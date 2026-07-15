import GroupDb from './database/GroupDb.js'
import { fetchAiringInfoBatch } from './anilist.js'

const CHECK_INTERVAL_MS = 10 * 60_000 // AniList no necesita chequeos por minuto como los eventos con hora exacta

let intervalHandle = null

// AniList siempre expone el PRÓXIMO episodio (con cuenta regresiva). La
// forma de detectar "ya salió" sin depender de un timestamp exacto es
// comparar contra el último episodio que vimos como "próximo": si AniList
// ya avanzó a un número mayor (o el anime terminó), el que estábamos
// esperando ya se emitió.
export function startAiringScheduler(conn) {
  if (intervalHandle) clearInterval(intervalHandle)

  intervalHandle = setInterval(async () => {
    try {
      const groups = await GroupDb.getAll()
      const gruposConSeguidos = groups.filter(g => g.followedAnime?.length)
      if (!gruposConSeguidos.length) return

      const idsUnicos = [...new Set(gruposConSeguidos.flatMap(g => g.followedAnime.map(a => a.id)))]
      const info = await fetchAiringInfoBatch(idsUnicos)
      const infoPorId = new Map(info.map(i => [i.id, i]))

      for (const groupDb of gruposConSeguidos) {
        let changed = false
        const siguen = []

        for (const seguido of groupDb.followedAnime) {
          const actual = infoPorId.get(seguido.id)

          if (!actual || actual.nextEpisode == null) {
            // Terminó (o AniList ya no lo devuelve) — avisamos el último
            // episodio esperado como emitido y lo sacamos de la lista.
            conn.sendMessage(groupDb.id, {
              text: `*┏━━•❈ 📺 NUEVO EPISODIO ❈•━━┓*\n\n> *${seguido.title}*\n> Episodio ${seguido.lastKnownEpisode} — ¡ya salió! (parece que la serie terminó o entró en pausa)\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
            }).catch(() => {})
            changed = true
            continue // no se vuelve a agregar a `siguen`, queda sacado de la lista
          }

          if (actual.nextEpisode !== seguido.lastKnownEpisode) {
            conn.sendMessage(groupDb.id, {
              text: `*┏━━•❈ 📺 NUEVO EPISODIO ❈•━━┓*\n\n> *${seguido.title}*\n> Episodio ${seguido.lastKnownEpisode} — ¡ya salió!\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
            }).catch(() => {})
            seguido.lastKnownEpisode = actual.nextEpisode
            changed = true
          }

          siguen.push(seguido)
        }

        if (changed) {
          groupDb.followedAnime = siguen
          await groupDb.save()
        }
      }
    } catch (e) {
      console.error('[AIRING SCHEDULER ERROR]', e.message)
    }
  }, CHECK_INTERVAL_MS)
}
