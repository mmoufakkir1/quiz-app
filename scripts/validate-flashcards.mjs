import fs from 'node:fs'

const questionsData = JSON.parse(fs.readFileSync('public/questions.json', 'utf8'))
const flashcardData = JSON.parse(fs.readFileSync('public/flashcards.json', 'utf8'))

const normalize = (value) => String(value).trim().toLowerCase().replace(/\s+/g, ' ')

const cardTerms = new Map()
const duplicateTerms = []
const invalidCards = []

for (const [index, card] of flashcardData.flashcards.entries()) {
  const term = card.term?.trim()
  const key = normalize(term)

  if (!term) invalidCards.push({ index, field: 'term' })
  if (!card.definition?.trim()) invalidCards.push({ index, field: 'definition' })
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
  flashcards: flashcardData.flashcards.length,
  invalidCards,
  duplicateTerms,
  missingCorrectTerms,
}

console.log(JSON.stringify(result, null, 2))

if (invalidCards.length || duplicateTerms.length || missingCorrectTerms.length) {
  process.exitCode = 1
}
