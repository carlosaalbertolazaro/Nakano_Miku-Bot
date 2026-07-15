// Traductor gratuito sin API key vía el endpoint no oficial de Google
// Translate (el mismo que usan paquetes populares como translate-google).
// Verificado en vivo con curl. No está documentado oficialmente por Google,
// así que puede fallar o cambiar.

import { fetchJsonWithRetry } from './httpJson.js'

// General: cualquier idioma origen/destino (códigos ISO tipo 'en','es','fr',
// 'ja'...). sourceLang 'auto' deja que Google detecte el idioma solo.
export async function translateText(text, targetLang, sourceLang = 'auto') {
  if (!text) return { text, detectedLang: sourceLang }
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
  const json = await fetchJsonWithRetry(url, { retries: 1, timeoutMs: 8000 })
  const translated = json?.[0]?.map(chunk => chunk[0]).join('')
  const detectedLang = json?.[2] || sourceLang
  if (!translated) throw new Error('Google Translate no devolvió una traducción.')
  return { text: translated, detectedLang }
}

// Usado por la trivia (lib/opentdb.js) — nunca tira error: si falla, devuelve
// el texto original en inglés en vez de romper la ronda.
export async function translateToSpanish(text, sourceLang = 'en') {
  if (!text) return text
  try {
    const { text: translated } = await translateText(text, 'es', sourceLang)
    return translated || text
  } catch {
    return text
  }
}
