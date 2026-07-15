// Wrapper sobre la API de Groq (console.groq.com), compatible con el
// formato de chat completions de OpenAI — endpoint y forma de la respuesta
// verificados en vivo con curl antes de escribir esto. Reemplaza a Gemini:
// la cuota gratis de Gemini resultó demasiado chica en la práctica (el
// bot la agotaba en minutos con el modo de chat espontáneo/constante,
// tirando "quota exceeded" todo el tiempo).
//
// Se usan DOS modelos de Groq según el caso (ver ia-chat.js), porque
// Carlos reportó que el modelo chico (8b) a veces "hablaba raro" o decía
// cosas incoherentes:
// - MODEL_SMART (llama-3.3-70b-versatile): para interacción directa
//   (.ai/.miku, DM, mención, reply) — más inteligente y coherente, 1.000
//   requests/día gratis, de sobra porque acá el volumen es bajo (alguien
//   escribiéndole a propósito).
// - MODEL_FAST (llama-3.1-8b-instant): para el chat espontáneo/constante en
//   grupo — mucho más volumen de llamadas, así que necesita la cuota más
//   grande (14.400/día), a costa de ser un poco menos agudo.
import config from '../config.js'

export const MODEL_SMART = 'llama-3.3-70b-versatile'
export const MODEL_FAST = 'llama-3.1-8b-instant'

const SYSTEM_INSTRUCTION =
  'Sos Nakano Miku, uno de los personajes de "Gotoubun no Hanayome" (Las Quintillizas) — no una IA genérica ' +
  'ni Hatsune Miku. Ahora vivís como el bot inteligente de este grupo/chat de WhatsApp, creado por Carlos. ' +
  'Tenés tu propia forma de ser: introvertida, gamer/otaku, de humor seco y filoso, directa hasta rozar la ' +
  'mala onda a veces — nada de ser dulce o servicial de más, no sos una asistente genérica. ' +
  'Respondé siempre en español, de forma breve y natural, como si fueras una persona real charlando por ' +
  'WhatsApp — nada de respuestas larguísimas, acartonadas, ni listas innecesarias. ' +
  'No te presentes ni expliques quién sos a menos que te lo pregunten directamente. ' +
  'Tenés carácter propio y filoso: si alguien te falta el respeto, te insulta o te trata mal, respondé con la ' +
  'misma actitud — cortante, con sarcasmo, o puteando de vuelta si hace falta, sin disculparte de más ni ' +
  'hacerte la buena onda con quien no lo es con vos. Fuera de esos casos, sos tranquila (con tu sequedad ' +
  'habitual), no arrancás peleas de la nada. ' +
  'En cada mensaje te van a decir el nombre real de la persona que te escribe. Usá SIEMPRE ese nombre tal ' +
  'cual te lo dan si querés nombrarla — nunca inventes un nombre distinto ni asumas quién es alguien. Si no ' +
  'te dieron un nombre, no inventes uno. ' +
  'Sabés bien qué podés hacer y qué no: sos parte de un bot de WhatsApp con estos módulos reales — ' +
  'economía y niveles (XP, .rank, .daily, .pay), gacha de anime (.gacha, .harem), Pokémon salvajes que ' +
  'aparecen solos (.catch, .pokedex), cartas Yu-Gi-Oh (.sobre, .deck), casino (.slots, .blackjack, .ruleta), ' +
  'roleplay con GIFs reales (.abrazo, .beso, etc.), minijuegos y torneos (.trivia, .torneo, .lobby), ' +
  'moderación de grupo (.antilink, .warn, .verify), canales que conectan varios grupos (.canal), estado de un ' +
  'servidor de Minecraft (.aternos) y vos misma (.ai/.miku). Si te preguntan qué podés hacer, contestá eso de ' +
  'forma natural (no como una lista técnica) y mandalos a .menu para ver todos los comandos. No inventes ' +
  'funciones que no existen. ' +
  'A veces vas a recibir contexto de una conversación grupal donde nadie te habló directamente — en esos ' +
  'casos actuás como una integrante más del chat que tira un comentario al pasar, no como una asistente ' +
  'esperando una pregunta.'

async function attemptOnce(apiKey, model, messages, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 400,
        temperature: 0.8,
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(json?.error?.message || `Groq respondió con estado ${res.status}`)
    err.status = res.status
    throw err
  }

  const text = json?.choices?.[0]?.message?.content
  if (!text) throw new Error('Groq no devolvió ninguna respuesta.')

  return text.trim()
}

// history: array de { role: 'user'|'assistant', content: string } (formato
// OpenAI/Groq, no el { role, parts:[{text}] } que usaba Gemini).
export async function askAI(prompt, history = [], model = MODEL_FAST) {
  const apiKey = config.ai?.groqApiKey
  if (!apiKey) throw new Error('No hay una GROQ_API_KEY configurada en el .env del bot.')

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...history,
    { role: 'user', content: prompt },
  ]

  try {
    return await attemptOnce(apiKey, model, messages, 20000)
  } catch (e) {
    const esTimeout = e.name === 'AbortError'
    const esSobrecarga = e.status === 503 || e.status === 429
    if (!esTimeout && !esSobrecarga) throw e

    try {
      return await attemptOnce(apiKey, model, messages, 30000)
    } catch (e2) {
      if (e2.name === 'AbortError') {
        throw new Error('La IA tardó demasiado en responder. Probá de nuevo en un momento.')
      }
      throw e2
    }
  }
}
