import UserDb from '../../lib/database/UserDb.js'

const COOLDOWN_MS = 45 * 1000 // 45s — alineado con Nekos Club a pedido de Carlos (antes 30 min)
const SUCCESS_RATE = 0.55
const MIN_WIN = 100
const MAX_WIN = 500
const MIN_FINE = 50
const MAX_FINE = 250

const HISTORIAS_OK = [
  'Le robaste el vuelto a un kiosco distraído y sacaste {reward} monedas.',
  'Vendiste figuras de anime falsificadas como si fueran originales y ganaste {reward} monedas.',
  'Hackeaste una cuenta de streaming ajena y la revendiste por {reward} monedas.',
  'Te escapaste con la caja registradora de un local de ramen — {reward} monedas en el bolsillo.',
  'Le vendiste "cartas raras" que en realidad eran de una pack de sobres viejo, y sacaste {reward} monedas.',
  'Colaste un sticker pack pirata en el grupo del vecindario y cobraste {reward} monedas.',
  'Le hiciste trampa a alguien en un torneo casero y te quedaste con {reward} monedas del premio.',
  'Revendiste entradas falsas para una convención y sacaste {reward} monedas antes de que se dieran cuenta.',
]
const HISTORIAS_MAL = [
  'Te agarró la policía intentando robar y pagaste {reward} monedas de multa.',
  'Te descubrieron vendiendo figuras falsificadas y tuviste que devolver {reward} monedas.',
  'La víctima te reconoció al toque y le tuviste que pagar {reward} monedas para que no te denuncie.',
  'Se activó la alarma del local y saliste corriendo sin nada, perdiendo {reward} monedas en el proceso.',
  'Intentaste hackear una cuenta y te rastrearon — {reward} monedas de multa por meterte en líos.',
  'Te descubrieron haciendo trampa en el torneo y te sancionaron {reward} monedas.',
  'Vendiste entradas falsas justo al organizador del evento — {reward} monedas de indemnización.',
]

const handler = async (m) => {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}

  const last = user.data.economy.lastCrime || 0
  const now = Date.now()
  const elapsed = now - last

  if (elapsed < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - elapsed
    const seg = Math.ceil(remaining / 1000)
    return m.reply(`*『 🚨 』MUY ARRIESGADO*\n> Esperá que se enfríe la cosa — volvé a intentarlo en *${seg}s*.`)
  }

  user.data.economy.lastCrime = now

  if (Math.random() < SUCCESS_RATE) {
    const win = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN
    const historia = HISTORIAS_OK[Math.floor(Math.random() * HISTORIAS_OK.length)].replace('{reward}', win)
    user.coins += win
    await user.save()
    return m.reply(`*『 😎 』ÉXITO*\n> ${historia}\n> Balance: *${user.coins}* 💰`)
  }

  const fine = Math.min(user.coins, Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1)) + MIN_FINE)
  const historia = HISTORIAS_MAL[Math.floor(Math.random() * HISTORIAS_MAL.length)].replace('{reward}', fine)
  user.coins -= fine
  await user.save()
  return m.reply(`*『 🚔 』TE ATRAPARON*\n> ${historia}\n> Balance: *${user.coins}* 💸`)
}

handler.help = ['crime']
handler.desc = 'Intentá ganar monedas rápido cometiendo un delito — arriesgado, podés perder plata si te atrapan.'
handler.tags = ['economia']
handler.command = ['crime', 'delito', 'c']

export default handler
