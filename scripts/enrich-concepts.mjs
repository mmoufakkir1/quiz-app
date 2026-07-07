import fs from 'node:fs'

const conceptsData = JSON.parse(fs.readFileSync('public/concepts.json', 'utf8'))
const questionsData = JSON.parse(fs.readFileSync('public/questions.json', 'utf8'))

function ensureSentence(text) {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''
  return /[.!?)]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sentences(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return []
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  return parts ? parts.map((part) => part.trim()).filter(Boolean) : [trimmed]
}

function dedupeSentences(text) {
  const seen = new Set()
  return sentences(text)
    .filter((sentence) => {
      const key = sentence.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(' ')
}

function removeQuizWording(text) {
  return (text || '')
    .replace(/\s*Focus on that behavior, not on the extra wording around it\./gi, '')
    .replace(/\s*The other options describe different ideas\./gi, '')
    .replace(/, which is what separates it from the other choices[.]?/gi, '')
    .trim()
}

function cleanExplanation(explanation, term) {
  let text = removeQuizWording(explanation.trim())
  text = text.replace(new RegExp(`^This is ${escapeRegex(term)}[.]?\\s*`, 'i'), '')
  text = text.replace(
    new RegExp(`In security terminology, that is ${escapeRegex(term)}[.]?\\s*`, 'i'),
    '',
  )
  text = text.replace(/^The prompt is describing\s+/i, '')
  text = text.replace(/^The important detail is\s+/i, '')
  return text.trim()
}

function stripBoilerplate(explanation) {
  let text = explanation.trim()
  text = text.replace(/\s*Study concept:.*$/i, '')
  text = text.replace(/\s*For Security\+, recognize .*$/i, '')
  text = text.replace(/\s*In [^,]+, connect (?:this term|it) to (?:this topic focus|Prove|Identity|Core|Administrative|Never|Email|Compare|Know|Why|Flaws|Third-party|Manipulating|Trust|Symmetric|One-way|HSM|X\.509|Hiding|Random|Labels|WPA3|Documented|Reduce|Isolated|Secure|Two|Create|Permissions|Trust|One|Documented|Speed|Benign|Passive|Replace|Detects|Users|Virus|DDoS|Theft|Brute|Injection|IOCs|Controlled|Test|Formal|Systematic|Subjective|Catalog|Apply|Evaluate|First-party|Independent|Authorized|Formal|Penalties|Ongoing|EU|Labels).*$/i, '')
  text = text.replace(
    /\s*This acronym appears on the CompTIA Security\+ SY0-701 objectives and should be recognized by its full meaning[.]?/gi,
    '',
  )
  return dedupeSentences(text.trim())
}

function isBoilerplateExplanation(explanation) {
  const value = (explanation || '').trim()
  if (!value) return true
  if (/Study concept:/i.test(value)) return true
  if (/For Security\+, recognize/i.test(value)) return true
  if (/connect this term to/i.test(value)) return true
  if (/connect it to this topic focus/i.test(value)) return true
  if (/should be recognized by its full meaning/i.test(value)) return true
  if (/^This is [^.]+[.]?\s*$/i.test(value)) return true
  return false
}

function expandAcronymExplanation(term, memorize) {
  const expanded = memorize.replace(
    new RegExp(`^${escapeRegex(term)} stands for (.+)[.]?$`, 'i'),
    '$1',
  )
  if (expanded !== memorize) {
    return ensureSentence(`${term} (${expanded}) is a Security+ term you should understand in context, not just as an abbreviation.`)
  }
  return ensureSentence(memorize)
}

const CURATED_EXPLANATIONS = {
  Confidentiality:
    'Confidentiality protects information from unauthorized disclosure. Encryption, access controls, and data classification limit who can read sensitive data.',
  Integrity:
    'Integrity ensures data stays accurate and unaltered. Hashing, digital signatures, file integrity monitoring, and change control detect or prevent unauthorized modification.',
  Availability:
    'Availability keeps systems and data reachable when needed. Redundancy, backups, patching, and DDoS mitigation reduce downtime and service interruptions.',
  'Defense in depth':
    'Defense in depth uses multiple independent security layers so one failed control does not expose the entire environment.',
  DLP: 'Data loss prevention monitors data in use, motion, and at rest to block or alert on unauthorized sharing of sensitive information.',
}

function topicContextSentence(topic) {
  const summary = topic.summary?.trim()
  if (!summary) return ''
  if (/^know /i.test(summary)) {
    return ensureSentence(`This topic helps you ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`)
  }
  return ensureSentence(`This fits ${topic.path} because ${summary.charAt(0).toLowerCase()}${summary.slice(1)}`)
}

function expandMemorizeExplanation(term, memorize, topic) {
  if (CURATED_EXPLANATIONS[term]) {
    return CURATED_EXPLANATIONS[term]
  }

  const base = ensureSentence(memorize)
  const context = topicContextSentence(topic)

  if (/^[A-Z]{2,6}$/.test(term.trim()) && /stands for/i.test(memorize)) {
    return expandAcronymExplanation(term, memorize)
  }

  if (/^[A-Z]/.test(base) && !/^Use /i.test(base) && !/^Port /i.test(base)) {
    return context ? dedupeSentences(`${base} ${context}`) : base
  }

  const remainder = base.replace(new RegExp(`^${escapeRegex(term)}\\s*`, 'i'), '').trim()
  const body = remainder || base
  const lead = ensureSentence(`${term} means ${body.charAt(0).toLowerCase()}${body.slice(1)}`)
  return context ? dedupeSentences(`${lead} ${context}`) : lead
}

function isAwkwardExplanation(text) {
  const value = (text || '').trim()
  return (
    /This supports [^]+ because /i.test(value) ||
    /This matters in [^]+ because /i.test(value) ||
    /This fits [^]+ because know /i.test(value)
  )
}

function isFragmentaryExplanation(text) {
  const value = (text || '').trim()
  if (!value) return true
  if (value.length < 25) return true
  if (/^[a-z]/.test(value) && !/^e\.g\./i.test(value)) return true
  if (!/[.!?]$/.test(value) && value.split(/\s+/).length < 12) return true
  if (/^the [a-z]+ (?:property|concept|control|protocol|method)\b/i.test(value)) return true
  if (/fits because the scenario/i.test(value)) return true
  return false
}

function capitalizeExplanation(text) {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}

function buildRealExplanation(term, memorize, topic, questionExplanation) {
  if (CURATED_EXPLANATIONS[term]) {
    return CURATED_EXPLANATIONS[term]
  }

  if (questionExplanation) {
    const cleaned = stripBoilerplate(cleanExplanation(questionExplanation, term))
    const parts = sentences(cleaned).filter((sentence) => !isFragmentaryExplanation(sentence))
    if (parts.length >= 1) {
      const merged = dedupeSentences(parts.slice(0, 3).join(' '))
      if (!isFragmentaryExplanation(merged)) {
        return capitalizeExplanation(ensureSentence(merged))
      }
    }
  }

  return expandMemorizeExplanation(term, memorize, topic)
}

const questionExplanations = new Map()
for (const section of questionsData.sections) {
  for (const question of section.questions) {
    const explanation = (question.explanation || '').trim()
    if (!explanation) continue
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
    for (const answer of answers) {
      const key = normalize(answer)
      if (!questionExplanations.has(key)) {
        questionExplanations.set(key, explanation)
      }
    }
  }
}

const MISSING_TERMS = [
  {
    path: 'Authentication, Authorization, and Accounting (AAA)',
    domain: '1.0 General Security Concepts',
    terms: [
      {
        term: 'Identity proofing',
        memorize: 'Verifies that a person is the real-world identity they claim before an account is created.',
        explanation:
          'Identity proofing confirms someone is who they say they are using documents, biometrics, or trusted verification services before credentials are issued.',
      },
      {
        term: 'Attestation',
        memorize: 'A formal declaration that a system, process, or control meets required standards.',
        explanation:
          'Attestation is evidence that requirements are satisfied, such as a signed compliance statement or device health proof during authentication.',
      },
      {
        term: 'Interoperability',
        memorize: 'Different identity systems can exchange authentication and authorization information reliably.',
        explanation:
          'Interoperability lets SSO and federation work across vendors and domains using shared standards like SAML, OAuth, and OIDC.',
      },
    ],
  },
  {
    path: 'Security Controls > Categories',
    domain: '1.0 General Security Concepts',
    terms: [
      {
        term: 'Managerial control',
        memorize: 'Management-directed security measures such as risk assessments, policies, and oversight.',
        explanation:
          'Managerial controls guide how security is governed and supervised. They include risk management, security planning, and executive accountability.',
      },
    ],
  },
  {
    path: 'Deception and disruption technology',
    domain: '1.0 General Security Concepts',
    summary: 'Honeypots and decoys detect or mislead attackers.',
    terms: [
      {
        term: 'Honeypot',
        memorize: 'A decoy system designed to attract and observe attacker activity.',
        explanation:
          'Honeypots look valuable but are isolated and monitored. They help detect intrusions and study attacker behavior without risking production data.',
      },
      {
        term: 'Honeynet',
        memorize: 'A network of honeypots that simulates a realistic environment.',
        explanation:
          'A honeynet expands deception across multiple systems so analysts can observe lateral movement and tool use in a controlled lab.',
      },
      {
        term: 'Honeyfile',
        memorize: 'A fake file planted to detect unauthorized access.',
        explanation:
          'Honeyfiles are bait documents. Opening or copying them generates alerts because legitimate users should not need them.',
      },
      {
        term: 'Honeytoken',
        memorize: 'Fake credential or data token used to detect misuse.',
        explanation:
          'Honeytokens act as tripwires. Any use of the fake username, API key, or record indicates likely malicious activity or policy violation.',
      },
    ],
  },
  {
    path: 'Cryptographic Solutions > Encryption',
    domain: '1.0 General Security Concepts',
    terms: [
      {
        term: 'Open public ledger',
        memorize: 'A distributed record visible to participants and resistant to undetected tampering.',
        explanation:
          'An open public ledger lets participants verify transactions or entries without a single trusted editor. Blockchain is a common implementation.',
      },
      {
        term: 'Secure enclave',
        memorize: 'Protected processor area that isolates keys and sensitive computations from the main OS.',
        explanation:
          'Secure enclaves reduce exposure of cryptographic material even if the operating system is compromised.',
      },
    ],
  },
  {
    path: 'Change Management Processes > Business processes impacting security operation',
    domain: '5.0 Security Program Management and Oversight',
    terms: [
      { term: 'Approval process', memorize: 'Formal review and sign-off before a change is implemented.' },
      { term: 'Backout plan', memorize: 'Steps to reverse a change if it fails or creates risk.' },
      { term: 'Ownership', memorize: 'Assigned accountability for approving, testing, and supporting a change.' },
      { term: 'Stakeholders', memorize: 'People or teams affected by or responsible for a change.' },
    ],
  },
  {
    path: 'Threat actors',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      {
        term: 'Shadow IT',
        memorize: 'Technology deployed or used without official IT approval.',
        explanation:
          'Shadow IT increases risk because unmanaged systems may lack patching, monitoring, backups, or policy enforcement.',
      },
    ],
  },
  {
    path: 'Vectors and Attack Surfaces > Message-based',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      { term: 'Brand impersonation', memorize: 'Attackers mimic a trusted brand to trick victims.' },
      { term: 'Misinformation/disinformation', memorize: 'False or misleading content used to manipulate decisions or behavior.' },
      { term: 'Impersonation', memorize: 'Pretending to be a trusted person, brand, or service.' },
    ],
  },
  {
    path: 'Malicious Activity > Malware attacks',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      { term: 'Bloatware', memorize: 'Unwanted preinstalled or bundled software that expands attack surface.' },
      { term: 'Keylogger', memorize: 'Malware or device that records keystrokes to steal credentials or data.' },
      { term: 'Logic bomb', memorize: 'Malicious code that executes when a specific condition is met.' },
    ],
  },
  {
    path: 'Malicious Activity > Indicators',
    domain: '2.0 Threats, Vulnerabilities, and Mitigations',
    terms: [
      { term: 'Account lockout', memorize: 'Repeated failed logins trigger account disablement.' },
      { term: 'Blocked content', memorize: 'Security controls stop access to known malicious or policy-violating material.' },
      { term: 'Concurrent session usage', memorize: 'Same account active from multiple sessions at once.' },
      { term: 'Resource consumption', memorize: 'Unusual CPU, memory, or bandwidth use may indicate attack activity.' },
      { term: 'Missing logs', memorize: 'Absent expected log entries may suggest tampering or anti-forensics.' },
    ],
  },
  {
    path: 'Vulnerability Management > Vulnerability response and remediation',
    domain: '4.0 Security Operations',
    terms: [
      {
        term: 'Validation of remediation',
        memorize: 'Confirming that a fix actually removed or mitigated the vulnerability.',
        explanation:
          'After patching or mitigation, teams rescan or retest to verify the issue is resolved and no new weakness was introduced.',
      },
      {
        term: 'Vulnerability reporting',
        memorize: 'Documenting findings, severity, owners, and remediation status.',
        explanation:
          'Reporting gives leadership and operations teams visibility into open risk and tracks progress toward closure.',
      },
    ],
  },
  {
    path: 'Enterprise Capabilities > IDS/IPS',
    domain: '4.0 Security Operations',
    terms: [
      {
        term: 'Email security',
        memorize: 'Controls that filter malicious email, enforce TLS, and protect against phishing and spoofing.',
        explanation:
          'Email security includes gateways, SPF/DKIM/DMARC, attachment sandboxing, and user reporting workflows.',
      },
      {
        term: 'UTM',
        memorize: 'Unified Threat Management combines firewall, IPS, AV, and other protections in one appliance.',
        explanation:
          'UTM devices consolidate several perimeter controls for smaller environments, though they can become a single point of failure.',
      },
    ],
  },
  {
    path: 'Security Awareness > Execution',
    domain: '5.0 Security Program Management and Oversight',
    terms: [
      {
        term: 'Development',
        memorize: 'Designing and updating awareness content, campaigns, and role-based training.',
        explanation:
          'Development is the planning stage of an awareness program: choosing topics, formats, audiences, and success measures before delivery.',
      },
    ],
  },
  {
    path: 'Risk Management > Risk assessment',
    domain: '5.0 Security Program Management and Oversight',
    terms: [
      {
        term: 'Due diligence',
        memorize: 'Reasonable investigation to identify and reduce risk before committing to a decision.',
        explanation:
          'Due diligence appears in vendor selection, mergers, and compliance scenarios where organizations must show they assessed risk responsibly.',
      },
    ],
  },
  {
    path: 'Architecture Models > Architecture and infrastructure concepts',
    domain: '3.0 Security Architecture',
    terms: [
      {
        term: 'Infrastructure as code (IaC)',
        memorize: 'Infrastructure defined and deployed through machine-readable templates.',
        explanation:
          'IaC enables repeatable, auditable environments, but misconfigurations in templates can spread quickly across cloud deployments.',
      },
      {
        term: 'SD-WAN',
        memorize: 'Software-defined WAN that routes traffic across multiple links with centralized policy.',
        explanation:
          'SD-WAN improves resilience and can enforce encrypted transport, but policy mistakes can expose internal resources.',
      },
      {
        term: 'Embedded systems',
        memorize: 'Special-purpose computing built into devices with limited patching and monitoring.',
        explanation:
          'Embedded systems in IoT and ICS often have long lifecycles, making firmware updates and network isolation critical.',
      },
    ],
  },
]

function findTopic(path) {
  return conceptsData.topics.find((topic) => topic.path === path)
}

function addMissingTerms() {
  let added = 0
  for (const group of MISSING_TERMS) {
    let topic = findTopic(group.path)
    if (!topic) {
      topic = {
        id: `topic-${String(conceptsData.topics.length + 1).padStart(3, '0')}`,
        path: group.path,
        domain: group.domain,
        summary: group.summary || `Key concepts from ${group.path}.`,
        terms: [],
      }
      conceptsData.topics.push(topic)
    }

    const existing = new Set(topic.terms.map((term) => normalize(term.term)))
    for (const entry of group.terms) {
      if (existing.has(normalize(entry.term))) continue
      topic.terms.push({
        term: entry.term,
        memorize: entry.memorize,
        explanation: entry.explanation || expandMemorizeExplanation(entry.term, entry.memorize, topic),
      })
      added += 1
    }
  }
  return added
}

let fixed = 0
let kept = 0

for (const topic of conceptsData.topics) {
  for (const entry of topic.terms) {
    const current = entry.explanation || ''
    const questionExplanation = questionExplanations.get(normalize(entry.term))

    if (
      CURATED_EXPLANATIONS[entry.term] ||
      isBoilerplateExplanation(current) ||
      isFragmentaryExplanation(current) ||
      isAwkwardExplanation(current)
    ) {
      entry.explanation = buildRealExplanation(
        entry.term,
        entry.memorize || current,
        topic,
        questionExplanation,
      )
      fixed += 1
      continue
    }

    const cleaned = stripBoilerplate(current)
    if (cleaned !== current) {
      entry.explanation = cleaned
      fixed += 1
    } else {
      kept += 1
    }
  }
}

const addedTerms = addMissingTerms()
conceptsData.topicCount = conceptsData.topics.length
conceptsData.termCount = conceptsData.topics.reduce((sum, topic) => sum + topic.terms.length, 0)
conceptsData.description =
  'Expanded Security+ SY0-701 study concepts with real explanations sourced from exam objectives, scenarios, and practice materials.'

fs.writeFileSync('public/concepts.json', `${JSON.stringify(conceptsData, null, 2)}\n`)

const remainingBoilerplate = conceptsData.topics
  .flatMap((topic) => topic.terms)
  .filter((entry) => isBoilerplateExplanation(entry.explanation))

console.log(
  JSON.stringify(
    {
      fixedExplanations: fixed,
      keptGoodExplanations: kept,
      addedTerms,
      topicCount: conceptsData.topicCount,
      termCount: conceptsData.termCount,
      remainingBoilerplate: remainingBoilerplate.length,
      samples: remainingBoilerplate.slice(0, 8).map((entry) => ({
        term: entry.term,
        explanation: entry.explanation?.slice(0, 120),
      })),
    },
    null,
    2,
  ),
)
