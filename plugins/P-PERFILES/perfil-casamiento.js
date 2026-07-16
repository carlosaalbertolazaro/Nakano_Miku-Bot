import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb from '../../lib/database/UserDb.js'

// Propuestas pendientes en memoria (mismo patrón que fun-tourney.js/
// fun-lobby.js): clave chat+destinatario, expira sola a los 2 minutos.
const proposals = new Map() // `${chat}:${target}` -> { from, timer }
const PROPOSAL_TTL_MS = 2 * 60 * 1000

function spouseOf(user) {
  return user.data?.profile?.marriedTo || null
}

async function proponer(m, { conn, usedPrefix }) {
  const targetJid = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
  if (!targetJid) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}marry @usuario`)

  const target = jidNormalizedUser(targetJid)
  const sender = jidNormalizedUser(m.sender)
  if (target === sender) return m.reply(`*『 ❌ 』No podés casarte con vos mismo.*`)

  const proposerUser = await UserDb.findOrCreate(m.sender)
  if (spouseOf(proposerUser)) return m.reply(`*『 ❌ 』Ya estás casado/a. Usá *${usedPrefix}divorce* primero.*`)

  const targetUser = await UserDb.findOrCreate(target)
  if (spouseOf(targetUser)) return m.reply(`*『 ❌ 』@${target.split('@')[0]} ya está casado/a con alguien.*`, { mentions: [target] })

  const key = `${m.chat}:${target}`
  if (proposals.has(key)) return m.reply(`*『 ❕ 』Ya le hiciste una propuesta a esa persona, esperá su respuesta.*`)

  const timer = setTimeout(() => proposals.delete(key), PROPOSAL_TTL_MS)
  proposals.set(key, { from: sender, timer })

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 💍 PROPUESTA ❈•━━┓*\n\n> @${sender.split('@')[0]} le propone matrimonio a @${target.split('@')[0]} 💕\n\n> @${target.split('@')[0]}, escribí *${usedPrefix}marry aceptar* dentro de 2 minutos para aceptar.\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`,
    mentions: [sender, target],
  }, { quoted: m })
}

async function aceptar(m, { usedPrefix }) {
  const sender = jidNormalizedUser(m.sender)
  const key = `${m.chat}:${sender}`
  const pending = proposals.get(key)

  if (!pending) return m.reply(`*『 ❕ 』No tenés ninguna propuesta pendiente en este chat.*`)

  clearTimeout(pending.timer)
  proposals.delete(key)

  const proposerUser = await UserDb.findOrCreate(pending.from)
  const targetUser = await UserDb.findOrCreate(sender)

  if (spouseOf(proposerUser) || spouseOf(targetUser)) {
    return m.reply(`*『 ❌ 』Uno de los dos ya se casó con otra persona mientras tanto.*`)
  }

  if (!proposerUser.data.profile) proposerUser.data.profile = {}
  if (!targetUser.data.profile) targetUser.data.profile = {}
  proposerUser.data.profile.marriedTo = sender
  targetUser.data.profile.marriedTo = pending.from
  await proposerUser.save()
  await targetUser.save()

  await m.reply(
    `*『 💍 』¡FELICIDADES!*\n> @${pending.from.split('@')[0]} y @${sender.split('@')[0]} ahora están casados 💕`,
    { mentions: [pending.from, sender] }
  )
}

async function divorciar(m) {
  const user = await UserDb.findOrCreate(m.sender)
  const spouseJid = spouseOf(user)
  if (!spouseJid) return m.reply(`*『 ❕ 』No estás casado/a con nadie.*`)

  const spouse = await UserDb.findOrCreate(spouseJid)
  delete user.data.profile.marriedTo
  if (spouse.data?.profile) delete spouse.data.profile.marriedTo
  await user.save()
  await spouse.save()

  await m.reply(`*『 💔 』Te divorciaste de @${spouseJid.split('@')[0]}.*`, { mentions: [spouseJid] })
}

const handler = async (m, ctx) => {
  if (ctx.command === 'divorce' || ctx.command === 'divorciar' || ctx.command === 'divorciarme') return divorciar(m, ctx)
  if ((ctx.args[0] || '').toLowerCase() === 'aceptar') return aceptar(m, ctx)
  return proponer(m, ctx)
}

handler.help = ['marry @usuario', 'marry aceptar', 'divorce']
handler.desc = 'Casate con alguien del grupo (con propuesta y confirmación) o divorciate.'
handler.tags = ['perfiles']
handler.command = ['marry', 'casarse', 'divorce', 'divorciar', 'divorciarme']
handler.groupOnly = true

export default handler
