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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
  return termTokens(term).some((token) => {
    if (token.length < 3) {
      return new RegExp(`\\b${escapeRegex(token)}\\b`, 'i').test(text)
    }
    return normalizedText.includes(token)
  })
}

function isGenericScenario(scenario) {
  return /must choose the best (?:vulnerability management|governance|architecture|supporting|application security|risk management|compliance|monitoring or response|control for the device or system|next best response or investigative action) (?:concept|choice|principle|control|action)/i.test(
    scenario,
  )
}

function firstSentence(text) {
  const trimmed = text.trim()
  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/)
  return match ? match[1] : trimmed
}

function truncateHint(text, maxLength = 280) {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed
  const slice = trimmed.slice(0, maxLength)
  const sentenceEnd = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('?'))
  if (sentenceEnd > 80) return slice.slice(0, sentenceEnd + 1)
  return `${slice.trimEnd()}...`
}

function redactTerm(text, term) {
  let result = text
  const replacements = new Map([
    ['clear', 'reset'],
  ])

  for (const token of termTokens(term).sort((a, b) => b.length - a.length)) {
    if (token.length < 2) continue
    const replacement = replacements.get(token) || ''
    const pattern = token.length < 4
      ? new RegExp(`\\b${escapeRegex(token)}\\b`, 'gi')
      : new RegExp(escapeRegex(token), 'gi')
    result = result.replace(pattern, replacement)
  }

  return result.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim()
}

function cleanQuestionForHint(question, term) {
  return truncateHint(redactTerm(question.replace(/\s+/g, ' ').trim(), term))
}

function cleanExplanation(explanation, term) {
  let text = explanation.trim()
  text = text.replace(new RegExp(`^This is ${escapeRegex(term)}[.]?\\s*`, 'i'), '')
  text = text.replace(
    new RegExp(`In security terminology, that is ${escapeRegex(term)}[.]?\\s*`, 'i'),
    '',
  )
  text = text.replace(/^The prompt is describing\s+/i, '')
  text = text.replace(
    new RegExp(`^${escapeRegex(term)}\\s+is\\s+the\\s+(?:Nmap option|command)\\s+`, 'i'),
    '',
  )
  return text.trim()
}

function isGenericQuestion(question) {
  return /^(?:which command should be used|which port number should be documented)\??$/i.test(
    question.trim(),
  )
}

function formatImportantDetailDefinition(explanation, term) {
  const cleaned = cleanExplanation(explanation, term)
  const detailMatch = cleaned.match(/^The important detail is (.+)$/i)
  if (detailMatch) {
    const detail = detailMatch[1].replace(/, which is what separates it from the other choices[.]?$/i, '')
    return `${detail.charAt(0).toUpperCase()}${detail.slice(1)}.`
  }
  return cleaned
}

function findPrimaryQuestion(card) {
  const termNorm = normalize(card.term)
  for (const questionId of card.sourceQuestionIds || []) {
    const question = questionById.get(questionId)
    if (!question) continue
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
    if (answers.some((answer) => normalize(answer) === termNorm)) {
      return question
    }
  }

  for (const questionId of card.sourceQuestionIds || []) {
    const question = questionById.get(questionId)
    if (question) return question
  }

  return null
}

function hintFromDefinition(definition) {
  const match = definition.match(/ is the ((?:Nmap option|command) used to .+)$/i)
  if (match) {
    const phrase = match[1]
    return phrase.charAt(0).toUpperCase() + phrase.slice(1)
  }

  const policyMatch = definition.match(/^A (.+ policy .+)$/i)
  if (policyMatch) {
    return policyMatch[1].charAt(0).toUpperCase() + policyMatch[1].slice(1)
  }

  return null
}

function buildHint(card, question) {
  if (question) {
    if (question.question === 'What is this called?' && question.scenario) {
      return question.scenario.trim()
    }

    if (question.scenario) {
      const scenarioHint = redactTerm(question.scenario.trim(), card.term)
      if (scenarioHint && !isGenericScenario(question.scenario) && !isBadHint(scenarioHint, card.term, false)) {
        return scenarioHint
      }
    }

    if (question.question && question.question !== 'What is this called?' && !isGenericQuestion(question.question)) {
      const questionHint = cleanQuestionForHint(question.question, card.term)
      if (questionHint && !isBadHint(questionHint, card.term, false)) {
        return questionHint
      }
    }

    if (question.scenario && !isGenericScenario(question.scenario)) {
      const scenarioHint = redactTerm(question.scenario.trim(), card.term)
      if (scenarioHint && !isBadHint(scenarioHint, card.term, false)) {
        return scenarioHint
      }
    }

    if (question.scenario) {
      const scenarioHint = redactTerm(question.scenario.trim(), card.term)
      if (scenarioHint && !isBadHint(scenarioHint, card.term, false)) {
        return scenarioHint
      }
    }

    if (question.explanation) {
      const cleaned = cleanExplanation(question.explanation, card.term)
      const detailMatch = cleaned.match(/^The important detail is (.+)$/i)
      const candidate = detailMatch ? firstSentence(detailMatch[1]) : firstSentence(cleaned)
      const redacted = redactTerm(candidate, card.term)
      if (redacted && !isBadHint(redacted, card.term, false)) {
        return redacted
      }
    }
  }

  const definitionHint = hintFromDefinition(card.definition || '')
  if (definitionHint && !isBadHint(definitionHint, card.term, false)) {
    return redactTerm(definitionHint, card.term)
  }

  return card.hint
}

function buildDefinition(card, question) {
  if (question?.explanation) {
    if (question.question === 'What is this called?') {
      return formatImportantDetailDefinition(question.explanation, card.term)
    }

    const cleaned = cleanExplanation(question.explanation, card.term)
    if (cleaned) {
      return cleaned
    }
  }

  const definitionHint = hintFromDefinition(card.definition || '')
  if (definitionHint) {
    return `${card.term} is the ${definitionHint.charAt(0).toLowerCase()}${definitionHint.slice(1)}`
  }

  return card.definition
}

function isBadHint(hint, term, checkLeak = true) {
  if (!hint?.trim()) return true
  const value = hint.trim()
  if (/^command used to choose/i.test(value)) return true
  if (/concept related to/i.test(value)) return true
  if (/^[a-z] are the /i.test(value)) return true
  if (/^a ensures/i.test(value)) return true
  if (/^in security terminology, that is[.]?$/i.test(value)) return true
  if (/^command used to the /i.test(value)) return true
  if (/^, a director/i.test(value)) return true
  if (checkLeak && term.trim().length > 1 && textIncludesTerm(value, term)) return true
  return false
}

function isBadDefinition(definition, term) {
  if (!definition?.trim()) return true
  const value = definition.trim()
  if (/ is the command used to choose/i.test(value)) return true
  if (new RegExp(`^This is ${escapeRegex(term)}[.]?$`, 'i').test(value)) return true
  if (/^In security terminology, that is/i.test(value)) return true
  if (/^, a director/i.test(value)) return true
  if (/^the most suitable/i.test(value)) return true
  return false
}

const changes = []

for (const card of flashcardData.flashcards) {
  const question = findPrimaryQuestion(card)
  const previousHint = card.hint
  const previousDefinition = card.definition

  if (isBadDefinition(card.definition, card.term)) {
    card.definition = buildDefinition(card, question)
  }

  if (isBadHint(card.hint, card.term) || isGenericQuestion(card.hint || '')) {
    card.hint = buildHint(card, question)
  }

  if (card.hint !== previousHint || card.definition !== previousDefinition) {
    changes.push({
      term: card.term,
      hint: { before: previousHint, after: card.hint },
      definition: { before: previousDefinition, after: card.definition },
    })
  }
}

fs.writeFileSync('public/flashcards.json', `${JSON.stringify(flashcardData, null, 2)}\n`)

const remainingBadHints = flashcardData.flashcards.filter((card) => isBadHint(card.hint, card.term))
const remainingBadDefinitions = flashcardData.flashcards.filter((card) =>
  isBadDefinition(card.definition, card.term),
)

console.log(
  JSON.stringify(
    {
      updatedCards: changes.length,
      remainingBadHints: remainingBadHints.length,
      remainingBadDefinitions: remainingBadDefinitions.length,
      samples: {
        changes: changes.slice(0, 12),
        remainingBadHints: remainingBadHints.slice(0, 15).map((card) => ({
          term: card.term,
          hint: card.hint,
        })),
      },
    },
    null,
    2,
  ),
)
