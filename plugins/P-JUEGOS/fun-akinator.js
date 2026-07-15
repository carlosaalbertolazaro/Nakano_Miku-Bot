import axios from 'axios'
import { akinator, THEMES, ANSWERS } from '../../lib/Akinator.js'
import config from '../../config.js'

const sessions = new Map()
const TIMEOUT_MS = 5 * 60 * 1000

function sessionKey(chatId, userId) { return `${chatId}:${userId}` }

function clearSession(key) {
  const s = sessions.get(key)
  if (s?.timer) clearTimeout(s.timer)
  sessions.delete(key)
}

async function getBuffer(url) {
  try {
    if (!url) return null

    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    const type = res.headers['content-type'] || ''

    if (!type.startsWith('image/')) return null

    const buffer = Buffer.from(res.data)

    if (!Buffer.isBuffer(buffer) || !buffer.length) return null

    return buffer
  } catch {
    return null
  }
}

function getBtnId(m) {
  return (
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
      ? (() => { try { return JSON.parse(m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson)?.id } catch { return '' } })()
      : '' ||
    m.message?.templateButtonReplyMessage?.selectedId ||
    ''
  )
}

async function enviarTemas(conn, m) {
  const buf = await getBuffer('https://i.ibb.co/35S18d98/1535456306-275056-1535472304-noticia-normal.jpg')
  const text = `*🎩 ¡Hola! Soy Akinator, el genio de la web.*\n\n`
             + `> Pensá en un personaje famoso (anime, película, serie, real...), un animal o un objeto.\n`
             + `> _Con solo unas pocas preguntas, lo adivinaré._\n\n`
             + `> 🧠 *¿Listo? Elegí un tema para comenzar:*`

  await conn.sendMessage(m.chat, {
    ...(buf ? { image: buf, caption: text } : { text: text }),
    footer: global.botname || config.botName,
    buttons: [{
      text: 'Elegir tema 🎯',
      sections: [{
        title: '✧ Temas disponibles ✧',
        rows: [
          { title: '🧑 Personaje', description: 'Anime, serie, película, real...', id: 'aki_tema_personaje' },
          { title: '🐾 Animal',    description: 'Cualquier animal',               id: 'aki_tema_animal' },
          { title: '📦 Objeto',    description: 'Objetos y cosas',                id: 'aki_tema_objeto' },
        ]
      }]
    }],
    headerType: buf ? 4 : 1
  }, { quoted: m })
}

async function enviarPregunta(conn, m, game) {
  const step        = game.getStep()
  const progression = game.getProgression()

  const rows = [
    { title: '✅ Sí',               description: '', id: 'aki_yes' },
    { title: '❌ No',               description: '', id: 'aki_no' },
    { title: '🤷 No sé',            description: '', id: 'aki_idk' },
    { title: '🟡 Probablemente',    description: '', id: 'aki_probably' },
    { title: '🟠 Probablemente no', description: '', id: 'aki_probablynot' },
  ]

  if (step > 0) rows.push({ title: '↩️ Atrás', description: 'Volver a la pregunta anterior', id: 'aki_back' })
  rows.push({ title: '🛑 Salir', description: 'Terminar la partida', id: 'aki_stop' })

  await conn.sendMessage(m.chat, {
    text: `*┏━━•❈ 🎩 AKINATOR ❈•━━┓*\n\n`
        + `> 🧠 *Paso:* ${step}\n`
        + `> 📊 *Confianza:* ${progression.toFixed(1)}%\n\n`
        + `> ❓ *${game.getQuestion()}*\n\n`
        + `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`,
    footer: global.botname || config.botName,
    buttons: [{
      text: 'Responder 💬',
      sections: [{
        title: '✧ Tu respuesta ✧',
        rows
      }]
    }],
    headerType: 1
  }, { quoted: m })
}

async function enviarProposicion(conn, m, prop) {
  const buf = await getBuffer(prop.photo)
  const text = `*┏━━•❈ 🎩 ¡LO SÉ! ❈•━━┓*\n\n`
             + `> 🎯 *Creo que es...*\n`
             + `> 👤 *${prop.name}*\n`
             + `> 📝 ${prop.description || ''}\n\n`
             + `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`

  await conn.sendMessage(m.chat, {
    ...(buf ? { image: buf, caption: text } : { text: text }),
    footer: global.botname || config.botName,
    buttons: [{
      text: '¿Es correcto? 🤔',
      sections: [{
        title: '✧ ¿Acerté? ✧',
        rows: [
          { title: '✅ ¡Sí, es ese!', description: 'Akinator ganó',    id: 'aki_si_es' },
          { title: '❌ No es ese',    description: 'Esta vez perdiste', id: 'aki_no_es' },
        ]
      }]
    }],
    headerType: buf ? 4 : 1
  }, { quoted: m })
}

const handler = async (m, { conn, command, usedPrefix }) => {
  const chatId = m.chat
  const userId = m.sender
  const key    = sessionKey(chatId, userId)

  const btnId  = getBtnId(m)
  const esBoton = !!btnId

  if (['akinator', 'aki'].includes(command) && !esBoton) {
    if (sessions.has(key)) {
      return m.reply(`*『 🎩 』YA EN JUEGO.*\n> Ya tenés una partida activa. Respondé con la lista o usá *${usedPrefix}akistop* para salir.`)
    }
    await enviarTemas(conn, m)
    sessions.set(key, { state: 'choosing_theme', timer: setTimeout(() => clearSession(key), TIMEOUT_MS) })
    return
  }

  if (command === 'akistop' && !esBoton) {
    if (!sessions.has(key)) return m.reply(`*『 ❕ 』SIN PARTIDA.*\n> No tenés ninguna partida activa.`)
    clearSession(key)
    return m.reply(`*『 🛑 』PARTIDA TERMINADA.*\n> Tu sesión de Akinator fue cerrada.`)
  }

  if (!esBoton) return

  const session = sessions.get(key)
  if (!session) return

  if (session.timer) { clearTimeout(session.timer); session.timer = null }

  if (session.state === 'choosing_theme') {
    const temaMap = {
      aki_tema_personaje: { theme: THEMES.Character, label: 'personaje (anime, serie, película, real...)' },
      aki_tema_animal:    { theme: THEMES.Animals,   label: 'animal' },
      aki_tema_objeto:    { theme: THEMES.Objects,   label: 'objeto' },
    }

    if (!(btnId in temaMap)) {
      session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
      return
    }

    const { theme, label } = temaMap[btnId]
    await m.reply(`*『 ⏳ 』Iniciando Akinator...*\n> _Pensá en un ${label}._`)

    let game
    try {
      game = await akinator('es', theme)
    } catch (e) {
      clearSession(key)
      return m.reply(`*『 ❌ 』ERROR.*\n> No se pudo conectar con Akinator: ${e.message}`)
    }

    session.state = 'playing'
    session.game  = game
    session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
    await enviarPregunta(conn, m, game)
    return
  }

  if (session.state === 'playing') {
    const game = session.game

    if (btnId === 'aki_stop') {
      clearSession(key)
      return m.reply(`*『 🛑 』PARTIDA TERMINADA.*\n> Akinator no pudo adivinar tu personaje... ¡esta vez! 😏`)
    }

    if (btnId === 'aki_back') {
      try {
        await game.back()
        session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
        await enviarPregunta(conn, m, game)
      } catch {
        session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
        await m.reply(`*『 ❕ 』No podés retroceder más.*`)
      }
      return
    }

    const answerMap = {
      aki_yes:         ANSWERS.Yes,
      aki_no:          ANSWERS.No,
      aki_idk:         ANSWERS.IDontKnow,
      aki_probably:    ANSWERS.Probably,
      aki_probablynot: ANSWERS.ProbablyNot,
    }

    if (!(btnId in answerMap)) {
      session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
      return
    }

    let result
    try {
      result = await game.answer(answerMap[btnId])
    } catch (e) {
      clearSession(key)
      return m.reply(`*『 ❌ 』ERROR.*\n> ${e.message}`)
    }

    if (result.won && result.proposition) {
      session.state = 'proposing'
      session.prop  = result.proposition
      session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
      await enviarProposicion(conn, m, result.proposition)
      return
    }

    session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
    await enviarPregunta(conn, m, game)
    return
  }

  if (session.state === 'proposing') {
    if (btnId === 'aki_si_es') {
      const prop = session.prop
      clearSession(key)
      const buf = await getBuffer(prop?.photo)
      const text = `*『 🎉 』¡LO SABÍA!*\n> Akinator siempre gana 😏\n> 👤 *${prop?.name}*`
      return conn.sendMessage(m.chat, {
        ...(buf ? { image: buf, caption: text } : { text: text }),
        footer: global.botname || config.botName,
        headerType: buf ? 4 : 1
      }, { quoted: m })
    }

    if (btnId === 'aki_no_es') {
      clearSession(key)
      return m.reply(`*『 🤔 』¡Esta vez ganaste vos!*\n> Akinator no pudo adivinar tu personaje. ¡Sos único! 🏆`)
    }

    session.timer = setTimeout(() => clearSession(key), TIMEOUT_MS)
  }
}

handler.help       = ['akinator']
handler.desc       = 'El genio adivina en qué personaje, animal u objeto estás pensando.'
handler.tags       = ['juegos']
handler.command    = [
  'akinator', 'aki', 'akistop',
  'aki_tema_personaje', 'aki_tema_animal', 'aki_tema_objeto',
  'aki_yes', 'aki_no', 'aki_idk', 'aki_probably', 'aki_probablynot',
  'aki_back', 'aki_stop', 'aki_si_es', 'aki_no_es'
]
handler.noRegister = true
export default handler
