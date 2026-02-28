from datetime import datetime, timezone

from fpdf import FPDF

from app.models.case import Case
from app.models.conversation import Conversation
from app.models.message import Message


def _collect_citations(messages: list[Message]) -> list[dict]:
    """Deduplicate citations across all messages, preserving order."""
    seen: set[tuple[str, int]] = set()
    citations: list[dict] = []
    for msg in messages:
        if msg.role != "assistant" or not isinstance(msg.citations, list):
            continue
        for c in msg.citations:
            key = (c.get("document_name", ""), c.get("source_index", 0))
            if key not in seen:
                seen.add(key)
                citations.append(c)
    return citations


def generate_markdown(
    conversation: Conversation, case: Case, messages: list[Message]
) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = []
    lines.append(f"# {conversation.title}")
    lines.append(f"**Case:** {case.name} | **Exported:** {now}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for msg in messages:
        label = "You" if msg.role == "user" else "CAISE"
        lines.append(f"**{label}:** {msg.content}")
        lines.append("")

    citations = _collect_citations(messages)
    if citations:
        lines.append("---")
        lines.append("")
        lines.append("## Citations")
        lines.append("")
        lines.append("| # | Document | Pages | Excerpt |")
        lines.append("|---|----------|-------|---------|")
        for c in citations:
            idx = c.get("source_index", "")
            doc = c.get("document_name", "")
            pages = ", ".join(str(p) for p in c.get("page_numbers", []))
            snippet = c.get("snippet", "")[:120].replace("|", "\\|").replace("\n", " ")
            lines.append(f"| {idx} | {doc} | {pages} | {snippet} |")
        lines.append("")

    return "\n".join(lines)


def generate_pdf(
    conversation: Conversation, case: Case, messages: list[Message]
) -> bytes:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Header
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, conversation.title, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f"Case: {case.name}  |  Exported: {now}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    pdf.ln(4)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # Messages
    for msg in messages:
        if msg.role == "user":
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 6, "You:", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(79, 70, 229)  # indigo-600
            pdf.cell(0, 6, "CAISE:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)

        pdf.set_font("Helvetica", "", 10)
        # Replace unsupported characters for the built-in font
        safe_content = msg.content.encode("latin-1", errors="replace").decode("latin-1")
        pdf.multi_cell(0, 5, safe_content)
        pdf.ln(4)

    # Citations table
    citations = _collect_citations(messages)
    if citations:
        pdf.ln(2)
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(6)

        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, "Citations", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        # Table header
        col_w = [12, 55, 25, 98]
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(241, 245, 249)  # slate-100
        pdf.cell(col_w[0], 7, "#", border=1, fill=True)
        pdf.cell(col_w[1], 7, "Document", border=1, fill=True)
        pdf.cell(col_w[2], 7, "Pages", border=1, fill=True)
        pdf.cell(col_w[3], 7, "Excerpt", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 8)
        for c in citations:
            idx = str(c.get("source_index", ""))
            doc = c.get("document_name", "")[:30]
            pages = ", ".join(str(p) for p in c.get("page_numbers", []))
            snippet = c.get("snippet", "")[:80].replace("\n", " ")
            safe_snippet = snippet.encode("latin-1", errors="replace").decode("latin-1")
            safe_doc = doc.encode("latin-1", errors="replace").decode("latin-1")

            pdf.cell(col_w[0], 6, idx, border=1)
            pdf.cell(col_w[1], 6, safe_doc, border=1)
            pdf.cell(col_w[2], 6, pages, border=1)
            pdf.cell(col_w[3], 6, safe_snippet, border=1, new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())
