import UserDb from '../../lib/database/UserDb.js'

// Nace de un pedido concreto de Carlos: la gente le pregunta seguido "para
// qué sirven las monedas" y "para qué sirve el gacha" — esto es la
// respuesta directa, en un solo comando.
const handler = async (m) => {
  const user = await UserDb.findOrCreate(m.sender)
  const bank = user.data?.economy?.bank || 0

  await m.reply(
    `*┏━━•❈ 💰 ¿PARA QUÉ SIRVEN LAS MONEDAS? ❈•━━┓*\n\n` +
    `> Tu billetera: *${user.coins}* · Banco: *${bank}*\n\n` +
    `*『 📈 Cómo ganar más 』*\n` +
    `> *.daily* — recompensa diaria\n` +
    `> *.work* — sin riesgo, cada 1h\n` +
    `> *.crime* / *.flirt* — más plata, pero podés perder si sale mal\n` +
    `> *.sellwaifu* / *.sellpokemon* / *.vendercarta* — vender lo que reclamaste\n\n` +
    `*『 🎯 En qué gastarlas 』*\n` +
    `> *.gacha* → *.claim* un personaje, después *.haremshop*/*.sellwaifu* para venderlo\n` +
    `> *.sobre* — sobres de cartas Yu-Gi-Oh\n` +
    `> *.slots* / *.blackjack* / *.ruleta* / *.coinflip* — casino, para multiplicar (o perder) monedas\n` +
    `> *.pay* — regalarle monedas a alguien\n` +
    `> *.deposit* — guardarlas en el banco, a salvo de *.steal*\n\n` +
    `> 💡 Todo el que te roba, vende o gana monedas usa el mismo balance — es una sola economía para toda la diversión del bot.\n` +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
  )
}

handler.help = ['economyinfo']
handler.desc = 'Explica para qué sirven las monedas y cómo funciona toda la economía del bot en un solo lugar.'
handler.tags = ['economia']
handler.command = ['economyinfo', 'einfo', 'infoeconomia']

export default handler
