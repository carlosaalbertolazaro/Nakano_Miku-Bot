import * as baileysMod from '@whiskeysockets/baileys'
import { incrementActivity, getActivityMap, resetGroupActivity } from '../../lib/database/UserDb.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

function resolveJid(p) {
  if (p.phoneNumber) {
    const num = p.phoneNumber
    return jidNormalizedUser(num.includes('@') ? num : `${num}@s.whatsapp.net`)
  }
  if (!p.id.endsWith('@lid')) return jidNormalizedUser(p.id)
  return null
}

const handler = async (m, { conn, participants, isAdmin, isOwner, args, command }) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> Este comando solo funciona en grupos.`)

  const sub = (args[0] || '').toLowerCase()

  if (sub === 'reset') {
    if (!isAdmin && !isOwner) {
      return m.reply(`*『 👤 』SOLO ADMINS.*\n> Necesitás ser admin para resetear la actividad.`)
    }
    await resetGroupActivity(m.chat)
    return m.reply(`*『 ✅ 』RESET COMPLETO.*\n> El contador de actividad del grupo fue reiniciado.`)
  }

  const data     = await getActivityMap(m.chat)
  const mentions = []
  let txt        = ''

  const esInactivos = ['inactivos', 'inactive', 'nulos'].includes(command)

  if (esInactivos) {
    const botJid = jidNormalizedUser(conn.user.id)
    const umbral = Number.isInteger(parseInt(args[0])) && parseInt(args[0]) >= 0
      ? parseInt(args[0])
      : 0

    const inactivos = participants
      .filter(p => {
        const jid = resolveJid(p)
        if (!jid) return false
        if (jid === botJid) return false
        return (data[jid] || 0) <= umbral
      })
      .sort((a, b) => (data[resolveJid(a)] || 0) - (data[resolveJid(b)] || 0))
      .slice(0, 20)

    if (inactivos.length === 0) {
      return m.reply(`*『 ✅ 』SIN RESULTADOS.*\n> Ningún miembro tiene ${umbral} mensaje${umbral === 1 ? '' : 's'} o menos.`)
    }

    const tituloFiltro = umbral === 0 ? 'SIN MENSAJES' : `${umbral} MSGS O MENOS`

    txt = `*┏━━•❈ 😴 INACTIVOS ❈•━━┓*\n\n`
    txt += `*『 💤 ${tituloFiltro} 』*\n`
    inactivos.forEach((p, i) => {
      const jid  = resolveJid(p)
      const msgs = data[jid] || 0
      mentions.push(jid)
      txt += `> *${i + 1}.* @${jid.split('@')[0]} — ${msgs} msgs\n`
    })
    txt += `\n*━━━━━━━━━━━━━━━━━━━━*\n`
    txt += `> 😴 *Encontrados:* ${inactivos.length} usuarios\n`
    txt += `> 👥 *Total en grupo:* ${participants.length}\n`
    txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  } else {
    const sorted = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 20)

    if (sorted.length === 0) {
      return m.reply(`*『 📊 』SIN DATOS.*\n> Aún no hay actividad registrada en este grupo.`)
    }

    const totalMsgs = Object.values(data).reduce((a, b) => a + b, 0)
    const medals    = ['🥇', '🥈', '🥉']

    txt = `*┏━━•❈ 📊 ACTIVIDAD ❈•━━┓*\n\n`
    txt += `*『 🔥 MÁS ACTIVOS 』*\n`
    sorted.forEach(([jid, count], i) => {
      mentions.push(jid)
      txt += `> ${medals[i] || `*${i + 1}.*`} @${jid.split('@')[0]} — ${count} msgs\n`
    })
    txt += `\n*━━━━━━━━━━━━━━━━━━━━*\n`
    txt += `> 📨 *Total mensajes:* ${totalMsgs}\n`
    txt += `> 👥 *Usuarios con actividad:* ${Object.keys(data).length}\n`
    txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  }

  await conn.sendMessage(m.chat, { text: txt, mentions }, { quoted: m })
}

handler.all = async function (m) {
  if (!m.isGroup || !m.sender || m.isBaileys) return
  if (!m.message) return

  await incrementActivity(m.sender, m.chat)
}

handler.help      = ['actividad', 'inactivos']
handler.tags      = ['group']
handler.command   = ['actividad', 'activos', 'activity', 'inactivos', 'inactive', 'nulos']
handler.groupOnly = true
handler.noRegister = true

export default handler
