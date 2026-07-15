import UserDb from '../../lib/database/UserDb.js'
import { POKEMON_RARITY } from '../../lib/pokeapi.js'

const PAGE_SIZE = 10

const handler = async (m, { args }) => {
  const user = await UserDb.findOrCreate(m.sender)
  const caught = user.data?.pokemon?.caught || []

  if (caught.length === 0) {
    return m.reply(`*『 📭 』POKÉDEX VACÍA*\n> Todavía no atrapaste ningún Pokémon. Esperá a que aparezca uno salvaje en el grupo y usá *.catch <nombre>*.`)
  }

  const totalPages = Math.ceil(caught.length / PAGE_SIZE)
  let page = parseInt(args[0]) || 1
  if (page < 1) page = 1
  if (page > totalPages) page = totalPages

  const start = (page - 1) * PAGE_SIZE
  const slice = caught.slice(start, start + PAGE_SIZE)

  let txt = `*┏━━•❈ 🐾 TU POKÉDEX ❈•━━┓*\n\n`
  slice.forEach((p, i) => {
    const idx = start + i + 1
    const label = POKEMON_RARITY[p.rarity]?.label || p.rarity
    const shinyTag = p.shiny ? '✨ ' : ''
    txt += `> *${idx}.* ${shinyTag}${p.nameEs} — ${label}\n`
  })
  txt += `\n*━━━━━━━━━━━━━━━━━━━━*\n`
  txt += `> 📦 Total: ${caught.length} Pokémon\n`
  txt += `> 📄 Página ${page}/${totalPages}\n`
  txt += `> 💡 Usá *.pokeinfo <número>* para ver detalles\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

handler.help = ['pokedex [pagina]']
handler.tags = ['pokemon']
handler.command = ['pokedex', 'mipokedex']

export default handler
