import json
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, START, END
from src.query_engine import generate_sql, execute_sql, generate_answer, client

MAX_ATTEMPTS = 3

class AgentState(TypedDict):
    question: str
    history: list
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
        lines = [f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['text']}" for m in state["history"]]
        history_text = "Conversation so far:\n" + "\n".join(lines) + "\n\n"

    response = client.chat.completions.create(
        model="qwen/qwen3.6-35b-a3b",
        messages=[
            {
                "role": "system",
 "content": "You are a planning assistant for a retail sales chatbot. "
                            "The chatbot can ONLY answer questions using retail sales, stores, "
                            "oil prices, holidays, and transactions data (2015-08-15 onward). "
                            "Given the conversation so far and a new question, decide if it's answerable "
                            "using ONLY this kind of data. If the new question refers back to the "
                            "conversation (e.g. 'what about store 2?', 'and last year?'), resolve it into "
                            "a single, fully self-contained question using the conversation context. "
                            "If the new question is a confidence-check asking to double-check, verify, or "
                            "confirm the previous answer (e.g. 'are you sure?', 'double check that', "
                            "'really?'), treat it as IN SCOPE and set the plan to a restatement of the "
                            "PREVIOUS data question from the conversation history, so it gets recomputed "
                            "and re-verified. "
                            "Reply with ONLY a JSON object, no markdown, in this exact shape:\n"
                            '{"in_scope": true or false, "plan": "a single clear, specific, self-contained '
                            'restatement of the question for a SQL analyst, or empty string if not in scope"}',
            },
            {"role": "user", "content": f"{history_text}Current question: {state['question']}"},
        ],
    )
    result = json.loads(response.choices[0].message.content.strip())
    return {**state, "in_scope": result["in_scope"], "plan": result["plan"]}

def route_after_planner(state: AgentState) -> str:
    return "analytics" if state["in_scope"] else "refuse"

def refuse_node(state: AgentState) -> AgentState:
    return {**state, "answer": "I can only answer questions about retail sales, stores, oil prices, "
                                "holidays, and transactions from this dataset — could you ask something "
                                "related to that?"}

def analytics_node(state: AgentState) -> AgentState:
    attempts = state["attempts"] + 1
    try:
        sql = generate_sql(state["plan"], previous_error=state["error"], previous_sql=state["sql"])
        columns, rows = execute_sql(sql)
        return {**state, "sql": sql, "columns": columns, "rows": rows, "error": None, "attempts": attempts}
    except Exception as e:
        return {**state, "sql": state["sql"], "error": str(e), "attempts": attempts}

def route_after_analytics(state: AgentState) -> str:
    if state["error"] is None:
        return "verify"
    if state["attempts"] >= MAX_ATTEMPTS:
        return "give_up"
    return "retry"

def verify_node(state: AgentState) -> AgentState:
    response = client.chat.completions.create(
        model="qwen/qwen3.6-35b-a3b",
        messages=[
            {
                "role": "system",
                "content": "You are a strict verifier. Given a question, the SQL query used, and its "
                            "result, decide if the result actually and correctly answers the question. "
                            "Reply with ONLY a JSON object, no markdown, in this exact shape:\n"
                            '{"verified": true or false, "reason": "brief explanation, especially if false"}',
            },
            {
                "role": "user",
                "content": f"Question: {state['plan']}\nSQL: {state['sql']}\n"
                            f"Columns: {state['columns']}\nRows: {state['rows']}",
            },
        ],
    )
    result = json.loads(response.choices[0].message.content.strip())
    if result["verified"]:
        return {**state, "verified": True}
    return {**state, "verified": False, "error": f"Verification failed: {result['reason']}"}

def route_after_verify(state: AgentState) -> str:
    if state["verified"]:
        return "answer"
    if state["attempts"] >= MAX_ATTEMPTS:
        return "give_up"
    return "retry"

def answer_node(state: AgentState) -> AgentState:
    answer = generate_answer(state["plan"], state["sql"], state["columns"], state["rows"])
    return {**state, "answer": answer}

def give_up_node(state: AgentState) -> AgentState:
    return {**state, "answer": "I'm sorry, I wasn't able to answer that question after a few attempts — "
                                "could you try rephrasing it?"}

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

def ask_question_agent(question: str, history: list = None) -> dict:
    result = compiled_graph.invoke({
        "question": question, "history": history or [], "in_scope": None, "plan": None,
        "sql": None, "columns": None, "rows": None, "error": None, "verified": None,
        "attempts": 0, "answer": None,
    })
    return {
        "answer": result["answer"],
        "in_scope": result["in_scope"],
        "plan": result["plan"],
        "sql": result["sql"],
        "verified": result["verified"],
        "attempts": result["attempts"],
    }


if __name__ == "__main__":
    test_question = "What were the total sales in store 1 during January 2017?"
    print(ask_question_agent(test_question))