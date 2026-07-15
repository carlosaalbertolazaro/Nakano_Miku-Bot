// Toggle admin-only por grupo del modo de charla de la IA (ver
// plugins/P-IA/ia-chat.js). Mismo patrón que grupo-modulos.js: un flag en
// GroupDb, chequeado a mano dentro del .all porque el sistema genérico de
// .disable/.enable no cubre hooks pasivos.
const MODOS = {
  normal: { emoji: '🟡', nombre: 'NORMAL', desc: 'Participa de vez en cuando, además de cuando le hablás directo.' },
  constante: { emoji: '🟢', nombre: 'CONSTANTE', desc: 'Responde casi todos los mensajes del grupo.' },
  silencio: { emoji: '🔴', nombre: 'SILENCIO', desc: 'Solo responde si le hablás directo (mención, reply, .ai, o por privado). Nunca por su cuenta.' },
}

const handler = async (m, { args, groupDb, usedPrefix, isAdmin, isOwner }) => {
  const sub = (args[0] || '').toLowerCase()
  const modoActual = MODOS[groupDb.aiMode] ? groupDb.aiMode : 'normal'

  if (!sub) {
    const m1 = MODOS[modoActual]
    let txt = `*┏━━•❈ 🤖 MODO CHAT DE MIKU ❈•━━┓*\n\n> Actual: ${m1.emoji} *${m1.nombre}*\n\n`
    for (const [key, info] of Object.entries(MODOS)) {
      txt += `> ${info.emoji} *${key}* — ${info.desc}\n`
    }
    txt += `\n> ${usedPrefix}iamodo <normal|constante|silencio>\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
    return m.reply(txt)
  }

  if (!isAdmin && !isOwner) return m.reply(`*『 👤 』Solo un admin puede cambiar el modo de chat de Miku.*`)

  if (!MODOS[sub]) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}iamodo normal\n> ${usedPrefix}iamodo constante\n> ${usedPrefix}iamodo silencio`)
  }

  groupDb.aiMode = sub
  await groupDb.save()

  const info = MODOS[sub]
  await m.reply(`*『 ${info.emoji} 』Modo cambiado a ${info.nombre}.*\n> ${info.desc}`)
}

handler.help = ['iamodo', 'iamodo normal', 'iamodo constante', 'iamodo silencio']
handler.desc = 'Elegí cómo participa Miku en el chat: de vez en cuando, todo el tiempo, o solo cuando le hablás directo.'
handler.tags = ['ia']
handler.command = ['iamodo', 'modoia', 'iachat']
handler.groupOnly = true

export default handler
