import os, re, json
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
    "You are a resume info extractor. From the INPUT resume text, extract the candidate profile.\n"
    "Return ONLY valid JSON with these exact keys:\n"
    "{\n"
    '  "name": "string",\n'
    '  "headline": "string",\n'
    '  "email": "string",\n'
    '  "phone": "string",\n'
    '  "linkedin": "string",\n'
    '  "location": "string"\n'
    "}\n"
    "If a field is unknown, return an empty string for it. Do NOT invent values."
)

def _basic_regex_hints(text: str) -> Dict[str, str]:
    # ultra-light fallback hints
    email = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    linkedin = re.search(r"(linkedin\.com\/in\/[A-Za-z0-9\-_/]+)", text, re.I)
    phone = re.search(r"(\+?\d[\d\-\s()]{7,}\d)", text)
    hints = {
        "email": email.group(0) if email else "",
        "linkedin": linkedin.group(1) if linkedin else "",
        "phone": phone.group(1) if phone else "",
    }
    return hints

def extract_candidate_profile(resume_text: str) -> Dict[str, str]:
    # ask the LLM for a strict JSON
    msgs = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=f"INPUT RESUME TEXT:\n{resume_text}")
    ]
    out = llm.invoke(msgs).content.strip()

    # tolerate accidental fences
    if out.startswith("```"):
        out = out.split("```", 2)[1] if "```" in out[3:] else out.replace("```", "")
    try:
        data = json.loads(out)
    except Exception:
        # last-resort: try to extract a JSON object region
        m = re.search(r"\{.*\}", out, re.S)
        if not m:
            data = {}
        else:
            data = json.loads(m.group(0))

    # normalize keys
    profile = {
        "name": str(data.get("name", "")).strip(),
        "headline": str(data.get("headline", "")).strip(),
        "email": str(data.get("email", "")).strip(),
        "phone": str(data.get("phone", "")).strip(),
        "linkedin": str(data.get("linkedin", "")).strip(),
        "location": str(data.get("location", "")).strip(),
    }

    # merge basic regex hints for missing fields
    hints = _basic_regex_hints(resume_text)
    for k in ["email", "phone", "linkedin"]:
        if not profile.get(k):
            profile[k] = hints.get(k, "")

    return profile

def save_profile_to_json(profile: Dict[str, str], path="data/candidate_profile.json"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2)
