import os
from typing import Dict
import json
import re
import html
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem

from backend.config import get_settings


def _safe_text(value: object) -> str:
    return html.escape(str(value if value is not None else ""))


def _normalise_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _parse_jsonish(text: str):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    try:
        return json.loads(cleaned)
    except Exception:
        return None


def generate_notes_pdf(video_id: str, notes: Dict, summary: str = "", transcript: str = "") -> str:
    """
    Render structured notes into a clean, printable PDF and return the file path.
    """
    settings = get_settings()
    os.makedirs(settings.pdf_output_dir, exist_ok=True)

    safe_video_id = "".join(ch for ch in video_id if ch.isalnum() or ch in ("-", "_"))[:40]
    filename = f"{safe_video_id}_notes.pdf"
    pdf_path = os.path.join(settings.pdf_output_dir, filename)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=notes.get("title", "Study Notes"),
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        textColor=colors.HexColor("#0f172a"),
        fontSize=24,
        leading=28,
        spaceAfter=10,
    )
    meta_style = ParagraphStyle(
        "Meta",
        parent=styles["BodyText"],
        textColor=colors.HexColor("#64748b"),
        fontSize=9,
        leading=12,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "Heading",
        parent=styles["Heading2"],
        spaceBefore=14,
        spaceAfter=6,
        textColor=colors.HexColor("#0f172a"),
        fontSize=14,
        leading=18,
    )
    subheading_style = ParagraphStyle(
        "SubHeading",
        parent=styles["Heading3"],
        textColor=colors.HexColor("#1e293b"),
        fontSize=11,
        leading=14,
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        textColor=colors.HexColor("#1e293b"),
        fontSize=10.5,
        leading=15,
        spaceAfter=7,
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=styles["BodyText"],
        leftIndent=12,
        textColor=colors.HexColor("#1e293b"),
        fontSize=10,
        leading=14,
        spaceAfter=4,
    )

    story = []

    # Title
    story.append(Paragraph(_safe_text(notes.get("title", "Study Notes")), title_style))
    story.append(
        Paragraph(
            _safe_text(f"Video ID: {video_id}  |  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}"),
            meta_style,
        )
    )

    # Section 1 — Video Summary
    story.append(Paragraph("SECTION 1 — VIDEO SUMMARY", heading_style))
    summary_text = (summary or notes.get("overview", "") or "").strip()
    if summary_text:
        bullets = [line.strip() for line in re.split(r"(?:\n+|(?<=[.!?])\s+)", summary_text) if line.strip()]
        bullets = bullets[:10] if bullets else []
        if bullets:
            items = [ListItem(Paragraph(_safe_text(item), bullet_style)) for item in bullets]
            story.append(ListFlowable(items, bulletType="bullet"))
        else:
            story.append(Paragraph(_safe_text(summary_text), body_style))
    else:
        story.append(Paragraph("No summary available.", body_style))

    # Section 2 — Detailed Notes
    story.append(Paragraph("SECTION 2 — DETAILED NOTES", heading_style))

    # Overview
    story.append(Paragraph("Overview", subheading_style))
    overview = str(notes.get("overview", "")).strip()
    if overview:
        for paragraph in overview.split("\n\n"):
            if paragraph.strip():
                story.append(Paragraph(_safe_text(paragraph.strip()), body_style))
    else:
        story.append(Paragraph("No overview available.", body_style))

    # Main concepts
    main_concepts = _normalise_list(notes.get("main_concepts", []))
    if main_concepts:
        story.append(Paragraph("Main Concepts", subheading_style))
        items = [ListItem(Paragraph(_safe_text(item), bullet_style)) for item in main_concepts]
        story.append(ListFlowable(items, bulletType="bullet"))

    # Detailed explanation
    detailed = notes.get("detailed_explanation", "")
    if detailed:
        story.append(Paragraph("Detailed Explanation", subheading_style))
        structured = detailed if isinstance(detailed, dict) else _parse_jsonish(str(detailed))
        if isinstance(structured, dict):
            for topic, content in structured.items():
                story.append(Paragraph(_safe_text(str(topic).replace("_", " ").title()), subheading_style))
                if isinstance(content, dict):
                    description = content.get("description")
                    if description:
                        story.append(Paragraph(_safe_text(description), body_style))
                    resources = content.get("resources", [])
                    if resources:
                        resource_lines = []
                        for resource in resources:
                            if isinstance(resource, dict):
                                name = resource.get("name") or resource.get("title") or "Resource"
                                url = resource.get("url")
                                resource_lines.append(f"{name}: {url}" if url else str(name))
                            else:
                                resource_lines.append(str(resource))
                        items = [ListItem(Paragraph(_safe_text(line), bullet_style)) for line in resource_lines if line.strip()]
                        if items:
                            story.append(ListFlowable(items, bulletType="bullet"))
                    for key, value in content.items():
                        if key in {"description", "resources"}:
                            continue
                        line = f"{str(key).replace('_', ' ').title()}: {value}"
                        story.append(Paragraph(_safe_text(line), body_style))
                elif isinstance(content, list):
                    items = [ListItem(Paragraph(_safe_text(item), bullet_style)) for item in content]
                    if items:
                        story.append(ListFlowable(items, bulletType="bullet"))
                else:
                    story.append(Paragraph(_safe_text(content), body_style))
        else:
            for paragraph in str(detailed).split("\n\n"):
                if paragraph.strip():
                    story.append(Paragraph(_safe_text(paragraph.strip()), body_style))

    # Examples
    examples = _normalise_list(notes.get("examples", []))
    if examples:
        story.append(Paragraph("Examples", subheading_style))
        items = [ListItem(Paragraph(_safe_text(example), bullet_style)) for example in examples]
        story.append(ListFlowable(items, bulletType="bullet"))

    # Key takeaways
    key_takeaways = _normalise_list(notes.get("key_takeaways", []))
    if key_takeaways:
        story.append(Paragraph("Key Takeaways", subheading_style))
        items = [ListItem(Paragraph(_safe_text(point), bullet_style)) for point in key_takeaways]
        story.append(ListFlowable(items, bulletType="bullet"))

    # Section 3 — Full Transcript
    story.append(Paragraph("SECTION 3 — FULL TRANSCRIPT", heading_style))
    transcript_text = (transcript or "").strip()
    if transcript_text:
        chunks = re.split(r"(?<=[.!?])\s+", transcript_text)
        buffer: list[str] = []
        current_len = 0
        for sentence in chunks:
            if current_len + len(sentence) > 700 and buffer:
                story.append(Paragraph(_safe_text(" ".join(buffer)), body_style))
                buffer = []
                current_len = 0
            buffer.append(sentence)
            current_len += len(sentence)
        if buffer:
            story.append(Paragraph(_safe_text(" ".join(buffer)), body_style))
    else:
        story.append(Paragraph("Transcript not available.", body_style))

    doc.build(story)
    return pdf_path

