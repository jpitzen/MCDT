import html
import re
from pathlib import Path

INPUT_DIR = Path("DG_PROD")
OUTPUT_FILE = Path("DeploymentGuide.md")

ORDER = [
    "ZL_DG_202512162115.html",
    "ZL_DG_PHASE_0.html",
    "ZL_DG_PHASE_1.html",
    "ZL_DG_PHASE_2.html",
    "ZL_DG_PHASE_3.html",
    "ZL_DG_PHASE_4.html",
    "ZL_DG_PHASE_5.html",
    "ZL_DG_PHASE_6.html",
    "ZL_DG_PHASE_7.html",
    "ZL_DG_PHASE_8.html",
    "ZL_DG_PHASE_9.html",
    "ZL_DG_PHASE_10.html",
    "ZL_DG_PHASE_11.html",
    "ZL_DG_PHASE_12.html",
    "ZL_DG_PHASE_13.html",
    "ZL_DG_TROUBLESHOOTING.html",
    "ZL_DG_APPENDIX_A.html",
    "ZL_DG_APPENDIX_B.html",
    "ZL_DG_APPENDIX_C.html",
    "ZL_DG_APPENDIX_D.html",
    "ZL_DG_APPENDIX_E.html",
    "ZL_DG_APPENDIX_F.html",
]


def strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)


def extract_summary(text: str) -> str:
    match = re.search(r'<div class="page-content">.*?<p>(.*?)</p>', text, re.S)
    if match:
        summary = strip_tags(match.group(1)).strip()
        return html.unescape(summary)
    return ""


def extract_header(text: str) -> str:
    match = re.search(r'<div class="page-header">.*?<h1>(.*?)</h1>', text, re.S)
    if match:
        return html.unescape(strip_tags(match.group(1)).strip())
    match = re.search(r'<h1>(.*?)</h1>', text, re.S)
    if match:
        return html.unescape(strip_tags(match.group(1)).strip())
    return ""


def extract_steps(text: str) -> list[str]:
    keyword = "const stepData = {"
    start = text.find(keyword)
    if start == -1:
        return []
    i = start + len(keyword)
    brace_level = 1
    in_quote = None
    escape = False
    while i < len(text) and brace_level > 0:
        char = text[i]
        if escape:
            escape = False
        elif char == "\\":
            escape = True
        elif in_quote:
            if char == in_quote:
                if text[i - 1] != "\\":
                    in_quote = None
        elif char in ("'", '"', "`"):
            in_quote = char
        elif char == "{":
            brace_level += 1
        elif char == "}":
            brace_level -= 1
        i += 1
    block = text[start + len(keyword): i - 1]
    titles = [match[1].strip() for match in re.findall(r"title:\s*(['\"])(.*?)\1", block, re.S)]
    return [html.unescape(title) for title in titles]


def main() -> None:
    sections = []
    for index, file_name in enumerate(ORDER):
        path = INPUT_DIR / file_name
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        header = extract_header(text) or file_name
        summary = extract_summary(text)
        steps = extract_steps(text)
        sections.append({
            "file": file_name,
            "header": header,
            "summary": summary,
            "steps": steps,
            "index": index,
        })

    lines = [
        "# ZL AWS EKS Deployment Guide",
        "",
        "This consolidated reference mirrors every phase, step, and appendix available in the original static HTML guide stored under `DG_PROD`. Each section references the source HTML so you can dive into the interactive experience if needed.",
        "",
    ]

    if sections:
        overview = sections[0]
        lines += ["## Overview", "", overview["summary"] or "", "", f"**Path:** DG_PROD/{overview['file']}", ""]

    for section in sections[1:]:
        lines.append(f"## {section['header']}")
        if section['summary']:
            lines.append("")
            lines.append(section['summary'])
        lines.append("")
        if section['steps']:
            lines.append("**Steps**")
            lines.append("")
            for idx, step in enumerate(section['steps'], start=1):
                lines.append(f"{idx}. {step}")
        else:
            lines.append("*This page does not use the guided step structure; refer to the source for full context.*")
        lines.append("")
        lines.append(f"**Source:** [DG_PROD/{section['file']}](DG_PROD/{section['file']})")
        lines.append("")

    OUTPUT_FILE.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
