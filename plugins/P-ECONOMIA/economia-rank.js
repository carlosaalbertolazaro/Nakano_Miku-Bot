import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb, { getXpRanking } from '../../lib/database/UserDb.js'
import { generateRankCard } from '../../lib/rankcard.js'

const handler = async (m, { conn, text, participants }) => {
  let who = m.mentionedJid?.[0]
    || (m.quoted ? m.quoted.sender : null)
    || (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null)
    || m.sender
  who = jidNormalizedUser(who)

  const user = await UserDb.findOrCreate(who)

  let rank = 1
  let total = 1
  if (m.isGroup && participants?.length) {
    const jids = participants.map(p => jidNormalizedUser(p.id)).filter(Boolean)
    const ranking = await getXpRanking(jids)
    total = ranking.length || 1
    const idx = ranking.findIndex(r => r.jid === who)
    rank = idx >= 0 ? idx + 1 : total
  }

  let avatarUrl = null
  try { avatarUrl = await conn.profilePictureUrl(who, 'image') } catch {}

  const displayName = who === m.sender ? (m.pushName || who.split('@')[0]) : who.split('@')[0]

  try {
    const buffer = await generateRankCard({
      avatarUrl,
      username: displayName,
      xp: user.xp,
      coins: user.coins,
      rank,
      totalInGroup: total,
    })
    await m.replyImg(buffer, `*『 🏆 』Nivel ${user.level}*`)
  } catch (e) {
    console.error('[RANK CARD ERROR]', e.message)
    await m.reply(`*『 📊 』PERFIL*\n> Nivel: ${user.level}\n> XP: ${user.xp}\n> Monedas: ${user.coins}\n> Posición: #${rank} de ${total}`)
  }
}

handler.help = ['rank [@user]']
handler.desc = 'Tarjeta visual con tu nivel, XP, monedas y posición en el ranking del grupo.'
handler.tags = ['economia']
handler.command = ['rank', 'level', 'nivel']

export default handler
