from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
import os
import requests
from pydantic import BaseModel
from dotenv import load_dotenv
import io

load_dotenv()

from services.pipeline_service import start_job, get_job, RUNS_DIR

app = FastAPI(title="Job Agent System API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/run")
async def run_pipeline(
    resume_text: Optional[str] = Form(None),
    top_n: int = Form(3),
    agentic: bool = Form(True),
    file: UploadFile = File(None),
):
    """
    Start a pipeline run. Either send resume_text or upload a file.
    Returns a job_id to poll.
    """
    if not resume_text and not file:
        return JSONResponse({"error": "Provide resume_text or upload a file"}, status_code=400)

    # 🔥 UPDATED FILE HANDLING (PDF + TXT SUPPORT)
    if file:
        content = await file.read()

        if file.filename.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader

                reader = PdfReader(io.BytesIO(content))
                extracted_text = ""

                for page in reader.pages:
                    extracted_text += page.extract_text() or ""

                resume_text = extracted_text.strip()

                if not resume_text:
                    return JSONResponse(
                        {"error": "Could not extract text from PDF."},
                        status_code=400
                    )

            except Exception as e:
                return JSONResponse(
                    {"error": f"PDF processing failed: {str(e)}"},
                    status_code=400
                )

        elif file.filename.lower().endswith(".txt"):
            resume_text = content.decode("utf-8", errors="ignore")

        else:
            return JSONResponse(
                {"error": "Unsupported file format. Upload PDF or TXT."},
                status_code=400
            )

    job_id = start_job(resume_text=resume_text, top_n=top_n, agentic=agentic)
    return {"job_id": job_id, "status": "started"}


@app.get("/jobs/{job_id}")
def job_status(job_id: str):
    return get_job(job_id)


@app.get("/download")
def download(path: str):
    """
    Serve a file by absolute/relative path (limited to outputs/).
    """
    path = os.path.abspath(path)
    base = os.path.abspath("outputs")
    if not path.startswith(base) or not os.path.exists(path):
        return JSONResponse({"error": "file not found"}, status_code=404)
    return FileResponse(path, media_type="application/pdf")


@app.get("/runs")
def list_runs():
    if not os.path.exists(RUNS_DIR):
        return []
    out = []
    for d in sorted(os.listdir(RUNS_DIR)):
        p = os.path.join(RUNS_DIR, d)
        if os.path.isdir(p):
            out.append({"run_id": d, "dir": p})
    return out


# ================================
# GROQ CHAT ENDPOINT
# ================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class ChatRequest(BaseModel):
    messages: list


@app.post("/chat")
def chat_with_groq(data: ChatRequest):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": data.messages,
    }

    response = requests.post(GROQ_URL, headers=headers, json=payload)

    if response.status_code != 200:
        return JSONResponse(
            {"error": response.text}, status_code=response.status_code
        )

    result = response.json()

    return {
        "reply": result["choices"][0]["message"]["content"]
    }