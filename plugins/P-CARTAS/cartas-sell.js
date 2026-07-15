import UserDb from '../../lib/database/UserDb.js'
import { CARD_RARITY_TIERS } from '../../lib/ygo.js'

const handler = async (m, { args, usedPrefix, command }) => {
  const idx = parseInt(args[0])
  if (!Number.isInteger(idx) || idx < 1) {
    return m.reply(`*『 ℹ️ 』USO CORRECTO*\n> ${usedPrefix}${command} <número>\n> Mirá los números con *.deck*`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const owned = user.data?.cards?.owned || []
  const card = owned[idx - 1]

  if (!card) {
    return m.reply(`*『 ❌ 』NO ENCONTRADA*\n> No tenés ninguna carta en la posición *${idx}*.`)
  }

  const value = CARD_RARITY_TIERS[card.rarity]?.sellValue || CARD_RARITY_TIERS.comun.sellValue
  owned.splice(idx - 1, 1)
  user.coins += value
  await user.save()

  await m.reply(`*『 💰 』VENDIDA*\n> Vendiste *${card.name}* por *${value} monedas*.\n> Balance actual: *${user.coins}*`)
}

handler.help = ['vendercarta <numero>']
handler.tags = ['cartas']
handler.command = ['vendercarta']

export default handler
