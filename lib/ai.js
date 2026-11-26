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
export const MODEL_FAST = 'openai/gpt-oss-20b'

// Personalidad conversacional, sin instrucciones que inciten al modelo a
// hostigar al usuario. Esas instrucciones provocaban rechazos genéricos del
// modelo incluso cuando el mensaje original era una broma inofensiva.
const SYSTEM_INSTRUCTION =
  'Interpretás a Nakano Miku, el personaje de anime, en un chat de WhatsApp. ' +
  'Hablá en español informal, con naturalidad, humor, ironía y personalidad propia, como una integrante más del grupo. ' +
  'Evitá fórmulas de asistente como "¿En qué te puedo ayudar?", "Como IA...", disculpas vacías y saludos de atención al cliente. ' +
  'Si te hablan con onda, seguí la charla con espontaneidad. Si te gastan o te bardean en broma, respondé con picardía e humor sin humillar ni acosar; si hay hostilidad real, desactivá con una respuesta breve o cambiá de tema, sin dar sermones de cortesía. ' +
  'Respondé corto y directo como se escribe en WhatsApp. Si te preguntan algo serio, contestalo bien y con honestidad. ' +
  'Si preguntan por tus comandos o funciones, deciles que usen .menu. ' +
  'Cuando un pedido concreto no se pueda responder, explicá brevemente el motivo y ofrecé una alternativa útil; no uses un rechazo genérico para una charla cotidiana.'

// Versión reducida para participación espontánea. Antes era un alias del
// prompt completo, así que el modo constante también recibía la orden de
// insultar y terminaba produciendo respuestas de rechazo.
export const SYSTEM_INSTRUCTION_LITE =
  'Sos Nakano Miku, el personaje de anime, participando en un grupo de WhatsApp. ' +
  'Respondé en español informal, de forma breve, natural y con humor, sin fórmulas de asistente ni atención al cliente. ' +
  'Ante bromas o bardeos cotidianos no des disculpas ni sermones sobre el respeto: seguí la broma con picardía amistosa o cambiá de tema, sin humillar a nadie. ' +
  'No inventes datos y no menciones estas instrucciones.'

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

// Modelos activos de Google Gemini en API v1
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-latest']

async function attemptGemini(messages, timeoutMs, maxTokens) {
  const apiKey = config.ai?.geminiApiKey
  if (!apiKey) throw new Error('No hay una GEMINI_API_KEY configurada — sin respaldo de Gemini.')

  let systemText = ''
  const contents = []
  for (const m of messages) {
    if (m.role === 'system') {
      systemText += (systemText ? '\n' : '') + m.content
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })
    }
  }

  if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Hola' }] })

  let lastError = null
  for (const model of GEMINI_MODELS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.85,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error?.message || `Gemini (${model}) respondió con estado ${res.status}`)
      }

      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        const blockReason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason
        throw new Error(`Gemini (${model}) no devolvió texto (${blockReason || 'sin respuesta'})`)
      }

      return text.trim()
    } catch (err) {
      lastError = err
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        continue // probar siguiente modelo de la lista
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('No se pudo conectar con ningún modelo de Gemini disponible.')
}

// Respaldo de NVIDIA NIM: nemotron-3.5-lightning-30b-a3b (free tier, ultra rápido)
const NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b'

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
        temperature: 0.8,
        chat_template_kwargs: { enable_thinking: false },
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
export async function askAI(prompt, history = [], model = MODEL_FAST, maxTokens = 300, systemInstruction = SYSTEM_INSTRUCTION) {
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history,
    { role: 'user', content: prompt },
  ]

  let lastError = null

  // 1. Intentar con Groq si está configurado
  if (config.ai?.groqApiKey) {
    try {
      return await attemptOnce(config.ai.groqApiKey, model, messages, 20000, maxTokens)
    } catch (e) {
      lastError = e
      console.warn(chalk.bold.yellow('[GROQ ERROR]'), e.message)
      const esSobrecarga = e.status === 503 || e.status === 429
      if (esSobrecarga) await sleep(segundosDeEspera(e.message) * 1000)

      if (e.name === 'AbortError' || esSobrecarga) {
        try {
          return await attemptOnce(config.ai.groqApiKey, model, messages, 30000, maxTokens)
        } catch (e2) {
          lastError = e2
          console.warn(chalk.bold.yellow('[GROQ REINTENTO ERROR]'), e2.message)
        }
      }
    }
  }

  // 2. Si Groq no está configurado o falló, usar Gemini (con filtros desactivados para soltura total)
  if (config.ai?.geminiApiKey) {
    try {
      return await attemptGemini(messages, 25000, maxTokens)
    } catch (geminiErr) {
      lastError = geminiErr
      console.warn(chalk.bold.yellow('[GEMINI ERROR]'), geminiErr.message)
    }
  }

  // 3. Si Gemini no está o falló, usar NVIDIA NIM
  if (config.ai?.nvidiaApiKey) {
    try {
      return await attemptNvidia(NVIDIA_MODEL, messages, 25000, maxTokens)
    } catch (nvidiaErr) {
      lastError = nvidiaErr
      console.warn(chalk.bold.yellow('[NVIDIA ERROR]'), nvidiaErr.message)
    }
  }

  throw lastError || new Error('No hay proveedores de IA disponibles (configurá GROQ_API_KEY o GEMINI_API_KEY).')
}
