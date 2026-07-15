import { fetchTriviaQuestion, CATEGORIES } from '../../lib/opentdb.js'
import UserDb from '../../lib/database/UserDb.js'
import { grantXp } from '../../lib/economy.js'
import config from '../../config.js'

// Mismo patrón de botones probado en fun-akinator.js: WhatsApp devuelve el id
// de la fila elegida en m.responseId, y ese id tiene que estar registrado en
// handler.command para que handler.js lo enrute de vuelta a este plugin.
const sessions = new Map() // chatId -> { trivia, timer }

const QUESTION_TIMEOUT_MS = 30_000
const OPTION_EMOJI = ['🅰️', '🅱️', '🅲', '🅳']

function endSession(chat) {
  const s = sessions.get(chat)
  if (s?.timer) clearTimeout(s.timer)
  sessions.delete(chat)
}

async function startRound(m, { conn, args }) {
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

  const rows = trivia.options.map((opt, i) => ({
    title: `${OPTION_EMOJI[i]} ${opt}`,
    description: '',
    id: `trivia_answer_${i}`,
  }))

  const entry = { trivia, timer: null }
  entry.timer = setTimeout(() => {
    if (sessions.get(m.chat) !== entry) return
    endSession(m.chat)
    conn.sendMessage(m.chat, {
      text: `*『 ⏰ 』¡SE ACABÓ EL TIEMPO!*\n> Nadie respondió a tiempo.\n> La respuesta correcta era: *${OPTION_EMOJI[trivia.correctIndex]} ${trivia.options[trivia.correctIndex]}*`
    }).catch(() => {})
  }, QUESTION_TIMEOUT_MS)

  sessions.set(m.chat, entry)

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 🧠 TRIVIA ❈•━━┓*\n\n` +
      `> 📚 *Categoría:* ${trivia.category}\n` +
      `> 🎚️ *Dificultad:* ${trivia.difficulty}\n\n` +
      `> ❓ *${trivia.question}*\n\n` +
      `> Tenés *${Math.floor(QUESTION_TIMEOUT_MS / 1000)}s* para responder.`,
    footer: config.botName,
    buttons: [{
      text: 'Responder 💬',
      sections: [{ title: '✧ Opciones ✧', rows }]
    }],
    headerType: 1
  }, { quoted: m })
}

async function handleAnswer(m, { conn }, chosenIndex) {
  const entry = sessions.get(m.chat)
  if (!entry) return // ronda ya terminó (timeout o alguien más acertó) o no hay ninguna activa

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

const handler = async (m, ctx) => {
  const btnId = m.responseId
  if (btnId?.startsWith('trivia_answer_')) {
    const idx = parseInt(btnId.replace('trivia_answer_', ''), 10)
    return handleAnswer(m, ctx, idx)
  }
  return startRound(m, ctx)
}

handler.help = ['trivia [categoria]']
handler.tags = ['juegos']
handler.command = ['trivia', 'trivia_answer_0', 'trivia_answer_1', 'trivia_answer_2', 'trivia_answer_3']
handler.groupOnly = true

export default handler
