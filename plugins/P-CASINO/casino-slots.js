import UserDb from '../../lib/database/UserDb.js'
import { validateBet } from '../../lib/casino.js'

// Pesos relativos (no tienen que sumar 100, se normalizan solos). A menor
// peso, más raro el símbolo y mayor el pago por triple.
const SYMBOLS = [
  { emoji: '🍒', weight: 30, payout3: 2 },
  { emoji: '🍋', weight: 25, payout3: 3 },
  { emoji: '🍊', weight: 20, payout3: 4 },
  { emoji: '🍇', weight: 15, payout3: 6 },
  { emoji: '⭐', weight: 7,  payout3: 10 },
  { emoji: '💎', weight: 2,  payout3: 20 },
  { emoji: '7️⃣', weight: 1,  payout3: 50 },
]
const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0)

function spinReel() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const s of SYMBOLS) {
    if (r < s.weight) return s
    r -= s.weight
  }
  return SYMBOLS[0]
}

const handler = async (m, { args }) => {
  const user = await UserDb.findOrCreate(m.sender)
  const check = validateBet(user, args[0])
  if (!check.ok) return m.reply(`*『 🎰 』${check.error}*`)

  const { bet } = check
  const reels = [spinReel(), spinReel(), spinReel()]
  const display = reels.map(r => r.emoji).join('  |  ')

  let winnings = 0
  let resultado

  if (reels[0].emoji === reels[1].emoji && reels[1].emoji === reels[2].emoji) {
    winnings = bet * reels[0].payout3
    resultado = `🎉 *¡TRIPLE ${reels[0].emoji}!* Ganaste *${winnings} monedas*`
  } else if (reels[0].emoji === reels[1].emoji || reels[1].emoji === reels[2].emoji || reels[0].emoji === reels[2].emoji) {
    winnings = bet
    resultado = `😐 Casi... recuperás tu apuesta (*${bet} monedas*)`
  } else {
    resultado = `💥 Perdiste *${bet} monedas*`
  }

  user.coins += winnings - bet
  await user.save()

  await m.reply(
    `*┏━━•❈ 🎰 TRAGAMONEDAS ❈•━━┓*\n\n` +
    `> [ ${display} ]\n\n` +
    `> ${resultado}\n` +
    `> 💰 Balance: *${user.coins}*\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  )
}

handler.help = ['slots <apuesta>']
handler.desc = 'Tragamonedas de 3 rodillos. Triple símbolo paga en grande (hasta 50x).'
handler.tags = ['casino']
handler.command = ['slots', 'tragamonedas']

export default handler
