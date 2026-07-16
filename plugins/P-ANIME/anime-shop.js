import { jidNormalizedUser } from '@whiskeysockets/baileys'
import UserDb from '../../lib/database/UserDb.js'
import { RARITY_TIERS } from '../../lib/jikan.js'
import { createListing, getListings, getListing, removeListing } from '../../lib/waifuMarket.js'

const MIN_PRICE = 50

async function listar(m, { args, usedPrefix }) {
  const idx = parseInt(args[0])
  const precio = parseInt(args[1])

  if (!Number.isInteger(idx) || idx < 1 || !Number.isInteger(precio) || precio < MIN_PRICE) {
    return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}listwaifu <número> <precio>\n> Precio mínimo: ${MIN_PRICE}. Mirá los números con *.harem*.`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const characters = user.data?.waifu?.characters || []
  const character = characters[idx - 1]
  if (!character) return m.reply(`*『 ❌ 』No tenés ningún personaje en la posición *${idx}*.`)

  characters.splice(idx - 1, 1)
  await user.save()

  const id = await createListing(m.sender, character, precio)
  await m.reply(`*『 🏪 』PUBLICADO*\n> *${character.name}* está a la venta por *${precio} monedas* (ID #${id}).\n> Cualquiera lo puede comprar con *${usedPrefix}buycharacter ${id}*.`)
}

async function tienda(m, { args, usedPrefix }) {
  const page = parseInt(args[0]) || 1
  const { items, total, totalPages } = await getListings({ page })

  if (!total) {
    return m.reply(`*『 🏪 』TIENDA VACÍA*\n> Nadie publicó personajes todavía. Usá *${usedPrefix}listwaifu <número> <precio>* para vender el tuyo.`)
  }

  let txt = `*┏━━•❈ 🏪 TIENDA DE PERSONAJES ❈•━━┓*\n\n`
  for (const l of items) {
    const label = RARITY_TIERS[l.character.rarity]?.label || l.character.rarity
    txt += `> *#${l.id}* — ${l.character.name} (${label})\n> 💰 ${l.price} monedas · 👤 @${l.sellerJid.split('@')[0]}\n\n`
  }
  txt += `> Página ${page}/${totalPages} · ${usedPrefix}buycharacter <ID>\n*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await m.reply(txt, { mentions: items.map(l => l.sellerJid) })
}

async function comprar(m, { args, usedPrefix }) {
  const id = parseInt(args[0])
  if (!Number.isInteger(id)) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}buycharacter <ID>`)

  const listing = await getListing(id)
  if (!listing) return m.reply(`*『 ❌ 』No existe ninguna publicación con ese ID.*`)

  const buyerJid = jidNormalizedUser(m.sender)
  if (listing.sellerJid === buyerJid) return m.reply(`*『 ❌ 』No podés comprarte tu propia publicación — usá *${usedPrefix}removesale ${id}*.`)

  const buyer = await UserDb.findOrCreate(m.sender)
  if (buyer.coins < listing.price) {
    return m.reply(`*『 ❌ 』SALDO INSUFICIENTE*\n> Necesitás *${listing.price}* monedas, tenés *${buyer.coins}*.`)
  }

  const removed = await removeListing(id)
  if (!removed) return m.reply(`*『 ❌ 』Alguien más ya lo compró justo antes que vos.*`)

  const seller = await UserDb.findOrCreate(removed.sellerJid)
  buyer.coins -= removed.price
  seller.coins += removed.price
  if (!buyer.data.waifu) buyer.data.waifu = { characters: [] }
  if (!buyer.data.waifu.characters) buyer.data.waifu.characters = []
  buyer.data.waifu.characters.push(removed.character)

  await buyer.save()
  await seller.save()

  await m.reply(`*『 ✅ 』COMPRA REALIZADA*\n> Ahora tenés a *${removed.character.name}* en tu harem.\n> Balance: *${buyer.coins}*`)
}

async function quitar(m, { args, usedPrefix }) {
  const id = parseInt(args[0])
  if (!Number.isInteger(id)) return m.reply(`*『 ℹ️ 』USO*\n> ${usedPrefix}removesale <ID>`)

  const listing = await getListing(id)
  if (!listing) return m.reply(`*『 ❌ 』No existe ninguna publicación con ese ID.*`)
  if (listing.sellerJid !== jidNormalizedUser(m.sender)) return m.reply(`*『 ❌ 』Esa publicación no es tuya.*`)

  await removeListing(id)
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.waifu) user.data.waifu = { characters: [] }
  if (!user.data.waifu.characters) user.data.waifu.characters = []
  user.data.waifu.characters.push(listing.character)
  await user.save()

  await m.reply(`*『 🔙 』Retiraste la publicación — *${listing.character.name}* volvió a tu harem.`)
}

const handler = async (m, ctx) => {
  const cmd = ctx.command
  if (cmd === 'listwaifu' || cmd === 'publicar') return listar(m, ctx)
  if (cmd === 'buycharacter' || cmd === 'buychar') return comprar(m, ctx)
  if (cmd === 'removesale' || cmd === 'removerventa') return quitar(m, ctx)
  return tienda(m, ctx)
}

handler.help = ['haremshop [pagina]', 'listwaifu <numero> <precio>', 'buycharacter <ID>', 'removesale <ID>']
handler.desc = 'Mercado de personajes entre usuarios: publicá los tuyos a un precio, o comprale a otro jugador.'
handler.tags = ['anime']
handler.command = ['haremshop', 'tiendawaifus', 'wshop', 'listwaifu', 'publicar', 'buycharacter', 'buychar', 'removesale', 'removerventa']

export default handler
