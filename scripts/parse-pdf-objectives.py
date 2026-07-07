#!/usr/bin/env python3
"""Extract exam objective terms from the SY0-701 objectives PDF."""
import json
import re
from pathlib import Path

from pypdf import PdfReader

REPO_ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = REPO_ROOT / "scripts" / "CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf"
OUTPUT_PATH = REPO_ROOT / "scripts" / "pdf-objectives-terms.json"


def clean_line(line: str) -> str:
    line = line.replace("\u00a0", " ").strip()
    line = re.sub(r"\s+", " ", line)
    return line


def is_noise(line: str) -> bool:
    if not line:
        return True
    if "Copyright" in line and "CompTIA" in line:
        return True
    if line.startswith("CompTIA Security+"):
        return True
    if re.fullmatch(r"\d\.\d", line):
        return True
    if re.fullmatch(r"\d\.\d\s+\d\.\d", line):
        return True
    if re.fullmatch(r"\d\.0\s*\|\s*.+", line):
        return True
    if re.fullmatch(r"\d\.0\s+.+", line) and "%" in line:
        return True
    return False


def extract_terms(text: str) -> list[dict]:
    lines = [clean_line(line) for line in text.split("\n")]
    terms: list[dict] = []
    current_domain = ""
    current_section = ""
    current_subsection = ""

    bullet_prefixes = ("•", "·", "-", "o", "○")

    for raw in lines:
        if is_noise(raw):
            continue

        domain_match = re.match(r"^(\d\.0)\s+([^|]+?)(?:\s+\d+%)?$", raw)
        if domain_match and "%" not in raw and len(domain_match.group(2)) > 8:
            current_domain = f"{domain_match.group(1)} {domain_match.group(2).strip()}"
            current_section = ""
            current_subsection = ""
            continue

        section_match = re.match(
            r"^(\d\.\d)\s+(.+)$",
            raw,
        )
        if section_match and not raw.startswith("•"):
            current_section = section_match.group(2).strip()
            current_subsection = ""
            continue

        if raw.startswith(bullet_prefixes):
            term = raw.lstrip("•·-o○ ").strip()
            if not term or len(term) < 2:
                continue
            if term.endswith(":"):
                current_subsection = term.rstrip(":")
                continue
            terms.append(
                {
                    "term": term,
                    "domain": current_domain,
                    "section": current_section,
                    "subsection": current_subsection,
                }
            )

    return terms


def dedupe_terms(terms: list[dict]) -> list[dict]:
    seen: set[str] = set()
    unique: list[dict] = []
    for entry in terms:
        key = entry["term"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(entry)
    return unique


def main() -> int:
    text = "\n".join((page.extract_text() or "") for page in PdfReader(str(PDF_PATH)).pages)
    terms = dedupe_terms(extract_terms(text))
    OUTPUT_PATH.write_text(json.dumps(terms, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "terms": len(terms),
                "output": str(OUTPUT_PATH),
                "samples": terms[:20],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
