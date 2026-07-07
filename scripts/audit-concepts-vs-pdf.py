#!/usr/bin/env python3
import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = REPO_ROOT / "scripts" / "CompTIA-Security-Plus-SY0-701-Exam-Objectives.pdf"
CONCEPTS_PATH = REPO_ROOT / "public" / "concepts.json"


def load_pdf_structure() -> list[dict]:
    from pypdf import PdfReader

    text = "\n".join((page.extract_text() or "") for page in PdfReader(str(PDF_PATH)).pages)
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    domains: list[dict] = []
    current_domain = None
    current_sub = None

    for line in lines:
        domain_match = re.match(r"^(\d\.0)\s+(.+)$", line)
        if domain_match:
            current_domain = {
                "id": domain_match.group(1),
                "name": domain_match.group(2),
                "subs": [],
            }
            domains.append(current_domain)
            current_sub = None
            continue

        sub_match = re.match(r"^(\d\.\d)\s+(.+)$", line)
        if sub_match and current_domain:
            current_sub = {
                "id": sub_match.group(1),
                "name": sub_match.group(2),
                "objectives": [],
                "examples": [],
            }
            current_domain["subs"].append(current_sub)
            continue

        objective_match = re.match(r"^(\d\.\d\.\d)\s+(.+)$", line)
        if objective_match and current_sub:
            current_sub["objectives"].append(
                {"id": objective_match.group(1), "text": objective_match.group(2)}
            )
            continue

        if current_sub and line.startswith("•"):
            current_sub["examples"].append(line.lstrip("• ").strip())

    return domains


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def main() -> int:
    domains = load_pdf_structure()
    concepts = json.loads(CONCEPTS_PATH.read_text(encoding="utf-8"))

    pdf_subs = []
    for domain in domains:
        for sub in domain["subs"]:
            pdf_subs.append(
                {
                    "domain": f"{domain['id']} {domain['name']}",
                    "id": sub["id"],
                    "name": sub["name"],
                    "objective_count": len(sub["objectives"]),
                    "example_count": len(sub["examples"]),
                    "objectives": sub["objectives"],
                    "examples": sub["examples"],
                }
            )

    concept_paths = {normalize(topic["path"]): topic for topic in concepts["topics"]}
    concept_path_keys = set(concept_paths)

    missing_topics = []
    for sub in pdf_subs:
        name_norm = normalize(sub["name"])
        path_candidates = [
            name_norm,
            normalize(f"{sub['name']} > Categories"),
            normalize(f"{sub['name']} > Control types"),
        ]
        if not any(candidate in concept_path_keys for candidate in path_candidates):
            matched = any(name_norm in path or path in name_norm for path in concept_path_keys)
            if not matched:
                missing_topics.append(sub)

    boilerplate_terms = []
    for topic in concepts["topics"]:
        for term in topic["terms"]:
            explanation = term.get("explanation", "")
            if any(
                marker in explanation
                for marker in (
                    "Study concept:",
                    "For Security+",
                    "connect this term",
                    "connect it to this topic focus",
                )
            ):
                boilerplate_terms.append(
                    {"topic": topic["path"], "term": term["term"], "explanation": explanation[:120]}
                )

    print(
        json.dumps(
            {
                "pdfDomains": len(domains),
                "pdfSubtopics": len(pdf_subs),
                "conceptTopics": len(concepts["topics"]),
                "conceptTerms": sum(len(topic["terms"]) for topic in concepts["topics"]),
                "boilerplateExplanations": len(boilerplate_terms),
                "missingPdfSubtopics": len(missing_topics),
                "samples": {
                    "missingPdfSubtopics": missing_topics[:20],
                    "pdfSubtopics": [
                        {"id": sub["id"], "name": sub["name"], "examples": sub["examples"][:8]}
                        for sub in pdf_subs[:15]
                    ],
                    "boilerplateTerms": boilerplate_terms[:10],
                },
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
