import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { fetchRandomCharacter } from '../../lib/jikan.js'
import { gachaCooldownCache } from '../../lib/caches.js'
import UserDb from '../../lib/database/UserDb.js'
import { fetchImageBuffer } from '../../lib/sendImageSafe.js'

// Mecánica estilo Mudae: .gacha invoca un personaje al azar en el grupo, y el
// primero en escribir .claim se lo queda. Estado en memoria por chat (mismo
// patrón que fun-ttt.js / fun-akinator.js), se pierde si el bot reinicia —
// intencional, es solo la ventana de "carrera" para reclamar, no inventario.
const pendingRolls = new Map() // chatId -> { character, claimed, timer }

const ROLL_COOLDOWN_S = 45
const CLAIM_WINDOW_MS = 60_000

async function rollCharacter(m, { conn, groupDb }) {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> El gacha de personajes solo funciona en grupos.`)

  if (groupDb?.modules?.waifu === false) {
    return m.reply(`*『 🚫 』El módulo de waifus/anime está desactivado en este grupo.*`)
  }

  if (gachaCooldownCache.has(m.sender)) {
    const ttl = gachaCooldownCache.getTtl(m.sender) || 0
    const remaining = Math.max(1, Math.ceil((ttl - Date.now()) / 1000))
    return m.reply(`*『 ⏳ 』ESPERÁ UN POCO*\n> Podés tirar de nuevo en *${remaining}s*.`)
  }

  if (pendingRolls.has(m.chat)) {
    return m.reply(`*『 ⚠️ 』YA HAY UN PERSONAJE ESPERANDO*\n> Alguien tiene que escribir *.claim* antes de que puedas tirar otro.`)
  }

  await m.reply(`*『 🎴 』Invocando un personaje...*`)

  let character
  try {
    character = await fetchRandomCharacter()
  } catch (e) {
    return m.reply(`*『 ❌ 』ERROR DE CONEXIÓN*\n> No se pudo consultar la base de datos de anime (Jikan) ahora mismo. Probá de nuevo en un rato.\n> _${e.message}_`)
  }

  gachaCooldownCache.set(m.sender, true, ROLL_COOLDOWN_S)

  const entry = { character, claimed: false, timer: null }
  entry.timer = setTimeout(() => {
    const current = pendingRolls.get(m.chat)
    if (current === entry && !entry.claimed) {
      pendingRolls.delete(m.chat)
      conn.sendMessage(m.chat, { text: `*『 💨 』${character.name} se escapó...*\n> Nadie lo reclamó a tiempo.` }).catch(() => {})
    }
  }, CLAIM_WINDOW_MS)

  pendingRolls.set(m.chat, entry)

  const caption = `*『 🎴 』¡UN PERSONAJE SALVAJE APARECIÓ!*\n\n` +
    `> ✨ *${character.name}*\n` +
    `> 📺 ${character.series}\n` +
    `> ${character.rarity.label}\n` +
    `> 💖 ${character.favorites} favoritos en MyAnimeList\n` +
    (character.fromCache ? `> _(Jikan no responde ahora — personaje del caché local)_\n` : '') +
    `\n> Escribí *.claim* para quedártelo — tenés *${Math.floor(CLAIM_WINDOW_MS / 1000)}s* antes de que se escape.`

  try {
    const buffer = character.image ? await fetchImageBuffer(character.image) : null
    if (buffer) {
      await conn.sendMessage(m.chat, { image: buffer, caption })
    } else {
      await m.reply(caption)
    }
  } catch {
    await m.reply(caption)
  }
}

async function claimCharacter(m) {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> Esto solo funciona en grupos.`)

  const entry = pendingRolls.get(m.chat)
  if (!entry || entry.claimed) {
    return m.reply(`*『 ❕ 』NADA QUE RECLAMAR*\n> No hay ningún personaje esperando en este grupo. Usá *.gacha* para invocar uno.`)
  }

  // Marcado sincrónico ANTES de cualquier await: si dos mensajes ".claim"
  // llegan casi juntos, JS los procesa uno a la vez (sin await de por medio
  // acá), así que el segundo ya ve claimed=true y no duplica el personaje.
  entry.claimed = true
  clearTimeout(entry.timer)
  pendingRolls.delete(m.chat)

  const { character } = entry
  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.waifu) user.data.waifu = { characters: [] }
  if (!Array.isArray(user.data.waifu.characters)) user.data.waifu.characters = []

  user.data.waifu.characters.push({
    malId: character.malId,
    name: character.name,
    series: character.series,
    image: character.image,
    favorites: character.favorites,
    rarity: character.rarity.key,
    claimedAt: Date.now(),
  })
  await user.save()

  await m.reply(
    `*『 💘 』¡RECLAMADO!*\n> @${jidNormalizedUser(m.sender).split('@')[0]} agregó a *${character.name}* (${character.rarity.label}) a su colección.\n> Usá *.harem* para ver tu colección completa, *.sellwaifu <numero>* para venderlo al bot, o *.listwaifu <numero> <precio>* para publicarlo en *.haremshop* y que otro jugador te lo compre.`,
    { mentions: [m.sender] }
  )
}

const handler = async (m, ctx) => {
  if (['claim', 'reclamar'].includes(ctx.command)) return claimCharacter(m)
  return rollCharacter(m, ctx)
}

handler.help = ['gacha', 'claim']
handler.desc = 'Invoca un personaje de anime al azar. El primero en escribir *.claim* se lo queda — después lo podés vender (.sellwaifu) o publicarlo en el mercado (.haremshop) para ganar monedas.'
handler.tags = ['anime']
handler.command = ['gacha', 'roll', 'rollwaifu', 'rw', 'waifu', 'claim', 'reclamar']
handler.groupOnly = true

export default handler
