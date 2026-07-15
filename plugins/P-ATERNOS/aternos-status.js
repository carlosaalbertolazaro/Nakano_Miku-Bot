import { checkAternosStatus } from '../../lib/aternos.js'

const handler = async (m) => {
  let info
  try {
    info = await checkAternosStatus()
  } catch (e) {
    return m.reply(`*『 ❌ 』${e.message}*`)
  }

  if (!info.online) {
    return m.reply(
      `*┏━━•❈ 🎮 SERVIDOR MINECRAFT ❈•━━┓*\n\n` +
      `> 🔴 Apagado ahora mismo.\n` +
      `> Andá a aternos.org y arrancalo si querés jugar.\n` +
      `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
    )
  }

  await m.reply(
    `*┏━━•❈ 🎮 SERVIDOR MINECRAFT ❈•━━┓*\n\n` +
    `> 🟢 Encendido\n` +
    `> 👥 ${info.players}/${info.maxPlayers} jugadores\n` +
    `> 🧩 ${info.version}\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  )
}

handler.help = ['aternos']
handler.desc = 'Consultá si el servidor de Minecraft (Aternos) está encendido y cuántos jugadores hay.'
handler.tags = ['tools']
handler.command = ['aternos', 'mcserver']

export default handler
