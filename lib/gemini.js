// Wrapper sobre la API de Gemini (Google AI). Verificado en vivo con la key
// real de Carlos: la key autentica bien (ListModels funciona), pero
// gemini-2.0-flash/-lite devuelven 429 "limit: 0" en el plan gratuito de ese
// proyecto — hay que revisar la cuota en aistudio.google.com/apikey.
// Se usa 'gemini-flash-latest' (alias que apunta siempre al Flash vigente,
// evita hardcodear una versión que Google deprecará más adelante). No se usa
// el helper compartido lib/httpJson.js a propósito: los mensajes de error de
// Gemini son bien específicos (cuota, seguridad, etc.) y vale la pena
// mostrarlos tal cual en vez del genérico "estado 429".

import config from '../config.js'

const MODEL = 'gemini-flash-latest'

const SYSTEM_INSTRUCTION =
  'Sos Miku (Nakano Miku), la asistente de este grupo/chat de WhatsApp, creada por Carlos. ' +
  'Respondé siempre en español, de forma breve, natural y amigable, como si fueras una persona real ' +
  'charlando por WhatsApp — nada de respuestas larguísimas, acartonadas, ni listas innecesarias. ' +
  'No te presentes ni expliques quién sos a menos que te lo pregunten directamente.'

export async function askGemini(prompt, history = []) {
  const apiKey = config.ai?.geminiApiKey
  if (!apiKey) throw new Error('No hay una GEMINI_API_KEY configurada en el .env del bot.')

  const contents = [...history, { role: 'user', parts: [{ text: prompt }] }]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  let res
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: { maxOutputTokens: 400, temperature: 0.9 },
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(json?.error?.message || `Gemini respondió con estado ${res.status}`)
  }

  const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join('')
  if (!text) {
    const blockReason = json?.promptFeedback?.blockReason
    if (blockReason) throw new Error(`Gemini bloqueó la respuesta por seguridad (${blockReason}).`)
    throw new Error('Gemini no devolvió ninguna respuesta.')
  }

  return text.trim()
}
