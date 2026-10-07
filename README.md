# Retail Sales Chatbot

A multi-agent AI chatbot that answers natural-language questions over real retail sales data — no manual SQL, no dashboards. Ask it something like *"What were the total sales in store 1 during January 2017?"* and it plans, writes, runs, and verifies a SQL query before answering, with conversation memory for follow-up questions and a built-in explainability panel showing exactly how it got there.

**Live demo:** [Chatbot](https://retail-sales-chatbot.vercel.app) · [API docs](https://backend-production-11c8.up.railway.app/docs)

## How it works

This isn't a single LLM call wrapping the database — it's a small multi-agent pipeline built with [LangGraph](https://github.com/langchain-ai/langgraph):

1. **Planner** — checks whether the question is answerable from this dataset (refuses gracefully if not, e.g. general-knowledge questions), and resolves conversational follow-ups (*"what about store 2?"*) into a single self-contained question using chat history.
2. **Analytics** — generates a SQL query for the clarified question and runs it against PostgreSQL. All generated SQL is validated in code before execution — only `SELECT` statements are ever allowed to run, with hard checks against stacked queries and destructive keywords, regardless of what the LLM produces.
3. **Verification** — a separate LLM call checks whether the query result actually answers the question (not just "did it run without crashing"). If it fails, the query step retries with the failure fed back as context — up to 3 attempts before a graceful fallback.
4. **Answer** — phrases the verified result as a natural-language sentence.

Every response includes an optional "Show details" panel exposing the Planner's decision, the generated SQL, and the verification result — full transparency into the agent's reasoning, not a black box.

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, LangGraph |
| LLM | Qwen 3.6 35B (via [OpenRouter](https://openrouter.ai)) |
| Database | PostgreSQL (Railway) |
| Frontend | React + Vite |
| Backend hosting | Railway |
| Frontend hosting | Vercel |

## Dataset

[Corporación Favorita](https://www.kaggle.com/competitions/store-sales-time-series-forecasting) — real Ecuadorian grocery chain data: 54 stores across 33 product families, plus oil prices, holidays, and transaction counts, joined in a 5-table PostgreSQL schema (`stores`, `oil_prices`, `holidays`, `transactions`, `sales`). Sales data is scoped to the most recent ~2 years (2015-08-15 onward) to fit within the hosting tier's storage limits — full detail is available on request.

## API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/chat` | POST | `{ question, history[] }` → `{ answer, in_scope, plan, sql, verified, attempts }` |

Interactive docs available at `/docs` (FastAPI auto-generated Swagger UI).

## Running locally

### Backend
```bash
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash; use venv\Scripts\activate on cmd
pip install -r requirements.txt

# create .env with:
# DATABASE_URL=postgresql://...
# OPENROUTER_API_KEY=your_key_here

uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Set `VITE_API_URL` in `frontend/.env` to point at your running backend (e.g. `http://localhost:8000`).

## Project structure
```
├── app/            # FastAPI application (routes)
├── src/            # Agent pipeline: db connection, text-to-SQL engine, LangGraph agent
├── scripts/        # One-off data loading/exploration scripts
├── frontend/       # React + Vite chat UI
└── Procfile        # Railway start command
```

## License

MIT
