
import os, json, uuid, shutil, time, random, functools
from typing import Dict, Any, List, Optional, TypedDict


from agents.job_scraper import scrape_himalayas_jobs
from agents.resume_matcher import match_resume_to_top_jobs
from agents.resume_customizer import generate_tailored_resume
from agents.coverletter_generator import generate_cover_letter
from agents.resume_structurizer import structurize_tailored_resume
from agents.format_resume_pdf import main as format_resumes_pdf
from agents.candidate_extractor import extract_candidate_profile, save_profile_to_json


from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.schema import SystemMessage, HumanMessage

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
LLM = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.1-8b-instant") if GROQ_API_KEY else None

RUNS_DIR = "outputs/runs"
os.makedirs(RUNS_DIR, exist_ok=True)

JOBS: Dict[str, Dict[str, Any]] = {}  # simple in-memory job registry


# utilities 

def _write_json(path: str, data: Any):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def fn_slug(name: str) -> str:
    return "".join(ch.lower() for ch in name if ch.isalnum() or ch in ("-", "_")).replace(" ", "-")


# --- Simple retry decorator (exponential backoff) ---
def retry(max_attempts=3, base_delay=0.5, jitter=0.2, exceptions=(Exception,)):
    def deco(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 0
            delay = base_delay
            while True:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    attempt += 1
                    if attempt >= max_attempts:
                        raise
                    time.sleep(delay + random.random() * jitter)
                    delay *= 2
        return wrapper
    return deco


# ====== Sequential pipeline (kept for compatibility) ==============================

def sequential_pipeline(resume_text: str, top_n: int = 3, both_styles: bool = True) -> Dict[str, Any]:
    run_id = time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
    run_dir = os.path.join(RUNS_DIR, run_id)
    out_resumes_dir = os.path.join(run_dir, "resumes")
    os.makedirs(out_resumes_dir, exist_ok=True)

    profile = extract_candidate_profile(resume_text)
    save_profile_to_json(profile, path=os.path.join(run_dir, "candidate_profile.json"))

    jobs = scrape_himalayas_jobs(save_to=os.path.join(run_dir, "sample_jobs.json"))
    matched_jobs = match_resume_to_top_jobs(resume_text, jobs, top_n=top_n)
    _write_json(os.path.join(run_dir, "matched_jobs.json"), matched_jobs)

    tailored_items = []
    for job in matched_jobs:
        t = generate_tailored_resume(resume_text, job.get("description", ""))
        tailored_items.append({
            "job_title": job["title"],
            "company": job["company"],
            "link": job["link"],
            "score": job["score"],
            "description": job.get("description", ""),
            "tailored_resume": t
        })
    _write_json(os.path.join(run_dir, "top_matched_resumes.json"), tailored_items)

    structured_items = []
    for it in tailored_items:
        s = structurize_tailored_resume(it["tailored_resume"], it["job_title"], it["company"])
        structured_items.append({**it, "structured": s})
    _write_json(os.path.join(run_dir, "top_matched_resumes_structured.json"), structured_items)

    format_resumes_pdf(structured_items, candidate=profile, both=both_styles)

    global_resumes_dir = "outputs/resumes"
    generated = []
    if os.path.exists(global_resumes_dir):
        for fn in os.listdir(global_resumes_dir):
            if fn.endswith(".pdf") and profile.get("name") and fn.lower().startswith(fn_slug(profile["name"])):
                src = os.path.join(global_resumes_dir, fn)
                dst = os.path.join(out_resumes_dir, fn)
                shutil.copy2(src, dst)
                generated.append(dst)

    packets = []
    for job in matched_jobs:
        t = next((x["tailored_resume"] for x in tailored_items
                  if x["job_title"] == job["title"] and x["company"] == job["company"]), "")
        cl = generate_cover_letter(
            job_title=job["title"], company=job["company"],
            description=job.get("description", ""), tailored_resume=t
        )
        packets.append({**job, "tailored_resume": t, "cover_letter": cl})
    _write_json(os.path.join(run_dir, "top_matched_applications.json"), packets)

    return {
        "run_id": run_id,
        "profile_path": os.path.join(run_dir, "candidate_profile.json"),
        "matched_jobs_path": os.path.join(run_dir, "matched_jobs.json"),
        "tailored_resumes_path": os.path.join(run_dir, "top_matched_resumes.json"),
        "structured_resumes_path": os.path.join(run_dir, "top_matched_resumes_structured.json"),
        "packets_path": os.path.join(run_dir, "top_matched_applications.json"),
        "pdf_dir": out_resumes_dir,
        "pdf_files": generated,
    }


# ====== Agentic Graph (LangGraph) =================================================

from langgraph.graph import StateGraph, END

class PipelineState(TypedDict, total=False):
    # inputs / flags
    resume_text: str
    refined: bool  # whether we've already refined once
    # outputs
    profile: Dict[str, Any]
    jobs: List[Dict[str, Any]]
    matches: List[Dict[str, Any]]
    tailored: List[Dict[str, Any]]
    structured: List[Dict[str, Any]]
    cover_letters: List[Dict[str, Any]]
    packets: List[Dict[str, Any]]
    artifacts: Dict[str, Any]
    # diagnostics
    error: Optional[str]


# --- Nodes with retries where relevant ---

@retry(max_attempts=3)
def _extract_profile(resume_text: str) -> Dict[str, Any]:
    return extract_candidate_profile(resume_text)

def n_extract_profile(state: PipelineState):
    try:
        profile = _extract_profile(state["resume_text"])
        return {"profile": profile}
    except Exception as e:
        return {"error": f"profile: {e}"}

@retry(max_attempts=3)
def _scrape() -> List[Dict[str, Any]]:
    # use default path in agents; API returns the list
    return scrape_himalayas_jobs()

def n_scrape_jobs(state: PipelineState):
    try:
        jobs = _scrape()
        return {"jobs": jobs}
    except Exception as e:
        return {"error": f"scrape: {e}"}

def n_match(state: PipelineState):
    try:
        matches = match_resume_to_top_jobs(state["resume_text"], state["jobs"], top_n=3)
        return {"matches": matches}
    except Exception as e:
        return {"error": f"match: {e}"}

# LLM-based refinement of base resume (one pass max)
REFINE_SYSTEM = (
    "You are a resume optimizer. Given a base resume and a target job title + description, "
    "rewrite the resume to better align to the role. Keep facts only; do NOT invent. "
    "Return a refined resume in plain text, concise but substantive."
)

@retry(max_attempts=3)
def _refine_resume_llm(base_resume: str, target_title: str, target_desc: str) -> str:
    if not LLM:
        # no key: return base resume unchanged
        return base_resume
    msgs = [
        SystemMessage(content=REFINE_SYSTEM),
        HumanMessage(content=f"TARGET: {target_title}\n\nDESCRIPTION:\n{target_desc}\n\nBASE RESUME:\n{base_resume}")
    ]
    return LLM.invoke(msgs).content

def n_refine_resume(state: PipelineState):
    try:
        # pick the highest-scoring match if exists; else first job
        target = None
        if state.get("matches"):
            target = max(state["matches"], key=lambda m: m.get("score", 0.0))
            title = target.get("title", "")
            desc = target.get("description", "")
        elif state.get("jobs"):
            j = state["jobs"][0]
            title = j.get("title", "")
            desc = j.get("description", "")
        else:
            title, desc = "", ""

        refined = _refine_resume_llm(state["resume_text"], title, desc)
        return {"resume_text": refined, "refined": True}
    except Exception as e:
        return {"error": f"refine: {e}"}

@retry(max_attempts=3)
def _tailor_llm(resume_text: str, jd: str) -> str:
    return generate_tailored_resume(resume_text, jd)

def n_tailor(state: PipelineState):
    try:
        out = []
        for job in state["matches"]:
            t = _tailor_llm(state["resume_text"], job.get("description", ""))
            out.append({**job, "tailored_resume": t})
        return {"tailored": out}
    except Exception as e:
        return {"error": f"tailor: {e}"}

@retry(max_attempts=3)
def _structure_llm(tailored: str, title: str, company: str) -> Dict[str, Any]:
    return structurize_tailored_resume(tailored, title, company)

def n_structure(state: PipelineState):
    try:
        out = []
        for it in state["tailored"]:
            s = _structure_llm(it["tailored_resume"], it["title"], it["company"])
            out.append({**it, "structured": s})
        return {"structured": out}
    except Exception as e:
        return {"error": f"struct: {e}"}

@retry(max_attempts=3)
def _cover_llm(job_title: str, company: str, jd: str, tailored: str) -> str:
    return generate_cover_letter(job_title=job_title, company=company, description=jd, tailored_resume=tailored)

def n_cover_letters(state: PipelineState):
    """
    Generate cover letters. Prefer 'tailored' if present; otherwise fall back to 'matches'
    by creating a quick tailored text on the fly from resume_text + JD.
    """
    try:
        items = state.get("tailored") or state.get("matches") or []
        out = []
        base_resume = state.get("resume_text", "")
        for it in items:
            title = it["title"]
            company = it["company"]
            jd = it.get("description", "")
            tailored_text = it.get("tailored_resume") or generate_tailored_resume(base_resume, jd)
            cl = _cover_llm(title, company, jd, tailored_text)
            out.append({**it, "tailored_resume": tailored_text, "cover_letter": cl})
        return {"cover_letters": out}
    except Exception as e:
        return {"error": f"cover: {e}"}

def n_join_after_parallel(state: PipelineState):
    """
    Join gate: proceed only when both 'structured' and 'cover_letters' are present.
    """
    if state.get("structured") is not None and state.get("cover_letters") is not None:
        packets = []
        by_key = {(it["title"], it["company"]): it for it in (state.get("tailored") or [])}
        for cl in state["cover_letters"]:
            k = (cl["title"], cl["company"])
            tr = by_key.get(k, {})
            packets.append({
                "title": cl["title"],
                "company": cl["company"],
                "link": cl.get("link", ""),
                "score": cl.get("score", 0),
                "description": cl.get("description", ""),
                "tailored_resume": tr.get("tailored_resume", cl.get("tailored_resume", "")),
                "cover_letter": cl["cover_letter"]
            })
        return {"packets": packets}
    return {}

def n_pdfs(state: PipelineState):
    try:
        profile = state.get("profile", {})
        items = state.get("structured", []) or state.get("tailored", [])
        if not items:
            return {"error": "pdf: no items to render"}
        format_resumes_pdf(items, candidate=profile, both=True)
        return {"artifacts": {"pdf_dir": "outputs/resumes"}}
    except Exception as e:
        return {"error": f"pdf: {e}"}


# ====== LLM Supervisor (chooses next action) ======================================

SUPERVISOR_SYSTEM = (
    "You are a pipeline supervisor. Based on the current state snapshot, decide next actions.\n"
    "Allowed actions: [REFINE_MATCH, TAILOR, STRUCTURE_AND_COVER, PDFS, END]\n"
    "- REFINE_MATCH: Use only if best match score < 0.60 and refined==False.\n"
    "- TAILOR: Generate tailored resumes for current matches.\n"
    "- STRUCTURE_AND_COVER: Run structuring and cover-letter generation in parallel.\n"
    "- PDFS: Render PDFs when structured data is present.\n"
    "- END: When everything is done or nothing else to do.\n"
    "Return ONLY a JSON list of actions, e.g., [\"TAILOR\"]."
)

def supervisor_decide(state: PipelineState) -> List[str]:
    # safe default rules without LLM (if key missing or no API key)
    def rule_based() -> List[str]:
        matches = state.get("matches") or []
        refined = state.get("refined", False)
        structured = state.get("structured")
        cover_letters = state.get("cover_letters")

        best = max((m.get("score", 0.0) for m in matches), default=0.0)
        if matches and best < 0.60 and not refined:
            return ["REFINE_MATCH"]
        if matches and not state.get("tailored"):
            return ["TAILOR"]
        if state.get("tailored") and (structured is None or cover_letters is None):
            return ["STRUCTURE_AND_COVER"]
        if structured:
            return ["PDFS", "END"]
        return ["END"]

    if not LLM:
        return rule_based()

    # small, privacy-light summary for the LLM
    snapshot = {
        "has_profile": bool(state.get("profile")),
        "jobs": len(state.get("jobs") or []),
        "matches": [{"title": m.get("title"), "company": m.get("company"), "score": m.get("score", 0.0)} for m in (state.get("matches") or [])][:5],
        "best_score": max((m.get("score", 0.0) for m in (state.get("matches") or [])), default=0.0),
        "refined": state.get("refined", False),
        "has_tailored": bool(state.get("tailored")),
        "has_structured": state.get("structured") is not None,
        "has_cover_letters": state.get("cover_letters") is not None
    }

    msgs = [
        SystemMessage(content=SUPERVISOR_SYSTEM),
        HumanMessage(content=json.dumps(snapshot))
    ]
    try:
        raw = LLM.invoke(msgs).content.strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1] if "```" in raw[3:] else raw.replace("```", "")
        actions = json.loads(raw)
        if isinstance(actions, list) and all(isinstance(a, str) for a in actions):
            return actions
        return rule_based()
    except Exception:
        return rule_based()


# ====== Build the graph ===========================================================

def build_graph():
    g = StateGraph(PipelineState)

    # atomic nodes
    g.add_node("extract_profile", n_extract_profile)
    g.add_node("scrape_jobs", n_scrape_jobs)
    g.add_node("match", n_match)
    g.add_node("refine_resume", n_refine_resume)
    g.add_node("tailor", n_tailor)
    g.add_node("structure", n_structure)
    g.add_node("cover_letters", n_cover_letters)
    g.add_node("join_parallel", n_join_after_parallel)
    g.add_node("pdfs", n_pdfs)

    # fixed early chain
    g.set_entry_point("extract_profile")
    g.add_edge("extract_profile", "scrape_jobs")
    g.add_edge("scrape_jobs", "match")

    # ----- Conditional supervisor edges after match/refine/tailor/join -----

    def after_match_router(state: PipelineState):
        actions = supervisor_decide(state)
        if "REFINE_MATCH" in actions and not state.get("refined", False):
            return "refine_resume"
        if "TAILOR" in actions:
            return "tailor"
        if "STRUCTURE_AND_COVER" in actions and state.get("tailored"):
            return "parallel"
        if "PDFS" in actions and state.get("structured"):
            return "pdfs"
        return END

    def after_refine_router(state: PipelineState):
        # after refine we always re-match
        return "match"

    def after_tailor_router(state: PipelineState):
        actions = supervisor_decide(state)
        if "STRUCTURE_AND_COVER" in actions:
            return "parallel"
        return "pdfs" if state.get("structured") else END

    def after_join_router(state: PipelineState):
        actions = supervisor_decide(state)
        if "PDFS" in actions:
            return "pdfs"
        return END

    # Conditional edges
    g.add_conditional_edges("match", after_match_router, {
        "refine_resume": "refine_resume",
        "tailor": "tailor",
        "parallel": "structure",  # we'll also branch to cover_letters from 'tailor'
        END: END
    })

    g.add_conditional_edges("refine_resume", after_refine_router, {
        "match": "match"
    })

    g.add_conditional_edges("tailor", after_tailor_router, {
        "parallel": "structure",
        "pdfs": "pdfs",
        END: END
    })
    # fan-out for parallel stage only AFTER tailor
    g.add_edge("tailor", "cover_letters")

    # both structure and cover_letters flow into join
    g.add_edge("structure", "join_parallel")
    g.add_edge("cover_letters", "join_parallel")

    g.add_conditional_edges("join_parallel", after_join_router, {
        "pdfs": "pdfs",
        END: END
    })

    # final
    g.add_edge("pdfs", END)

    return g.compile()


# ====== Public agentic runner =====================================================

def agentic_pipeline(resume_text: str) -> Dict[str, Any]:
    graph = build_graph()
    state: PipelineState = {"resume_text": resume_text, "refined": False}
    final = graph.invoke(state)
    return final


# ====== Job facade for FastAPI ====================================================

def start_job(resume_text: str, top_n: int = 3, agentic: bool = True) -> str:
    job_id = uuid.uuid4().hex
    JOBS[job_id] = {"status": "running", "result": None, "error": None}

    try:
        if agentic:
            result = agentic_pipeline(resume_text)
            JOBS[job_id]["result"] = result
            JOBS[job_id]["status"] = "done" if not result.get("error") else "error"
            JOBS[job_id]["error"] = result.get("error")
        else:
            result = sequential_pipeline(resume_text, top_n=top_n, both_styles=True)
            JOBS[job_id]["result"] = result
            JOBS[job_id]["status"] = "done"
    except Exception as e:
        JOBS[job_id]["status"] = "error"
        JOBS[job_id]["error"] = str(e)

    return job_id

def get_job(job_id: str) -> Dict[str, Any]:
    return JOBS.get(job_id, {"status": "unknown", "result": None, "error": "not found"})
