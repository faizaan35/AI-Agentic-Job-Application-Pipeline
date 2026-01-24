from agents.job_scraper import scrape_himalayas_jobs
from agents.resume_matcher import match_resume_to_top_jobs
from agents.resume_customizer import generate_tailored_resume
from agents.coverletter_generator import generate_cover_letter

# PDF formatter (supports variant="classic"/"teal" or both=True)
try:
    from agents.format_resume_pdf import main as format_resumes_pdf
except Exception as e:
    format_resumes_pdf = None
    print("ℹ️  PDF formatter not loaded. Install:")
    print("    python -m pip install reportlab python-slugify")
    print(f"   (Reason: {e})")

# LLM structurizer (tailored text -> strict JSON layout)
from agents.resume_structurizer import structurize_tailored_resume

# NEW: candidate profile extractor (LLM)
from agents.candidate_extractor import extract_candidate_profile, save_profile_to_json

import json
import os


def save_top_resumes(top_jobs, resume_text, save_path="data/top_matched_resumes.json"):
    """
    Generates tailored resumes for the selected jobs and writes them to JSON.
    Returns the in-memory list that the PDF formatter will use immediately.
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    tailored_resumes = []
    for job in top_jobs:
        print(f"\n📄 Generating tailored resume for: {job['title']} at {job['company']}")
        tailored_resume = generate_tailored_resume(resume_text, job.get("description", ""))

        tailored_resumes.append({
            "job_title": job["title"],
            "company": job["company"],
            "link": job["link"],
            "score": job["score"],
            "description": job.get("description", ""),
            "tailored_resume": tailored_resume
        })

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(tailored_resumes, f, indent=4)

    print(f"\n✅ Tailored resumes saved to: {save_path}")
    return tailored_resumes


def save_top_application_packets(top_jobs, resume_text, save_path="data/top_matched_applications.json"):
    """
    For each top job, generate a tailored resume + cover letter and save both to JSON.
    (This step is independent of PDF generation.)
    """
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    packets = []
    for job in top_jobs:
        print(f"\n🧩 Building application packet for: {job['title']} at {job['company']}")
        tailored_resume = generate_tailored_resume(resume_text, job.get("description", ""))
        cover_letter = generate_cover_letter(
            job_title=job["title"],
            company=job["company"],
            description=job.get("description", ""),
            tailored_resume=tailored_resume
        )
        packets.append({
            "job_title": job["title"],
            "company": job["company"],
            "link": job["link"],
            "score": job["score"],
            "description": job.get("description", ""),
            "tailored_resume": tailored_resume,
            "cover_letter": cover_letter
        })

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(packets, f, indent=4)

    print(f"\n✅ Application packets (resume + cover letter) saved to: {save_path}")
    return packets


if __name__ == "__main__":
    # 0) Extract candidate profile dynamically from the user's resume
    #    (we reuse resume_matcher.load_resume to read data/sample_resume.txt)
    from agents.resume_matcher import load_resume
    base_resume_text = load_resume()
    candidate_profile = extract_candidate_profile(base_resume_text)
    # (optional) Persist for reuse/inspection
    save_profile_to_json(candidate_profile)
    print("✅ Candidate profile extracted and saved to data/candidate_profile.json")
    # You can also print it if you want:
    # print(candidate_profile)

    # 1) Scrape jobs
    jobs = scrape_himalayas_jobs()
    if not jobs:
        print("❌ No jobs scraped. Exiting...")
        raise SystemExit

    # 2) Match resume to jobs
    matched_jobs = match_resume_to_top_jobs(base_resume_text, jobs)
    if not matched_jobs:
        print("❌ No matches found. Exiting...")
        raise SystemExit

    # 3) Pick top 3
    top_3_jobs = matched_jobs[:3]

    # 4) Tailor & save JSON (returns items)
    tailored_items = save_top_resumes(top_3_jobs, base_resume_text)

    # 5) STRUCTURIZE each tailored resume → add to items + save a structured JSON for audit
    structured_items = []
    for it in tailored_items:
        s = structurize_tailored_resume(it["tailored_resume"], it["job_title"], it["company"])
        structured_items.append({**it, "structured": s})
    os.makedirs("data", exist_ok=True)
    with open("data/top_matched_resumes_structured.json", "w", encoding="utf-8") as f:
        json.dump(structured_items, f, indent=2)
    print("✅ Structured resumes saved to: data/top_matched_resumes_structured.json")

    # 6) PDFs from the fresh structured items — generate BOTH (classic + teal)
    print("\n🔎 Checking PDF formatter availability...")
    if format_resumes_pdf is None:
        print("⚠️  Skipping PDF formatting (formatter not available).")
        print("   Run: python -m pip install reportlab python-slugify")
        print("   Then re-run: python main.py")
    else:
        try:
            print("🖨️  Formatting tailored resumes to PDF (classic + teal)…")
            # pass the dynamically extracted candidate profile
            format_resumes_pdf(structured_items, candidate=candidate_profile, both=True)
            print("✅ PDFs generated in outputs/resumes/")
        except Exception as e:
            print(f"❌ PDF formatting failed: {e}")

    # 7) (optional) cover-letter packets JSON
    save_top_application_packets(top_3_jobs, base_resume_text)
