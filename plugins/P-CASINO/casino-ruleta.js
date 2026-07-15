import UserDb from '../../lib/database/UserDb.js'
import { validateBet } from '../../lib/casino.js'

// Ruleta europea: 0-36, un solo cero (la ventaja de la casa sale de ahí).
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

function girar() {
  return Math.floor(Math.random() * 37) // 0-36
}

function colorDe(n) {
  if (n === 0) return 'verde'
  return ROJOS.has(n) ? 'rojo' : 'negro'
}

const handler = async (m, { args, usedPrefix, command }) => {
  const user = await UserDb.findOrCreate(m.sender)
  const check = validateBet(user, args[0])
  if (!check.ok) return m.reply(`*『 🎡 』${check.error}*`)

  const apuestaTipo = (args[1] || '').toLowerCase()
  const numeroApostado = parseInt(apuestaTipo, 10)
  const esNumero = /^\d+$/.test(apuestaTipo) && numeroApostado >= 0 && numeroApostado <= 36
  const esColor = ['rojo', 'negro', 'verde'].includes(apuestaTipo)

  if (!esNumero && !esColor) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}${command} <apuesta> <rojo|negro|verde|0-36>`)
  }

  const { bet } = check
  const resultado = girar()
  const color = colorDe(resultado)

  let winnings = 0
  if (esNumero && numeroApostado === resultado) winnings = bet * 36
  else if (esColor && apuestaTipo === color) winnings = color === 'verde' ? bet * 14 : bet * 2

  user.coins += winnings - bet
  await user.save()

  const texto = winnings > 0
    ? `🎉 *¡GANASTE ${winnings} monedas!*`
    : `💥 Perdiste *${bet} monedas*`

  await m.reply(
    `*┏━━•❈ 🎡 RULETA ❈•━━┓*\n\n` +
    `> 🎯 Salió: *${resultado}* (${color})\n\n` +
    `> ${texto}\n` +
    `> 💰 Balance: *${user.coins}*\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  )
}

handler.help = ['ruleta <apuesta> <rojo|negro|verde|numero>']
handler.tags = ['casino']
handler.command = ['ruleta', 'roulette']

export default handler
