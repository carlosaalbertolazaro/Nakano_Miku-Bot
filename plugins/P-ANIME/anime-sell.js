import UserDb from '../../lib/database/UserDb.js'
import { RARITY_TIERS } from '../../lib/jikan.js'

const handler = async (m, { args, usedPrefix, command }) => {
  const idx = parseInt(args[0])
  if (!Number.isInteger(idx) || idx < 1) {
    return m.reply(`*『 ℹ️ 』USO CORRECTO*\n> ${usedPrefix}${command} <número>\n> Mirá los números con *.harem*`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const characters = user.data?.waifu?.characters || []
  const character = characters[idx - 1]

  if (!character) {
    return m.reply(`*『 ❌ 』NO ENCONTRADO*\n> No tenés ningún personaje en la posición *${idx}*.`)
  }

  const value = RARITY_TIERS[character.rarity]?.sellValue || RARITY_TIERS.comun.sellValue
  characters.splice(idx - 1, 1)
  user.coins += value
  await user.save()

  await m.reply(`*『 💰 』VENDIDO*\n> Vendiste a *${character.name}* por *${value} monedas*.\n> Balance actual: *${user.coins}*`)
}

handler.help = ['sellwaifu <numero>']
handler.desc = 'Vender un personaje reclamado por monedas, según su rareza.'
handler.tags = ['anime']
handler.command = ['sellwaifu', 'vender']

export default handler
