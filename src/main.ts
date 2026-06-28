import './style.css'

type Question = {
  id: number
  scenario?: string
  question: string
  options: string[]
  answer: string
  domain?: string
  explanation?: string
  section: string
}

type QuestionSection = {
  name: string
  questions: Omit<Question, 'section'>[]
}

type QuizData = {
  sections: QuestionSection[]
}

function getExplanation(q: Question): string {
  const existing = q.explanation?.trim()
  if (existing) return existing

  const section = q.section.toLowerCase()
  const answer = q.answer.trim()

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
let loaded = false
let pendingSectionNames = new Set<string>()

type AppState = {
  selectedSection: string | null
  currentIndex: number
  responses: {
    selectedIndex: number | null
    answered: boolean
  }[]
  score: number
  finished: boolean
}

let state: AppState = {
  selectedSection: null,
  currentIndex: 0,
  responses: [],
  score: 0,
  finished: false,
}

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

  if (state.finished) {
    renderFinished(app)
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
  const sectionButtons = sections
    .map(
      (section) => `
        <button
          class="section-card ${pendingSectionNames.has(section.name) ? 'selected' : ''}"
          data-section="${section.name}"
          aria-pressed="${pendingSectionNames.has(section.name)}"
          type="button"
        >
          <span class="section-card-details">
            <span class="section-checkbox" aria-hidden="true"></span>
            <span class="section-card-name">${section.name}</span>
          </span>
          <span class="section-card-count">${section.questions.length} questions</span>
        </button>
      `,
    )
    .join('')

  app.innerHTML = `
    <div class="quiz-container selection-container">
      <div class="selection-header">
        <p class="section-label">CompTIA Security+ SY0-701</p>
        <h1>Choose Quiz Sections</h1>
        <p>Select one or more topics, then start your quiz.</p>
      </div>
      <div class="section-grid">
        ${sectionButtons}
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
}

function startQuiz(sectionNames: string[]) {
  const selectedSections = sections.filter((section) => sectionNames.includes(section.name))

  questions = selectedSections.flatMap((section) =>
    section.questions.map((question) => ({
      ...question,
      section: section.name,
    })),
  )

  state = {
    selectedSection:
      selectedSections.length === sections.length
        ? 'All Sections'
        : selectedSections.map((section) => section.name).join(', '),
    currentIndex: 0,
    responses: questions.map(() => ({
      selectedIndex: null,
      answered: false,
    })),
    score: 0,
    finished: false,
  }
  render()
}

function renderFinished(app: HTMLDivElement) {
  const total = questions.length
  const pct = Math.round((state.score / total) * 100)
  app.innerHTML = `
    <div class="quiz-container question-container finished">
      <h1>Quiz Complete!</h1>
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
    state = {
      ...state,
      currentIndex: 0,
      responses: questions.map(() => ({
        selectedIndex: null,
        answered: false,
      })),
      score: 0,
      finished: false,
    }
    render()
  })
  app.querySelector('.choose-section-btn')!.addEventListener('click', () => {
    state.selectedSection = null
    questions = []
    render()
  })
}

function renderQuestion(app: HTMLDivElement, q: Question) {
  const response = state.responses[state.currentIndex] ?? {
    selectedIndex: null,
    answered: false,
  }
  const progress = `${state.currentIndex + 1} / ${questions.length}`
  const correctIndex = q.options.indexOf(q.answer)
  const isCorrect = response.answered && response.selectedIndex === correctIndex

  let feedbackHtml = ''
  if (response.answered) {
    const explanation = getExplanation(q)
    feedbackHtml = `
      <div class="feedback ${isCorrect ? 'correct' : 'wrong'}">
        ${isCorrect ? 'Correct!' : `Wrong. The correct answer is: <strong>${escapeHtml(q.answer)}</strong>`}
        <p class="answer-explanation">${escapeHtml(explanation)}</p>
      </div>
    `
  }

  const optionsHtml = q.options
    .map((opt, i) => {
      let cls = 'option-btn'
      if (response.answered) {
        if (i === correctIndex) cls += ' correct'
        else if (i === response.selectedIndex && i !== correctIndex) cls += ' wrong'
        else cls += ' disabled'
      } else if (i === response.selectedIndex) {
        cls += ' selected'
      }
      const disabled = response.answered ? 'disabled' : ''
      return `<button class="${cls}" data-index="${i}" ${disabled}>${escapeHtml(opt)}</button>`
    })
    .join('')

  const submitDisabled = response.selectedIndex === null || response.answered ? 'disabled' : ''
  const showBackButton = state.currentIndex > 0

  app.innerHTML = `
    <div class="quiz-container question-container">
      <div class="quiz-header">
        <div class="quiz-status">
          <span class="progress">${escapeHtml(progress)}</span>
          <span class="score">Score: ${state.score}</span>
        </div>
        <button class="header-section-btn" type="button">Choose Section</button>
      </div>
      <p class="section-label">${escapeHtml(q.section)}</p>
      ${q.domain ? `<p class="domain-label">${escapeHtml(q.domain)}</p>` : ''}
      ${q.scenario ? `<p class="question-scenario">${escapeHtml(q.scenario)}</p>` : ''}
      <h2 class="question-text">${escapeHtml(q.question)}</h2>
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
        response.selectedIndex = Number((btn as HTMLButtonElement).dataset.index)
        render()
      })
    })
    app.querySelector('.submit-btn')?.addEventListener('click', () => {
      if (response.selectedIndex === null || response.answered) return
      response.answered = true
      if (response.selectedIndex === correctIndex) state.score++
      render()
    })
  } else {
    app.querySelector('.next-btn')?.addEventListener('click', () => {
      if (state.currentIndex < questions.length - 1) {
        state.currentIndex++
      } else {
        state.finished = true
      }
      render()
    })
  }
}

async function init() {
  const res = await fetch(`${import.meta.env.BASE_URL}questions.json`)
  const quizData = await res.json() as QuizData
  sections = quizData.sections
  loaded = true
  render()
}

init()
