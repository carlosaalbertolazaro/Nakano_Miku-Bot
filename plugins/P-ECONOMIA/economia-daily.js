import UserDb from '../../lib/database/UserDb.js'

const COOLDOWN_MS = 24 * 60 * 60 * 1000
const MIN_REWARD = 100
const MAX_REWARD = 300

const handler = async (m) => {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}

  const last = user.data.economy.lastDaily || 0
  const now = Date.now()
  const elapsed = now - last

  if (elapsed < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - elapsed
    const h = Math.floor(remaining / 3600000)
    const min = Math.floor((remaining % 3600000) / 60000)
    return m.reply(`*『 ⏳ 』YA RECLAMASTE HOY*\n> Volvé a intentarlo en *${h}h ${min}m*.`)
  }

  const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD
  user.coins += reward
  user.data.economy.lastDaily = now
  await user.save()

  await m.reply(`*『 🎁 』RECOMPENSA DIARIA*\n> Recibiste *${reward} monedas* 💰\n> Balance actual: *${user.coins}*\n> Volvé mañana por más.`)
}

handler.help = ['daily']
handler.desc = 'Reclamá tu recompensa diaria de monedas (100-300, una vez cada 24h).'
handler.tags = ['economia']
handler.command = ['daily', 'diario', 'recompensa']

export default handler
