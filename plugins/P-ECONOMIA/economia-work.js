import UserDb from '../../lib/database/UserDb.js'

const COOLDOWN_MS = 15 * 1000 // 15s — alineado con Nekos Club a pedido de Carlos (antes 1h)
const MIN_REWARD = 50
const MAX_REWARD = 250

// Frases completas (no solo el rubro) al estilo "cursed" que le gustó a
// Carlos de otros bots — cada una es una historia cortita, {reward} se
// reemplaza por el monto ganado.
const HISTORIAS = [
  'Trabajaste como loco toda la noche para juntar la plata de la figura que tanto querías y ganaste {reward} monedas.',
  'Repartiste pedidos en bici bajo la lluvia y terminaste ganando {reward} monedas (y un resfriado).',
  'Le diste clases de matemática a un pibe de la secundaria y te pagó {reward} monedas.',
  'Hiciste un streaming de 12 horas seguidas sin dormir y la gente te tiró {reward} monedas en donaciones.',
  'Cuidaste a los gatos de la vecina mientras estaba de viaje y te dejó {reward} monedas de propina.',
  'Arreglaste la PC de tu tío (otra vez) y te pagó {reward} monedas "por las molestias".',
  'Vendiste tu colección de figuras duplicadas en una convención y sacaste {reward} monedas.',
  'Traducís manga sin licencia para un foro random y te depositaron {reward} monedas.',
  'Lavaste autos todo el día bajo el sol y terminaste con {reward} monedas y quemado.',
  'Atendiste la caja de un local de ramen en la hora pico y te dieron {reward} monedas de propina.',
  'Paseaste 6 perros al mismo tiempo sin que se te escape ninguno — {reward} monedas ganadas, dignidad intacta.',
  'Hiciste de extra en un cosplay shoot random y te pagaron {reward} monedas por aguantar el frío.',
  'Reparaste el router de todo el edificio y los vecinos juntaron {reward} monedas para agradecerte.',
  'Vendiste tus viejos manga a peso y sacaste {reward} monedas — algo es algo.',
  'Diste una clase improvisada de "cómo tirar del gacha sin arruinarte" y cobraste {reward} monedas.',
]

const handler = async (m) => {
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.economy) user.data.economy = {}

  const last = user.data.economy.lastWork || 0
  const now = Date.now()
  const elapsed = now - last

  if (elapsed < COOLDOWN_MS) {
    const remaining = COOLDOWN_MS - elapsed
    const seg = Math.ceil(remaining / 1000)
    return m.reply(`*『 ⏳ 』ESTÁS CANSADO*\n> Descansá un poco más — volvé a trabajar en *${seg}s*.`)
  }

  const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD
  const historia = HISTORIAS[Math.floor(Math.random() * HISTORIAS.length)].replace('{reward}', reward)

  user.coins += reward
  user.data.economy.lastWork = now
  await user.save()

  await m.reply(`*『 💼 』A TRABAJAR*\n> ${historia}\n> Balance: *${user.coins}* 💰`)
}

handler.help = ['work']
handler.desc = 'Trabajá para ganar monedas de forma segura (sin riesgo), cada 15 segundos.'
handler.tags = ['economia']
handler.command = ['work', 'trabajar', 'w']

export default handler
