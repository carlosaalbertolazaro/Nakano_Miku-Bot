// Buzón de confesiones anónimas: .confesion <texto> se escribe DIRECTO en el
// grupo (no por privado) — el bot borra el mensaje original al toque y lo
// reposta anonimizado. Por eso necesita ser admin del grupo (para poder
// borrar el mensaje de otra persona); si no puede borrarlo, no publica nada
// anónimo (el mensaje original ya quedó visible con el nombre de quien lo
// mandó, publicarlo de nuevo "anónimo" ahí sería engañoso).
const handler = async (m, { conn, text, groupDb }) => {
  if (!text) {
    return m.reply(`*『 🤐 』BUZÓN DE CONFESIONES*\n> Escribí tu confesión después del comando.\n> Ejemplo: *.confesion Nunca vi el final de esa serie...*\n> _Tu mensaje se borra al toque y se publica sin tu nombre._`)
  }

  let borrado = false
  try {
    await conn.sendMessage(m.chat, {
      delete: { remoteJid: m.chat, fromMe: false, id: m.id, participant: m.sender }
    })
    borrado = true
  } catch (e) {
    console.error('[CONFESION DELETE ERROR]', e.message)
  }

  if (!borrado) {
    return m.reply(`*『 ⚠️ 』NO SE PUDO GARANTIZAR TU ANONIMATO*\n> No pude borrar tu mensaje original (¿soy admin del grupo?), así que no lo voy a publicar de nuevo. Tu mensaje anterior puede seguir visible.`)
  }

  groupDb.confesionCount = (groupDb.confesionCount || 0) + 1
  await groupDb.save()

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 🤐 CONFESIÓN #${groupDb.confesionCount} ❈•━━┓*\n\n` +
      `> ${text}\n\n` +
      `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  })
}

handler.help = ['confesion <texto>']
handler.desc = 'Publica tu mensaje de forma anónima en el grupo (borra el original).'
handler.tags = ['group']
handler.command = ['confesion', 'confesar']
handler.groupOnly = true
handler.botAdminOnly = true

export default handler
