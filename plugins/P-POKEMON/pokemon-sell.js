import UserDb from '../../lib/database/UserDb.js'
import { POKEMON_RARITY } from '../../lib/pokeapi.js'

const handler = async (m, { args, usedPrefix, command }) => {
  const idx = parseInt(args[0])
  if (!Number.isInteger(idx) || idx < 1) {
    return m.reply(`*『 ℹ️ 』USO CORRECTO*\n> ${usedPrefix}${command} <número>\n> Mirá los números con *.pokedex*`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const caught = user.data?.pokemon?.caught || []
  const pokemon = caught[idx - 1]

  if (!pokemon) {
    return m.reply(`*『 ❌ 』NO ENCONTRADO*\n> No tenés ningún Pokémon en la posición *${idx}*.`)
  }

  let value = POKEMON_RARITY[pokemon.rarity]?.sellValue || POKEMON_RARITY.comun.sellValue
  if (pokemon.shiny) value *= 2

  caught.splice(idx - 1, 1)
  user.coins += value
  await user.save()

  await m.reply(`*『 💰 』LIBERADO*\n> Liberaste a *${pokemon.nameEs}* y recibiste *${value} monedas*.\n> Balance actual: *${user.coins}*`)
}

handler.help = ['sellpokemon <numero>']
handler.tags = ['pokemon']
handler.command = ['sellpokemon', 'liberarpokemon']

export default handler
