import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb from '../../lib/database/UserDb.js'
import { getProgress } from '../../lib/economy.js'

function asciiBar(progress, size = 10) {
  const filled = Math.max(0, Math.min(size, Math.round(progress * size)))
  return '▓'.repeat(filled) + '░'.repeat(size - filled)
}

const handler = async (m, { text }) => {
  let who = m.mentionedJid?.[0]
    || (m.quoted ? m.quoted.sender : null)
    || (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
    || m.sender
  who = jidNormalizedUser(who)

  const user = await UserDb.findOrCreate(who)
  const progress = getProgress(user.xp)
  const bar = asciiBar(progress.progress)
  const tag = `@${who.split('@')[0]}`

  const premiumLine = user.premium?.tier && user.premium.tier !== 'free'
    ? `> 💎 Premium: *${user.premium.tier}*\n`
    : ''

  const texto = `*『 💰 』PERFIL DE ${tag}*\n\n` +
    `> 🏅 Nivel: *${progress.level}*\n` +
    `> ✨ XP: *${progress.into}/${progress.span}*\n` +
    `> ${bar}\n` +
    `> 🪙 Monedas: *${user.coins}*\n` +
    premiumLine +
    `\n> 💡 Usá *.rank* para tu tarjeta visual, *.daily* para tu recompensa diaria.`

  await m.reply(texto, { mentions: [who] })
}

handler.help = ['bal [@user]']
handler.desc = 'Ver tu perfil: monedas, nivel, XP y progreso hacia el siguiente nivel.'
handler.tags = ['economia']
handler.command = ['bal', 'balance', 'economia', 'perfil', 'profile']

export default handler
