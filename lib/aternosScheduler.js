import config from '../config.js'
import { checkAternosStatus } from './aternos.js'

const CHECK_INTERVAL_MS = 2 * 60_000

let wasOnline = null // null = todavía no chequeamos nada, evita un aviso falso apenas arranca el bot
let intervalHandle = null

// Solo servidor único configurado por .env (no por-grupo, como aternos.host
// en config.js) — no hay un lugar fijo para "avisar a un grupo" sin inventar
// un config nuevo, así que por ahora avisa por privado a los dueños del bot
// (config.ownerNumber). Si Carlos quiere que avise en un grupo puntual más
// adelante, es un cambio chico.
export function startAternosScheduler(conn) {
  if (!config.aternos?.host) return // sin servidor configurado, nada que chequear
  if (intervalHandle) clearInterval(intervalHandle)

  intervalHandle = setInterval(async () => {
    try {
      const info = await checkAternosStatus()

      if (wasOnline === false && info.online) {
        const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber]
        for (const num of owners) {
          conn.sendMessage(`${num}@s.whatsapp.net`, {
            text: `*┏━━•❈ 🎮 ATERNOS ❈•━━┓*\n\n> 🟢 ¡Tu servidor de Minecraft ya está encendido!\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
          }).catch(() => {})
        }
      }

      wasOnline = info.online
    } catch (e) {
      console.error('[ATERNOS SCHEDULER ERROR]', e.message)
    }
  }, CHECK_INTERVAL_MS)
}
