import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def load_resume(path="data/sample_resume.txt"):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def load_jobs(path="data/sample_jobs.json"):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def match_resume_to_top_jobs(resume_text, jobs, top_n=3):
    job_texts = [(" ".join(job["tags"]) + " " + job.get("description", "")).lower() for job in jobs]
    documents = [resume_text.lower()] + job_texts

    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform(documents)

    resume_vector = vectors[0]
    job_vectors = vectors[1:]
    similarities = cosine_similarity(resume_vector, job_vectors).flatten()

    scored_jobs = []
    for i, score in enumerate(similarities):
        job = jobs[i]
        scored_jobs.append({
            "title": job["title"],
            "company": job["company"],
            "link": job["link"],
            "tags": job["tags"],
            "description": job["description"],
            "score": round(float(score), 2),
        })

    return sorted(scored_jobs, key=lambda x: x["score"], reverse=True)[:top_n]
