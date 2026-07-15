// Wrapper sobre Open Trivia DB (opentdb.com), pública y gratuita, sin API
// key. Verificado en vivo: &encode=url3986 devuelve los strings URL-encoded,
// que se decodifican con decodeURIComponent (mucho más confiable que parsear
// entidades HTML sueltas). response_code 0 = éxito.

import { fetchJsonWithRetry } from './httpJson.js'

export const CATEGORIES = {
  general:   9,
  peliculas: 11,
  musica:    12,
  tv:        14,
  gaming:    15,
  ciencia:   17,
  mitologia: 20,
  deportes:  21,
  geografia: 22,
  historia:  23,
  anime:     31,
  animales:  27,
}

const DIFFICULTY_REWARD = { easy: 20, medium: 35, hard: 50 }

function decode(str) {
  try { return decodeURIComponent(str) } catch { return str }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function fetchTriviaQuestion(categoryId = null) {
  const params = new URLSearchParams({ amount: '1', type: 'multiple', encode: 'url3986' })
  if (categoryId) params.set('category', String(categoryId))

  const json = await fetchJsonWithRetry(`https://opentdb.com/api.php?${params.toString()}`)
  if (json?.response_code !== 0 || !json.results?.[0]) {
    throw new Error('Open Trivia DB no devolvió ninguna pregunta (puede que la categoría esté vacía).')
  }

  const raw = json.results[0]
  const question = decode(raw.question)
  const correctAnswer = decode(raw.correct_answer)
  const incorrectAnswers = raw.incorrect_answers.map(decode)
  const category = decode(raw.category)
  const difficulty = raw.difficulty || 'easy'

  const options = shuffle([correctAnswer, ...incorrectAnswers])
  const correctIndex = options.indexOf(correctAnswer)

  return {
    question,
    category,
    difficulty,
    options,
    correctIndex,
    reward: DIFFICULTY_REWARD[difficulty] || DIFFICULTY_REWARD.easy,
  }
}
