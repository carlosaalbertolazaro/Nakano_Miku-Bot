// Wrapper sobre minecraft-server-util (pura JS, sin dependencias nativas)
// para consultar el estado de un servidor de Minecraft alojado en Aternos,
// sin necesitar credenciales de la cuenta de Aternos — solo el ping normal
// del protocolo de Minecraft (Server List Ping).
//
// Verificado en vivo antes de escribir esto: implementé el handshake a mano
// (VarInt + status request) contra mc.hypixel.net (siempre online) para
// confirmar el protocolo, y después contra el servidor real de Aternos que
// pasó Carlos — con el server apagado, Aternos acepta la conexión TCP pero
// corta la conexión apenas se manda el handshake real (ECONNRESET). Por eso
// acá CUALQUIER error de status() se interpreta directamente como
// "apagado", sin distinguir el tipo — es el comportamiento real observado,
// no una suposición.
//
// Importante: Aternos publica un registro SRV (_minecraft._tcp.<host>) que
// apunta al host:puerto real y CAMBIA cada vez que el servidor se reinicia
// — confirmado con un SRV lookup real. Por eso se usa enableSRV:true y se
// ignora cualquier puerto fijo guardado en el .env salvo como respaldo.
import { status } from 'minecraft-server-util'
import config from '../config.js'

export async function checkAternosStatus() {
  const host = config.aternos?.host
  if (!host) throw new Error('No hay un servidor de Aternos configurado (ATERNOS_SERVER_HOST en el .env).')

  const port = Number(config.aternos?.port) || 25565

  try {
    const res = await status(host, port, { enableSRV: true, timeout: 5000 })
    return {
      online: true,
      players: res.players.online,
      maxPlayers: res.players.max,
      motd: res.motd.clean,
      version: res.version.name,
    }
  } catch {
    return { online: false }
  }
}
