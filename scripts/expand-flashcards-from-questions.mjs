import fs from 'node:fs'

const questionsData = JSON.parse(fs.readFileSync('public/questions.json', 'utf8'))
const flashcardData = JSON.parse(fs.readFileSync('public/flashcards.json', 'utf8'))

const DOMAIN_ORDER = [
  '1.0 General Security Concepts',
  '2.0 Threats, Vulnerabilities, and Mitigations',
  '3.0 Security Architecture',
  '4.0 Security Operations',
  '5.0 Security Program Management and Oversight',
  'Supplemental',
]

function getFlashcards(data) {
  return data.sections?.flatMap((section) => section.flashcards) ?? data.flashcards ?? []
}

function setFlashcards(data, cards) {
  const groups = new Map(DOMAIN_ORDER.map((domain) => [domain, []]))
  for (const card of cards) {
    const domain = card.domains?.[0] || (card.supplemental ? 'Supplemental' : 'Uncategorized')
    if (!groups.has(domain)) groups.set(domain, [])
    groups.get(domain).push(card)
  }
  data.sections = [...groups.entries()]
    .filter(([, groupCards]) => groupCards.length > 0)
    .map(([name, groupCards]) => ({ name, flashcards: groupCards }))
  delete data.flashcards
}

const normalize = (value) => String(value).trim().toLowerCase().replace(/\s+/g, ' ')

const GENERIC_SINGLE_WORD_BLOCKLIST = new Set([
  'network',
  'cryptographic',
  'faxes',
  'consensus',
  'preparation',
  'boot',
  'script',
  'injection',
  'collision',
  'firmware',
  'containment',
  'esc',
  'virus',
  'cryptographic',
])

const SUPPLEMENTAL_TERMS = [
  {
    term: 'PGP',
    definition:
      'Pretty Good Privacy; an encryption program used for signing, encrypting, and decrypting email and files.',
    domains: ['1.0 General Security Concepts'],
    topics: ['1.4 Explain cryptographic solutions'],
  },
  {
    term: 'Cross-site scripting (XSS)',
    definition:
      'An injection attack where malicious scripts are executed in a victim browser through a vulnerable web application.',
    domains: ['2.0 Threats, Vulnerabilities, and Mitigations'],
    topics: ['2.2 Summarize types of vulnerabilities'],
  },
  {
    term: 'SQL injection',
    definition:
      'An attack that inserts malicious SQL into application input to manipulate or extract database data.',
    domains: ['2.0 Threats, Vulnerabilities, and Mitigations'],
    topics: ['2.2 Summarize types of vulnerabilities'],
  },
  {
    term: 'CSRF',
    definition:
      'Cross-site request forgery; tricks an authenticated user into submitting unwanted actions on a web app.',
    domains: ['2.0 Threats, Vulnerabilities, and Mitigations'],
    topics: ['2.3 Explain threat actors and motivations'],
  },
  {
    term: 'On-path attack',
    definition:
      'A person-in-the-middle attack where an attacker intercepts or alters communications between two parties.',
    domains: ['2.0 Threats, Vulnerabilities, and Mitigations'],
    topics: ['2.4 Explain threat vectors and attack surfaces'],
  },
  {
    term: 'Defense in depth',
    definition:
      'Layered security strategy using multiple overlapping controls so one failure does not expose the whole system.',
    domains: ['1.0 General Security Concepts'],
    topics: ['1.2 Summarize fundamental security concepts'],
  },
  {
    term: 'Need to know',
    definition:
      'Access principle limiting information to only what a user requires to perform their job.',
    domains: ['1.0 General Security Concepts'],
    topics: ['1.3 Explain the importance of change management'],
  },
  {
    term: 'Separation of duties',
    definition:
      'Control that divides critical tasks among multiple people so no single person can complete a sensitive process alone.',
    domains: ['1.0 General Security Concepts'],
    topics: ['1.3 Explain the importance of change management'],
  },
  {
    term: 'OAuth',
    definition:
      'Open authorization framework that allows limited access to resources without sharing account passwords.',
    domains: ['4.0 Security Operations'],
    topics: ['4.6 Given a scenario, implement and maintain identity and access management'],
  },
  {
    term: 'SAML',
    definition:
      'Security Assertion Markup Language; XML-based standard for exchanging authentication and authorization data between identity providers and service providers.',
    domains: ['4.0 Security Operations'],
    topics: ['4.6 Given a scenario, implement and maintain identity and access management'],
  },
]

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b)
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))]
}

function isTermLike(text) {
  const value = String(text || '').trim()
  if (value.length < 3 || value.length > 72) return false
  if (/[?]/.test(value)) return false
  if (/^\$[\d,]+/.test(value)) return false
  if (/^(yes|no|true|false|none of the above)$/i.test(value)) return false
  if (/^(the|a|an)\s+(risks|costs|benefits)\b/i.test(value)) return false
  if (/^(implement|requirement for|allow only|deny all|accept the|purchase|need for|encryption of)\b/i.test(value)) {
    return false
  }
  if (/^(a|an) (larger|designated|different|new)\b/i.test(value) && value.split(/\s+/).length > 5) {
    return false
  }
  if (/\b(should|must|prioritize|connect all)\b/i.test(value) && value.split(/\s+/).length > 7) {
    return false
  }
  if (/^(increase|decrease|reduce|improve|ensure|require)\b/i.test(value) && value.split(/\s+/).length > 5) {
    return false
  }
  if (/outweigh the costs/i.test(value)) return false
  return true
}

function parentheticalAlias(term) {
  return term.match(/\(([^)]+)\)/)?.[1]?.trim() || null
}

function buildCardIndex(cards) {
  const byTerm = new Map()
  for (const [index, card] of cards.entries()) {
    byTerm.set(normalize(card.term), { index, card })
    for (const alias of card.aliases || []) {
      byTerm.set(normalize(alias), { index, card, alias: true })
    }
    const short = parentheticalAlias(card.term)
    if (short) byTerm.set(normalize(short), { index, card, alias: true })
  }
  return byTerm
}

function termIsKnown(term, cardIndex) {
  const key = normalize(term)
  if (cardIndex.has(key)) return true

  const short = parentheticalAlias(term)
  if (short && cardIndex.has(normalize(short))) return true

  for (const [existingKey] of cardIndex) {
    if (existingKey === key) continue
    if (existingKey.includes(key) || key.includes(existingKey)) {
      const overlap = Math.min(existingKey.length, key.length) / Math.max(existingKey.length, key.length)
      if (overlap >= 0.92) return true
    }
  }

  return false
}

function firstSentence(text) {
  const trimmed = String(text || '').trim()
  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/)
  return match ? match[1].trim() : trimmed
}

function definitionFromExplanation(term, explanation) {
  const cleaned = String(explanation || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''

  const termNorm = normalize(term)
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned]

  for (const sentence of sentences) {
    const sentenceNorm = normalize(sentence)
    if (sentenceNorm.includes(termNorm)) {
      return firstSentence(sentence)
    }
  }

  const words = term
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9-]/gi, ''))
    .filter((word) => word.length > 4)

  for (const sentence of sentences) {
    const sentenceNorm = normalize(sentence)
    if (words.some((word) => sentenceNorm.includes(normalize(word)))) {
      return firstSentence(sentence)
    }
  }

  return ''
}

function isWorthAddingDistractor(term, entry) {
  if (entry.count < 2) return false
  if (!isTermLike(term)) return false
  if (term.split(/\s+/).length > 8) return false
  if (term.split(/\s+/).length === 1 && GENERIC_SINGLE_WORD_BLOCKLIST.has(normalize(term))) return false

  const definition = entry.definitions[0] || ''
  if (!definition && entry.count < 3) return false
  if (definition && !normalize(definition).includes(normalize(term).slice(0, Math.min(5, term.length)))) {
    const words = term
      .replace(/\([^)]*\)/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 4)
    if (!words.some((word) => normalize(definition).includes(normalize(word)))) return false
  }

  return true
}

function mergeQuestionMeta(card, question, sectionName) {
  const domain = question.topic || sectionName || ''
  if (domain && !card.domains.includes(domain)) {
    card.domains.push(domain)
  }
  if (question.lesson && card.topics && !card.topics.includes(question.lesson)) {
    card.topics.push(question.lesson)
  }
  if (!card.sourceQuestionIds.includes(question.id)) {
    card.sourceQuestionIds.push(question.id)
  }
}

function createBaseCard({ term, definition, domains, topics, sourceQuestionIds, supplemental = false }) {
  return {
    term,
    definition: definition.trim(),
    domains: uniqueStrings(domains),
    topics: uniqueStrings(topics),
    aliases: [],
    sourceQuestionIds: uniqueSorted(sourceQuestionIds),
    supplemental,
    hint: '',
    front: '',
    keyDetails: '',
    example: '',
    memoryHook: '',
  }
}

function collectCorrectTerms() {
  const correctTerms = new Set()
  for (const section of questionsData.sections) {
    for (const question of section.questions) {
      const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
      for (const answer of answers) correctTerms.add(normalize(answer))
    }
  }
  return correctTerms
}

const correctTerms = collectCorrectTerms()
const existingByTerm = new Map(
  getFlashcards(flashcardData).map((card) => [normalize(card.term), card]),
)

const cards = []
const cardIndex = buildCardIndex(cards)
const added = []
const merged = []
const aliasLinked = []

for (const section of questionsData.sections) {
  for (const question of section.questions) {
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
    const domain = question.topic || section.name

    for (const answer of answers) {
      const term = String(answer).trim()
      const key = normalize(term)
      const existing = cardIndex.get(key) || (existingByTerm.get(key) ? { card: existingByTerm.get(key) } : null)

      if (cardIndex.has(key)) {
        const card = cards[cardIndex.get(key).index]
        const before = card.sourceQuestionIds.length
        mergeQuestionMeta(card, question, section.name)
        if (card.sourceQuestionIds.length > before) merged.push(term)
        continue
      }

      const short = parentheticalAlias(term)
      const aliasMatch = short ? cardIndex.get(normalize(short)) : null
      if (aliasMatch) {
        const card = cards[aliasMatch.index]
        if (!card.aliases.map(normalize).includes(key)) {
          card.aliases.push(term)
          cardIndex.set(key, { index: aliasMatch.index, card, alias: true })
          aliasLinked.push({ term, linkedTo: card.term })
        }
        mergeQuestionMeta(card, question, section.name)
        continue
      }

      const prior = existingByTerm.get(key)
      const definition =
        prior?.definition ||
        definitionFromExplanation(term, question.explanation) ||
        String(question.explanation || '').trim() ||
        `${term} is a key CompTIA Security+ concept.`

      const card = createBaseCard({
        term,
        definition,
        domains: prior?.domains?.length ? prior.domains : [domain],
        topics: prior?.topics?.length ? prior.topics : question.lesson ? [question.lesson] : [],
        sourceQuestionIds: prior?.sourceQuestionIds?.length
          ? [...prior.sourceQuestionIds, question.id]
          : [question.id],
      })
      cards.push(card)
      cardIndex.set(key, { index: cards.length - 1, card })
      if (!prior) added.push({ type: 'correct-answer', term })
    }
  }
}

const distractorCandidates = new Map()

for (const section of questionsData.sections) {
  for (const question of section.questions) {
    const answers = new Set(
      (Array.isArray(question.answer) ? question.answer : [question.answer]).map((answer) =>
        normalize(answer),
      ),
    )
    const explanation = String(question.explanation || '')
    const explanationNorm = normalize(explanation)
    const domain = question.topic || section.name

    for (const option of question.options || []) {
      const term = String(option).trim()
      const key = normalize(term)
      if (answers.has(key) || !isTermLike(term) || termIsKnown(term, cardIndex)) continue

      const termNorm = normalize(term)
      const short = parentheticalAlias(term)
      const mentioned =
        explanationNorm.includes(termNorm) ||
        (short ? explanationNorm.includes(normalize(short)) : false) ||
        term
          .replace(/\([^)]*\)/g, ' ')
          .split(/\s+/)
          .filter((word) => word.length > 4)
          .some((word) => explanationNorm.includes(normalize(word)))

      if (!mentioned) continue

      const entry = distractorCandidates.get(key) || {
        term,
        count: 0,
        sourceQuestionIds: [],
        domains: [],
        topics: [],
        definitions: [],
      }
      entry.count += 1
      entry.sourceQuestionIds.push(question.id)
      entry.domains.push(domain)
      if (question.lesson) entry.topics.push(question.lesson)
      const definition = definitionFromExplanation(term, explanation)
      if (definition) entry.definitions.push(definition)
      distractorCandidates.set(key, entry)
    }
  }
}

for (const entry of distractorCandidates.values()) {
  if (!isWorthAddingDistractor(entry.term, entry)) continue
  if (termIsKnown(entry.term, cardIndex)) continue

  const short = parentheticalAlias(entry.term)
  const aliasMatch = short ? cardIndex.get(normalize(short)) : null
  if (aliasMatch) {
    const card = cards[aliasMatch.index]
    if (!card.aliases.map(normalize).includes(normalize(entry.term))) {
      card.aliases.push(entry.term)
      cardIndex.set(normalize(entry.term), { index: aliasMatch.index, card, alias: true })
      aliasLinked.push({ term: entry.term, linkedTo: card.term })
    }
    continue
  }

  const definition =
    entry.definitions[0] ||
    `${entry.term} is an important related concept to distinguish on the Security+ exam.`

  const card = createBaseCard({
    term: entry.term,
    definition,
    domains: entry.domains,
    topics: entry.topics,
    sourceQuestionIds: entry.sourceQuestionIds,
  })
  cards.push(card)
  cardIndex.set(normalize(entry.term), { index: cards.length - 1, card })
  added.push({ type: 'related-concept', term: entry.term, count: entry.count })
}

for (const supplemental of SUPPLEMENTAL_TERMS) {
  if (termIsKnown(supplemental.term, cardIndex)) continue

  const card = createBaseCard({
    term: supplemental.term,
    definition: supplemental.definition,
    domains: supplemental.domains,
    topics: supplemental.topics || [],
    sourceQuestionIds: [],
    supplemental: true,
  })
  cards.push(card)
  cardIndex.set(normalize(supplemental.term), { index: cards.length - 1, card })
  added.push({ type: 'supplemental', term: supplemental.term })
}

cards.sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }))

setFlashcards(flashcardData, cards)
fs.writeFileSync('public/flashcards.json', `${JSON.stringify(flashcardData, null, 2)}\n`)

const missingCorrect = [...correctTerms].filter((term) => !cardIndex.has(term))

console.log(
  JSON.stringify(
    {
      flashcards: cards.length,
      correctAnswerCards: cards.filter((card) => correctTerms.has(normalize(card.term))).length,
      relatedConceptCards: cards.filter((card) => !correctTerms.has(normalize(card.term)) && !card.supplemental)
        .length,
      supplementalCards: cards.filter((card) => card.supplemental).length,
      added: added.length,
      mergedQuestionLinks: merged.length,
      aliasLinked: aliasLinked.length,
      missingCorrectTerms: missingCorrect,
      addedSamples: added.slice(0, 25),
      aliasSamples: aliasLinked.slice(0, 15),
    },
    null,
    2,
  ),
)

if (missingCorrect.length) {
  process.exitCode = 1
}
