import os
import json
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

INPUT_PATH = "data/top_matched_resumes.json"
OUTPUT_PATH = "data/top_matched_with_cover_letters.json"

SYSTEM_PROMPT = (
    "You are a senior hiring manager. Write a concise, persuasive, ATS-friendly cover letter "
    "for the given job using the tailored resume below. Use a professional tone, 180–300 words, "
    "with a strong opener, 1–2 quantified highlights aligned to the JD, and a confident close. "
    "Do not invent facts. Output only the final letter text."
)

def generate_cover_letter(job_title: str, company: str, description: str, tailored_resume: str) -> str:
    human = (
        f"Job Title: {job_title}\n"
        f"Company: {company}\n\n"
        f"Job Description:\n{description}\n\n"
        f"Tailored Resume:\n{tailored_resume}\n"
    )
    msgs = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=human)]
    return llm.invoke(msgs).content

def main():
    if not os.path.exists(INPUT_PATH):
        print(f"❌ Missing input file: {INPUT_PATH}. Run main.py first.")
        return

    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        items = json.load(f)

    out = []
    for item in items:
        print(f"✉️  Generating cover letter for: {item['job_title']} @ {item['company']}")
        letter = generate_cover_letter(
            job_title=item["job_title"],
            company=item["company"],
            description=item.get("description", ""),
            tailored_resume=item["tailored_resume"],
        )
        out.append({**item, "cover_letter": letter})

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)

    print(f"\n✅ Saved resumes + cover letters → {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
