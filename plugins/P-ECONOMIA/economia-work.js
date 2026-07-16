import UserDb from '../../lib/database/UserDb.js'

const COOLDOWN_MS = 60 * 60 * 1000 // 1h
const MIN_REWARD = 50
const MAX_REWARD = 150

const TRABAJOS = [
  'repartiendo pedidos en bici', 'cuidando gatos del vecindario', 'traduciendo manga',
  'haciendo streaming toda la noche', 'vendiendo figuras de anime', 'arreglando una PC',
  'dando clases particulares', 'lavando autos', 'paseando perros', 'atendiendo un local de ramen',
]

const handler = async (m) => {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}

  const last = user.data.economy.lastWork || 0
  const now = Date.now()
  const elapsed = now - last

  if (elapsed < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - elapsed
    const min = Math.ceil(remaining / 60000)
    return m.reply(`*『 ⏳ 』ESTÁS CANSADO*\n> Descansá un poco más — volvé a trabajar en *${min} minutos*.`)
  }

  const trabajo = TRABAJOS[Math.floor(Math.random() * TRABAJOS.length)]
  const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD

  user.coins += reward
  user.data.economy.lastWork = now
  await user.save()

  await m.reply(`*『 💼 』A TRABAJAR*\n> Estuviste ${trabajo} y ganaste *${reward} monedas* 💰\n> Balance: *${user.coins}*`)
}

handler.help = ['work']
handler.desc = 'Trabajá para ganar monedas de forma segura (sin riesgo), una vez por hora.'
handler.tags = ['economia']
handler.command = ['work', 'trabajar']

export default handler
