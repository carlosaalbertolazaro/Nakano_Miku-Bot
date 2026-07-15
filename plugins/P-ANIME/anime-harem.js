import UserDb from '../../lib/database/UserDb.js'
import { RARITY_TIERS } from '../../lib/jikan.js'

const PAGE_SIZE = 10

const handler = async (m, { args }) => {
  const user = await UserDb.findOrCreate(m.sender)
  const characters = user.data?.waifu?.characters || []

  if (characters.length === 0) {
    return m.reply(`*『 📭 』COLECCIÓN VACÍA*\n> Todavía no reclamaste ningún personaje. Usá *.gacha* en un grupo para empezar.`)
  }

  const totalPages = Math.ceil(characters.length / PAGE_SIZE)
  let page = parseInt(args[0]) || 1
  if (page < 1) page = 1
  if (page > totalPages) page = totalPages

  const start = (page - 1) * PAGE_SIZE
  const slice = characters.slice(start, start + PAGE_SIZE)

  let txt = `*┏━━•❈ 💘 TU COLECCIÓN ❈•━━┓*\n\n`
  slice.forEach((c, i) => {
    const idx = start + i + 1
    const label = RARITY_TIERS[c.rarity]?.label || c.rarity
    txt += `> *${idx}.* ${c.name} — ${label}\n`
  })
  txt += `\n*━━━━━━━━━━━━━━━━━━━━*\n`
  txt += `> 📦 Total: ${characters.length} personajes\n`
  txt += `> 📄 Página ${page}/${totalPages}\n`
  txt += `> 💡 Usá *.charinfo <número>* para ver detalles\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

handler.help = ['harem [pagina]']
handler.desc = 'Ver tu colección de personajes de anime reclamados.'
handler.tags = ['anime']
handler.command = ['harem', 'miharem', 'coleccion']

export default handler
