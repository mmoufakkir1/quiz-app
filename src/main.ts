import './style.css'

type Question = {
  id: number
  type?: 'single' | 'multiple'
  scenario?: string
  question: string
  options: string[]
  answer: string | string[]
  explanation?: string
  topic: string
  lesson?: string
  section: string
}

type QuestionSection = {
  name: string
  questions: Omit<Question, 'section'>[]
}

type QuizData = {
  sections: QuestionSection[]
}

type FlashcardData = {
  flashcards: Flashcard[]
}

type SectionGroup = {
  name: string
  sectionNames: string[]
}

type Flashcard = {
  term: string
  front: string
  hint: string
  definition: string
  keyDetails: string
  example: string
  memoryHook: string
  domains: string[]
  topics?: string[]
  aliases?: string[]
  sourceQuestionIds?: number[]
}

type ConceptTerm = {
  term: string
  memorize: string
  explanation: string
  inFlashcards: boolean
}

type ConceptTopic = {
  id: string
  path: string
  domain: string
  summary: string
  terms: ConceptTerm[]
}

type ConceptData = {
  description?: string
  topics: ConceptTopic[]
  topicCount: number
  termCount: number
}

type ConceptStudyItem = ConceptTerm & {
  topicPath: string
  domain: string
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    name: 'CompTIA Exam Domains',
    sectionNames: [
      '1.0 General Security Concepts',
      '2.0 Threats, Vulnerabilities, and Mitigations',
      '3.0 Security Architecture',
      '4.0 Security Operations',
      '5.0 Security Program Management and Oversight',
    ],
  },
]

const FALLBACK_SECTION_TOPICS: Record<string, string> = {
  '1.0 General Security Concepts': '1.0 General Security Concepts',
  '2.0 Threats, Vulnerabilities, and Mitigations': '2.0 Threats, Vulnerabilities, and Mitigations',
  '3.0 Security Architecture': '3.0 Security Architecture',
  '4.0 Security Operations': '4.0 Security Operations',
  '5.0 Security Program Management and Oversight': '5.0 Security Program Management and Oversight',
}

function getExplanation(q: Question): string {
  const existing = q.explanation?.trim()
  if (existing) return existing

  const section = `${q.section} ${q.lesson ?? ''}`.toLowerCase()
  const answer = getCorrectAnswers(q).join(', ')

  if (section.includes('ports and protocols')) {
    return `${answer} is the standard port or port pair for the service described in the scenario. The other choices belong to different services.`
  }

  if (section.includes('linux commands')) {
    return explainLinuxCommand(answer)
  }

  if (section.includes('nmap commands')) {
    return explainNmapOption(answer)
  }

  if (section.includes('incident response')) {
    return `This is the correct incident response choice because it best matches the phase or action described in the scenario. The other options fit different stages of the lifecycle.`
  }

  if (section.includes('risk management')) {
    return `This is correct because it reflects the next risk management step for the situation described. The distractors describe other parts of the process.`
  }

  if (section.includes('vulnerability management')) {
    return `This is correct because it best matches the scan type, control, or response needed for the situation. The other options do not provide the same level of visibility or protection.`
  }

  return `${answer} is correct because it best fits the scenario. The other choices describe different tools, controls, or phases.`
}

function explainLinuxCommand(answer: string): string {
  const explanations: Record<string, string> = {
    'ls': 'ls lists the files and folders in the current directory.',
    'ls -R': 'ls -R lists directory contents recursively through subfolders.',
    'ls -a': 'ls -a shows all files, including hidden files that start with a dot.',
    'ls -al': 'ls -al shows a long listing and includes hidden files.',
    'ls -l': 'ls -l shows files in long format with details like permissions, owner, and size.',
    'cd <location>': 'cd changes the current working directory to the location you specify.',
    'cd ..': 'cd .. moves up one directory level to the parent folder.',
    'cd ~': 'cd ~ changes to the user\'s home directory.',
    'cd /': 'cd / changes to the root directory.',
    'touch <filename>': 'touch creates a new empty file or updates the timestamp on an existing file.',
    'cat <filename>': 'cat displays the contents of a file in the terminal.',
    'cat <file1> <file2> > <file3>': 'cat can concatenate multiple files and redirect the output into a new file.',
    'mv <file> <path>': 'mv moves a file to a new path.',
    'mv <old-name> <new-name>': 'mv can also rename a file by moving it to a new name.',
    'sudo <command>': 'sudo runs a command with elevated privileges when the user is authorized.',
    'rm <filename>': 'rm removes a file from the filesystem.',
    'man <command>': 'man opens the manual page for a command.',
    'history': 'history shows previously entered shell commands.',
    'clear': 'clear wipes the terminal display for a cleaner view.',
    'mkdir <directory>': 'mkdir creates a new directory.',
    'rmdir <directory>': 'rmdir removes an empty directory.',
    'pr -<columns> <filename>': 'pr formats a file for printing and can control page layout.',
    'lpr <filename>': 'lpr sends a file to the default printer queue.',
    'lp -n <copies> <filename>': 'lp prints a file and lets you specify the number of copies.',
    'lp -d <printer> <filename>': 'lp prints a file to the printer you name with -d.',
    'apt-get install <package>': 'apt-get install installs a package on Debian-based Linux systems.',
    'locate <filename>': 'locate searches a prebuilt database to find file paths quickly.',
    'grep <pattern> <files>': 'grep searches files for a matching text pattern.',
    'grep -r <pattern> <directory>': 'grep -r searches for a pattern recursively through a directory tree.',
    'grep -i <pattern> <files>': 'grep -i ignores letter case when searching for a pattern.',
    'find <directory> -name <name>': 'find searches the filesystem for files that match the name you specify.',
    'chown <user> <filename>': 'chown changes the owner of a file.',
    'chown <user>:<group> <filename>': 'chown can change both the owner and the group of a file.',
    'ssh <user>@<host>': 'ssh opens a secure remote shell session to another host.',
    'put <file>': 'put uploads a local file to a remote system in an interactive file-transfer session.',
    'get <file>': 'get downloads a remote file to the local system in an interactive file-transfer session.',
    'quit': 'quit exits the interactive session or shell utility.',
    'ping <host>': 'ping sends ICMP echo requests to test reachability and latency.',
    'ip a': 'ip a displays IP addresses and interface details on Linux.',
    'ifconfig': 'ifconfig shows network interface configuration on older Linux systems.',
    'bg': 'bg sends a stopped job to the background.',
    'fg': 'fg brings a background job back to the foreground.',
    'top': 'top shows live system processes and resource usage.',
    'ps': 'ps lists running processes.',
    'kill <PID>': 'kill terminates a process by process ID.',
    'nice <command>': 'nice starts a command with a lower or higher scheduling priority.',
    'renice -n <priority> <PID>': 'renice changes the priority of an already running process.',
    'df': 'df shows available disk space on mounted filesystems.',
    'free': 'free shows memory usage, including RAM and swap.',
    'i': 'i enters insert mode in vi or vim.',
    'a': 'a appends text after the cursor in vi or vim.',
    'A': 'A appends text at the end of the current line in vi or vim.',
    'Esc': 'Esc leaves insert mode and returns to command mode in vi or vim.',
    'u': 'u undoes the most recent change in vi or vim.',
    'U': 'U restores the current line in vi or vim.',
    'o': 'o opens a new line below the current line and enters insert mode.',
    'dd': 'dd deletes the current line in vi or vim.',
    '3dd': '3dd deletes three lines starting at the current line in vi or vim.',
    'D': 'D deletes from the cursor to the end of the line in vi or vim.',
    'C': 'C changes from the cursor to the end of the line in vi or vim.',
    'dw': 'dw deletes from the cursor to the end of the current word.',
    '4dw': '4dw deletes four words starting at the cursor position.',
    'cw': 'cw changes from the cursor to the end of the current word.',
    'x': 'x deletes the character under the cursor.',
    'r': 'r replaces the character under the cursor with a new one.',
    'R': 'R enters replace mode so new text overwrites existing text.',
    's': 's deletes the character under the cursor and enters insert mode.',
    'S': 'S deletes the current line and enters insert mode.',
    '~': '~ toggles the case of the selected character in vi or vim.',
  }

  return explanations[answer] ?? `The ${answer} command is the correct Linux tool for the task described in the scenario.`
}

function explainNmapOption(answer: string): string {
  const explanations: Record<string, string> = {
    '-sS': '-sS performs a TCP SYN scan, which is a common stealthier scan type.',
    '-sT': '-sT performs a full TCP connect scan using the operating system\'s normal connection process.',
    '-sU': '-sU performs a UDP scan.',
    '-sP': '-sP performs host discovery to identify live systems.',
    '-sL': '-sL lists targets without performing a port scan.',
    '-sn': '-sn performs host discovery only and skips the port scan.',
    '-p <ports>': '-p lets you specify exactly which ports Nmap should scan.',
    '-F': '-F performs a faster scan by checking only the most common ports.',
    '-r': '-r scans ports sequentially instead of randomizing the order.',
    '-sV': '-sV probes open ports to identify service versions.',
    '--version-intensity <0-9>': '--version-intensity controls how aggressively Nmap probes for service versions.',
    '--version-all': '--version-all uses every version-detection probe Nmap has.',
    '--version-trace': '--version-trace shows the version-detection process in detail.',
    '-f': '-f fragments packets to help bypass some filtering devices.',
    '-D <decoys>': '-D adds decoy hosts so the scan appears to come from multiple sources.',
    '-D RND:10': '-D RND:10 uses 10 randomly generated decoy hosts.',
    '-S <source-ip>': '-S spoofs the source IP address of the scan.',
    '-e <interface>': '-e selects the network interface to use for the scan.',
    '-g <port>': '-g sets the source port for the scan packets.',
    '--source-port <port>': '--source-port explicitly sets the source port.',
    '--proxies <URLs>': '--proxies routes traffic through specified proxy servers.',
    '--data-length <bytes>': '--data-length pads packets with extra data bytes.',
    '--ip-options <options>': '--ip-options adds custom IP header options.',
    '--ttl <value>': '--ttl sets the packet time-to-live value.',
    '--spoof-mac <value>': '--spoof-mac falsifies the MAC address used by the scan.',
    '-T<0-5>': '-T<0-5> sets the scan timing template.',
    '--min-rate <rate>': '--min-rate sets the minimum packets per second Nmap should send.',
    '--max-rate <rate>': '--max-rate limits the maximum packet rate.',
    '--script ipidseq': '--script ipidseq runs a script that checks IP ID sequence behavior.',
    '--script http-honeypot': '--script http-honeypot helps identify fake or deceptive HTTP services.',
    '--script ftp-proftpd-backdoor': '--script ftp-proftpd-backdoor checks for a known ProFTPD backdoor.',
    '-O': '-O performs operating system detection.',
    '--osscan-limit': '--osscan-limit restricts OS detection to promising targets.',
    '--osscan-guess': '--osscan-guess increases the chance of guessing the OS when detection is uncertain.',
    '--os-fingerprint': '--os-fingerprint prints the OS fingerprint information.',
    '-iL <file>': '-iL reads targets from a file.',
    '-iR <count>': '-iR generates random targets to scan.',
    '-6': '-6 enables IPv6 scanning.',
    '-A': '-A enables aggressive detection, including OS, version, script, and traceroute checks.',
    '--script <script>': '--script runs the specified Nmap NSE script.',
    '--script-args <args>': '--script-args passes arguments to an NSE script.',
    '--script-help <script>': '--script-help shows help for a specific NSE script.',
    '--script-updatedb': '--script-updatedb refreshes the NSE script database.',
    '-sY': '-sY performs an SCTP INIT scan.',
    '-sZ': '-sZ performs an SCTP COOKIE-ECHO scan.',
    '-sO': '-sO performs an IP protocol scan.',
    '--traceroute': '--traceroute maps the route packets take to the target.',
    '--reason': '--reason explains why Nmap marked a port or host in a particular state.',
    '--badsum': '--badsum sends packets with invalid checksums for testing defenses.',
    '-PR': '-PR uses ARP ping to discover hosts on a local network.',
    '--top-ports <count>': '--top-ports scans the most common ports by frequency.',
    '--open': '--open shows only open ports in the results.',
    '-oN <file>': '-oN writes results to normal format output.',
    '-oX <file>': '-oX writes results in XML format.',
    '-oS <file>': '-oS writes results in a script-kiddie style output format.',
    '-oG <file>': '-oG writes results in grepable format.',
    '-oA <basename>': '-oA saves output in all major formats with the same basename.',
    '-v': '-v increases verbosity so Nmap prints more detail.',
    '-d': '-d enables debugging output.',
    '--packet-trace': '--packet-trace shows raw packets that Nmap sends and receives.',
    '--iflist': '--iflist lists available network interfaces and routes.',
  }

  return explanations[answer] ?? `The ${answer} Nmap option is the correct flag for the scan behavior described in the scenario.`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

let sections: QuestionSection[] = []
let questions: Question[] = []
let flashcards: Flashcard[] = []
let allFlashcards: Flashcard[] = []
let allConceptTopics: ConceptTopic[] = []
let conceptStudyItems: ConceptStudyItem[] = []
let conceptTermCount = 0
let conceptDescription = ''
let loaded = false
let pendingSectionNames = new Set<string>()

type AppState = {
  selectedSection: string | null
  mode: 'practice' | 'timed-test' | 'flashcards' | 'concepts'
  conceptsView: 'topics' | 'study'
  activeConceptTopicId: string | null
  conceptRevealed: boolean
  currentIndex: number
  flashcardRevealed: boolean
  responses: {
    selectedIndexes: number[]
    answered: boolean
  }[]
  score: number
  finished: boolean
  timedOut: boolean
  durationSeconds: number | null
  endsAt: number | null
}

let state: AppState = {
  selectedSection: null,
  mode: 'practice',
  conceptsView: 'topics',
  activeConceptTopicId: null,
  conceptRevealed: false,
  currentIndex: 0,
  flashcardRevealed: false,
  responses: [],
  score: 0,
  finished: false,
  timedOut: false,
  durationSeconds: null,
  endsAt: null,
}

let timerHandle: number | null = null

const TIMED_TEST_QUESTION_COUNT = 90
const TIMED_TEST_DURATION_SECONDS = 90 * 60

function render() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  if (!loaded) {
    app.innerHTML = `<div class="quiz-container question-container"><p style="color:var(--text-muted)">Loading questions...</p></div>`
    return
  }

  if (state.selectedSection === null) {
    renderSectionSelection(app)
    return
  }

  if (state.finished && state.mode === 'flashcards') {
    renderFlashcardsFinished(app)
  } else if (state.finished && state.mode === 'concepts') {
    renderConceptsFinished(app)
  } else if (state.finished) {
    renderFinished(app)
  } else if (state.mode === 'concepts' && state.conceptsView === 'topics') {
    renderConceptTopics(app)
  } else if (state.mode === 'concepts') {
    renderConceptStudy(app, conceptStudyItems[state.currentIndex])
  } else if (state.mode === 'flashcards') {
    renderFlashcard(app, flashcards[state.currentIndex])
  } else {
    renderQuestion(app, questions[state.currentIndex])
  }
}

function renderSectionSelection(app: HTMLDivElement) {
  const totalQuestions = sections.reduce((total, section) => total + section.questions.length, 0)
  const allSelected = pendingSectionNames.size === sections.length
  const selectedQuestionCount = sections
    .filter((section) => pendingSectionNames.has(section.name))
    .reduce((total, section) => total + section.questions.length, 0)
  const sectionGroups = getOrganizedSectionGroups()
  const allSectionsButton = `
    <button
      class="section-card all-sections ${allSelected ? 'selected' : ''}"
      data-section="all"
      aria-pressed="${allSelected}"
      type="button"
    >
      <span class="section-card-details">
        <span class="section-checkbox" aria-hidden="true"></span>
        <span class="section-card-name">All Sections</span>
      </span>
      <span class="section-card-count">${totalQuestions} questions</span>
    </button>
  `
  const timedTestButton = `
    <button class="timed-test-card" type="button">
      <span>
        <strong>90-question timed test</strong>
        <span>Random mix from all sections · 1 hr 30 min</span>
      </span>
      <span class="timed-test-count">${Math.min(TIMED_TEST_QUESTION_COUNT, totalQuestions)} questions</span>
    </button>
  `
  const flashcardsButton = `
    <button class="flashcard-launch-card" type="button">
      <span>
        <strong>Flashcards All</strong>
        <span>Definition prompt → recall the term</span>
      </span>
      <span class="timed-test-count">${allFlashcards.length} cards</span>
    </button>
  `
  const conceptsButton = `
    <button class="concepts-launch-card" type="button">
      <span>
        <strong>Concepts by Topic</strong>
        <span>Browse exam topics and memorize key terms</span>
      </span>
      <span class="timed-test-count">${allConceptTopics.length} topics</span>
    </button>
  `
  const sectionGroupsHtml = sectionGroups
    .map((group) => {
      const groupQuestionCount = group.sections.reduce(
        (total, section) => total + section.questions.length,
        0,
      )
      const sectionButtons = group.sections
        .map((section) => renderSectionCard(section))
        .join('')

      return `
        <section class="section-group" aria-labelledby="${escapeHtml(group.id)}">
          <div class="section-group-header">
            <h2 id="${escapeHtml(group.id)}">${escapeHtml(group.name)}</h2>
            <span>${group.sections.length} sections · ${groupQuestionCount} questions</span>
          </div>
          <div class="section-grid">
            ${sectionButtons}
          </div>
        </section>
      `
    })
    .join('')

  app.innerHTML = `
    <div class="quiz-container selection-container">
      <div class="selection-header">
        <p class="section-label">CompTIA Security+ SY0-701</p>
        <h1>Choose Quiz Sections</h1>
        <p>Pick one or more official exam domains before starting.</p>
      </div>
      <div class="timed-test-panel">
        ${timedTestButton}
        ${flashcardsButton}
        ${conceptsButton}
      </div>
      <div class="section-grid all-section-grid">
        ${allSectionsButton}
      </div>
      <div class="section-groups">
        ${sectionGroupsHtml}
      </div>
      <div class="selection-actions">
        <span class="selection-summary">
          ${pendingSectionNames.size} selected · ${selectedQuestionCount} questions
        </span>
        <button class="btn start-quiz-btn" ${pendingSectionNames.size === 0 ? 'disabled' : ''}>
          Start Quiz
        </button>
      </div>
    </div>
  `

  app.querySelectorAll<HTMLButtonElement>('.section-card').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionName = button.dataset.section!
      if (sectionName === 'all') {
        pendingSectionNames = allSelected
          ? new Set<string>()
          : new Set(sections.map((section) => section.name))
      } else if (pendingSectionNames.has(sectionName)) {
        pendingSectionNames.delete(sectionName)
      } else {
        pendingSectionNames.add(sectionName)
      }
      render()
    })
  })

  app.querySelector('.start-quiz-btn')?.addEventListener('click', () => {
    startQuiz([...pendingSectionNames])
  })

  app.querySelector('.timed-test-card')?.addEventListener('click', () => {
    startTimedTest()
  })

  app.querySelector('.flashcard-launch-card')?.addEventListener('click', () => {
    startFlashcards()
  })

  app.querySelector('.concepts-launch-card')?.addEventListener('click', () => {
    startConcepts()
  })
}

function renderSectionCard(section: QuestionSection): string {
  return `
    <button
      class="section-card ${pendingSectionNames.has(section.name) ? 'selected' : ''}"
      data-section="${escapeHtml(section.name)}"
      aria-pressed="${pendingSectionNames.has(section.name)}"
      type="button"
    >
      <span class="section-card-details">
        <span class="section-checkbox" aria-hidden="true"></span>
        <span class="section-card-name">${escapeHtml(section.name)}</span>
      </span>
      <span class="section-card-count">${section.questions.length} questions</span>
    </button>
  `
}

function getOrganizedSectionGroups() {
  const sectionsByName = new Map(sections.map((section) => [section.name, section]))
  const assignedSectionNames = new Set<string>()
  const organizedGroups = SECTION_GROUPS
    .map(
      (group) => ({
        id: `section-group-${group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: group.name,
        sections: group.sectionNames.flatMap((sectionName) => {
          const section = sectionsByName.get(sectionName)
          if (!section) return []
          assignedSectionNames.add(sectionName)
          return [section]
        }),
      }),
    )
    .filter((group) => group.sections.length > 0)

  const uncategorizedSections = sections.filter((section) => !assignedSectionNames.has(section.name))
  if (uncategorizedSections.length === 0) return organizedGroups

  return [
    ...organizedGroups,
    {
      id: 'section-group-other',
      name: 'Other',
      sections: uncategorizedSections,
    },
  ]
}

function startQuiz(sectionNames: string[]) {
  stopTimer()
  const selectedSections = sections.filter((section) => sectionNames.includes(section.name))

  questions = selectedSections.flatMap((section) =>
    section.questions.map((question) => ({
      ...question,
      topic: question.topic || FALLBACK_SECTION_TOPICS[section.name] || '1.0 General Security Concepts',
      section: section.name,
    })),
  ).sort(compareQuestionsForStudy)

  state = {
    selectedSection:
      selectedSections.length === sections.length
        ? 'All Sections'
        : selectedSections.map((section) => section.name).join(', '),
    mode: 'practice',
    conceptsView: 'topics',
    activeConceptTopicId: null,
    conceptRevealed: false,
    currentIndex: 0,
    flashcardRevealed: false,
    responses: questions.map(() => ({
      selectedIndexes: [],
      answered: false,
    })),
    score: 0,
    finished: false,
    timedOut: false,
    durationSeconds: null,
    endsAt: null,
  }
  render()
}

function startTimedTest() {
  stopTimer()
  questions = buildTimedTestQuestions()
  const now = Date.now()
  state = {
    selectedSection: '90-question timed test',
    mode: 'timed-test',
    conceptsView: 'topics',
    activeConceptTopicId: null,
    conceptRevealed: false,
    currentIndex: 0,
    flashcardRevealed: false,
    responses: questions.map(() => ({
      selectedIndexes: [],
      answered: false,
    })),
    score: 0,
    finished: false,
    timedOut: false,
    durationSeconds: TIMED_TEST_DURATION_SECONDS,
    endsAt: now + TIMED_TEST_DURATION_SECONDS * 1000,
  }
  startTimer()
  render()
}

function startFlashcards() {
  stopTimer()
  questions = []
  flashcards = shuffleArray(allFlashcards)
  state = {
    selectedSection: 'Flashcards All',
    mode: 'flashcards',
    conceptsView: 'topics',
    activeConceptTopicId: null,
    conceptRevealed: false,
    currentIndex: 0,
    flashcardRevealed: false,
    responses: [],
    score: 0,
    finished: false,
    timedOut: false,
    durationSeconds: null,
    endsAt: null,
  }
  render()
}

function getNextConceptTopicId(topicId: string | null): string | null {
  if (!topicId) return null
  const index = allConceptTopics.findIndex((topic) => topic.id === topicId)
  if (index < 0 || index >= allConceptTopics.length - 1) return null
  return allConceptTopics[index + 1]?.id ?? null
}

function returnToConceptTopics() {
  state.conceptsView = 'topics'
  state.activeConceptTopicId = null
  state.conceptRevealed = false
  state.currentIndex = 0
  state.finished = false
  state.selectedSection = 'Concepts'
  window.scrollTo(0, 0)
  render()
}

function startConcepts() {
  stopTimer()
  questions = []
  flashcards = []
  conceptStudyItems = []
  state = {
    selectedSection: 'Concepts',
    mode: 'concepts',
    conceptsView: 'topics',
    activeConceptTopicId: null,
    conceptRevealed: false,
    currentIndex: 0,
    flashcardRevealed: false,
    responses: [],
    score: 0,
    finished: false,
    timedOut: false,
    durationSeconds: null,
    endsAt: null,
  }
  render()
}

function startConceptStudy(topicId: string | null) {
  const topic = topicId ? allConceptTopics.find((entry) => entry.id === topicId) : null
  const items: ConceptStudyItem[] = topic
    ? topic.terms.map((term) => ({
        ...term,
        topicPath: topic.path,
        domain: topic.domain,
      }))
    : allConceptTopics.flatMap((entry) =>
        entry.terms.map((term) => ({
          ...term,
          topicPath: entry.path,
          domain: entry.domain,
        })),
      )

  conceptStudyItems = shuffleArray(items)
  state = {
    ...state,
    conceptsView: 'study',
    activeConceptTopicId: topicId,
    conceptRevealed: false,
    currentIndex: 0,
    finished: false,
    selectedSection: topic ? topic.path : 'All concept terms',
  }
  window.scrollTo(0, 0)
  render()
}

function getConceptTopicsByDomain() {
  const groups = new Map<string, ConceptTopic[]>()
  for (const topic of allConceptTopics) {
    const list = groups.get(topic.domain) ?? []
    list.push(topic)
    groups.set(topic.domain, list)
  }
  return [...groups.entries()].map(([domain, topics]) => ({ domain, topics }))
}

function renderConceptTopics(app: HTMLDivElement) {
  const domainGroups = getConceptTopicsByDomain()
  const groupsHtml = domainGroups
    .map(({ domain, topics }) => {
      const topicButtons = topics
        .map(
          (topic) => `
            <button class="concept-topic-card" type="button" data-topic-id="${escapeHtml(topic.id)}">
              <span class="concept-topic-card-body">
                <strong>${escapeHtml(topic.path)}</strong>
                <span>${escapeHtml(topic.summary)}</span>
              </span>
              <span class="concept-topic-count">${topic.terms.length} terms</span>
            </button>
          `,
        )
        .join('')

      return `
        <section class="section-group" aria-labelledby="${escapeHtml(domain)}">
          <div class="section-group-header">
            <h2 id="${escapeHtml(domain)}">${escapeHtml(domain)}</h2>
            <span>${topics.length} topics</span>
          </div>
          <div class="concept-topic-grid">
            ${topicButtons}
          </div>
        </section>
      `
    })
    .join('')

  app.innerHTML = `
    <div class="quiz-container selection-container concepts-container">
      <div class="selection-header">
        <p class="section-label">CompTIA Security+ SY0-701</p>
        <h1>Concepts by Topic</h1>
        <p>${allConceptTopics.length} exam topics · ${conceptTermCount} terms to memorize</p>
      </div>
      <div class="concept-actions">
        <button class="btn study-all-concepts-btn" type="button">Study all ${conceptTermCount} terms</button>
        <button class="btn secondary-btn header-section-btn" type="button">Back to Home</button>
      </div>
      <div class="concepts-intro">
        <p class="concepts-intro-lead">${escapeHtml(conceptDescription)}</p>
        <p>Each topic lists the terms CompTIA expects you to know. Study them like flashcards:</p>
        <ol class="concepts-intro-steps">
          <li>Pick a topic below (or study all terms at once).</li>
          <li>Read the <strong>memorize</strong> prompt and recall the <strong>term</strong> in your head.</li>
          <li>Tap the card or <strong>Reveal</strong> to check your answer.</li>
          <li>Use <strong>Next Topic</strong> at the end to continue through the outline in order.</li>
        </ol>
      </div>
      <div class="section-groups">
        ${groupsHtml}
      </div>
    </div>
  `

  app.querySelector('.study-all-concepts-btn')!.addEventListener('click', () => {
    startConceptStudy(null)
  })

  app.querySelector('.header-section-btn')!.addEventListener('click', () => {
    state.selectedSection = null
    conceptStudyItems = []
    render()
  })

  app.querySelectorAll<HTMLButtonElement>('.concept-topic-card').forEach((button) => {
    button.addEventListener('click', () => {
      startConceptStudy(button.dataset.topicId!)
    })
  })
}

function renderConceptStudy(app: HTMLDivElement, item: ConceptStudyItem | undefined) {
  if (!item) {
    state.finished = true
    render()
    return
  }

  const progress = `${state.currentIndex + 1} / ${conceptStudyItems.length}`
  const flashcardBadge = item.inFlashcards
    ? '<span class="concept-flashcard-badge">In flashcards</span>'
    : ''
  const nextTopicId = getNextConceptTopicId(state.activeConceptTopicId)
  const isLastCard = state.currentIndex >= conceptStudyItems.length - 1
  const nextButtonLabel = isLastCard
    ? nextTopicId
      ? 'Next Topic'
      : 'Topics'
    : 'Next'

  app.innerHTML = `
    <div class="quiz-container question-container flashcard-container concept-study-container">
      <div class="quiz-header">
        <div class="quiz-status">
          <span class="progress">${escapeHtml(progress)}</span>
          <span class="score">Concept study</span>
        </div>
        <button class="header-section-btn" type="button">Topics</button>
      </div>
      <p class="section-label">${escapeHtml(item.topicPath)}</p>
      <button class="flashcard concept-card" type="button" aria-pressed="${state.conceptRevealed}">
        <span class="flashcard-kicker">${state.conceptRevealed ? 'Term' : 'Memorize'}</span>
        <span class="flashcard-answer">${escapeHtml(state.conceptRevealed ? item.term : item.memorize)}</span>
        ${
          state.conceptRevealed
            ? '<span class="flashcard-meta">Tap to return to the prompt.</span>'
            : '<span class="flashcard-meta">Recall the term, then tap to reveal.</span>'
        }
      </button>
      ${
        state.conceptRevealed
          ? `
            <div class="flashcard-details">
              <div class="flashcard-domains"><span>${escapeHtml(item.domain)}</span></div>
              ${flashcardBadge}
              <div class="flashcard-back-section">
                <p class="flashcard-back-label">Explanation</p>
                <p class="flashcard-back-text">${escapeHtml(item.explanation)}</p>
              </div>
              <div class="flashcard-back-section">
                <p class="flashcard-back-label">Topic</p>
                <p class="flashcard-back-text">${escapeHtml(item.topicPath)}</p>
              </div>
            </div>
          `
          : ''
      }
      <div class="actions">
        ${state.currentIndex > 0 ? '<button class="btn secondary-btn back-concept-btn">Back</button>' : ''}
        <button class="btn secondary-btn shuffle-concept-btn">Shuffle</button>
        <button class="btn reveal-card-btn">${state.conceptRevealed ? 'Hide' : 'Reveal'}</button>
        <button class="btn next-card-btn">${nextButtonLabel}</button>
      </div>
    </div>
  `

  app.querySelector('.header-section-btn')!.addEventListener('click', () => {
    returnToConceptTopics()
  })

  app.querySelector('.concept-card')!.addEventListener('click', () => {
    state.conceptRevealed = !state.conceptRevealed
    render()
  })

  app.querySelector('.reveal-card-btn')!.addEventListener('click', () => {
    state.conceptRevealed = !state.conceptRevealed
    render()
  })

  app.querySelector('.shuffle-concept-btn')!.addEventListener('click', () => {
    conceptStudyItems = shuffleArray(conceptStudyItems)
    state.currentIndex = 0
    state.conceptRevealed = false
    render()
  })

  app.querySelector('.back-concept-btn')?.addEventListener('click', () => {
    if (state.currentIndex === 0) return
    state.currentIndex--
    state.conceptRevealed = false
    render()
  })

  app.querySelector('.next-card-btn')!.addEventListener('click', () => {
    if (state.currentIndex < conceptStudyItems.length - 1) {
      state.currentIndex++
      state.conceptRevealed = false
      render()
      return
    }

    if (nextTopicId) {
      startConceptStudy(nextTopicId)
      return
    }

    returnToConceptTopics()
  })
}

function renderConceptsFinished(app: HTMLDivElement) {
  const nextTopicId = getNextConceptTopicId(state.activeConceptTopicId)

  app.innerHTML = `
    <div class="quiz-container finished-container">
      <h1>Concepts Complete</h1>
      <p class="completed-section">${escapeHtml(state.selectedSection ?? 'Concepts')}</p>
      <div class="score-circle pass">${conceptStudyItems.length}</div>
      <p class="score-label">terms reviewed</p>
      <div class="actions">
        <button class="btn secondary-btn review-concepts-btn">Study Again</button>
        ${nextTopicId ? '<button class="btn next-topic-concepts-btn">Next Topic</button>' : ''}
        <button class="btn topics-concepts-btn">Back to Topics</button>
        <button class="btn secondary-btn home-concepts-btn">Home</button>
      </div>
    </div>
  `

  app.querySelector('.review-concepts-btn')!.addEventListener('click', () => {
    startConceptStudy(state.activeConceptTopicId)
  })

  app.querySelector('.next-topic-concepts-btn')?.addEventListener('click', () => {
    if (nextTopicId) startConceptStudy(nextTopicId)
  })

  app.querySelector('.topics-concepts-btn')!.addEventListener('click', () => {
    returnToConceptTopics()
  })

  app.querySelector('.home-concepts-btn')!.addEventListener('click', () => {
    state.selectedSection = null
    conceptStudyItems = []
    render()
  })
}

function buildTimedTestQuestions(): Question[] {
  const shuffledSectionQuestions = shuffleArray(
    sections.map((section) => ({
      section,
      questions: shuffleArray(
        section.questions.map((question) => ({
          ...question,
          topic: question.topic || FALLBACK_SECTION_TOPICS[section.name] || '1.0 General Security Concepts',
          section: section.name,
        })),
      ),
    })),
  )
  const selectedQuestions: Question[] = []
  let offset = 0

  while (selectedQuestions.length < TIMED_TEST_QUESTION_COUNT) {
    let addedThisRound = false

    for (const sectionQuestions of shuffledSectionQuestions) {
      const question = sectionQuestions.questions[offset]
      if (!question) continue
      selectedQuestions.push(question)
      addedThisRound = true
      if (selectedQuestions.length === TIMED_TEST_QUESTION_COUNT) break
    }

    if (!addedThisRound) break
    offset++
  }

  return shuffleArray(selectedQuestions)
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function startTimer() {
  if (timerHandle !== null) window.clearInterval(timerHandle)
  timerHandle = window.setInterval(() => {
    if (state.mode !== 'timed-test' || state.finished || state.endsAt === null) {
      stopTimer()
      return
    }

    if (getRemainingSeconds() <= 0) {
      state.timedOut = true
      finishQuiz()
    } else {
      updateTimerDisplay()
    }
  }, 1000)
}

function stopTimer() {
  if (timerHandle === null) return
  window.clearInterval(timerHandle)
  timerHandle = null
}

function getRemainingSeconds(): number {
  if (state.endsAt === null) return 0
  return Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000))
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function updateTimerDisplay() {
  const timer = document.querySelector<HTMLElement>('.timer')
  if (!timer || state.mode !== 'timed-test') return
  timer.textContent = `Time: ${formatTime(getRemainingSeconds())}`
}

function compareQuestionsForStudy(a: Question, b: Question): number {
  return (
    a.topic.localeCompare(b.topic) ||
    (a.lesson ?? '').localeCompare(b.lesson ?? '') ||
    a.section.localeCompare(b.section) ||
    a.id - b.id
  )
}

function renderFinished(app: HTMLDivElement) {
  stopTimer()
  const total = questions.length
  const pct = Math.round((state.score / total) * 100)
  app.innerHTML = `
    <div class="quiz-container question-container finished">
      <h1>${state.timedOut ? 'Time is up' : 'Quiz Complete!'}</h1>
      <p class="completed-section">${state.selectedSection}</p>
      <div class="score-circle ${pct >= 70 ? 'pass' : 'fail'}">${state.score}/${total}</div>
      <p class="score-label">${pct}% correct</p>
      <div class="feedback">
        ${pct === 100 ? 'Perfect score!' : pct >= 70 ? 'Good job!' : 'Keep practicing!'}
      </div>
      <div class="finished-actions">
        <button class="btn secondary-btn choose-section-btn">Choose Section</button>
        <button class="btn restart-btn">Retry Quiz</button>
      </div>
    </div>
  `
  app.querySelector('.restart-btn')!.addEventListener('click', () => {
    const now = Date.now()
    state = {
      ...state,
      currentIndex: 0,
      responses: questions.map(() => ({
        selectedIndexes: [],
        answered: false,
      })),
      flashcardRevealed: false,
      score: 0,
      finished: false,
      timedOut: false,
      endsAt:
        state.mode === 'timed-test' && state.durationSeconds !== null
          ? now + state.durationSeconds * 1000
          : null,
    }
    if (state.mode === 'timed-test') startTimer()
    render()
  })
  app.querySelector('.choose-section-btn')!.addEventListener('click', () => {
    stopTimer()
    state.selectedSection = null
    questions = []
    render()
  })
}

function renderFlashcardsFinished(app: HTMLDivElement) {
  stopTimer()
  app.innerHTML = `
    <div class="quiz-container question-container finished">
      <h1>Flashcards Complete</h1>
      <p class="completed-section">Flashcards All</p>
      <div class="score-circle pass">${flashcards.length}</div>
      <p class="score-label">cards reviewed</p>
      <div class="feedback">
        Review the cards again in a new order to keep the answer terms fresh.
      </div>
      <div class="finished-actions">
        <button class="btn secondary-btn choose-section-btn">Choose Section</button>
        <button class="btn restart-btn">Shuffle Again</button>
      </div>
    </div>
  `
  app.querySelector('.restart-btn')!.addEventListener('click', () => {
    flashcards = shuffleArray(flashcards)
    state = {
      ...state,
      currentIndex: 0,
      flashcardRevealed: false,
      finished: false,
    }
    render()
  })
  app.querySelector('.choose-section-btn')!.addEventListener('click', () => {
    state.selectedSection = null
    flashcards = []
    render()
  })
}

function finishQuiz() {
  stopTimer()
  if (state.mode === 'flashcards' || state.mode === 'concepts') {
    state.finished = true
    render()
    return
  }
  state.score = questions.reduce((score, question, index) => {
    const response = state.responses[index]
    if (!response?.answered) return score
    const correctIndexes = getCorrectAnswers(question).map((answer) => question.options.indexOf(answer))
    return indexesMatch(response.selectedIndexes, correctIndexes) ? score + 1 : score
  }, 0)
  state.finished = true
  render()
}

function renderFlashcard(app: HTMLDivElement, card: Flashcard) {
  const progress = `${state.currentIndex + 1} / ${flashcards.length}`
  const domainHtml = card.domains.map((domain) => `<span>${escapeHtml(domain)}</span>`).join('')
  const topicHtml = card.topics?.length
    ? `<p class="lesson-label">${escapeHtml(card.topics.slice(0, 2).join(' · '))}</p>`
    : ''
  const aliasHtml = card.aliases?.length
    ? `<p class="flashcard-aliases">Also known as: ${escapeHtml(card.aliases.join(', '))}</p>`
    : ''
  const sourceHtml = card.sourceQuestionIds?.length
    ? `<p class="flashcard-source">Source questions: ${escapeHtml(card.sourceQuestionIds.join(', '))}</p>`
    : ''
  const front = card.front || card.hint

  app.innerHTML = `
    <div class="quiz-container question-container flashcard-container">
      <div class="quiz-header">
        <div class="quiz-status">
          <span class="progress">${escapeHtml(progress)}</span>
          <span class="score">Definition to term</span>
        </div>
        <button class="header-section-btn" type="button">Choose Section</button>
      </div>
      <p class="section-label">Flashcards All</p>
      <button class="flashcard" type="button" aria-pressed="${state.flashcardRevealed}">
        <span class="flashcard-kicker">${state.flashcardRevealed ? 'Term' : 'Prompt'}</span>
        <span class="flashcard-answer">${escapeHtml(state.flashcardRevealed ? card.term : front)}</span>
        ${
          state.flashcardRevealed
            ? '<span class="flashcard-meta">Tap to return to the prompt.</span>'
            : '<span class="flashcard-meta">Recall the term, then tap to reveal.</span>'
        }
      </button>
      ${
        state.flashcardRevealed
          ? `
            <div class="flashcard-details">
              <div class="flashcard-domains">${domainHtml}</div>
              ${topicHtml}
              ${aliasHtml}
              <div class="flashcard-back-section">
                <p class="flashcard-back-label">Definition</p>
                <p class="flashcard-back-text">${escapeHtml(card.definition)}</p>
              </div>
              ${
                card.keyDetails
                  ? `
              <div class="flashcard-back-section">
                <p class="flashcard-back-label">Key details</p>
                <p class="flashcard-back-text">${escapeHtml(card.keyDetails)}</p>
              </div>`
                  : ''
              }
              ${
                card.example
                  ? `
              <div class="flashcard-back-section">
                <p class="flashcard-back-label">Example</p>
                <p class="flashcard-back-text">${escapeHtml(card.example)}</p>
              </div>`
                  : ''
              }
              ${
                card.memoryHook
                  ? `
              <div class="flashcard-back-section">
                <p class="flashcard-back-label">Memory hook</p>
                <p class="flashcard-back-text">${escapeHtml(card.memoryHook)}</p>
              </div>`
                  : ''
              }
              ${sourceHtml}
            </div>
          `
          : ''
      }
      <div class="actions">
        ${state.currentIndex > 0 ? '<button class="btn secondary-btn back-card-btn">Back</button>' : ''}
        <button class="btn secondary-btn shuffle-card-btn">Shuffle</button>
        <button class="btn reveal-card-btn">${state.flashcardRevealed ? 'Hide' : 'Reveal'}</button>
        <button class="btn next-card-btn">${state.currentIndex < flashcards.length - 1 ? 'Next' : 'Finish'}</button>
      </div>
    </div>
  `

  app.querySelector('.header-section-btn')!.addEventListener('click', () => {
    state.selectedSection = null
    flashcards = []
    render()
  })

  app.querySelector('.flashcard')!.addEventListener('click', () => {
    state.flashcardRevealed = !state.flashcardRevealed
    render()
  })

  app.querySelector('.reveal-card-btn')!.addEventListener('click', () => {
    state.flashcardRevealed = !state.flashcardRevealed
    render()
  })

  app.querySelector('.shuffle-card-btn')!.addEventListener('click', () => {
    flashcards = shuffleArray(flashcards)
    state.currentIndex = 0
    state.flashcardRevealed = false
    render()
  })

  app.querySelector('.back-card-btn')?.addEventListener('click', () => {
    if (state.currentIndex === 0) return
    state.currentIndex--
    state.flashcardRevealed = false
    render()
  })

  app.querySelector('.next-card-btn')!.addEventListener('click', () => {
    if (state.currentIndex < flashcards.length - 1) {
      state.currentIndex++
      state.flashcardRevealed = false
      render()
      return
    }
    finishQuiz()
  })
}

function renderQuestion(app: HTMLDivElement, q: Question) {
  const response = state.responses[state.currentIndex] ?? {
    selectedIndexes: [],
    answered: false,
  }
  const progress = `${state.currentIndex + 1} / ${questions.length}`
  const remainingSeconds = state.mode === 'timed-test' ? getRemainingSeconds() : null
  const correctAnswers = getCorrectAnswers(q)
  const correctIndexes = correctAnswers.map((answer) => q.options.indexOf(answer))
  const isMultiAnswer = getQuestionAnswerType(q) === 'multiple'
  const isCorrect = response.answered && indexesMatch(response.selectedIndexes, correctIndexes)
  const isTimedTest = state.mode === 'timed-test'
  const answeredCount = state.responses.filter((savedResponse) => savedResponse.answered).length

  let feedbackHtml = ''
  if (response.answered && !isTimedTest) {
    const explanation = getExplanation(q)
    const answerText = correctAnswers.map(escapeHtml).join(', ')
    feedbackHtml = `
      <div class="feedback ${isCorrect ? 'correct' : 'wrong'}">
        ${isCorrect ? 'Correct!' : `Wrong. The correct answer is: <strong>${answerText}</strong>`}
        <p class="answer-explanation">${escapeHtml(explanation)}</p>
      </div>
    `
  }

  const optionsHtml = q.options
    .map((opt, i) => {
      let cls = 'option-btn'
      if (response.answered) {
        if (isTimedTest && response.selectedIndexes.includes(i)) cls += ' selected'
        else if (isTimedTest) cls += ' disabled'
        else if (correctIndexes.includes(i)) cls += ' correct'
        else if (response.selectedIndexes.includes(i)) cls += ' wrong'
        else cls += ' disabled'
      } else if (response.selectedIndexes.includes(i)) {
        cls += ' selected'
      }
      const disabled = response.answered ? 'disabled' : ''
      return `
        <button class="${cls}" data-index="${i}" ${disabled}>
          <span class="option-control ${isMultiAnswer ? 'checkbox' : 'radio'}" aria-hidden="true"></span>
          <span class="option-text">${escapeHtml(opt)}</span>
        </button>
      `
    })
    .join('')

  const submitDisabled = response.selectedIndexes.length === 0 || response.answered ? 'disabled' : ''
  const showBackButton = state.currentIndex > 0
  const supportingLabel = q.lesson && q.lesson !== q.topic ? q.lesson : ''

  app.innerHTML = `
    <div class="quiz-container question-container">
      <div class="quiz-header">
        <div class="quiz-status">
          <span class="progress">${escapeHtml(progress)}</span>
          <span class="score">${isTimedTest ? `Answered: ${answeredCount}` : `Score: ${state.score}`}</span>
          ${remainingSeconds !== null ? `<span class="timer">Time: ${formatTime(remainingSeconds)}</span>` : ''}
        </div>
        <button class="header-section-btn" type="button">Choose Section</button>
      </div>
      <p class="section-label">${escapeHtml(q.topic)}</p>
      ${supportingLabel ? `<p class="lesson-label">${escapeHtml(supportingLabel)}</p>` : ''}
      ${q.scenario ? `<p class="question-scenario">${escapeHtml(q.scenario)}</p>` : ''}
      <h2 class="question-text">${escapeHtml(q.question)}</h2>
      ${isMultiAnswer ? '<p class="multi-answer-hint">Select all correct answers.</p>' : ''}
      <div class="options">${optionsHtml}</div>
      ${feedbackHtml}
      <div class="actions">
        ${showBackButton ? '<button class="btn secondary-btn back-btn">Back</button>' : ''}
        ${
          response.answered
            ? `<button class="btn next-btn">${state.currentIndex < questions.length - 1 ? 'Next' : 'See Results'}</button>`
            : `<button class="btn submit-btn" ${submitDisabled}>Submit Answer</button>`
        }
      </div>
    </div>
  `

  app.querySelector('.header-section-btn')!.addEventListener('click', () => {
    stopTimer()
    state.selectedSection = null
    questions = []
    render()
  })

  app.querySelector('.back-btn')?.addEventListener('click', () => {
    if (state.currentIndex === 0) return
    state.currentIndex--
    render()
  })

  if (!response.answered) {
    app.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const optionIndex = Number((btn as HTMLButtonElement).dataset.index)
        response.selectedIndexes = isMultiAnswer
          ? toggleSelectedIndex(response.selectedIndexes, optionIndex)
          : [optionIndex]
        render()
      })
    })
    app.querySelector('.submit-btn')?.addEventListener('click', () => {
      if (response.selectedIndexes.length === 0 || response.answered) return
      response.answered = true
      if (indexesMatch(response.selectedIndexes, correctIndexes)) state.score++
      render()
    })
  } else {
    app.querySelector('.next-btn')?.addEventListener('click', () => {
      if (state.currentIndex < questions.length - 1) {
        state.currentIndex++
      } else {
        finishQuiz()
        return
      }
      render()
    })
  }
}

function getCorrectAnswers(q: Question): string[] {
  return Array.isArray(q.answer) ? q.answer : [q.answer]
}

function getQuestionAnswerType(q: Question): 'single' | 'multiple' {
  if (q.type === 'single' || q.type === 'multiple') return q.type
  return Array.isArray(q.answer) ? 'multiple' : 'single'
}

function toggleSelectedIndex(selectedIndexes: number[], optionIndex: number): number[] {
  return selectedIndexes.includes(optionIndex)
    ? selectedIndexes.filter((selectedIndex) => selectedIndex !== optionIndex)
    : [...selectedIndexes, optionIndex]
}

function indexesMatch(selectedIndexes: number[], correctIndexes: number[]): boolean {
  const validCorrectIndexes = correctIndexes.filter((index) => index >= 0)
  if (selectedIndexes.length !== validCorrectIndexes.length) return false
  return selectedIndexes.every((selectedIndex) => validCorrectIndexes.includes(selectedIndex))
}

async function init() {
  const [questionRes, flashcardRes, conceptRes] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}questions.json`),
    fetch(`${import.meta.env.BASE_URL}flashcards.json`),
    fetch(`${import.meta.env.BASE_URL}concepts.json`),
  ])
  const quizData = await questionRes.json() as QuizData
  const flashcardData = await flashcardRes.json() as FlashcardData
  const conceptData = await conceptRes.json() as ConceptData
  sections = quizData.sections
  allFlashcards = flashcardData.flashcards
  allConceptTopics = conceptData.topics
  conceptTermCount = conceptData.termCount ?? conceptData.topics.reduce((sum, topic) => sum + topic.terms.length, 0)
  conceptDescription =
    conceptData.description ??
    'Exam topic map with terms and concepts to memorize for CompTIA Security+.'
  loaded = true
  render()
}

init()
