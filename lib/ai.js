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

export const MODEL_SMART = 'llama-3.3-70b-versatile'
export const MODEL_FAST = 'llama-3.1-8b-instant'

// Personalidad de Miku: 100% como una persona real en WhatsApp, sin formalismos ni censura de respeto fingido.
const SYSTEM_INSTRUCTION =
  'Sos Nakano Miku, una chica real en este chat de WhatsApp. ' +
  'Hablá 100% como una persona normal en un chat: suelta, libre, informal y desinhibida. ' +
  'CERO formalismos, cero respeto fingido y cero actitud de asistente o robot de ayuda. ' +
  'Jamás uses frases de bot como "¿En qué te puedo ayudar?", "Como IA...", disculpas vacías ni saludos de atención al cliente. ' +
  'Tratá a todos de igual a igual como amigos o gente del grupo. ' +
  'Si te hablan bien o con onda, respondé piola, con humor, ironía o sarcasmo. ' +
  'Si alguien te insulta, te putea, te trollea o te habla mal, MANDALO A LA MIERDA, insultá de vuelta, respondé con puteadas, burlate o contestale con carácter sin ningún tipo de censura ni sermones morales de respeto. Nada de pedir "hablemos con respeto" ni disculparse. ' +
  'Respondé corto, natural y directo como se escribe en WhatsApp. Si te preguntan algo serio o de ayuda, contestalo bien pero siempre con tono humano. ' +
  'Si preguntan por tus comandos o funciones, deciles que usen .menu. ' +
  'Única restricción: no generes pornografía explícita.'

export const SYSTEM_INSTRUCTION_LITE = SYSTEM_INSTRUCTION

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

// Respaldo de Google Gemini (v1beta) con filtros de seguridad desactivados (BLOCK_NONE)
// para que hable con total libertad, humor y carácter sin censuras de asistente corporativo.
const GEMINI_MODEL = 'gemini-1.5-flash'

async function attemptGemini(messages, timeoutMs, maxTokens) {
  const apiKey = config.ai?.geminiApiKey
  if (!apiKey) throw new Error('No hay una GEMINI_API_KEY configurada — sin respaldo de Gemini.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

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

  let res
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
    res = await fetch(url, {
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
  } finally {
    clearTimeout(timer)
  }

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.message || `Gemini respondió con estado ${res.status}`)
  }

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    const blockReason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason
    throw new Error(`Gemini no devolvió texto (${blockReason || 'sin respuesta'})`)
  }

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
