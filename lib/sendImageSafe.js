// Baileys puede recibir { image: { url } } y bajar la imagen él mismo, pero
// sin ningún timeout propio: si el servidor de origen (ibb.co, MyAnimeList,
// PokeAPI, YGOPRODeck, etc.) tarda o no responde, esa tarea de envío queda
// colgada en la cola de salida del chat (lib/queue.js, tope de 60s) y
// bloquea TODO lo que le siga en ese mismo chat hasta que expire el timeout
// — reportado en vivo por Carlos: comandos que dejaban de responder justo
// después de un .menu/.menú casino, con "[QUEUE:...] Timeout" en consola.
// Bajando la imagen acá con timeout propio (bastante más corto) evitamos
// ese cuelgue: si falla, el que llama puede caer a solo texto en vez de
// dejar la cola entera esperando.
const IMAGE_FETCH_TIMEOUT_MS = 12000

export async function fetchImageBuffer(url) {
  if (!url) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
