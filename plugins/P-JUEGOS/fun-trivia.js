import { fetchTriviaQuestion, CATEGORIES } from '../../lib/opentdb.js'
import UserDb from '../../lib/database/UserDb.js'
import { grantXp } from '../../lib/economy.js'
import config from '../../config.js'

// Respuestas por TEXTO PLANO (número 1-4, con o sin prefijo), no por botones
// nativos de WhatsApp: los mensajes de botones/listas dejaron de ser
// confiables para números no verificados como negocio (a veces no responden
// al toque, a veces el destinatario ve "mensaje no compatible con tu versión
// de WhatsApp"). Un simple "1"/"2"/"3"/"4" en el chat funciona siempre.
const sessions = new Map() // chatId -> { trivia, timer }

const QUESTION_TIMEOUT_MS = 30_000
const OPTION_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']

function endSession(chat) {
  const s = sessions.get(chat)
  if (s?.timer) clearTimeout(s.timer)
  sessions.delete(chat)
}

// Acepta "1".."4" con o sin el prefijo configurado (ej. ".1", "1") — pero
// NUNCA choca con los movimientos de fun-ttt.js ("1".."9"), porque esos se
// registran en cmdMap y por lo tanto solo se disparan CON prefijo, mientras
// que este chequeo corre en handler.all (pasa por fuera de cmdMap) y evalúa
// el texto crudo del mensaje.
function parseAnswerDigit(body) {
  const stripped = String(body || '').replace(config.prefix, '').trim()
  if (!/^[1-4]$/.test(stripped)) return null
  return parseInt(stripped, 10) - 1
}

const handler = async (m, { conn, args }) => {
  if (!m.isGroup) return m.reply(`*『 👥 』SOLO GRUPOS.*\n> La trivia solo funciona en grupos.`)
  if (sessions.has(m.chat)) {
    return m.reply(`*『 ⚠️ 』YA HAY UNA PREGUNTA ACTIVA*\n> Esperá a que termine la ronda actual.`)
  }

  const catArg = (args[0] || '').toLowerCase()
  const categoryId = CATEGORIES[catArg] || null

  let trivia
  try {
    trivia = await fetchTriviaQuestion(categoryId)
  } catch (e) {
    return m.reply(`*『 ❌ 』ERROR*\n> No se pudo obtener una pregunta ahora mismo. Probá de nuevo en un rato.\n> _${e.message}_\n> *Categorías válidas:* ${Object.keys(CATEGORIES).join(', ')}`)
  }

  const entry = { trivia, timer: null }
  entry.timer = setTimeout(() => {
    if (sessions.get(m.chat) !== entry) return
    endSession(m.chat)
    conn.sendMessage(m.chat, {
      text: `*『 ⏰ 』¡SE ACABÓ EL TIEMPO!*\n> Nadie respondió a tiempo.\n> La respuesta correcta era: *${OPTION_EMOJI[trivia.correctIndex]} ${trivia.options[trivia.correctIndex]}*`
    }).catch(() => {})
  }, QUESTION_TIMEOUT_MS)

  sessions.set(m.chat, entry)

  const opciones = trivia.options.map((opt, i) => `${OPTION_EMOJI[i]} ${opt}`).join('\n')

  await m.reply(
    `*┏━━•❈ 🧠 TRIVIA ❈•━━┓*\n\n` +
    `> 📚 *Categoría:* ${trivia.category}\n` +
    `> 🎚️ *Dificultad:* ${trivia.difficulty}\n\n` +
    `> ❓ *${trivia.question}*\n\n` +
    `${opciones}\n\n` +
    `> Escribí el *número* de la respuesta correcta. Tenés *${Math.floor(QUESTION_TIMEOUT_MS / 1000)}s*.`
  )
}

handler.all = async function (m, { conn }) {
  if (!m.isGroup || !m.sender || m.isBaileys || m.fromMe || !m.message) return

  const entry = sessions.get(m.chat)
  if (!entry) return

  const chosenIndex = parseAnswerDigit(m.body)
  if (chosenIndex === null) return

  const { trivia } = entry

  if (chosenIndex !== trivia.correctIndex) {
    return m.react('❌')
  }

  // Cierre sincrónico ANTES de cualquier await (mismo patrón que gacha/pokemon):
  // una segunda respuesta correcta casi simultánea ya no encuentra sesión.
  endSession(m.chat)

  const user = await UserDb.findOrCreate(m.sender)
  user.coins += trivia.reward
  const { leveledUp, newLevel, coinBonus } = grantXp(user, 25)
  await user.save()

  let txt = `*『 ✅ 』¡RESPUESTA CORRECTA!*\n> @${m.sender.split('@')[0]} acertó primero.\n> 💰 +${trivia.reward} monedas\n> ✨ +25 XP`
  if (leveledUp) txt += `\n\n*🎉 ¡Subiste a nivel ${newLevel}! +${coinBonus} monedas extra.*`

  await conn.sendMessage(m.chat, { text: txt, mentions: [m.sender] }, { quoted: m })
}

handler.help = ['trivia [categoria]']
handler.desc = 'Pregunta de trivia en español (traducida) con 4 opciones — respondé con el número. Categorías: general, anime, gaming, peliculas, musica, ciencia, historia, geografia, mitologia, deportes, animales.'
handler.tags = ['juegos']
handler.command = ['trivia']
handler.groupOnly = true

export default handler
