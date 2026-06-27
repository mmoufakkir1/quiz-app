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

let sections: QuestionSection[] = []
let questions: Question[] = []
let loaded = false
let pendingSectionNames = new Set<string>()

type AppState = {
  selectedSection: string | null
  currentIndex: number
  selectedIndex: number | null
  answered: boolean
  score: number
  finished: boolean
}

let state: AppState = {
  selectedSection: null,
  currentIndex: 0,
  selectedIndex: null,
  answered: false,
  score: 0,
  finished: false,
}

function render() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  if (!loaded) {
    app.innerHTML = `<div class="quiz-container"><p style="color:var(--text-muted)">Loading questions...</p></div>`
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
    <div class="quiz-container">
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
    selectedIndex: null,
    answered: false,
    score: 0,
    finished: false,
  }
  render()
}

function renderFinished(app: HTMLDivElement) {
  const total = questions.length
  const pct = Math.round((state.score / total) * 100)
  app.innerHTML = `
    <div class="quiz-container finished">
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
      selectedIndex: null,
      answered: false,
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
  const progress = `${state.currentIndex + 1} / ${questions.length}`
  const correctIndex = q.options.indexOf(q.answer)
  const isCorrect = state.answered && state.selectedIndex === correctIndex

  let feedbackHtml = ''
  if (state.answered) {
    feedbackHtml = `
      <div class="feedback ${isCorrect ? 'correct' : 'wrong'}">
        ${isCorrect ? 'Correct!' : `Wrong. The correct answer is: <strong>${q.answer}</strong>`}
        ${q.explanation ? `<p class="answer-explanation">${q.explanation}</p>` : ''}
      </div>
    `
  }

  const optionsHtml = q.options
    .map((opt, i) => {
      let cls = 'option-btn'
      if (state.answered) {
        if (i === correctIndex) cls += ' correct'
        else if (i === state.selectedIndex && i !== correctIndex) cls += ' wrong'
        else cls += ' disabled'
      } else if (i === state.selectedIndex) {
        cls += ' selected'
      }
      const disabled = state.answered ? 'disabled' : ''
      return `<button class="${cls}" data-index="${i}" ${disabled}>${opt}</button>`
    })
    .join('')

  const submitDisabled = state.selectedIndex === null || state.answered ? 'disabled' : ''

  app.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-header">
        <div class="quiz-status">
          <span class="progress">${progress}</span>
          <span class="score">Score: ${state.score}</span>
        </div>
        <button class="header-section-btn" type="button">Choose Section</button>
      </div>
      <p class="section-label">${q.section}</p>
      ${q.domain ? `<p class="domain-label">${q.domain}</p>` : ''}
      ${q.scenario ? `<p class="question-scenario">${q.scenario}</p>` : ''}
      <h2 class="question-text">${q.question}</h2>
      <div class="options">${optionsHtml}</div>
      ${feedbackHtml}
      <div class="actions">
        ${state.answered
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

  if (!state.answered) {
    app.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedIndex = Number((btn as HTMLButtonElement).dataset.index)
        render()
      })
    })
    app.querySelector('.submit-btn')?.addEventListener('click', () => {
      if (state.selectedIndex === null) return
      state.answered = true
      if (state.selectedIndex === correctIndex) state.score++
      render()
    })
  } else {
    app.querySelector('.next-btn')?.addEventListener('click', () => {
      if (state.currentIndex < questions.length - 1) {
        state.currentIndex++
        state.selectedIndex = null
        state.answered = false
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
