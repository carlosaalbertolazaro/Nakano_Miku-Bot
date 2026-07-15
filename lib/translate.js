// Traductor gratuito sin API key vía el endpoint no oficial de Google
// Translate (el mismo que usan paquetes populares como translate-google).
// Verificado en vivo con curl. No está documentado oficialmente por Google,
// así que puede fallar o cambiar — por eso translateToSpanish() nunca tira
// error: si falla, devuelve el texto original sin traducir.

import { fetchJsonWithRetry } from './httpJson.js'

export async function translateToSpanish(text, sourceLang = 'en') {
  if (!text) return text
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=es&dt=t&q=${encodeURIComponent(text)}`
    const json = await fetchJsonWithRetry(url, { retries: 1, timeoutMs: 8000 })
    const translated = json?.[0]?.map(chunk => chunk[0]).join('')
    return translated || text
  } catch {
    return text
  }
}
