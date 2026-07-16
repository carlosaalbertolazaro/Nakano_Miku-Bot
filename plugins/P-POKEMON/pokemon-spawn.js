import { fetchRandomPokemon, generateSilhouette } from '../../lib/pokeapi.js'
import UserDb from '../../lib/database/UserDb.js'
import { fetchImageBuffer } from '../../lib/sendImageSafe.js'

// Spawns automáticos estilo Pokétwo: cada grupo tiene su propio contador de
// mensajes y un umbral aleatorio; al alcanzarlo aparece un Pokémon salvaje en
// silueta y el primero en escribir ".catch <nombre>" se lo queda. Estado en
// memoria por chat (mismo patrón que fun-ttt.js / anime-gacha.js).
const messageCounters = new Map() // chatId -> count
const spawnThresholds  = new Map() // chatId -> umbral del próximo spawn
const pendingSpawns     = new Map() // chatId -> { pokemon, caught, timer }

const MIN_MSGS = 80
const MAX_MSGS = 160
const CATCH_WINDOW_MS = 90_000
const CATCH_REWARD = { comun: 15, legendario: 60, mitico: 120 }
const SHINY_BONUS = 100

function nextThreshold() {
  return Math.floor(Math.random() * (MAX_MSGS - MIN_MSGS + 1)) + MIN_MSGS
}

// NFD descompone letras acentuadas en base + marca combinante (ej. 'é' -> 'e'
// + acento); al quedarnos solo con [a-z0-9] esas marcas se eliminan solas, sin
// necesidad de un rango de códigos Unicode explícito en el regex.
function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '')
}

async function trySpawn(chat, conn) {
  if (pendingSpawns.has(chat)) return

  let pokemon
  try {
    pokemon = await fetchRandomPokemon()
  } catch {
    return // fallo silencioso: un spawn automático que falla no debe interrumpir el chat
  }
  if (!pokemon.image) return

  let silhouette = null
  try { silhouette = await generateSilhouette(pokemon.image) } catch {}

  const entry = { pokemon, caught: false, timer: null }
  entry.timer = setTimeout(() => {
    const current = pendingSpawns.get(chat)
    if (current === entry && !entry.caught) {
      pendingSpawns.delete(chat)
      conn.sendMessage(chat, {
        text: `*『 💨 』¡El Pokémon salvaje huyó!*\n> Era *${pokemon.nameEs}*. Nadie lo atrapó a tiempo.`
      }).catch(() => {})
    }
  }, CATCH_WINDOW_MS)

  pendingSpawns.set(chat, entry)

  const caption = `*『 🌿 』¡UN POKÉMON SALVAJE APARECIÓ!*\n\n` +
    `> ¿Quién es este Pokémon?\n` +
    `> Escribí *.catch <nombre>* para atraparlo — tenés *${Math.floor(CATCH_WINDOW_MS / 1000)}s*.`

  try {
    if (silhouette) {
      await conn.sendMessage(chat, { image: silhouette, caption })
    } else {
      const buffer = await fetchImageBuffer(pokemon.image)
      if (buffer) await conn.sendMessage(chat, { image: buffer, caption })
      else await conn.sendMessage(chat, { text: caption })
    }
  } catch {}
}

async function catchPokemon(m, { text }) {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> Esto solo funciona en grupos.`)

  const entry = pendingSpawns.get(m.chat)
  if (!entry || entry.caught) {
    return m.reply(`*『 ❕ 』No hay ningún Pokémon salvaje esperando ahora.*`)
  }

  const guess = normalize(text)
  if (!guess) {
    return m.reply(`*『 ℹ️ 』USO*\n> .catch <nombre del Pokémon>`)
  }

  const { pokemon } = entry
  const acierto = guess === normalize(pokemon.name) || guess === normalize(pokemon.nameEs)
  if (!acierto) {
    return m.reply(`*『 ❌ 』No es correcto.*\n> Intentá de nuevo antes de que se escape.`)
  }

  // Igual que en anime-gacha.js: marcado sincrónico antes de cualquier await
  // para que un segundo ".catch" casi simultáneo ya vea caught=true.
  entry.caught = true
  clearTimeout(entry.timer)
  pendingSpawns.delete(m.chat)

  const user = await UserDb.findOrCreate(m.sender)
  if (!user.data.pokemon) user.data.pokemon = { caught: [] }
  if (!Array.isArray(user.data.pokemon.caught)) user.data.pokemon.caught = []

  const reward = (CATCH_REWARD[pokemon.rarity.key] || CATCH_REWARD.comun) + (pokemon.shiny ? SHINY_BONUS : 0)

  user.data.pokemon.caught.push({
    dexId: pokemon.id,
    name: pokemon.name,
    nameEs: pokemon.nameEs,
    types: pokemon.types,
    image: pokemon.image,
    shiny: pokemon.shiny,
    rarity: pokemon.rarity.key,
    caughtAt: Date.now(),
  })
  user.coins += reward
  await user.save()

  const shinyTag = pokemon.shiny ? '✨ ¡SHINY! ✨ ' : ''
  await m.reply(
    `*『 🎯 』¡ATRAPADO!*\n> ${shinyTag}@${m.sender.split('@')[0]} atrapó a *${pokemon.nameEs}* (${pokemon.rarity.label})\n` +
    `> 💰 +${reward} monedas\n> Usá *.pokedex* para ver tu colección.`,
    { mentions: [m.sender] }
  )
}

const handler = async (m, ctx) => catchPokemon(m, ctx)

handler.all = async function (m, { conn, groupDb }) {
  if (!m.isGroup || !m.sender || m.isBaileys || m.fromMe || !m.message) return
  if (groupDb?.modules?.pokemon === false) return
  // Si además desactivaron la categoría entera con .disable pokemon, ".catch"
  // queda bloqueado como comando — no tiene sentido seguir spawneando algo
  // que ya nadie puede atrapar.
  if (groupDb?.disabledCategories?.includes('pokemon')) return

  const count = (messageCounters.get(m.chat) || 0) + 1
  if (!spawnThresholds.has(m.chat)) spawnThresholds.set(m.chat, nextThreshold())

  if (count >= spawnThresholds.get(m.chat)) {
    messageCounters.set(m.chat, 0)
    spawnThresholds.set(m.chat, nextThreshold())
    trySpawn(m.chat, conn).catch(() => {})
  } else {
    messageCounters.set(m.chat, count)
  }
}

handler.help = ['catch <nombre>']
handler.desc = 'Atrapá al Pokémon salvaje que aparece automáticamente en el grupo adivinando su nombre (inglés o español).'
handler.tags = ['pokemon']
handler.command = ['catch', 'atrapar']
handler.groupOnly = true

export default handler
