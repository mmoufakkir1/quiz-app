import fs from 'node:fs'

const questionsData = JSON.parse(fs.readFileSync('public/questions.json', 'utf8'))
const flashcardData = JSON.parse(fs.readFileSync('public/flashcards.json', 'utf8'))
const flashcards = flashcardData.sections?.flatMap((section) => section.flashcards) ?? flashcardData.flashcards ?? []

const normalize = (value) => String(value).trim().toLowerCase().replace(/\s+/g, ' ')

const cardTerms = new Map()
const duplicateTerms = []
const invalidCards = []

for (const [index, card] of flashcards.entries()) {
  const term = card.term?.trim()
  const key = normalize(term)

  if (!term) invalidCards.push({ index, field: 'term' })
  if (!card.front?.trim() && !card.hint?.trim()) invalidCards.push({ index, field: 'front' })
  if (!card.definition?.trim()) invalidCards.push({ index, field: 'definition' })
  if (!card.keyDetails?.trim()) invalidCards.push({ index, field: 'keyDetails' })
  if (!card.example?.trim()) invalidCards.push({ index, field: 'example' })
  if (!card.memoryHook?.trim()) invalidCards.push({ index, field: 'memoryHook' })
  if (!Array.isArray(card.domains) || card.domains.length === 0) {
    invalidCards.push({ index, field: 'domains' })
  }

  if (cardTerms.has(key)) {
    duplicateTerms.push({ term, firstIndex: cardTerms.get(key), secondIndex: index })
  }
  cardTerms.set(key, index)

  for (const alias of card.aliases || []) {
    cardTerms.set(normalize(alias), index)
  }
}

const leakedHints = []
for (const [index, card] of flashcards.entries()) {
  const forbiddenTerms = [card.term, ...(card.aliases || [])]
    .filter(Boolean)
    .filter((term) => String(term).trim().length > 1)
    .flatMap((term) => {
      const text = String(term).trim()
      const parenthetical = text.match(/\(([^)]+)\)/)?.[1]
      const withoutParenthetical = text.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
      return [text, parenthetical, withoutParenthetical].filter((value) => value && value.length >= 3)
    })

  const frontText = card.front || card.hint || ''
  const normalizedHint = normalize(frontText)
  const leaked = forbiddenTerms.find((term) => normalizedHint.includes(normalize(term)))
  if (leaked) {
    leakedHints.push({ index, term: card.term, leaked })
  }
}

const missingCorrectTerms = []
const correctTerms = new Set()

for (const section of questionsData.sections) {
  for (const question of section.questions) {
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
    for (const answer of answers) {
      const key = normalize(answer)
      correctTerms.add(key)
      if (!cardTerms.has(key)) {
        missingCorrectTerms.push({
          questionId: question.id,
          term: answer,
          domain: question.topic || section.name,
        })
      }
    }
  }
}

const result = {
  questions: questionsData.sections.flatMap((section) => section.questions).length,
  uniqueCorrectTerms: correctTerms.size,
  flashcards: flashcards.length,
  correctAnswerCards: flashcards.filter((card) => correctTerms.has(normalize(card.term))).length,
  relatedConceptCards: flashcards.filter(
    (card) => !correctTerms.has(normalize(card.term)) && !card.supplemental,
  ).length,
  supplementalCards: flashcards.filter((card) => card.supplemental).length,
  invalidCards,
  duplicateTerms,
  leakedHints,
  missingCorrectTerms,
}

console.log(JSON.stringify(result, null, 2))

if (invalidCards.length || duplicateTerms.length || leakedHints.length || missingCorrectTerms.length) {
  process.exitCode = 1
}
