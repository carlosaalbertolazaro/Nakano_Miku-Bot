import UserDb from '../../lib/database/UserDb.js'
import { validateBet } from '../../lib/casino.js'

const handler = async (m, { args, usedPrefix, command }) => {
  const user = await UserDb.findOrCreate(m.sender)
  const check = validateBet(user, args[0])
  if (!check.ok) return m.reply(`*『 🪙 』${check.error}*`)

  const eleccion = (args[1] || '').toLowerCase()
  if (!['cara', 'cruz'].includes(eleccion)) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}${command} <apuesta> <cara|cruz>`)
  }

  const { bet } = check
  // Ventaja de la casa: 48% de probabilidad de que gane el jugador (no 50/50).
  const gano = Math.random() < 0.48
  const resultado = gano ? eleccion : (eleccion === 'cara' ? 'cruz' : 'cara')
  const winnings = gano ? bet * 2 : 0

  user.coins += winnings - bet
  await user.save()

  await m.reply(
    `*┏━━•❈ 🪙 CARA O CRUZ ❈•━━┓*\n\n` +
    `> 🎯 Salió: *${resultado}*\n\n` +
    `> ${gano ? `🎉 *¡GANASTE ${winnings} monedas!*` : `💥 Perdiste *${bet} monedas*`}\n` +
    `> 💰 Balance: *${user.coins}*\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  )
}

handler.help = ['coinflip <apuesta> <cara|cruz>']
handler.desc = 'Cara o cruz — acertá y duplicás tu apuesta.'
handler.tags = ['casino']
handler.command = ['coinflip', 'caraocruz']

export default handler
