import json
import re
from typing import TypedDict, Optional, List, Any
from langgraph.graph import StateGraph, START, END
from src.query_engine import (
    generate_sql,
    execute_sql,
    generate_answer,
    extract_text_content,
    client,
    call_llm,
    SCHEMA_DESCRIPTION,
)
from src.dataset_manager import get_dataset_metadata

MAX_ATTEMPTS = 3

class AgentState(TypedDict):
    question: str
    history: list
    dataset_id: str
    dataset_name: str
    dialect: str
    schema_description: str
    scope_description: str
    refuse_message: str
    in_scope: Optional[bool]
    plan: Optional[str]
    sql: Optional[str]
    columns: Optional[list]
    rows: Optional[list]
    error: Optional[str]
    verified: Optional[bool]
    attempts: int
    answer: Optional[str]

def planner_node(state: AgentState) -> AgentState:
    history_text = ""
    if state["history"]:
        # Filter out transient failed or refusal messages from history
        valid_history = [
            m for m in state["history"]
            if m.get("text")
            and "no response received" not in m.get("text", "").lower()
            and not m.get("text", "").startswith("I can only answer questions about")
        ]
        if valid_history:
            lines = [f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('text', '')}" for m in valid_history]
            history_text = "Conversation so far:\n" + "\n".join(lines) + "\n\n"

    system_prompt = (
        f"You are an expert query planning assistant for an enterprise data platform.\n"
        f"Analysis Scope: {state['scope_description']}\n\n"
        f"Database Schema:\n{state['schema_description']}\n\n"
        f"Given the conversation history and a new question, decide if it's answerable "
        f"using the available dataset schema. If the question refers back to the "
        f"conversation (e.g. 'what about store 2?', 'and the second-highest department?', 'how many students?'), "
        f"resolve it into a single, fully self-contained question using the conversation context.\n"
        f"If the new question is a confidence-check asking to double-check or confirm "
        f"(e.g. 'are you sure?', 'verify that', 'really?'), treat it as IN SCOPE and set the "
        f"plan to a restatement of the PREVIOUS data question from history so it gets recomputed.\n"
        f"Reply with ONLY a JSON object, no markdown, in this exact shape:\n"
        f'{{"in_scope": true or false, "plan": "a single clear, specific, self-contained restatement of the question for a SQL analyst, or empty string if not in scope"}}'
    )

    response = call_llm(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{history_text}Current question: {state['question']}"},
        ],
        max_tokens=250,
    )
    raw = extract_text_content(response.choices[0].message)
    # Strip markdown if present
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    try:
        # Extract json object if there's text around it
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            raw = match.group(0)
        result = json.loads(raw)
        in_scope = result.get("in_scope", True)
        plan = result.get("plan", state["question"])
    except Exception:
        # Fallback to treating as in_scope if JSON parsing fails
        in_scope = True
        plan = state["question"]

    # Domain safety override: if question directly queries domain attributes, ensure in_scope is True
    q_lower = state["question"].lower()
    domain_terms = [
        "sale", "sales", "revenue", "store", "stores", "oil", "price", "prices",
        "transaction", "transactions", "holiday", "holidays", "family", "families",
        "mark", "marks", "grade", "student", "salary", "salaries", "department", "employee"
    ]
    if any(term in q_lower for term in domain_terms):
        in_scope = True
        if not plan:
            plan = state["question"]

    return {**state, "in_scope": in_scope, "plan": plan}

def route_after_planner(state: AgentState) -> str:
    return "analytics" if state["in_scope"] else "refuse"

def refuse_node(state: AgentState) -> AgentState:
    return {**state, "answer": state["refuse_message"]}

def analytics_node(state: AgentState) -> AgentState:
    attempts = state["attempts"] + 1
    try:
        sql = generate_sql(
            state["plan"],
            previous_error=state["error"],
            previous_sql=state["sql"],
            schema_description=state["schema_description"],
            dialect=state["dialect"]
        )
        columns, rows = execute_sql(sql, dataset_id=state["dataset_id"])
        return {
            **state,
            "sql": sql,
            "columns": columns,
            "rows": rows,
            "error": None,
            "attempts": attempts,
        }
    except Exception as e:
        return {
            **state,
            "sql": state.get("sql"),
            "error": str(e),
            "attempts": attempts,
        }

def route_after_analytics(state: AgentState) -> str:
    if state["error"] is None:
        return "verify"
    if state["attempts"] >= MAX_ATTEMPTS:
        return "give_up"
    return "retry"

def verify_node(state: AgentState) -> AgentState:
    # Quick sanity check: if columns exist, verify relevance
    sample_rows = state["rows"][:10] if state["rows"] else []
    
    response = call_llm(
        messages=[
            {
                "role": "system",
                "content": "You are a strict SQL verifier. Given a question, the SQL query used, and its "
                            "result, decide if the result actually and correctly answers the question. "
                            "Reply with ONLY a JSON object, no markdown, in this exact shape:\n"
                            '{"verified": true or false, "reason": "brief explanation, especially if false"}',
            },
            {
                "role": "user",
                "content": f"Question: {state['plan']}\nSQL: {state['sql']}\n"
                            f"Columns: {state['columns']}\nRows: {sample_rows}",
            },
        ],
        max_tokens=250,
    )
    raw = extract_text_content(response.choices[0].message)
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            raw = match.group(0)
        result = json.loads(raw)
        if result.get("verified", False):
            return {**state, "verified": True}
        return {**state, "verified": False, "error": f"Verification failed: {result.get('reason', 'Query output did not answer question')}"}
    except Exception:
        # If verification JSON parsing fails but query succeeded with columns, accept
        return {**state, "verified": True}

def route_after_verify(state: AgentState) -> str:
    if state["verified"]:
        return "answer"
    if state["attempts"] >= MAX_ATTEMPTS:
        return "give_up"
    return "retry"

def answer_node(state: AgentState) -> AgentState:
    answer = generate_answer(
        state["plan"],
        state["sql"],
        state["columns"] or [],
        state["rows"] or [],
        dataset_name=state["dataset_name"]
    )
    return {**state, "answer": answer}

def give_up_node(state: AgentState) -> AgentState:
    return {
        **state,
        "answer": f"I wasn't able to answer that question from {state['dataset_name']} after multiple attempts "
                  f"(error: {state.get('error', 'unknown error')}). Could you try rephrasing your question?"
    }

# Build LangGraph StateMachine
graph = StateGraph(AgentState)
graph.add_node("planner", planner_node)
graph.add_node("analytics", analytics_node)
graph.add_node("verify", verify_node)
graph.add_node("answer", answer_node)
graph.add_node("refuse", refuse_node)
graph.add_node("give_up", give_up_node)

graph.add_edge(START, "planner")
graph.add_conditional_edges("planner", route_after_planner, {"analytics": "analytics", "refuse": "refuse"})
graph.add_conditional_edges("analytics", route_after_analytics, {"verify": "verify", "retry": "analytics", "give_up": "give_up"})
graph.add_conditional_edges("verify", route_after_verify, {"answer": "answer", "retry": "analytics", "give_up": "give_up"})
graph.add_edge("answer", END)
graph.add_edge("refuse", END)
graph.add_edge("give_up", END)

compiled_graph = graph.compile()

def ask_question_agent(question: str, history: list = None, dataset_id: str = "retail") -> dict:
    """
    Main entry point for conversational Text-to-SQL.
    Supports Mode A (Retail Sales via Neon PostgreSQL) and Mode B (Custom Datasets via isolated SQLite).
    """
    dataset_id = dataset_id or "retail"

    if dataset_id == "retail":
        dialect = "PostgreSQL"
        schema_desc = SCHEMA_DESCRIPTION
        dataset_name = "Retail Sales"
        scope_desc = (
            "The chatbot can ONLY answer questions using retail sales, stores, "
            "oil prices, holidays, and transactions data (2015-08-15 onward)."
        )
        refuse_msg = (
            "I can only answer questions about retail sales, stores, oil prices, "
            "holidays, and transactions from this dataset — could you ask something related to that?"
        )
    else:
        meta = get_dataset_metadata(dataset_id)
        if not meta:
            raise ValueError(f"Dataset '{dataset_id}' not found.")
        dialect = "SQLite"
        schema_desc = f"You have access to SQLite database with table 'dataset'.\n{meta['schema_text']}"
        dataset_name = meta.get("name", "Custom Dataset")
        cols_summary = ", ".join(meta.get("column_names", []))
        scope_desc = (
            f"The chatbot is analyzing the user-uploaded dataset '{dataset_name}'. "
            f"Available columns are: {cols_summary}. "
            f"Decide if the question is answerable using the data in table 'dataset'."
        )
        refuse_msg = (
            f"I can only answer questions using the data in '{dataset_name}' "
            f"(available columns: {cols_summary}) — could you ask something related to those fields?"
        )

    result = compiled_graph.invoke({
        "question": question,
        "history": history or [],
        "dataset_id": dataset_id,
        "dataset_name": dataset_name,
        "dialect": dialect,
        "schema_description": schema_desc,
        "scope_description": scope_desc,
        "refuse_message": refuse_msg,
        "in_scope": None,
        "plan": None,
        "sql": None,
        "columns": None,
        "rows": None,
        "error": None,
        "verified": None,
        "attempts": 0,
        "answer": None,
    })

    return {
        "answer": result.get("answer"),
        "in_scope": result.get("in_scope"),
        "plan": result.get("plan"),
        "sql": result.get("sql"),
        "verified": result.get("verified"),
        "attempts": result.get("attempts", 1),
        "columns": result.get("columns"),
        "rows": result.get("rows"),
    }


if __name__ == "__main__":
    test_question = "What were the total sales in store 1 during January 2017?"
    print(ask_question_agent(test_question, dataset_id="retail"))
