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
  const bank = user.data?.economy?.bank || 0
  const profile = user.data?.profile || {}

  const extra = []
  if (profile.bio) extra.push(`> 📝 ${profile.bio}`)
  if (profile.genre) extra.push(`> ⚧️ Género: *${profile.genre}*`)
  if (profile.marriedTo) extra.push(`> 💍 Casado/a con @${profile.marriedTo.split('@')[0]}`)
  const mentions = [who, ...(profile.marriedTo ? [profile.marriedTo] : [])]
  const extraBlock = extra.length ? extra.join('\n') + '\n\n' : ''

  const texto = `*『 💰 』PERFIL DE ${tag}*\n\n` +
    extraBlock +
    `> 🏅 Nivel: *${progress.level}*\n` +
    `> ✨ XP: *${progress.into}/${progress.span}*\n` +
    `> ${bar}\n` +
    `> 🪙 Billetera: *${user.coins}*\n` +
    `> 🏦 Banco: *${bank}*\n` +
    premiumLine +
    `\n> 💡 *.rank* tarjeta visual · *.daily* recompensa diaria · *.work*/*.crime* ganar más · *.deposit* proteger tu plata.`

  await m.reply(texto, { mentions })
}

handler.help = ['bal [@user]']
handler.desc = 'Ver tu perfil: monedas, nivel, XP y progreso hacia el siguiente nivel.'
handler.tags = ['economia']
handler.command = ['bal', 'balance', 'economia', 'perfil', 'profile']

export default handler
