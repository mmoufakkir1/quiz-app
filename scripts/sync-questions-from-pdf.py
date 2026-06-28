#!/usr/bin/env python3
import importlib.util
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = REPO_ROOT / "public" / "questions.json"
SYNC_SCRIPT = REPO_ROOT / "scripts" / "sync-flashcards-from-pdf.py"

spec = importlib.util.spec_from_file_location("sync_pdf", SYNC_SCRIPT)
sync_pdf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync_pdf)

DEFAULT_PRACTICES_DIR = sync_pdf.DEFAULT_PRACTICES_DIR
load_pdf_explanations = sync_pdf.load_pdf_explanations
normalize = sync_pdf.normalize


def is_generic_explanation(explanation: str) -> bool:
    value = explanation.strip()
    if not value:
        return True
    if re.search(r" is the command used to choose", value, re.I):
        return True
    if re.fullmatch(r"The .+ (?:Nmap option|command) is correct because it performs .+", value, re.I):
        return True
    if value.startswith("This is ") and "important detail is" not in value:
        return True
    return False


def explanation_similarity(a: str, b: str) -> float:
    a_words = set(normalize(a).split())
    b_words = set(normalize(b).split())
    if not a_words or not b_words:
        return 0.0
    return len(a_words & b_words) / len(a_words | b_words)


def question_context(question: dict) -> str:
    parts = [
        question.get("question") or "",
        question.get("scenario") or "",
        " ".join(question.get("options") or []),
    ]
    return normalize(" ".join(parts))


def should_skip_update(question: dict, current: str, pdf: str, similarity: float) -> str | None:
    if similarity >= 0.72:
        return "already_similar"

    if normalize(current) == normalize(pdf):
        return "already_equal"

    answers = question.get("answer")
    if not isinstance(answers, list):
        answers = [answers]

    pdf_lower = pdf.lower()
    context = question_context(question)

    if any(normalize(answer) in {"denial of service"} for answer in answers):
        if "multiple compromised machines" in pdf_lower:
            if any(
                token in context
                for token in (
                    "load balanc",
                    "cluster",
                    "high availability",
                    "slow file access",
                    "resource consumption",
                    "resource inaccessibility",
                )
            ):
                return "pdf_describes_ddos_for_dos_question"

    context_words = {
        word
        for word in context.split()
        if len(word) > 5 and word not in {"which", "following", "select", "scenario", "question"}
    }
    current_words = set(normalize(current).split())
    pdf_words = set(normalize(pdf).split())
    scenario_terms_in_current = context_words & current_words
    scenario_terms_missing_in_pdf = scenario_terms_in_current - pdf_words

    if (
        len(scenario_terms_missing_in_pdf) >= 2
        and len(current) > len(pdf) * 0.75
        and similarity < 0.35
        and not is_generic_explanation(current)
    ):
        return "question_specific_explanation"

    return None


def find_pdf_match(answers: list, pdf_explanations: dict) -> dict | None:
    for answer in answers:
        key = normalize(answer)
        if key in pdf_explanations:
            return pdf_explanations[key]
    return None


def main() -> int:
    practices_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PRACTICES_DIR
    pdf_explanations = load_pdf_explanations(practices_dir)
    questions_data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

    updated = []
    skipped = []
    filled_empty = []

    for section in questions_data["sections"]:
        for question in section["questions"]:
            answers = question.get("answer")
            if not isinstance(answers, list):
                answers = [answers]

            matched_pdf = find_pdf_match(answers, pdf_explanations)
            if not matched_pdf:
                continue

            pdf_expl = re.sub(r"\s+", " ", matched_pdf["explanation"]).strip()
            current = re.sub(r"\s+", " ", (question.get("explanation") or "")).strip()

            if not current:
                question["explanation"] = pdf_expl
                filled_empty.append(question["id"])
                continue

            similarity = explanation_similarity(current, pdf_expl)
            skip_reason = should_skip_update(question, current, pdf_expl, similarity)
            if skip_reason:
                skipped.append(
                    {
                        "id": question["id"],
                        "reason": skip_reason,
                        "similarity": round(similarity, 2),
                    }
                )
                continue

            question["explanation"] = pdf_expl
            updated.append(
                {
                    "id": question["id"],
                    "answer": answers[0] if len(answers) == 1 else answers,
                    "source": matched_pdf["source"],
                    "similarity": round(similarity, 2),
                }
            )

    QUESTIONS_PATH.write_text(
        f"{json.dumps(questions_data, indent=2, ensure_ascii=False)}\n",
        encoding="utf-8",
    )

    result = {
        "updated": len(updated),
        "skipped": len(skipped),
        "filledEmpty": len(filled_empty),
        "samples": {
            "updated": updated[:15],
            "skipped": skipped[:15],
            "filledEmpty": filled_empty[:10],
        },
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
