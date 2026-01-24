import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.schema import SystemMessage, HumanMessage

load_dotenv()

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.1-8b-instant",
)

def generate_tailored_resume(resume_text, job_description):
    system_prompt = (
        "You are a resume optimization expert. Based on the job description provided, "
        "rewrite the resume to highlight the most relevant skills and experience. make it atleast 150 words. "
        "Keep it professional, ATS-optimized, and under 2 pages. Do not fabricate anything."
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Job Description:\n{job_description}"),
        HumanMessage(content=f"Current Resume:\n{resume_text}")
    ]

    response = llm.invoke(messages)
    return response.content
