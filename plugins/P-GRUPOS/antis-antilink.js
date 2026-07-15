const linkRegex = /(?:https?:\/\/)?(?:www\.)?(?:chat\.whatsapp\.com|wa\.me)\/(?:invite\/)?([0-9A-Za-z]{20,24})/i

const getMessageText = (m) => {
  return m.body
    || m.text
    || m.message?.extendedTextMessage?.text
    || m.message?.extendedTextMessage?.matchedText
    || m.message?.imageMessage?.caption
    || m.message?.videoMessage?.caption
    || m.message?.documentMessage?.caption
    || ''
}

const handler = async (m, { args, groupDb }) => {
  const option = args[0]?.toLowerCase()

  if (!option) {
    return m.reply(`*『 🔗 』ANTILINK*\n\n> Estado: ${groupDb.antilink ? '✅ ON' : '❌ OFF'}\n> *Uso:* .antilink on / off`)
  }

  if (['on', '1', 'true', 'activar', 'enable'].includes(option)) {
    if (groupDb.antilink) return m.reply(`*『 ⚠️ 』YA ACTIVADO*\n> El antilink ya estaba activado.`)

    groupDb.antilink = true
    await groupDb.save()
    return m.reply(`*『 ✅ 』ANTILINK ACTIVADO*\n> Se eliminarán los enlaces de otros grupos y se expulsará al infractor.`)

  } else if (['off', '0', 'false', 'desactivar', 'disable'].includes(option)) {
    if (!groupDb.antilink) return m.reply(`*『 ⚠️ 』YA DESACTIVADO*\n> El antilink ya estaba desactivado.`)

    groupDb.antilink = false
    await groupDb.save()
    return m.reply(`*『 ❌ 』ANTILINK DESACTIVADO*`)

  } else {
    return m.reply(`*『 ❕ 』OPCIÓN INVÁLIDA*\n> Usa: .antilink on / off`)
  }
}

handler.before = async (m, { conn, isAdmin, isOwner, isBotAdmin, groupDb }) => {
  if (!m.isGroup || m.fromMe) return false
  if (!groupDb?.antilink) return false
  if (isAdmin || isOwner || !isBotAdmin) return false

  const text = getMessageText(m)
  if (!text) return false

  const match = text.match(linkRegex)
  if (!match) return false

  const linkCode = match[1]
  const currentCode = await conn.groupInviteCode(m.chat).catch(() => null)
  if (currentCode && linkCode === currentCode) return false

  try {
    await conn.sendMessage(m.chat, { delete: m.key })
    await m.reply(`*『 🔗 』ENLACE DETECTADO*\n> @${m.sender.split('@')[0]}, los enlaces externos no están permitidos. Serás expulsado.`, { mentions: [m.sender] })
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
  } catch (e) {
    console.error('[ANTILINK ERROR] Fallo al expulsar/borrar:', e.message)
  }

  return true
}

handler.help = ['antilink <on/off>']
handler.desc = 'Borra automáticamente links de invitación a otros grupos de WhatsApp y expulsa a quien los mande.'
handler.tags = ['group']
handler.command = ['antilink', 'antienlace']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.alwaysBefore = true
handler.noRegister = true

export default handler
