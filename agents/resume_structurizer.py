import os, json, re
from typing import Dict, Any
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.schema import SystemMessage, HumanMessage

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY in .env")

llm = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.1-8b-instant")

SYSTEM = (
  "You are a resume structuring assistant. Convert the INPUT resume text into the EXACT JSON schema. "
  "Do not invent facts. Keep bullets action-led, concise, and quantifiable where possible. "
  "Return ONLY valid JSON. No markdown, no commentary."
)

SCHEMA = """
Return JSON with keys exactly: summary, experience, projects, education, skills, certifications.
Schema example:
{
  "summary": "string (<= 80 words)",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string or ''",
      "start": "YYYY-MM or 'YYYY'",
      "end": "YYYY-MM | 'Present' | ''",
      "bullets": ["string", "string", "... (<= 6)"]
    }
  ],
  "projects": [
    {"name":"string","role":"string or ''","bullets":["string","...(<=4)"]}
  ],
  "education": [
    {"degree":"string","school":"string","year":"YYYY or ''"}
  ],
  "skills": {
    "technical": ["string", "..."],
    "tools": ["string", "..."],
    "soft": ["string", "..."]
  },
  "certifications": ["string", "..."]
}
"""

_JSON_RE = re.compile(r"\{.*\}", re.S)

def _force_json(s: str) -> Dict[str, Any]:
    """Try to load JSON; strip code fences if any; fallback to regex extraction."""
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z0-9]*", "", s)
        s = s.strip().rstrip("`").rstrip("```").strip()
    try:
        return json.loads(s)
    except Exception:
        m = _JSON_RE.search(s)
        if m:
            return json.loads(m.group(0))
        raise

def structurize_tailored_resume(tailored_resume: str, job_title: str, company: str) -> Dict[str, Any]:
    msgs = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=(
            f"TARGET ROLE: {job_title} at {company}\n"
            f"SCHEMA (strict):\n{SCHEMA}\n\n"
            f"INPUT RESUME TEXT:\n{tailored_resume}"
        )),
    ]
    out = llm.invoke(msgs).content
    data = _force_json(out)

    # light normalization to ensure keys exist
    data.setdefault("summary", "")
    data.setdefault("experience", [])
    data.setdefault("projects", [])
    data.setdefault("education", [])
    data.setdefault("skills", {"technical": [], "tools": [], "soft": []})
    data.setdefault("certifications", [])
    return data
