

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.schema import SystemMessage, HumanMessage

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY in .env")

llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model="llama-3.1-8b-instant",
)

SYSTEM_PROMPT = (
    "You are an expert technical interview coach.\n"
    "Based on the job description and candidate resume, generate:\n"
    "1. 8 Technical Questions\n"
    "2. 4 HR Questions\n"
    "3. 4 Behavioral Questions\n"
    "4. Key topics to revise\n"
    "5. A short mock interview strategy\n\n"
    "Keep it structured and professional.\n"
    "Do NOT invent resume details."
)

def generate_interview_prep(job_title: str, company: str, description: str, tailored_resume: str) -> str:
    human = (
        f"Job Title: {job_title}\n"
        f"Company: {company}\n\n"
        f"Job Description:\n{description}\n\n"
        f"Tailored Resume:\n{tailored_resume}\n"
    )

    msgs = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=human)
    ]

    return llm.invoke(msgs).content