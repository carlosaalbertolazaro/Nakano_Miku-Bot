import UserDb from '../../lib/database/UserDb.js'

const COOLDOWN_MS = 24 * 60 * 60 * 1000
const MIN_REWARD = 100
const MAX_REWARD = 300

// Ingreso pasivo por tener personajes reclamados — le da una razón real
// para GUARDAR waifus en vez de venderlas todas al toque (a pedido de
// Carlos: "las waifus no tienen utilidad"). Tope para que una colección
// gigante no rompa el balance del juego.
const BONUS_POR_RAREZA = { legendaria: 15, epica: 8, rara: 3, comun: 1 }
const BONUS_MAXIMO = 200

function calcularBonusHarem(characters) {
  const total = characters.reduce((sum, c) => sum + (BONUS_POR_RAREZA[c.rarity] ?? 1), 0)
  return Math.min(total, BONUS_MAXIMO)
}

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
  const characters = user.data?.waifu?.characters || []
  const bonusHarem = calcularBonusHarem(characters)

  user.coins += reward + bonusHarem
  user.data.economy.lastDaily = now
  await user.save()

  const bonusLine = bonusHarem > 0
    ? `\n> 💘 Bonus por tu colección (${characters.length} personajes): *+${bonusHarem}*`
    : `\n> 💡 Tip: los personajes que reclamás con *.gacha* te dan un bonus acá todos los días — no hace falta venderlos todos.`

  await m.reply(`*『 🎁 』RECOMPENSA DIARIA*\n> Recibiste *${reward} monedas* 💰${bonusLine}\n> Balance actual: *${user.coins}*\n> Volvé mañana por más.`)
}

handler.help = ['daily']
handler.desc = 'Reclamá tu recompensa diaria de monedas (100-300 + bonus por tu colección de personajes, una vez cada 24h).'
handler.tags = ['economia']
handler.command = ['daily', 'diario', 'recompensa', 'd']

export default handler
