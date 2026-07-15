import GroupDb from '../../lib/database/GroupDb.js'
import config from '../../config.js'

const extraerNum = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')

const handler = async (m, { conn, args, command, groupDb, participants, usedPrefix, isAdmin, isOwner, isBotAdmin }) => {
  if (command !== 'warns' && !isAdmin && !isOwner) {
    return m.reply(`*『 👤 』SOLO ADMINS.*\n> Necesitás ser admin para usar este comando.`, { mentions: [m.sender] })
  }

  if (command === 'setwarnlimit') {
    const num = parseInt(args[0])
    if (isNaN(num) || num < 1 || num > 10) return m.reply(`*『 ✙ 』LÍMITE INVÁLIDO.*\n> Ingresá un número entre 1 y 10.`)
    groupDb.warnLimit = num
    groupDb.save()
    return m.reply(`*『 ⚙️ 』LÍMITE ACTUALIZADO.*\n> El nuevo límite de advertencias es *${num}*.`)
  }

  const target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
  const warnLimit = groupDb.warnLimit || 3
  const warns = groupDb.warns || {}

  if (command === 'warns') {
    const who = target || m.sender
    const numWho = extraerNum(who)
    const count = warns[numWho] || 0
    return m.reply(`*『 ⚠️ 』ADVERTENCIAS.*\n> @${numWho} tiene *${count}/${warnLimit}* advertencias.`, { mentions: [who] })
  }

  if (!target) return m.reply(`*『 ⚠️ 』USUARIO REQUERIDO.*\n> Mencioná o respondé el mensaje del usuario.`)
  const numTarget = extraerNum(target)

  if (command === 'delwarn') {
    warns[numTarget] = Math.max(0, (warns[numTarget] || 1) - 1)
    groupDb.warns = warns
    groupDb.save()
    return m.reply(`*『 ✅ 』ADVERTENCIA QUITADA.*\n> @${numTarget} ahora tiene *${warns[numTarget]}/${warnLimit}*.`, { mentions: [target] })
  }

  if (command === 'resetwarn') {
    warns[numTarget] = 0
    groupDb.warns = warns
    groupDb.save()
    return m.reply(`*『 🔄 』ADVERTENCIAS REINICIADAS.*\n> @${numTarget} ya no tiene advertencias.`, { mentions: [target] })
  }

  // command === 'warn'
  warns[numTarget] = (warns[numTarget] || 0) + 1
  groupDb.warns = warns
  groupDb.save()

  const current = warns[numTarget]
  let txt = `*『 ⚠️ 』ADVERTENCIA.*\n> @${numTarget} recibió una advertencia.\n> *${current}/${warnLimit}* advertencias.`

  if (current >= warnLimit) {
    try {
      await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
      txt += `\n> 🥾 Se alcanzó el límite y fue *expulsado*.`
      warns[numTarget] = 0
      groupDb.warns = warns
      groupDb.save()
    } catch {
      txt += `\n> ❌ No se pudo expulsar (bot sin permisos).`
    }
  }

  await conn.sendMessage(m.chat, { text: txt, mentions: [target] }, { quoted: m })
}

handler.help = ['warn @tag', 'warns @tag', 'delwarn @tag', 'resetwarn @tag', 'setwarnlimit N']
handler.desc = 'Sistema de advertencias: dar/ver/quitar warns, y expulsión automática al llegar al límite.'
handler.tags = ['group']
handler.command = ['warn', 'warns', 'delwarn', 'resetwarn', 'setwarnlimit']
handler.groupOnly = true
handler.adminOnly = false
handler.botAdminOnly = false

export default handler
