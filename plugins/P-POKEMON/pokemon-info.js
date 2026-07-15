import UserDb from '../../lib/database/UserDb.js'
import { POKEMON_RARITY } from '../../lib/pokeapi.js'

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const idx = parseInt(args[0])
  if (!Number.isInteger(idx) || idx < 1) {
    return m.reply(`*『 ℹ️ 』USO CORRECTO*\n> ${usedPrefix}${command} <número>\n> Mirá los números con *.pokedex*`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const caught = user.data?.pokemon?.caught || []
  const pokemon = caught[idx - 1]

  if (!pokemon) {
    return m.reply(`*『 ❌ 』NO ENCONTRADO*\n> No tenés ningún Pokémon en la posición *${idx}*. Mirá *.pokedex* para ver los números válidos.`)
  }

  const label = POKEMON_RARITY[pokemon.rarity]?.label || pokemon.rarity
  const fecha = new Date(pokemon.caughtAt).toLocaleDateString('es')
  const shinyTag = pokemon.shiny ? '✨ (Shiny) ' : ''

  const caption = `*『 🐾 』${shinyTag}${pokemon.nameEs}*\n\n` +
    `> 🔢 N° Pokédex: #${pokemon.dexId}\n` +
    `> 🏷️ Tipo: ${(pokemon.types || []).join(', ') || 'desconocido'}\n` +
    `> ${label}\n` +
    `> 📅 Atrapado: ${fecha}\n`

  try {
    if (pokemon.image) {
      await conn.sendMessage(m.chat, { image: { url: pokemon.image }, caption }, { quoted: m })
    } else {
      await m.reply(caption)
    }
  } catch {
    await m.reply(caption)
  }
}

handler.help = ['pokeinfo <numero>']
handler.desc = 'Ver la ficha de un Pokémon atrapado (tipo, rareza, imagen).'
handler.tags = ['pokemon']
handler.command = ['pokeinfo', 'infopokemon']

export default handler
