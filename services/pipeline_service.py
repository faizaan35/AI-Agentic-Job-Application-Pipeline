import os
import json
import uuid
import time
from typing import Dict, Any, List, Optional, TypedDict

from agents.job_scraper import scrape_himalayas_jobs
from agents.resume_matcher import match_resume_to_top_jobs
from agents.resume_customizer import generate_tailored_resume
from agents.coverletter_generator import generate_cover_letter
from agents.resume_structurizer import structurize_tailored_resume
from agents.format_resume_pdf import (
    main as format_resumes_pdf,
    format_cover_letter_pdf,
    format_interview_pdf,
)
from agents.candidate_extractor import extract_candidate_profile, save_profile_to_json
from agents.interview_agent import generate_interview_prep

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END

load_dotenv()

RUNS_DIR = "outputs/runs"
os.makedirs(RUNS_DIR, exist_ok=True)

JOBS: Dict[str, Dict[str, Any]] = {}

# =====================================================
# Sequential Pipeline (Backup)
# =====================================================

def sequential_pipeline(resume_text: str, top_n: int = 1) -> Dict[str, Any]:
    run_id = time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
    run_dir = os.path.join(RUNS_DIR, run_id)
    os.makedirs(run_dir, exist_ok=True)

    profile = extract_candidate_profile(resume_text)
    save_profile_to_json(profile, path=os.path.join(run_dir, "candidate_profile.json"))

    jobs = scrape_himalayas_jobs()
    matches = match_resume_to_top_jobs(resume_text, jobs, top_n=top_n)

    structured = []
    cover_letters = []
    interview_prep = []

    for job in matches:
        time.sleep(3)
        t = generate_tailored_resume(resume_text, job.get("description", ""))

        time.sleep(3)
        s = structurize_tailored_resume(t, job["title"], job["company"])

        time.sleep(3)
        cl = generate_cover_letter(job["title"], job["company"], job.get("description", ""), t)

        time.sleep(3)
        ip = generate_interview_prep(job["title"], job["company"], job.get("description", ""), t)

        structured.append({**job, "structured": s})
        cover_letters.append({**job, "cover_letter": cl})
        interview_prep.append({**job, "interview_prep": ip})

        # Generate PDFs
        format_cover_letter_pdf(
            name=profile.get("name", "candidate"),
            job_title=job["title"],
            company=job["company"],
            cover_letter=cl,
        )

        format_interview_pdf(
            name=profile.get("name", "candidate"),
            job_title=job["title"],
            company=job["company"],
            interview_text=ip,
        )

    format_resumes_pdf(structured, candidate=profile, both=True)

    return {
        "run_id": run_id,
        "profile": profile,
        "matches": matches,
        "structured": structured,
        "cover_letters": cover_letters,
        "interview_prep": interview_prep,
        "pdf_dir": "outputs/resumes",
    }


# =====================================================
# Agentic Graph (Deterministic + Throttled)
# =====================================================

class PipelineState(TypedDict, total=False):
    resume_text: str
    profile: Dict[str, Any]
    jobs: List[Dict[str, Any]]
    matches: List[Dict[str, Any]]
    tailored: List[Dict[str, Any]]
    structured: List[Dict[str, Any]]
    cover_letters: List[Dict[str, Any]]
    interview: List[Dict[str, Any]]
    error: Optional[str]


def n_extract_profile(state: PipelineState):
    return {"profile": extract_candidate_profile(state["resume_text"])}


def n_scrape_jobs(state: PipelineState):
    return {"jobs": scrape_himalayas_jobs()}


def n_match(state: PipelineState):
    return {"matches": match_resume_to_top_jobs(state["resume_text"], state["jobs"], top_n=2)}


def n_tailor(state: PipelineState):
    out = []
    for job in state["matches"]:
        time.sleep(3)
        t = generate_tailored_resume(state["resume_text"], job.get("description", ""))
        out.append({**job, "tailored_resume": t})
    return {"tailored": out}


def n_structure(state: PipelineState):
    out = []
    for it in state["tailored"]:
        time.sleep(3)
        s = structurize_tailored_resume(it["tailored_resume"], it["title"], it["company"])
        out.append({**it, "structured": s})
    return {"structured": out}


def n_cover_letters(state: PipelineState):
    out = []
    for it in state["tailored"]:
        time.sleep(3)
        cl = generate_cover_letter(
            it["title"],
            it["company"],
            it.get("description", ""),
            it["tailored_resume"],
        )
        out.append({**it, "cover_letter": cl})
    return {"cover_letters": out}


def n_interview(state: PipelineState):
    out = []
    for it in state["tailored"]:
        time.sleep(3)
        ip = generate_interview_prep(
            it["title"],
            it["company"],
            it.get("description", ""),
            it["tailored_resume"],
        )
        out.append({**it, "interview_prep": ip})
    return {"interview": out}


def n_pdfs(state: PipelineState):
    profile = state["profile"]
    name = profile.get("name", "candidate")

    # Resume PDFs
    format_resumes_pdf(state["structured"], candidate=profile, both=True)

    # Cover Letter PDFs
    for item in state["cover_letters"]:
        format_cover_letter_pdf(
            name=name,
            job_title=item["title"],
            company=item["company"],
            cover_letter=item["cover_letter"],
        )

    # Interview Prep PDFs
    for item in state["interview"]:
        format_interview_pdf(
            name=name,
            job_title=item["title"],
            company=item["company"],
            interview_text=item["interview_prep"],
        )

    return {}


def build_graph():
    g = StateGraph(PipelineState)

    g.add_node("extract_profile", n_extract_profile)
    g.add_node("scrape_jobs", n_scrape_jobs)
    g.add_node("match", n_match)
    g.add_node("tailor", n_tailor)
    g.add_node("structure", n_structure)
    g.add_node("cover_letters", n_cover_letters)
    g.add_node("interview", n_interview)
    g.add_node("pdfs", n_pdfs)

    g.set_entry_point("extract_profile")

    g.add_edge("extract_profile", "scrape_jobs")
    g.add_edge("scrape_jobs", "match")
    g.add_edge("match", "tailor")

    # Sequential chain instead of parallel
    g.add_edge("tailor", "structure")
    g.add_edge("structure", "cover_letters")
    g.add_edge("cover_letters", "interview")
    g.add_edge("interview", "pdfs")

    g.add_edge("pdfs", END)

    return g.compile()

def agentic_pipeline(resume_text: str) -> Dict[str, Any]:
    graph = build_graph()
    state: PipelineState = {"resume_text": resume_text}
    final = graph.invoke(state)
    return final


# =====================================================
# FastAPI Job Interface
# =====================================================

def start_job(resume_text: str, top_n: int = 1, agentic: bool = True) -> str:
    job_id = uuid.uuid4().hex
    JOBS[job_id] = {"status": "running", "result": None, "error": None}

    try:
        if agentic:
            result = agentic_pipeline(resume_text)
        else:
            result = sequential_pipeline(resume_text, top_n)

        JOBS[job_id]["result"] = result
        JOBS[job_id]["status"] = "done"
    except Exception as e:
        JOBS[job_id]["status"] = "error"
        JOBS[job_id]["error"] = str(e)

    return job_id


def get_job(job_id: str) -> Dict[str, Any]:
    return JOBS.get(job_id, {"status": "unknown", "result": None, "error": "not found"})