import logging
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from routers import briefing, flags, history, today, triage  # noqa: E402
from services.claude_service import MODEL  # noqa: E402

logger = logging.getLogger("innateai.backend")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="INNATEAI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(triage.router)
app.include_router(briefing.router)
app.include_router(flags.router)
app.include_router(history.router)
app.include_router(today.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception on %s %s\n%s", request.method, request.url.path, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )
