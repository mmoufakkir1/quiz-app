import fs from 'node:fs'

const questionsData = JSON.parse(fs.readFileSync('public/questions.json', 'utf8'))
const flashcardData = JSON.parse(fs.readFileSync('public/flashcards.json', 'utf8'))

const questionById = new Map()
for (const section of questionsData.sections) {
  for (const question of section.questions) {
    questionById.set(question.id, question)
  }
}

const normalize = (value) => String(value).trim().toLowerCase().replace(/\s+/g, ' ')

function termTokens(term) {
  const values = new Set()
  const text = String(term).trim()
  values.add(normalize(text))
  const withoutParenthetical = text.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (withoutParenthetical) values.add(normalize(withoutParenthetical))
  const parenthetical = text.match(/\(([^)]+)\)/)?.[1]
  if (parenthetical) values.add(normalize(parenthetical))
  return [...values].filter(Boolean)
}

function textIncludesTerm(text, term) {
  const normalizedText = normalize(text)
  return termTokens(term).some((token) => token.length >= 2 && normalizedText.includes(token))
}

const leakedHints = []
const sourceMismatches = []
const emptyOrShortHints = []
const duplicateHints = new Map()
const suspiciousHints = []

for (const [index, card] of flashcardData.flashcards.entries()) {
  const hint = card.hint?.trim() || ''
  const term = card.term?.trim() || ''

  if (!hint || hint.length < 8) {
    emptyOrShortHints.push({ index, term, hint })
  }

  if (textIncludesTerm(hint, term)) {
    leakedHints.push({ index, term, hint })
  }

  const hintKey = normalize(hint)
  if (hintKey) {
    if (!duplicateHints.has(hintKey)) duplicateHints.set(hintKey, [])
    duplicateHints.get(hintKey).push({ index, term })
  }

  for (const questionId of card.sourceQuestionIds || []) {
    const question = questionById.get(questionId)
    if (!question) continue

    const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
    const answerMatchesTerm = answers.some((answer) => {
      const answerNorm = normalize(answer)
      return termTokens(term).some((token) => token === answerNorm || token.includes(answerNorm) || answerNorm.includes(token))
    })

    if (!answerMatchesTerm) {
      sourceMismatches.push({
        index,
        term,
        hint,
        questionId,
        answers,
        scenario: question.scenario || question.question,
        explanation: question.explanation,
      })
    }
  }

  const scenario = card.sourceQuestionIds
    ?.map((id) => questionById.get(id))
    .find((question) => question?.scenario || question?.explanation)

  if (scenario) {
    const reference = `${scenario.scenario || ''} ${scenario.explanation || ''}`
    const hintNorm = normalize(hint)
    const refNorm = normalize(reference)
    const hintWords = hintNorm.split(/[^a-z0-9]+/).filter((word) => word.length > 4)
    const overlap = hintWords.filter((word) => refNorm.includes(word))
    if (hintWords.length >= 3 && overlap.length < 2 && sourceMismatches.some((item) => item.index === index)) {
      suspiciousHints.push({
        index,
        term,
        hint,
        questionId: scenario.id,
        scenario: scenario.scenario,
        explanation: scenario.explanation,
      })
    }
  }
}

const duplicateHintGroups = [...duplicateHints.entries()]
  .filter(([, cards]) => cards.length > 1)
  .map(([hint, cards]) => ({ hint, cards }))

const result = {
  flashcards: flashcardData.flashcards.length,
  leakedHints: leakedHints.length,
  sourceMismatches: sourceMismatches.length,
  emptyOrShortHints: emptyOrShortHints.length,
  duplicateHintGroups: duplicateHintGroups.length,
  suspiciousHints: suspiciousHints.length,
  samples: {
    leakedHints: leakedHints.slice(0, 20),
    sourceMismatches: sourceMismatches.slice(0, 30),
    duplicateHintGroups: duplicateHintGroups.slice(0, 20),
    suspiciousHints: suspiciousHints.slice(0, 20),
  },
}

console.log(JSON.stringify(result, null, 2))
