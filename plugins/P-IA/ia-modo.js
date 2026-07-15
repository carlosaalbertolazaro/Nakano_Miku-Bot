// Toggle admin-only por grupo del "modo constante" de la IA (ver
// plugins/P-IA/ia-chat.js). Mismo patrón que grupo-modulos.js: un flag en
// GroupDb, chequeado a mano dentro del .all porque el sistema genérico de
// .disable/.enable no cubre hooks pasivos.
const handler = async (m, { args, groupDb, usedPrefix, isAdmin, isOwner }) => {
  const sub = (args[0] || '').toLowerCase()

  if (!sub) {
    const estado = groupDb.aiConstantMode === true ? 'ACTIVADO 🟢' : 'DESACTIVADO 🔴'
    return m.reply(
      `*┏━━•❈ 🤖 MODO CHAT DE MIKU ❈•━━┓*\n\n` +
      `> Estado: *${estado}*\n\n` +
      `> Activado: Miku responde casi todos los mensajes del grupo.\n` +
      `> Desactivado: solo participa de vez en cuando (o si le hablás directo).\n\n` +
      `> ${usedPrefix}iamodo on\n> ${usedPrefix}iamodo off\n` +
      `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
    )
  }

  if (!isAdmin && !isOwner) return m.reply(`*『 👤 』Solo un admin puede cambiar el modo de chat de Miku.*`)

  if (['on', 'activar', 'si'].includes(sub)) {
    groupDb.aiConstantMode = true
    await groupDb.save()
    return m.reply(`*『 🟢 』Modo chat activado.*\n> Miku va a participar casi todo el tiempo. Usá *${usedPrefix}iamodo off* para que vuelva a ser espontánea.`)
  }

  if (['off', 'desactivar', 'no'].includes(sub)) {
    groupDb.aiConstantMode = false
    await groupDb.save()
    return m.reply(`*『 🔴 』Modo chat desactivado.*\n> Miku vuelve a participar solo de vez en cuando, o si le hablás directo.`)
  }

  return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}iamodo on\n> ${usedPrefix}iamodo off`)
}

handler.help = ['iamodo', 'iamodo on', 'iamodo off']
handler.desc = 'Activa un modo en el que Miku participa casi todo el tiempo en el chat del grupo (en vez de solo espontáneamente).'
handler.tags = ['ia']
handler.command = ['iamodo', 'modoia', 'iachat']
handler.groupOnly = true

export default handler
