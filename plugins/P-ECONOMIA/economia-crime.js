import UserDb from '../../lib/database/UserDb.js'

const COOLDOWN_MS = 30 * 60 * 1000 // 30 min, más corto que .work pero con riesgo
const SUCCESS_RATE = 0.55
const MIN_WIN = 100
const MAX_WIN = 400
const MIN_FINE = 50
const MAX_FINE = 200

const DELITOS_OK = [
  'le robaste el vuelto a un kiosco', 'vendiste figuras de anime falsificadas',
  'hackeaste una cuenta de streaming', 'escapaste con la caja registradora de un local',
]
const DELITOS_MAL = [
  'te agarró la policía intentando robar', 'te descubrieron falsificando figuras',
  'la víctima te reconoció y tuviste que pagarle', 'se activó la alarma y saliste corriendo sin nada',
]

const handler = async (m) => {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}

  const last = user.data.economy.lastCrime || 0
  const now = Date.now()
  const elapsed = now - last

  if (elapsed < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - elapsed
    const min = Math.ceil(remaining / 60000)
    return m.reply(`*『 🚨 』MUY ARRIESGADO*\n> Esperá que se enfríe la cosa — volvé a intentarlo en *${min} minutos*.`)
  }

  user.data.economy.lastCrime = now

  if (Math.random() < SUCCESS_RATE) {
    const win = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN
    const relato = DELITOS_OK[Math.floor(Math.random() * DELITOS_OK.length)]
    user.coins += win
    await user.save()
    return m.reply(`*『 😎 』ÉXITO*\n> ${relato} y ganaste *${win} monedas* 💰\n> Balance: *${user.coins}*`)
  }

  const fine = Math.min(user.coins, Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1)) + MIN_FINE)
  const relato = DELITOS_MAL[Math.floor(Math.random() * DELITOS_MAL.length)]
  user.coins -= fine
  await user.save()
  return m.reply(`*『 🚔 』TE ATRAPARON*\n> ${relato} y perdiste *${fine} monedas* 💸\n> Balance: *${user.coins}*`)
}

handler.help = ['crime']
handler.desc = 'Intentá ganar monedas rápido cometiendo un delito — arriesgado, podés perder plata si te atrapan.'
handler.tags = ['economia']
handler.command = ['crime', 'delito']

export default handler
