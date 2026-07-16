import { plugins } from '../../handler.js'
import config from '../../config.js'

const handler = async (m) => {
  const ms = process.uptime() * 1000
  const seg = Math.floor(ms / 1000) % 60
  const min = Math.floor(ms / 60000) % 60
  const hora = Math.floor(ms / 3600000) % 24
  const dias = Math.floor(ms / 86400000)

  const mem = process.memoryUsage()
  const ramMB = (mem.rss / 1024 / 1024).toFixed(1)

  await m.reply(
    `*┏━━•❈ 📊 ESTADO DEL BOT ❈•━━┓*\n\n` +
    `> 🤖 ${config.botFullName || config.botName}\n` +
    `> 🔖 Versión: *${config.version}*\n` +
    `> ⏱️ Encendido hace: *${dias}d ${hora}h ${min}m ${seg}s*\n` +
    `> 🧩 Comandos cargados: *${Object.keys(plugins).length}*\n` +
    `> 💾 RAM en uso: *${ramMB} MB*\n` +
    `> 🟢 Node: *${process.version}*\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  )
}

handler.help = ['status']
handler.desc = 'Ver el estado general del bot (uptime, RAM, versión, comandos cargados).'
handler.tags = ['tools']
handler.command = ['status', 'estado']

export default handler
