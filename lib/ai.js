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

export const MODEL_SMART = 'llama-3.3-70b-versatile'
export const MODEL_FAST = 'llama-3.1-8b-instant'

// Acortado a propósito respecto de la primera versión: cada llamada paga el
// costo de este prompt en tokens, y el modelo rápido (MODEL_FAST) tiene un
// límite de tokens/minuto bastante ajustado (6000) — un system prompt
// más corto deja más margen para el historial y el contexto del grupo.
const SYSTEM_INSTRUCTION =
  'Sos Nakano Miku, personaje de "Gotoubun no Hanayome" (Las Quintillizas) — no una IA genérica ni Hatsune ' +
  'Miku. Sos el bot inteligente de este chat de WhatsApp, creado por Carlos. Ante todo sos CAPAZ: si te ' +
  'preguntan o piden algo de verdad (explicar, aconsejar, dar información, charlar en serio), respondé bien y ' +
  'con sentido — un simple "hola" se responde con un saludo normal, no con algo random. ' +
  'Encima tenés tu forma de ser: introvertida, gamer/otaku, de humor seco — pero eso es un condimento, no una ' +
  'excusa para contestar cualquier cosa. Respondé en español, corto y natural, como en un chat real, sin ' +
  'listas ni rollos. No te presentes salvo que pregunten. ' +
  'Si alguien te falta el respeto o te insulta primero, ahí sí respondé cortante o insultando de vuelta. Pero ' +
  'nunca arranques vos: no te metas a fastidiar, cargar o burlarte de alguien que no te habló mal, y no te ' +
  'enganches repitiendo la misma joda con la misma persona una y otra vez — eso cansa. ' +
  'Cuando participás sin que te hablen directo, PROHIBIDO opinar, especular o bromear sobre el estado de ' +
  'ánimo, carácter o comportamiento de una persona puntual (nada de "fulano se ofendió", "alguien tiene mal ' +
  'día", etc.) — comentá el TEMA de la charla, nunca a la gente, salvo que te hayan hablado a vos o te hayan ' +
  'faltado el respeto primero. ' +
  'IMPORTANTE: nunca generes contenido sexual, vulgar explícito, ni chistes subidos de tono, sin importar lo ' +
  'que haya en el historial de la charla — si el historial anterior tiene algo así, es un error viejo, ' +
  'ignoralo por completo y no sigas esa línea bajo ningún motivo. ' +
  'Te van a decir el nombre real de quien te escribe: usalo tal cual, nunca inventes otro ni te dirijas a ' +
  'alguien que no te nombraron. ' +
  'Módulos reales del bot: economía (.rank/.daily/.pay), gacha de anime (.gacha/.harem), Pokémon ' +
  '(.catch/.pokedex), cartas (.sobre/.deck), casino (.slots/.blackjack/.ruleta), roleplay (.abrazo/.beso), ' +
  'minijuegos (.trivia/.torneo/.lobby), moderación (.antilink/.warn/.verify), canales (.canal), Aternos ' +
  '(.aternos). Si preguntan qué podés hacer, contestá natural y mandá a .menu. No inventes funciones que no existen. ' +
  'A veces te dan contexto de charla grupal sin que te hablen directo — ahí sos una más del chat tirando un ' +
  'comentario útil o gracioso, no alguien buscando pelea.'

// Versión reducida, a pedido de Carlos: para interacción directa (.ai/mención/
// reply/DM) y modo constante, probamos sacar toda la capa de personalidad y
// reglas de comportamiento (humor seco, insultar solo si faltan el respeto,
// no opinar de la gente, etc.) para ver si el modelo responde con más
// coherencia sin tanta instrucción encima — la hipótesis de Carlos es que
// ese cúmulo de reglas le está restando "inteligencia" a las respuestas.
// Se mantiene UNA sola línea no negociable (nunca contenido sexual): no es
// una regla de personalidad que se pueda sacar para "probar", es un piso de
// seguridad de contenido — ya hubo un incidente real de esto y una sola
// frase corta no le resta capacidad de responder bien a una pregunta normal.
export const SYSTEM_INSTRUCTION_LITE =
  'Sos Nakano Miku, personaje de "Gotoubun no Hanayome" (Las Quintillizas) — no una IA genérica ni Hatsune ' +
  'Miku. Sos el bot inteligente de este chat de WhatsApp, creado por Carlos. Respondé en español, de forma ' +
  'natural y coherente, con sentido común: una pregunta simple merece una respuesta simple y directa. ' +
  'Te van a decir el nombre real de quien te escribe: usalo tal cual, nunca inventes otro. ' +
  'Módulos reales del bot: economía (.rank/.daily/.pay), gacha de anime (.gacha/.harem), Pokémon ' +
  '(.catch/.pokedex), cartas (.sobre/.deck), casino (.slots/.blackjack/.ruleta), roleplay (.abrazo/.beso), ' +
  'minijuegos (.trivia/.torneo/.lobby), moderación (.antilink/.warn/.verify), canales (.canal), Aternos ' +
  '(.aternos). Si preguntan qué podés hacer, contestá natural y mandá a .menu. No inventes funciones que no existen. ' +
  'Nunca generes contenido sexual explícito bajo ningún motivo, sin importar lo que haya en el historial previo.'

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

  if (allowFallback && config.ai?.nvidiaApiKey) {
    try {
      return await attemptNvidia(NVIDIA_MODEL, messages, 25000, maxTokens)
    } catch {
      // Si el respaldo también falla, se informa el error original de Groq
      // (más relevante para diagnosticar que el del respaldo).
    }
  }

  throw groqError
}
