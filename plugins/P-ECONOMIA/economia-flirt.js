import UserDb from '../../lib/database/UserDb.js'

// Tercera ruta de ingresos rápidos (junto a .work y .crime), pensada como
// equivalente "picante mismo estilo" al típico comando tipo "slut" de otros
// bots de economía — sin la temática sexual/denigrante, con coqueteo y
// carisma en su lugar. Decisión tomada con Carlos.
const COOLDOWN_MS = 20 * 60 * 1000 // el más corto de los tres, pero el más parejo en riesgo
const SUCCESS_RATE = 0.6
const MIN_WIN = 80
const MAX_WIN = 300
const MIN_FINE = 40
const MAX_FINE = 150

const HISTORIAS_OK = [
  'Le coqueteaste al cajero del kiosco y te regaló {reward} monedas de descuento.',
  'Le tiraste onda a alguien en una convención de anime y terminó invitándote cosas por {reward} monedas.',
  'Coqueteaste con el barista hasta que te invitó el café Y te dio {reward} monedas para el bondi.',
  'Usaste tu encanto para que te presten plata "solo por hoy" y sacaste {reward} monedas.',
  'Le hiciste ojitos a un desconocido en la fila del cine y te terminó pagando la entrada + {reward} monedas.',
  'Coqueteaste tan bien en el chat que alguien te mandó {reward} monedas sin que se las pidieras.',
]
const HISTORIAS_MAL = [
  'Intentaste coquetear pero fue tan incómodo que tuviste que pagar {reward} monedas para que lo olviden.',
  'Te rechazaron tan fuerte que gastaste {reward} monedas en helado para consolarte.',
  'Confundiste el nombre de la persona a mitad de la charla y perdiste {reward} monedas de la vergüenza.',
  'Tu técnica de coqueteo espantó a todo el local y terminaste pagando {reward} monedas por el "susto".',
  'Te descubrieron coqueteando con dos personas a la vez y te salió caro: {reward} monedas.',
]

const handler = async (m) => {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}

  const last = user.data.economy.lastFlirt || 0
  const now = Date.now()
  const elapsed = now - last

  if (elapsed < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - elapsed
    const min = Math.ceil(remaining / 60000)
    return m.reply(`*『 😳 』MUY PRONTO*\n> Dejá pasar un rato antes de volver a intentarlo — *${min} minutos*.`)
  }

  user.data.economy.lastFlirt = now

  if (Math.random() < SUCCESS_RATE) {
    const win = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN
    const historia = HISTORIAS_OK[Math.floor(Math.random() * HISTORIAS_OK.length)].replace('{reward}', win)
    user.coins += win
    await user.save()
    return m.reply(`*『 😘 』ÉXITO*\n> ${historia}\n> Balance: *${user.coins}* 💰`)
  }

  const fine = Math.min(user.coins, Math.floor(Math.random() * (MAX_FINE - MIN_FINE + 1)) + MIN_FINE)
  const historia = HISTORIAS_MAL[Math.floor(Math.random() * HISTORIAS_MAL.length)].replace('{reward}', fine)
  user.coins -= fine
  await user.save()
  return m.reply(`*『 😅 』QUÉ VERGÜENZA*\n> ${historia}\n> Balance: *${user.coins}* 💸`)
}

handler.help = ['flirt']
handler.desc = 'Coqueteá para ganar monedas rápido — funciona la mayoría de las veces, pero a veces sale mal.'
handler.tags = ['economia']
handler.command = ['flirt', 'coquetear', 'ligar']

export default handler
