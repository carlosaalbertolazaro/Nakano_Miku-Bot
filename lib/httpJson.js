// Helper HTTP compartido para APIs públicas externas (Jikan, PokeAPI,
// YGOPRODeck): reintentos con backoff, timeout, y manejo de 429. Usado por
// los módulos de gacha/pokemon/cartas, que dependen de servicios gratuitos
// de terceros que a veces son inestables.

export async function fetchJsonWithRetry(url, { retries = 2, timeoutMs = 10000 } = {}) {
  let lastErr = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let res
      try {
        res = await fetch(url, { signal: controller.signal })
      } finally {
        clearTimeout(timer)
      }

      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      if (!res.ok) throw new Error(`La API respondió con estado ${res.status}`)

      return await res.json()
    } catch (e) {
      lastErr = e
      if (attempt < retries) await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }

  throw new Error(lastErr?.message || 'El servicio externo no respondió tras varios intentos.')
}
