const handler = async (m, { conn }) => {
  await conn.groupSettingUpdate(m.chat, 'announcement')
  m.reply(`*『 🔒 』GRUPO CERRADO.*\n▢ Solo los admins pueden enviar mensajes.`)
}

handler.help = ['cerrar']
handler.desc = 'Cerrar el grupo para que solo los admins puedan escribir.'
handler.tags = ['group']
handler.command = ['cerrar', 'closegroup', 'close']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
