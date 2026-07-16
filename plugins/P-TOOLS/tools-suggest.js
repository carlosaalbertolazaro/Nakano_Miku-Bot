import config from '../../config.js'

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text || !text.trim()) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}suggest <tu sugerencia o reporte>\n> Ejemplo: ${usedPrefix}suggest agreguen el anime "Chainsaw Man" al gacha`)
  }

  const owners = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber]
  const origen = m.isGroup ? (m.chat.split('@')[0]) : 'privado'

  for (const num of owners) {
    conn.sendMessage(`${num}@s.whatsapp.net`, {
      text: `*┏━━•❈ 💡 SUGERENCIA/REPORTE ❈•━━┓*\n\n> 👤 De: @${m.sender.split('@')[0]}\n> 📍 Origen: ${origen}\n> 📝 ${text.trim()}\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`,
      mentions: [m.sender],
    }).catch(() => {})
  }

  await m.reply(`*『 ✅ 』¡Gracias! Tu sugerencia le llegó al dueño del bot.*`)
}

handler.help = ['suggest <texto>']
handler.desc = 'Mandale una sugerencia o reporte (anime faltante, bug, idea) directo al dueño del bot.'
handler.tags = ['tools']
handler.command = ['suggest', 'sugerir', 'report', 'reportar']

export default handler
