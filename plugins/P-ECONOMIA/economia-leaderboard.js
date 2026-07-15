import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { getRanking } from '../../lib/database/UserDb.js'

const handler = async (m, { participants, command }) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> Este comando solo funciona en grupos.`)

  const byCoins = ['topcoins', 'topmonedas', 'ricos'].includes(command)
  const field = byCoins ? 'coins' : 'xp'
  const label = byCoins ? 'monedas' : 'XP'
  const icon = byCoins ? '🪙' : '✨'

  const jids = participants.map(p => jidNormalizedUser(p.id)).filter(Boolean)
  const ranking = await getRanking(jids, field, { limit: 10 })
  const top = ranking.filter(r => r.value > 0)

  if (top.length === 0) {
    return m.reply(`*『 📊 』SIN DATOS*\n> Todavía nadie tiene ${label} registrado en este grupo.`)
  }

  const medals = ['🥇', '🥈', '🥉']
  const mentions = []
  let txt = `*┏━━•❈ ${icon} TOP ${label.toUpperCase()} ❈•━━┓*\n\n`
  top.forEach((r, i) => {
    mentions.push(r.jid)
    txt += `> ${medals[i] || `*${i + 1}.*`} @${r.jid.split('@')[0]} — ${r.value} ${label}\n`
  })
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt, { mentions })
}

handler.help = ['topxp', 'topcoins']
handler.desc = 'Top 10 del grupo por experiencia o por monedas.'
handler.tags = ['economia']
handler.command = ['topxp', 'topcoins', 'topmonedas', 'ricos', 'leaderboard']
handler.groupOnly = true

export default handler
