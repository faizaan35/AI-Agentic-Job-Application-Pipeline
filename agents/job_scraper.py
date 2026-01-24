import requests
import json
import os
from datetime import datetime

def scrape_himalayas_jobs(save_to='data/sample_jobs.json', max_jobs=10):
    url = f"https://himalayas.app/jobs/api?limit={max_jobs}&offset=0"

    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"❌ Failed to fetch jobs: {e}")
        return []

    data = response.json()
    raw_jobs = data.get("jobs", [])

    jobs = []
    for job in raw_jobs:
        jobs.append({
            "title": job.get("title", "N/A"),
            "company": job.get("companyName", "Unknown"),
            "link": job.get("applicationLink", ""),
            "tags": job.get("tags", []),
            "description": job.get("description", ""),
            "category": job.get("category", ""),
            "scraped_at": datetime.utcnow().isoformat()
        })

    os.makedirs(os.path.dirname(save_to), exist_ok=True)
    with open(save_to, 'w', encoding='utf-8') as f:
        json.dump(jobs, f, indent=4)

    print(f"✅ Scraped and saved {len(jobs)} jobs to {save_to}")
    return jobs
