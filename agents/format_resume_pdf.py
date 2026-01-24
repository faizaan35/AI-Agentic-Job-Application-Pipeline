"""
format_resume_pdf.py
--------------------
Renders ATS-friendly resume PDFs from either:
  - structured items (preferred): item["structured"]
  - unstructured text: item["tailored_resume"] (heuristic fallback)

Variants:
  - classic : clean single–column (no cover)
  - teal    : cover page + colored accents + chips, single–column (stable)

Use from main.py:
  format_resumes_pdf(items, candidate=PROFILE, both=True)    # both styles
  format_resumes_pdf(items, candidate=PROFILE, variant="teal")  # only teal

Deps:
  python -m pip install reportlab python-slugify
"""

import os, re, json
from datetime import datetime
from typing import Dict, List, Any, Optional
from slugify import slugify

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, SimpleDocTemplate,
    Paragraph, Spacer, HRFlowable, Table, TableStyle, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String

# ---------- paths ----------
INPUT_JSON = "data/top_matched_resumes.json"
CANDIDATE_JSON = "data/candidate_profile.json"
OUT_DIR = "outputs/resumes"

# ---------- fonts ----------
def safe_register_fonts():
    try:
        pdfmetrics.registerFont(TTFont("Inter", "Inter-Regular.ttf"))
        pdfmetrics.registerFont(TTFont("Inter-SemiBold", "Inter-SemiBold.ttf"))
        return {"base": "Inter", "bold": "Inter-SemiBold"}
    except Exception:
        return {"base": "Helvetica", "bold": "Helvetica-Bold"}
FONTS = safe_register_fonts()

# ---------- themes ----------
THEME_CLASSIC = {
    "muted":   "#5f6368",
    "rule":    "#E0E0E0",
    "chip_bg": "#EEF2F7",
    "chip_tx": "#111111",
}
THEME_TEAL = {
    "primary": "#0F766E",
    "text":    "#111111",
    "muted":   "#5f6368",
    "rule":    "#E5E7EB",
    "chip_bg": "#EEF2F7",
    "chip_tx": "#111111",
}

# ---------- styles ----------
def build_base_styles(theme):
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Name", fontName=FONTS["bold"], fontSize=22, leading=26, alignment=1, spaceAfter=6))
    styles.add(ParagraphStyle(name="HeaderLine", fontName=FONTS["base"], fontSize=10.5, leading=14,
                              textColor=colors.HexColor(theme.get("muted","#5f6368")), alignment=1, spaceAfter=10))
    styles.add(ParagraphStyle(name="SectionTitle", fontName=FONTS["bold"], fontSize=12, leading=16,
                              textColor=colors.black, spaceBefore=10, spaceAfter=4))
    styles.add(ParagraphStyle(name="Body", fontName=FONTS["base"], fontSize=10.5, leading=14.5,
                              textColor=colors.HexColor("#111111"), spaceAfter=4))
    styles.add(ParagraphStyle(name="Meta", fontName=FONTS["base"], fontSize=9.5, leading=12.5,
                              textColor=colors.HexColor(theme.get("muted","#5f6368")), spaceAfter=2))
    styles.add(ParagraphStyle(name="BulletItem", fontName=FONTS["base"], fontSize=10.5, leading=14.5,
                              leftIndent=12, bulletIndent=0, bulletFontName=FONTS["bold"], bulletFontSize=8.5, spaceAfter=1.5))
    # Cover only (teal)
    styles.add(ParagraphStyle(name="CoverName", fontName=FONTS["bold"], fontSize=28, leading=32,
                              alignment=1, textColor=colors.HexColor(THEME_TEAL["text"]), spaceAfter=6))
    styles.add(ParagraphStyle(name="CoverSub", fontName=FONTS["base"], fontSize=12, leading=16,
                              alignment=1, textColor=colors.HexColor(THEME_TEAL["muted"]), spaceAfter=12))
    styles.add(ParagraphStyle(name="CoverTarget", fontName=FONTS["base"], fontSize=11.5, leading=15,
                              alignment=1, textColor=colors.HexColor(THEME_TEAL["text"]), spaceAfter=16))
    styles.add(ParagraphStyle(name="CoverContact", fontName=FONTS["base"], fontSize=10.5, leading=14,
                              alignment=1, textColor=colors.HexColor(THEME_TEAL["muted"]), spaceAfter=18))
    styles.add(ParagraphStyle(name="CoverDate", fontName=FONTS["base"], fontSize=9.2, leading=12,
                              alignment=1, textColor=colors.HexColor(THEME_TEAL["muted"]), spaceAfter=0))
    return styles

STYLES_CLASSIC = build_base_styles(THEME_CLASSIC)
STYLES_TEAL    = build_base_styles(THEME_TEAL)

# ---------- candidate header ----------
def load_candidate_header(candidate_override: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    default = {
        "name": "YOUR NAME",
        "headline": "",
        "location": "",
        "email": "",
        "phone": "",
        "linkedin": "",
        # optional for teal chips:
        "top_skills": ""
    }
    if os.path.exists(CANDIDATE_JSON):
        try:
            with open(CANDIDATE_JSON, "r", encoding="utf-8") as f:
                j = json.load(f)
            for k, v in j.items():
                if isinstance(v, str) and v.strip():
                    default[k] = v.strip()
        except Exception:
            pass
    env_map = {
        "name":"CANDIDATE_NAME","headline":"CANDIDATE_HEADLINE","location":"CANDIDATE_LOCATION",
        "email":"CANDIDATE_EMAIL","phone":"CANDIDATE_PHONE","linkedin":"CANDIDATE_LINKEDIN",
        "top_skills":"CANDIDATE_TOP_SKILLS",
    }
    for k, envk in env_map.items():
        if os.getenv(envk):
            default[k] = os.getenv(envk).strip()
    if candidate_override:
        for k, v in candidate_override.items():
            if isinstance(v, str) and v.strip():
                default[k] = v.strip()
    # drop placeholders in header display
    for k in ["headline","location","email","phone","linkedin"]:
        if default[k].lower() in ["city, country","you@email.com","+91-00000-00000","linkedin.com/in/your-profile"]:
            default[k] = ""
    return default

def header_line(data: Dict[str, str]) -> str:
    parts = [data.get("location",""), data.get("email",""), data.get("phone",""), data.get("linkedin","")]
    return "  •  ".join([p for p in parts if p])

# ---------- heuristic fallback parser ----------
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
SECTION_HINTS = [
    "professional summary","summary","profile","objective",
    "work experience","experience","professional experience",
    "projects","project experience","education","academics",
    "skills","technical skills","key skills","certifications","awards","achievements",
]
SECTION_RE = re.compile(r"^\s*(?P<hdr>(?:%s))\s*:?\s*$" % "|".join([re.escape(h) for h in SECTION_HINTS]), re.IGNORECASE)

def strip_markdown(text: str) -> str:
    text = MD_LINK_RE.sub(r"\1", text)
    text = re.sub(r"(\*\*|__|\*|`)", "", text)
    return text
def normalize_bullets(text: str) -> str:
    return (text.replace("•","-").replace("·","-").replace("‣","-").replace("–","-").replace("\t"," "))
def split_lines(text: str) -> List[str]:
    text = strip_markdown(text)
    return [ln.strip() for ln in normalize_bullets(text).splitlines()]

def naive_section_parse(tailored_resume: str) -> List[Dict[str, Any]]:
    lines = split_lines(tailored_resume)
    sections, cur = [], {"title": None, "buf": []}
    def flush():
        if cur["title"] or cur["buf"]:
            text_block = "\n".join(cur["buf"]).strip()
            paras = [p.strip() for p in re.split(r"\n\s*\n", text_block) if p.strip()]
            bullets, kept = [], []
            for p in paras:
                if p.lstrip().startswith(("-", "*")):
                    bullets.extend([b.strip(" -*") for b in p.split("\n") if b.strip()])
                else:
                    kept.append(p)
            sections.append({"title": (cur["title"] or "Professional Summary").title(),
                             "paragraphs": kept,
                             "bullets": [b.lstrip("- ").strip() for b in cur["buf"] if b.lstrip().startswith(("-", "*"))] + bullets})
    for ln in lines:
        m = SECTION_RE.match(ln)
        if m:
            flush(); cur = {"title": m.group("hdr"), "buf": []}
        else:
            cur["buf"].append(ln)
    flush()
    if len(sections) == 1 and sections[0]["title"].lower() != "professional summary":
        sections[0]["title"] = "Professional Summary"
    return sections

def _filter_contact_noise(lines: List[str], candidate: Dict[str, str]) -> List[str]:
    out = []
    cname = candidate.get("name","").lower()
    for t in lines:
        lt = t.lower()
        if ("email" in lt or "phone" in lt or "linkedin" in lt or "mailto:" in lt or "@"
            in lt or lt.startswith("contact information") or lt.startswith("optimized resume")
            or (cname and cname in lt)):
            continue
        out.append(t)
    return out

# ---------- small UI helpers ----------
def chip(text, theme, w=0, h=16):
    pad = 6
    text = str(text)
    est_w = max(60, len(text)*5 + pad*2) if w == 0 else w
    d = Drawing(est_w, h)
    d.add(Rect(0, 0, est_w, h, fillColor=colors.HexColor(theme["chip_bg"]), strokeColor=None, rx=4, ry=4))
    d.add(String(pad, h*0.7, text, fontName=FONTS["base"], fontSize=8.8, fillColor=colors.HexColor(theme["chip_tx"])))
    return d

def chips_table(csv_line, theme):
    chips = [chip(x, theme) for x in [t.strip() for t in str(csv_line).split(",")] if x]
    if not chips: return None
    tbl = Table([chips], hAlign="CENTER")
    tbl.setStyle(TableStyle([
        ("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),2),
        ("BOTTOMPADDING",(0,0),(-1,-1),2),
    ]))
    return tbl

# ---------- classic renderer ----------
def story_classic_header(candidate, styles, theme):
    s = []
    s.append(Paragraph(candidate["name"].upper(), styles["Name"]))
    if candidate.get("headline"): s.append(Paragraph(candidate["headline"], styles["HeaderLine"]))
    contact = header_line(candidate)
    if contact: s.append(Paragraph(contact, styles["HeaderLine"]))
    s.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor(theme["rule"])))
    s.append(Spacer(1, 4))
    return s

def render_from_unstructured_classic(tailored_resume: str, candidate: Dict[str,str], styles, theme):
    story = story_classic_header(candidate, styles, theme)
    sections = naive_section_parse(tailored_resume)
    order = ["Professional Summary","Work Experience","Projects","Education","Skills","Certifications"]
    norm = {"Experience":"Work Experience","Professional Experience":"Work Experience","Profile":"Professional Summary",
            "Summary":"Professional Summary","Objective":"Professional Summary","Academic":"Education","Academics":"Education",
            "Technical Skills":"Skills","Key Skills":"Skills","Awards":"Certifications","Achievements":"Certifications","Project Experience":"Projects"}
    merged = {}
    for s in sections:
        t = norm.get(s["title"], s["title"])
        merged.setdefault(t, {"paragraphs": [], "bullets": []})
        merged[t]["paragraphs"] += s.get("paragraphs", [])
        merged[t]["bullets"] += s.get("bullets", [])
    for t in order:
        if t not in merged: continue
        paragraphs = _filter_contact_noise(merged[t]["paragraphs"], candidate)
        bullets = _filter_contact_noise(merged[t]["bullets"], candidate)
        if not paragraphs and not bullets: continue
        story.append(Paragraph(t.upper(), styles["SectionTitle"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor(theme["rule"])))
        story.append(Spacer(1, 4))
        for p in paragraphs: story.append(Paragraph(p.strip(), styles["Body"]))
        for b in bullets: story.append(Paragraph(b.strip(), styles["BulletItem"], bulletText="•"))
        story.append(Spacer(1, 6))
    return story

def render_from_structured_classic(s: Dict[str,Any], candidate: Dict[str,str], styles, theme):
    story = story_classic_header(candidate, styles, theme)
    if s.get("summary"):
        story.append(Paragraph("PROFESSIONAL SUMMARY", styles["SectionTitle"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor(theme["rule"])))
        story.append(Spacer(1, 4))
        story.append(Paragraph(s["summary"], styles["Body"]))
        story.append(Spacer(1, 6))
    if s.get("experience"):
        story.append(Paragraph("WORK EXPERIENCE", styles["SectionTitle"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor(theme["rule"])))
        story.append(Spacer(1, 4))
        for e in s["experience"]:
            title=e.get("title",""); company=e.get("company",""); loc=e.get("location","")
            start=e.get("start",""); end=e.get("end","")
            meta=" • ".join([x for x in [company, loc, f"{start} – {end}".strip(" –")] if x])
            if title: story.append(Paragraph(title, styles["Body"]))
            if meta:  story.append(Paragraph(meta, styles["Meta"]))
            for b in e.get("bullets",[]): story.append(Paragraph(b.strip(), styles["BulletItem"], bulletText="•"))
            story.append(Spacer(1,4))
        story.append(Spacer(1,2))
    if s.get("projects"):
        story.append(Paragraph("PROJECTS", styles["SectionTitle"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor(theme["rule"])))
        story.append(Spacer(1,4))
        for p in s["projects"]:
            heading=" • ".join([x for x in [p.get("name",""), p.get("role","")] if x])
            if heading: story.append(Paragraph(heading, styles["Body"]))
            for b in p.get("bullets",[]): story.append(Paragraph(b.strip(), styles["BulletItem"], bulletText="•"))
            story.append(Spacer(1,4))
    if s.get("education"):
        story.append(Paragraph("EDUCATION", styles["SectionTitle"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor(theme["rule"])))
        story.append(Spacer(1,4))
        for ed in s["education"]:
            heading=" • ".join([x for x in [ed.get("degree",""), ed.get("school",""), ed.get("year","")] if x])
            if heading: story.append(Paragraph(heading, styles["Body"]))
        story.append(Spacer(1,4))
    skills=s.get("skills",{})
    if any(skills.get(k) for k in ["technical","tools","soft"]):
        story.append(Paragraph("SKILLS", styles["SectionTitle"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor(theme["rule"])))
        story.append(Spacer(1,4))
        for cat in ["technical","tools","soft"]:
            items=skills.get(cat,[])
            if items: story.append(Paragraph(f"{cat.title()}: " + ", ".join(items), styles["Body"]))
        story.append(Spacer(1,4))
    certs=s.get("certifications",[])
    if certs:
        story.append(Paragraph("CERTIFICATIONS", styles["SectionTitle"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor(theme["rule"])))
        story.append(Spacer(1,4))
        for c in certs: story.append(Paragraph(str(c), styles["Body"]))
        story.append(Spacer(1,4))
    return story

# ---------- teal renderer (stable: cover + single-column body) ----------
def cover_page_teal(candidate, styles):
    s=[]
    s.append(Spacer(1, 1.0*inch))
    s.append(Paragraph(candidate["name"].upper(), styles["CoverName"]))
    if candidate.get("headline"):
        s.append(Paragraph(candidate["headline"], styles["CoverSub"]))
    target = candidate.get("target","")
    if target:
        s.append(Paragraph(target, styles["CoverTarget"]))
    contact = header_line(candidate)
    if contact:
        s.append(Paragraph(contact, styles["CoverContact"]))
    s.append(HRFlowable(width="60%", thickness=2.0, color=colors.HexColor(THEME_TEAL["primary"]),
                        spaceBefore=6, spaceAfter=24))
    if candidate.get("top_skills"):
        tbl = chips_table(candidate["top_skills"], THEME_TEAL)
        if tbl: s.append(tbl); s.append(Spacer(1, 18))
    s.append(Spacer(1, 0.5*inch))
    s.append(Paragraph(datetime.utcnow().strftime("Updated %Y-%m-%d"), styles["CoverDate"]))
    return s

def build_doc_variant(output_path, variant):
    left, right, top, bottom = 0.75*inch, 0.75*inch, 0.75*inch, 0.7*inch
    if variant == "teal":
        # single-column BaseDocTemplate (stable)
        frame = Frame(left, bottom, LETTER[0]-left-right, LETTER[1]-top-bottom, id="F1")
        template = PageTemplate(id="onecol", frames=[frame], onPage=on_page)
        return BaseDocTemplate(output_path, pagesize=LETTER, leftMargin=left, rightMargin=right,
                               topMargin=top, bottomMargin=bottom, pageTemplates=[template])
    else:
        # classic uses SimpleDocTemplate
        return SimpleDocTemplate(output_path, pagesize=LETTER,
                                 leftMargin=left, rightMargin=right, topMargin=top, bottomMargin=bottom)

# ---------- footer ----------
def draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONTS["base"], 8.5)
    canvas.setFillColorRGB(0.45, 0.45, 0.45)
    canvas.drawRightString(7.75 * inch, 0.6 * inch, f"Page {doc.page}")
    canvas.restoreState()
def on_page(canvas, doc):
    draw_footer(canvas, doc)

# ---------- core render for one item + chosen variant ----------
def render_pdf_for_item(item: Dict[str, Any], candidate: Dict[str, str], variant: str):
    os.makedirs(OUT_DIR, exist_ok=True)
    job = item.get("job_title", "Role")
    company = item.get("company", "Company")

    suffix = "" if variant == "classic" else f"-{variant}"
    filename = f"{slugify(candidate['name'])}-{slugify(job)}-{slugify(company)}{suffix}.pdf"
    output_path = os.path.join(OUT_DIR, filename)

    styles = STYLES_TEAL if variant == "teal" else STYLES_CLASSIC
    theme  = THEME_TEAL if variant == "teal" else THEME_CLASSIC

    # optional: show target on teal cover
    cand_for_render = dict(candidate)
    cand_for_render["target"] = f"{job} @ {company}" if variant == "teal" else ""

    doc = build_doc_variant(output_path, variant)
    if hasattr(doc, "title"):  doc.title  = f"{candidate['name']} - {job} @ {company}"
    if hasattr(doc, "author"): doc.author = candidate["name"]

    story: List[Any] = []
    if variant == "teal":
        # cover first, then page break, then body
        story += cover_page_teal(cand_for_render, styles)
        story.append(PageBreak())

    structured = item.get("structured")
    if structured and isinstance(structured, dict):
        story += render_from_structured_classic(structured, cand_for_render, styles, theme)
    else:
        story += render_from_unstructured_classic(item.get("tailored_resume",""), cand_for_render, styles, theme)

    # build (note: BaseDocTemplate has onPage via PageTemplate; SimpleDocTemplate accepts onFirst/ onLater)
    if isinstance(doc, SimpleDocTemplate):
        doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    else:
        doc.build(story)
    return output_path

# ---------- public entry ----------
def main(items: Optional[List[Dict[str, Any]]] = None,
         candidate: Optional[Dict[str, str]] = None,
         variant: str = "classic",
         both: bool = False):
    """
    items: list of dicts (each contains job_title, company, and either structured or tailored_resume)
           if None, reads INPUT_JSON
    candidate: dict with name/headline/location/email/phone/linkedin (+ optional top_skills)
    variant: "classic" or "teal"
    both: if True, writes BOTH variants for each item
    """
    # load items if needed
    if items is None:
        if not os.path.exists(INPUT_JSON):
            print(f"❌ Missing input file: {INPUT_JSON}")
            return
        with open(INPUT_JSON, "r", encoding="utf-8") as f:
            items = json.load(f)

    cand = load_candidate_header(candidate_override=candidate)

    outputs: List[str] = []
    for it in items:
        try:
            if both:
                for v in ("classic","teal"):
                    out = render_pdf_for_item(it, cand, v)
                    print(f"✅ Wrote: {out}"); outputs.append(out)
            else:
                out = render_pdf_for_item(it, cand, variant)
                print(f"✅ Wrote: {out}"); outputs.append(out)
        except Exception as e:
            print(f"⚠️  Failed for {it.get('job_title','?')} @ {it.get('company','?')}: {e}")

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "_manifest.json"), "w", encoding="utf-8") as mf:
        json.dump({"generated_at": datetime.utcnow().isoformat(), "files": outputs}, mf, indent=2)
    print(f"\nDone. {len(outputs)} file(s) written.")

if __name__ == "__main__":
    main()
