import UserDb from '../../lib/database/UserDb.js'
import { CARD_RARITY_TIERS } from '../../lib/ygo.js'

const PAGE_SIZE = 10

const handler = async (m, { args }) => {
  const user = await UserDb.findOrCreate(m.sender)
  const owned = user.data?.cards?.owned || []

  if (owned.length === 0) {
    return m.reply(`*『 📭 』SIN CARTAS*\n> Todavía no tenés cartas. Usá *.sobre* para abrir tu primer sobre.`)
  }

  const totalPages = Math.ceil(owned.length / PAGE_SIZE)
  let page = parseInt(args[0]) || 1
  if (page < 1) page = 1
  if (page > totalPages) page = totalPages

  const start = (page - 1) * PAGE_SIZE
  const slice = owned.slice(start, start + PAGE_SIZE)

  let txt = `*┏━━•❈ 🃏 TU DECK ❈•━━┓*\n\n`
  slice.forEach((c, i) => {
    const idx = start + i + 1
    const label = CARD_RARITY_TIERS[c.rarity]?.label || c.rarity
    txt += `> *${idx}.* ${c.name} — ${label}\n`
  })
  txt += `\n*━━━━━━━━━━━━━━━━━━━━*\n`
  txt += `> 📦 Total: ${owned.length} cartas\n`
  txt += `> 📄 Página ${page}/${totalPages}\n`
  txt += `> 💡 Usá *.cartainfo <número>* para ver detalles\n`
  txt += `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt)
}

handler.help = ['deck [pagina]']
handler.desc = 'Ver tu colección de cartas de Yu-Gi-Oh.'
handler.tags = ['cartas']
handler.command = ['deck', 'miscartas']

export default handler
