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


def main() -> int:
    practices_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PRACTICES_DIR
    pdf_explanations = load_pdf_explanations(practices_dir)
    questions_data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

    exact_match = []
    similar_match = []
    needs_update = []
    missing_in_questions = []
    pdf_not_in_questions = []
    no_pdf_match = []
    generic_in_questions = []

    seen_pdf_keys = set()

    for section in questions_data["sections"]:
        for question in section["questions"]:
            answers = question.get("answer")
            if not isinstance(answers, list):
                answers = [answers]

            question_explanation = re.sub(r"\s+", " ", (question.get("explanation") or "").strip())
            matched_pdf = None

            for answer in answers:
                key = normalize(answer)
                if key in pdf_explanations:
                    matched_pdf = pdf_explanations[key]
                    seen_pdf_keys.add(key)
                    break

            if not matched_pdf:
                if not question_explanation or is_generic_explanation(question_explanation):
                    no_pdf_match.append(
                        {
                            "id": question["id"],
                            "answer": answers[0] if len(answers) == 1 else answers,
                            "issue": "missing_or_generic_explanation",
                            "explanation": question_explanation[:120],
                        }
                    )
                continue

            pdf_expl = matched_pdf["explanation"]
            entry = {
                "id": question["id"],
                "answer": answers[0] if len(answers) == 1 else answers,
                "pdfSource": matched_pdf["source"],
                "questionExplanation": question_explanation[:160],
                "pdfExplanation": pdf_expl[:160],
            }

            if not question_explanation:
                missing_in_questions.append({**entry, "issue": "empty"})
                continue

            if normalize(question_explanation) == normalize(pdf_expl):
                exact_match.append(question["id"])
                continue

            similarity = explanation_similarity(question_explanation, pdf_expl)
            if similarity >= 0.72:
                similar_match.append({**entry, "similarity": round(similarity, 2)})
            elif is_generic_explanation(question_explanation):
                needs_update.append({**entry, "issue": "generic_question_explanation", "similarity": round(similarity, 2)})
            else:
                needs_update.append({**entry, "issue": "different_explanation", "similarity": round(similarity, 2)})

    for key, pdf_entry in pdf_explanations.items():
        if key not in seen_pdf_keys:
            pdf_not_in_questions.append(
                {
                    "answer": pdf_entry["answer"],
                    "source": pdf_entry["source"],
                    "explanation": pdf_entry["explanation"][:120],
                }
            )

    result = {
        "pdfAnswerExplanations": len(pdf_explanations),
        "questionsTotal": sum(len(section["questions"]) for section in questions_data["sections"]),
        "matchedToPdf": len(exact_match) + len(similar_match) + len(needs_update) + len(missing_in_questions),
        "exactMatch": len(exact_match),
        "similarMatch": len(similar_match),
        "needsUpdate": len(needs_update),
        "missingExplanation": len(missing_in_questions),
        "noPdfMatch": len(no_pdf_match),
        "pdfAnswersNotInQuestions": len(pdf_not_in_questions),
        "recommendation": (
            "Update questions"
            if needs_update or missing_in_questions
            else "Questions already align with PDF explanations for matched items"
        ),
        "samples": {
            "needsUpdate": needs_update[:15],
            "missingExplanation": missing_in_questions[:10],
            "similarMatch": similar_match[:5],
            "pdfAnswersNotInQuestions": pdf_not_in_questions[:10],
            "noPdfMatch": no_pdf_match[:10],
        },
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
