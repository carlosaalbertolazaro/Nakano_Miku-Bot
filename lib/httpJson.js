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
        // Sin un User-Agent de navegador, algunos servicios (confirmado con
        // nekos.best devolviendo 403) bloquean el request por Cloudflare/WAF
        // al ver el User-Agent genérico por defecto de fetch/undici.
        res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        })
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
