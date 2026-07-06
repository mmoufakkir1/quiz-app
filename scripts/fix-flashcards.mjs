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

function normalizeForCompare(value) {
  return normalize(value).replace(/[.!?]+$/g, '')
}

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

function isPortTerm(term) {
  return /^(\d{1,5})(\s+and\s+\d{1,5})*$/.test(String(term).trim())
}

function portExplanationLead(explanation) {
  let text = explanation.trim()
  text = text.split(/\.\s+In this scenario/i)[0].trim()
  text = text.split(/\.\s+That service name/i)[0].trim()
  const sentence = firstSentence(text)
  if (!sentence) return ''
  return sentence.endsWith('.') ? sentence : `${sentence}.`
}

function buildPortDefinition(card, question) {
  if (question?.explanation) {
    const lead = portExplanationLead(question.explanation)
    if (lead && /ports?\s+\d/i.test(lead)) {
      return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}`
    }
    if (lead && /^Use port \d/i.test(lead)) {
      return lead
    }
  }

  const usePortMatch = card.definition?.match(/^Use port ([\d\s]+and\s+\d+|\d+) for (.+)\.?$/i)
  if (usePortMatch) {
    return `Use port ${usePortMatch[1]} for ${usePortMatch[2].replace(/\.$/, '')}.`
  }

  const cmdMatch = card.definition?.match(/^([\d\s]+and\s+\d+|\d+)\s+is the command used to support (.+)\.?$/i)
  if (cmdMatch) {
    return `Port ${cmdMatch[1]} is used for ${cmdMatch[2].replace(/\.$/, '')}.`
  }

  return card.definition
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
    if (isPortTerm(card.term) && question.scenario) {
      const scenarioHint = redactTerm(question.scenario.trim(), card.term)
      if (scenarioHint && !isBadHint(scenarioHint, card.term, false)) {
        return scenarioHint
      }
    }

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
      if (!isVagueExamQuestion(question.question)) {
        const questionHint = cleanQuestionForHint(question.question, card.term)
        if (questionHint && !isBadHint(questionHint, card.term, false)) {
          return questionHint
        }
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
  if (isPortTerm(card.term)) {
    return buildPortDefinition(card, question)
  }

  if (question?.explanation) {
    if (question.question === 'What is this called?') {
      return formatImportantDetailDefinition(question.explanation, card.term)
    }

    const cleaned = cleanExplanation(question.explanation, card.term)
    if (cleaned) {
      return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`
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
  if (/^Prompt is describing/i.test(value)) return true
  if (/^Use port for /i.test(value)) return true
  if (isPortTerm(term) && /^Command used to support/i.test(value)) return true
  if (isPortTerm(term) && /\buses TCP ports? for\b/i.test(value) && !/\d/.test(value)) return true
  if (checkLeak && term.trim().length > 1 && textIncludesTerm(value, term)) return true
  return false
}

function isBadDefinition(definition, term) {
  if (!definition?.trim()) return true
  const value = definition.trim()
  if (/ is the command used to choose/i.test(value)) return true
  if (new RegExp(`^This is ${escapeRegex(term)}[.]?`, 'i').test(value)) return true
  if (/^In security terminology, that is/i.test(value)) return true
  if (/^The prompt is describing/i.test(value)) return true
  if (/ is the command used to support/i.test(value)) return true
  if (isPortTerm(term) && !/ports?\s+\d/i.test(value) && !/^Use port \d/i.test(value)) return true
  if (/^, a director/i.test(value)) return true
  if (/^the most suitable/i.test(value)) return true
  return false
}

function sentences(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return []
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  return parts ? parts.map((part) => part.trim()).filter(Boolean) : [trimmed]
}

function ensurePeriod(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function conciseDefinition(definition, term) {
  let value = definition.trim()
  const importantDetailInBody = value.match(
    /^(?:This is [^.]+[.]?\s*)?The important detail is (.+)$/i,
  )
  if (importantDetailInBody) {
    return ensurePeriod(
      importantDetailInBody[1].replace(/, which is what separates it from the other choices[.]?$/i, ''),
    )
  }

  const nmapMatch = value.match(
    new RegExp(`^${escapeRegex(term)}\\s+is the Nmap option used to (.+)$`, 'i'),
  )
  if (nmapMatch) {
    return ensurePeriod(`Nmap option used to ${nmapMatch[1].replace(/\.$/, '')}`)
  }

  const commandMatch = value.match(
    new RegExp(`^${escapeRegex(term)}\\s+is the command used to (.+)$`, 'i'),
  )
  if (commandMatch) {
    return ensurePeriod(`Command used to ${commandMatch[1].replace(/\.$/, '')}`)
  }

  const detailMatch = value.match(/^The important detail is (.+)$/i)
  if (detailMatch) {
    return ensurePeriod(
      detailMatch[1].replace(/, which is what separates it from the other choices[.]?$/i, ''),
    )
  }

  const parts = sentences(value)
  if (parts.length > 2) {
    value = parts.slice(0, 2).join(' ')
  }

  return ensurePeriod(value)
}

function isVagueExamQuestion(text) {
  const value = String(text || '').trim()
  if (!value) return true
  if (/^what is the (?:most|best|next|primary|correct)\b/i.test(value)) return true
  if (/^which (?:command|port|firewall rule|nmap option)\b/i.test(value)) return true
  if (/^an? (?:organization|analyst|team).+must (?:choose|identify|select)\b/i.test(value)) return true
  return false
}

function buildFront(card, question) {
  if (isPortTerm(card.term)) {
    const forService = card.definition?.match(/for (.+?)\.?$/i)?.[1]
    if (forService) {
      return ensurePeriod(`What port is used for ${forService}`)
    }
    const usesPorts = card.definition?.match(/^(.+?) uses TCP ports? /i)?.[1]
    if (usesPorts) {
      return ensurePeriod(`What ports does ${usesPorts.trim()} use`)
    }
  }

  if (card.definition?.trim() && !textIncludesTerm(card.definition, card.term)) {
    return truncateHint(card.definition.trim(), 320)
  }

  const hint = buildHint(card, question)
  if (
    hint?.trim() &&
    !isBadHint(hint, card.term) &&
    !isVagueExamQuestion(hint) &&
    !isGenericScenario(hint)
  ) {
    return truncateHint(hint.trim(), 320)
  }

  const scenario = question?.scenario ? redactTerm(question.scenario.trim(), card.term) : ''
  if (
    scenario &&
    !isGenericScenario(question?.scenario) &&
    !textIncludesTerm(scenario, card.term)
  ) {
    return truncateHint(scenario, 320)
  }

  const stripped = redactTerm(card.definition?.trim() || '', card.term)
  if (stripped && !isBadHint(stripped, card.term, false)) {
    return truncateHint(stripped, 320)
  }

  return truncateHint(card.definition?.trim() || 'Recall the term for this concept.', 320)
}

function isExamObjective(text) {
  return /^\d+\.\d+\s/.test(String(text || '').trim())
}

function buildKeyDetails(card, question) {
  const details = []
  const definitionNorm = normalizeForCompare(card.definition)

  if (question?.explanation) {
    const cleaned = cleanExplanation(question.explanation, card.term)
    const explanationSentences = sentences(cleaned)
    const detailMatch = cleaned.match(/^The important detail is (.+)$/i)
    if (detailMatch) {
      const remainder = detailMatch[1]
        .replace(/, which is what separates it from the other choices[.]?$/i, '')
        .trim()
      if (remainder && normalizeForCompare(remainder) !== definitionNorm) {
        details.push(ensurePeriod(remainder))
      }
    } else if (explanationSentences.length > 1) {
      for (const sentence of explanationSentences.slice(1)) {
        if (normalizeForCompare(sentence) !== definitionNorm) {
          details.push(ensurePeriod(sentence))
        }
      }
    } else if (/other flags control different scan features/i.test(cleaned)) {
      details.push('Other Nmap flags control different scan features.')
    }
  }

  if (
    question?.lesson &&
    !isExamObjective(question.lesson) &&
    !details.some((detail) => detail.includes(question.lesson))
  ) {
    details.push(ensurePeriod(question.lesson))
  }

  if (card.aliases?.length) {
    details.push(`Also known as: ${card.aliases.join(', ')}.`)
  }

  const combined = details.join(' ').trim()
  if (combined) return truncateHint(combined, 360)

  const fallback = sentences(card.definition)
    .slice(1)
    .map(ensurePeriod)
    .filter((sentence) => normalizeForCompare(sentence) !== definitionNorm)
    .join(' ')
    .trim()
  if (fallback) return truncateHint(fallback, 360)

  return ensurePeriod(card.domains?.[0] || 'CompTIA Security+ exam concept')
}

function buildExample(card, question) {
  if (question?.scenario) {
    const scenario = redactTerm(question.scenario.trim(), card.term)
    if (scenario && !isGenericScenario(question.scenario)) {
      return truncateHint(scenario, 280)
    }
  }

  if (question?.question && question.question !== 'What is this called?' && !isGenericQuestion(question.question)) {
    const example = redactTerm(firstSentence(question.question), card.term)
    if (example) return truncateHint(example, 280)
  }

  const definitionLead = firstSentence(card.definition)
  if (definitionLead) {
    return truncateHint(`A security team applies this when ${definitionLead.replace(/[.!?]$/, '').toLowerCase()}.`, 280)
  }

  return `A security analyst encounters a scenario involving ${card.term}.`
}

function buildMemoryHook(card, question) {
  const term = card.term.trim()
  const upper = term.replace(/[^A-Za-z]/g, '')
  if (/^[A-Z]{2,6}$/.test(upper)) {
    const words = sentences(card.definition)[0]
      ?.replace(/[.!?]$/, '')
      .split(/\s+/)
      .filter((word) => /^[A-Z][a-z]/.test(word))
      .slice(0, 4)
    if (words?.length >= 2) {
      return `"${upper}" → ${words.join(' ')}.`
    }
  }

  if (term.startsWith('--')) {
    const flag = term.replace(/<[^>]+>/g, '').trim()
    return `"${flag}" = specialized Nmap switch; read the flag name as a hint to its behavior.`
  }

  if (/^-\w/.test(term)) {
    return `Short Nmap flag "${term}" — associate the letter or symbol with its scan behavior.`
  }

  if (/\s/.test(term)) {
    const words = term.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      return `"${words[0]}" + "${words[words.length - 1]}" → connect the words to the definition.`
    }
  }

  if (question?.explanation) {
    const contrast = sentences(cleanExplanation(question.explanation, term)).find((sentence) =>
      /\b(unlike|different from|rather than|instead of|opposite)\b/i.test(sentence),
    )
    if (contrast) {
      return truncateHint(contrast, 180)
    }
  }

  const lead = firstSentence(card.definition).replace(/[.!?]$/, '')
  if (lead) {
    return `Link "${term}" to: ${lead.toLowerCase()}.`
  }

  return `Remember "${term}" by connecting it to the core definition.`
}

function buildStructuredCard(card, question) {
  card.front = buildFront(card, question)
  card.definition = conciseDefinition(card.definition, card.term)
  card.keyDetails = buildKeyDetails(card, question)
  card.example = buildExample(card, question)
  card.memoryHook = buildMemoryHook(card, question)
  card.hint = card.front
}

const changes = []

for (const card of flashcardData.flashcards) {
  const question = findPrimaryQuestion(card)
  const previousHint = card.hint
  const previousDefinition = card.definition

  if (isBadDefinition(card.definition, card.term)) {
    card.definition = buildDefinition(card, question)
  } else if (isPortTerm(card.term)) {
    const rebuilt = buildPortDefinition(card, question)
    if (rebuilt && rebuilt !== card.definition) {
      card.definition = rebuilt
    }
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

  const definition = card.definition?.trim() || ''
  if (/^[a-z]/.test(definition) && !/ is the /i.test(definition) && definition.endsWith('.')) {
    const capitalized = `${definition.charAt(0).toUpperCase()}${definition.slice(1)}`
    if (capitalized !== card.definition) {
      card.definition = capitalized
      changes.push({
        term: card.term,
        hint: { before: card.hint, after: card.hint },
        definition: { before: definition, after: capitalized },
      })
    }
  }

  const previousStructured = {
    front: card.front,
    keyDetails: card.keyDetails,
    example: card.example,
    memoryHook: card.memoryHook,
  }
  buildStructuredCard(card, question)
  if (
    previousStructured.front !== card.front ||
    previousStructured.keyDetails !== card.keyDetails ||
    previousStructured.example !== card.example ||
    previousStructured.memoryHook !== card.memoryHook
  ) {
    changes.push({
      term: card.term,
      front: card.front,
      keyDetails: card.keyDetails,
      example: card.example,
      memoryHook: card.memoryHook,
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
