#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

DEFAULT_PRACTICES_DIR = Path(
    r"C:\Users\mmouf\SynologyDrive\mo-personal\Projects\comptia-security++\cyberkraft\practices"
)
REPO_ROOT = Path(__file__).resolve().parents[1]
FLASHCARDS_PATH = REPO_ROOT / "public" / "flashcards.json"
QUESTIONS_PATH = REPO_ROOT / "public" / "questions.json"


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def clean_pdf_text(text: str) -> str:
    text = re.sub(r"Q\s+u\s+e\s+s\s+t\s+i\s+o\s+n", "Question", text)
    text = text.replace("\u00a0", " ")
    return text


def trim_explanation(explanation: str) -> str:
    explanation = re.split(
        r"Question\s+\d+|\d+\.\d+\s+Lesson Practice|Score:|Time Spent:|Mohammed Moufakkir",
        explanation,
    )[0]
    return re.sub(r"\s+", " ", explanation).strip()


def answer_block_from_context(context: str) -> str:
    question_marks = [match.start() for match in re.finditer(r"\?", context)]
    if question_marks:
        return context[question_marks[-1] + 1 :]
    return context[-2500:]


def extract_answers(block: str) -> list[str]:
    answers: list[str] = []
    block = answer_block_from_context(block)

    for match in re.finditer(
        r"(?:^|\n)([A-D])\s+(.+?)\s+(Correct|Incorrect)\s*(?:\n|$)",
        block,
        re.DOTALL,
    ):
        if match.group(3) == "Correct":
            answers.append(re.sub(r"\s+", " ", match.group(2).strip()))

    if not answers:
        for match in re.finditer(r"(?:^|\n)([^\n]+?)\s+Correct\s*(?:\n|$)", block):
            answer = match.group(1).strip()
            if not answer or answer.startswith("Question"):
                continue
            if any(token in answer for token in ("Score:", "Passing Score:", "Time Spent:")):
                continue
            if len(answer) > 220:
                continue
            answers.append(answer)

    return answers


def parse_pdf(path: Path) -> list[tuple[str, str]]:
    text = clean_pdf_text(
        "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)
    )
    parts = text.split("Explanation")
    entries: list[tuple[str, str]] = []

    for index in range(1, len(parts)):
        explanation = trim_explanation(parts[index])
        if not explanation:
            continue

        answer_context = parts[index - 1][-3500:]

        for answer in extract_answers(answer_context):
            entries.append((answer, explanation))

    return entries


def load_pdf_explanations(practices_dir: Path) -> dict[str, dict]:
    explanations: dict[str, dict] = {}

    for pdf_path in sorted(practices_dir.glob("*.pdf")):
        for answer, explanation in parse_pdf(pdf_path):
            key = normalize(answer)
            explanations[key] = {
                "answer": answer,
                "explanation": explanation,
                "source": pdf_path.name,
            }

    return explanations


def find_pdf_explanation(card: dict, pdf_explanations: dict[str, dict]) -> tuple[str | None, str]:
    candidates = [card["term"], *(card.get("aliases") or [])]

    for candidate in candidates:
        key = normalize(candidate)
        if key in pdf_explanations:
            return pdf_explanations[key]["explanation"], "pdf"

    return None, "missing"


def load_question_explanations() -> dict[str, str]:
    questions_data = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    explanations: dict[str, str] = {}

    for section in questions_data["sections"]:
        for question in section["questions"]:
            explanation = (question.get("explanation") or "").strip()
            if not explanation:
                continue
            explanation = re.sub(r"\s+", " ", explanation)
            answers = question.get("answer")
            if not isinstance(answers, list):
                answers = [answers]
            for answer in answers:
                explanations[normalize(answer)] = explanation

    return explanations


def is_bad_definition(definition: str, term: str) -> bool:
    value = (definition or "").strip()
    if not value:
        return True
    if re.search(r" is the command used to choose", value, re.I):
        return True
    if re.fullmatch(rf"This is {re.escape(term)}[.]?", value, re.I):
        return True
    if value.startswith("In security terminology, that is"):
        return True
    if value.startswith(", a director"):
        return True
    if value.startswith("the most suitable"):
        return True
    return False


def main() -> int:
    practices_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PRACTICES_DIR
    if not practices_dir.exists():
        print(json.dumps({"error": f"Practices directory not found: {practices_dir}"}, indent=2))
        return 1

    pdf_explanations = load_pdf_explanations(practices_dir)
    question_explanations = load_question_explanations()
    flashcard_data = json.loads(FLASHCARDS_PATH.read_text(encoding="utf-8"))

    pdf_added = pdf_updated = pdf_unchanged = 0
    question_added = question_updated = 0
    untouched = 0
    samples: list[dict] = []

    for card in flashcard_data["flashcards"]:
        previous = (card.get("definition") or "").strip()
        explanation, source = find_pdf_explanation(card, pdf_explanations)

        if not explanation:
            term_key = normalize(card["term"])
            if term_key in question_explanations and (
                not previous or is_bad_definition(previous, card["term"])
            ):
                explanation = question_explanations[term_key]
                source = "questions"

        if not explanation:
            untouched += 1
            continue

        if not previous:
            card["definition"] = explanation
            if source.startswith("pdf"):
                pdf_added += 1
            else:
                question_added += 1
            if len(samples) < 8:
                samples.append({"term": card["term"], "action": "added", "source": source})
            continue

        if normalize(previous) == normalize(explanation):
            if source.startswith("pdf"):
                pdf_unchanged += 1
            else:
                untouched += 1
            continue

        card["definition"] = explanation
        if source.startswith("pdf"):
            pdf_updated += 1
        else:
            question_updated += 1
        if len(samples) < 8:
            samples.append(
                {
                    "term": card["term"],
                    "action": "updated",
                    "source": source,
                    "before": previous[:100],
                    "after": explanation[:100],
                }
            )

    FLASHCARDS_PATH.write_text(
        f"{json.dumps(flashcard_data, indent=2, ensure_ascii=False)}\n",
        encoding="utf-8",
    )

    result = {
        "practicesDir": str(practices_dir),
        "pdfFiles": len(list(practices_dir.glob("*.pdf"))),
        "pdfAnswerExplanations": len(pdf_explanations),
        "flashcards": len(flashcard_data["flashcards"]),
        "pdfAdded": pdf_added,
        "pdfUpdated": pdf_updated,
        "pdfUnchanged": pdf_unchanged,
        "questionAdded": question_added,
        "questionUpdated": question_updated,
        "untouched": untouched,
        "samples": samples,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
