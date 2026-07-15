import { fetchRandomCard } from '../../lib/ygo.js'
import UserDb from '../../lib/database/UserDb.js'

const PACK_COST = 50

const handler = async (m, { conn, groupDb }) => {
  if (m.isGroup && groupDb?.modules?.cards === false) {
    return m.reply(`*『 🚫 』El módulo de cartas está desactivado en este grupo.*`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  if (user.coins < PACK_COST) {
    return m.reply(`*『 ❌ 』SALDO INSUFICIENTE*\n> Un sobre cuesta *${PACK_COST} monedas* y tenés *${user.coins}*.\n> Usá *.daily* para conseguir más.`)
  }

  await m.reply(`*『 🃏 』Abriendo sobre...*`)

  let card
  try {
    card = await fetchRandomCard()
  } catch (e) {
    return m.reply(`*『 ❌ 』ERROR DE CONEXIÓN*\n> No se pudo consultar la base de datos de cartas (YGOPRODeck) ahora mismo. No se te descontó nada.\n> _${e.message}_`)
  }

  user.coins -= PACK_COST
  if (!user.data.cards) user.data.cards = { owned: [] }
  if (!Array.isArray(user.data.cards.owned)) user.data.cards.owned = []

  user.data.cards.owned.push({
    ygoId: card.id,
    name: card.name,
    type: card.type,
    race: card.race,
    attribute: card.attribute,
    atk: card.atk,
    def: card.def,
    level: card.level,
    image: card.image,
    rarity: card.rarity.key,
    obtainedAt: Date.now(),
  })
  await user.save()

  const caption = `*『 🃏 』¡NUEVA CARTA!*\n\n` +
    `> ✨ *${card.name}*\n` +
    `> 🏷️ ${card.type}${card.attribute ? ` • ${card.attribute}` : ''}\n` +
    (card.atk !== null ? `> ⚔️ ATK ${card.atk} / DEF ${card.def}\n` : '') +
    `> ${card.rarity.label}\n\n` +
    `> 💰 Sobre: -${PACK_COST} monedas (balance: ${user.coins})\n` +
    `> Usá *.deck* para ver tu colección.`

  try {
    if (card.image) {
      await conn.sendMessage(m.chat, { image: { url: card.image }, caption }, { quoted: m })
    } else {
      await m.reply(caption)
    }
  } catch {
    await m.reply(caption)
  }
}

handler.help = ['sobre']
handler.desc = 'Abrir un sobre de Yu-Gi-Oh (50 monedas) con 1 carta al azar.'
handler.tags = ['cartas']
handler.command = ['sobre', 'pack', 'abrirsobre']

export default handler
