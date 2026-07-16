import UserDb from '../../lib/database/UserDb.js'
import { CARD_RARITY_TIERS } from '../../lib/ygo.js'
import { fetchImageBuffer } from '../../lib/sendImageSafe.js'

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const idx = parseInt(args[0])
  if (!Number.isInteger(idx) || idx < 1) {
    return m.reply(`*『 ℹ️ 』USO CORRECTO*\n> ${usedPrefix}${command} <número>\n> Mirá los números con *.deck*`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const owned = user.data?.cards?.owned || []
  const card = owned[idx - 1]

  if (!card) {
    return m.reply(`*『 ❌ 』NO ENCONTRADA*\n> No tenés ninguna carta en la posición *${idx}*. Mirá *.deck* para ver los números válidos.`)
  }

  const label = CARD_RARITY_TIERS[card.rarity]?.label || card.rarity
  const fecha = new Date(card.obtainedAt).toLocaleDateString('es')

  const caption = `*『 🃏 』${card.name}*\n\n` +
    `> 🏷️ ${card.type}${card.attribute ? ` • ${card.attribute}` : ''}\n` +
    (card.atk !== null && card.atk !== undefined ? `> ⚔️ ATK ${card.atk} / DEF ${card.def}\n` : '') +
    `> ${label}\n` +
    `> 📅 Obtenida: ${fecha}\n`

  try {
    const buffer = card.image ? await fetchImageBuffer(card.image) : null
    if (buffer) {
      await conn.sendMessage(m.chat, { image: buffer, caption }, { quoted: m })
    } else {
      await m.reply(caption)
    }
  } catch {
    await m.reply(caption)
  }
}

handler.help = ['cartainfo <numero>']
handler.desc = 'Ver la ficha de una carta (ATK/DEF, tipo, rareza, imagen).'
handler.tags = ['cartas']
handler.command = ['cartainfo', 'infocarta']

export default handler
