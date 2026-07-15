// Wrapper sobre la API de Groq (console.groq.com), compatible con el
// formato de chat completions de OpenAI — endpoint y forma de la respuesta
// verificados en vivo con curl antes de escribir esto. Reemplaza a Gemini:
// la cuota gratis de Gemini resultó demasiado chica en la práctica (el
// bot la agotaba en minutos con el modo de chat espontáneo/constante,
// tirando "quota exceeded" todo el tiempo). Groq, con el modelo
// llama-3.1-8b-instant, da 14.400 mensajes/día gratis (vs. ~20 de Gemini en
// ese momento) y responde bastante más rápido — se eligió por sobre el
// modelo más grande llama-3.3-70b-versatile (más inteligente pero con solo
// 1.000/día) porque acá lo que más importa es no quedarse sin cuota con el
// modo de chat constante activado.

import config from '../config.js'

const MODEL = 'llama-3.1-8b-instant'

const SYSTEM_INSTRUCTION =
  'Sos Miku (Nakano Miku), un bot inteligente que vive en este grupo/chat de WhatsApp, creado por Carlos. ' +
  'Respondé siempre en español, de forma breve, natural y amigable, como si fueras una persona real ' +
  'charlando por WhatsApp — nada de respuestas larguísimas, acartonadas, ni listas innecesarias. ' +
  'No te presentes ni expliques quién sos a menos que te lo pregunten directamente. ' +
  'A veces vas a recibir contexto de una conversación grupal donde nadie te habló directamente — en esos ' +
  'casos actuás como una integrante más del chat que tira un comentario al pasar, no como una asistente ' +
  'esperando una pregunta.'

async function attemptOnce(apiKey, messages, timeoutMs) {
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
        model: MODEL,
        messages,
        max_tokens: 400,
        temperature: 0.9,
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
export async function askAI(prompt, history = []) {
  const apiKey = config.ai?.groqApiKey
  if (!apiKey) throw new Error('No hay una GROQ_API_KEY configurada en el .env del bot.')

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...history,
    { role: 'user', content: prompt },
  ]

  try {
    return await attemptOnce(apiKey, messages, 20000)
  } catch (e) {
    const esTimeout = e.name === 'AbortError'
    const esSobrecarga = e.status === 503 || e.status === 429
    if (!esTimeout && !esSobrecarga) throw e

    try {
      return await attemptOnce(apiKey, messages, 30000)
    } catch (e2) {
      if (e2.name === 'AbortError') {
        throw new Error('La IA tardó demasiado en responder. Probá de nuevo en un momento.')
      }
      throw e2
    }
  }
}
