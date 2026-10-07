from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.agent import ask_question_agent

app = FastAPI(title="Retail Sales Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://retail-sales-chatbot.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    question: str
    history: List[Message] = []

class ChatResponse(BaseModel):
    answer: str
    in_scope: bool
    plan: Optional[str] = None
    sql: Optional[str] = None
    verified: Optional[bool] = None
    attempts: int = 0

@app.get("/")
def root():
    return {"status": "ok", "service": "retail-sales-chatbot"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        history_dicts = [{"role": m.role, "text": m.text} for m in request.history]
        result = ask_question_agent(request.question, history=history_dicts)
        return ChatResponse(**result)
    except Exception:
        return ChatResponse(
            answer="Sorry, something went wrong while processing your question. Please try again.",
            in_scope=False,
        )

