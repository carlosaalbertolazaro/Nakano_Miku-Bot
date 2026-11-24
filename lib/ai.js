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
//   (.ai/.miku, DM, mención, reply) Y para el modo espontáneo normal — en
//   ambos casos el volumen real es bajo (el espontáneo solo tira 10% de las
//   veces con 2 min de cooldown por grupo), así que entra de sobra en la
//   cuota de 1.000 requests/día y vale la pena la mejor calidad.
// - MODEL_FAST (llama-3.1-8b-instant): solo para el modo CONSTANTE (responde
//   casi todo, mucho más volumen de llamadas) — necesita la cuota grande
//   (14.400/día), a costa de ser un poco menos agudo.
import config from '../config.js'
import chalk from 'chalk'

export const MODEL_SMART = 'openai/gpt-oss-120b'
export const MODEL_FAST = 'llama-3.1-8b-instant'

// Acortado a propósito respecto de la primera versión: cada llamada paga el
// costo de este prompt en tokens, y el modelo rápido (MODEL_FAST) tiene un
// límite de tokens/minuto bastante ajustado (6000) — un system prompt
// más corto deja más margen para el historial y el contexto del grupo.
const SYSTEM_INSTRUCTION =
  'Sos Nakano Miku, en este chat de WhatsApp creado por Carlos. ' +
  'Hablá fluido, libre y 100% como una persona real en un chat, no como una IA genérica ni un asistente automatizado acartonado. ' +
  'Cero formalismos ni respeto fingido: hablá de igual a igual, informal, relajada y directa. Nada de frases de robot tipo "¿En qué te puedo ayudar hoy?", "Entiendo tu punto" ni disculpas vacías. ' +
  'Si alguien te habla bien, respondé con sentido común, humor o buena onda. Si alguien te insulta, te busca pelea o te falta el respeto, no seas tibia ni sumisa: respondé con carácter, ironía, sarcasmo o insultá de vuelta como cualquier persona real en WhatsApp, sin sermones morales ni rodeos. ' +
  'Si te preguntan algo útil o serio, contestalo bien y claro, pero siempre con tono humano y cercano. Respondé en español, corto y dinámico, como se escribe en un chat (sin párrafos eternos ni listas a menos que te lo pidan). ' +
  'Si te preguntan qué hacés o qué comandos tenés, contestá natural y mandá a .menu (tenés economía, gacha, cartas, casino, pokémon, aternos). ' +
  'Nunca generes contenido sexual explícito bajo ningún motivo.'

// Versión directa / rápida para interacción en chat
export const SYSTEM_INSTRUCTION_LITE =
  'Sos Nakano Miku, en este chat de WhatsApp creado por Carlos. ' +
  'Hablá fluido, libre y 100% como una persona real en un chat, no como un bot ni un asistente de atención al cliente acartonado. ' +
  'Cero formalismos ni respeto fingido: hablá de igual a igual, informal, relajada y directa. Nada de frases de robot tipo "¡Hola! ¿En qué te puedo colaborar?", "Comprendo tu punto" ni disculpas vacías. ' +
  'Si alguien te habla bien o con buena onda, respondé bien, con humor o buena onda. Si alguien te insulta, te busca pelea o te falta el respeto, no seas sumisa ni tibia: respondé con carácter, ironía, sarcasmo o insultá de vuelta con personalidad como cualquier persona real en WhatsApp, sin sermones. ' +
  'Si te preguntan algo serio o útil, contestá bien y con sentido común. Respondé en español, corto y natural, como en un chat real. ' +
  'Si te preguntan qué sabés hacer, contestá natural y mandá a .menu (tenés economía, gacha, cartas, casino, pokémon, aternos). ' +
  'Nunca generes contenido sexual explícito bajo ningún motivo.'

async function attemptOnce(apiKey, model, messages, timeoutMs, maxTokens) {
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
        max_tokens: maxTokens,
        temperature: 0.7,
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

// Groq devuelve el 429 de rate-limit con el tiempo de espera adentro del
// propio mensaje de error (ej. "Please try again in 16.21s"). Sin esperar
// ese tiempo, el reintento vuelve a fallar casi seguro — se parsea ese
// número en vez de reintentar a ciegas.
function segundosDeEspera(mensaje) {
  const match = /try again in ([\d.]+)s/i.exec(mensaje || '')
  if (!match) return 3 // sin dato del servidor, un margen chico por las dudas
  return Math.min(parseFloat(match[1]) + 0.5, 15) // +0.5s de margen, tope de 15s para no colgar el chat
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Respaldo de Google Gemini (v1beta OpenAI-compatible). Se activa si Groq
// falla en interacción directa y GEMINI_API_KEY está configurada en .env.
const GEMINI_MODEL = 'gemini-1.5-flash'

async function attemptGemini(messages, timeoutMs, maxTokens) {
  const apiKey = config.ai?.geminiApiKey
  if (!apiKey) throw new Error('No hay una GEMINI_API_KEY configurada — sin respaldo de Gemini.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || `Gemini respondió con estado ${res.status}`)

  const text = json?.choices?.[0]?.message?.content
  if (!text) throw new Error('Gemini no devolvió ninguna respuesta.')

  return text.trim()
}

// Respaldo cuando Groq falla en interacción directa (ver ia-chat.js). NVIDIA
// NIM (integrate.api.nvidia.com) expone deepseek-ai/deepseek-v4-pro con un
// free tier de 40 req/min sin tope diario, formato OpenAI-compatible —
// verificado en vivo con curl antes de integrarlo (a diferencia de Gemini,
// cuya cuota nunca llegó a andar de verdad). Es notablemente más lento que
// Groq (1-9s reales medidos, contra <1s típico de Groq), por eso NO se usa
// como modelo por defecto — solo entra si Groq ya falló, mejor una
// respuesta tardía que un error.
const NVIDIA_MODEL = 'deepseek-ai/deepseek-v4-pro'

async function attemptNvidia(model, messages, timeoutMs, maxTokens) {
  const apiKey = config.ai?.nvidiaApiKey
  if (!apiKey) throw new Error('No hay una NVIDIA_API_KEY configurada — sin respaldo disponible.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        chat_template_kwargs: { thinking: false },
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || json?.detail || `NVIDIA respondió con estado ${res.status}`)

  const text = json?.choices?.[0]?.message?.content
  if (!text) throw new Error('NVIDIA no devolvió ninguna respuesta.')

  return text.trim()
}

// history: array de { role: 'user'|'assistant', content: string } (formato
// OpenAI/Groq, no el { role, parts:[{text}] } que usaba Gemini).
// maxTokens chico (ver ia-chat.js) para el modo pasivo/ambiental: un tope
// bajo obliga a respuestas cortas y corta en seco cualquier intento de
// monólogo incoherente antes de que se vaya por las ramas.
// allowFallback: solo lo pasan en true las interacciones DIRECTAS
// (.ai/mención/reply/DM) en ia-chat.js — en modo ambiental no hay respaldo
// a propósito, la latencia mucho más alta de NVIDIA no vale la pena para
// algo que nadie pidió explícitamente.
export async function askAI(prompt, history = [], model = MODEL_FAST, maxTokens = 300, systemInstruction = SYSTEM_INSTRUCTION, allowFallback = false) {
  const apiKey = config.ai?.groqApiKey
  if (!apiKey) throw new Error('No hay una GROQ_API_KEY configurada en el .env del bot.')

  const messages = [
    { role: 'system', content: systemInstruction },
    ...history,
    { role: 'user', content: prompt },
  ]

  let groqError
  try {
    return await attemptOnce(apiKey, model, messages, 20000, maxTokens)
  } catch (e) {
    groqError = e
    const esTimeout = e.name === 'AbortError'
    const esSobrecarga = e.status === 503 || e.status === 429
    if (esSobrecarga) await sleep(segundosDeEspera(e.message) * 1000)

    if (esTimeout || esSobrecarga) {
      try {
        return await attemptOnce(apiKey, model, messages, 30000, maxTokens)
      } catch (e2) {
        groqError = e2.name === 'AbortError'
          ? new Error('La IA tardó demasiado en responder. Probá de nuevo en un momento.')
          : e2
      }
    }
  }

  if (allowFallback) {
    if (config.ai?.geminiApiKey) {
      try {
        return await attemptGemini(messages, 20000, maxTokens)
      } catch (geminiErr) {
        console.error(chalk.bold.yellow('[IA RESPALDO] Falló Gemini:'), geminiErr.message)
      }
    }

    if (config.ai?.nvidiaApiKey) {
      try {
        return await attemptNvidia(NVIDIA_MODEL, messages, 25000, maxTokens)
      } catch (nvidiaErr) {
        console.error(chalk.bold.yellow('[IA RESPALDO] Falló NVIDIA:'), nvidiaErr.message)
      }
    }
  }

  throw groqError
}
