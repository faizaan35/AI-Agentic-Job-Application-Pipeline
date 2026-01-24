
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
import os

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

    if file:
        content = (await file.read()).decode("utf-8", errors="ignore")
        resume_text = content

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
