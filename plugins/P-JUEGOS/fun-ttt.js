import config from '../../config.js'

const partidas = new Map()

const TABLERO_VACIO = [' ',' ',' ',' ',' ',' ',' ',' ',' ']
const POS_MAP       = { '1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'7':6,'8':7,'9':8 }
const COMBOS        = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
const NUM_EMOJI     = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣']

const ALIAS_DIF = {
  facil: 'facil', easy: 'facil',
  medio: 'medio', medium: 'medio',
  dificil: 'dificil', hard: 'dificil',
  imposible: 'imposible', impossible: 'imposible'
}
const DIF_LABEL = {
  facil:    '🟢 FÁCIL',
  medio:    '🟡 MEDIO',
  dificil:  '🔴 DIFÍCIL',
  imposible:'⚫ IMPOSIBLE'
}

function dibujarTablero(t) {
  const c = i => t[i] === 'X' ? '❌' : t[i] === 'O' ? '⭕' : NUM_EMOJI[i]
  return `${c(0)}${c(1)}${c(2)}\n${c(3)}${c(4)}${c(5)}\n${c(6)}${c(7)}${c(8)}`
}

function ganador(t, sym) {
  return COMBOS.some(([a,b,c]) => t[a]===sym && t[b]===sym && t[c]===sym)
}

function tableroLleno(t) { return t.every(c => c !== ' ') }

function mejorMovIA(t, dif) {
  const libres = t.map((c,i) => c===' ' ? i : -1).filter(i=>i>=0)
  if (!libres.length) return -1

  if (dif === 'facil') {
    if (Math.random() < 0.7) return libres[Math.floor(Math.random()*libres.length)]
  }
  if (dif === 'medio') {
    if (Math.random() < 0.4) return libres[Math.floor(Math.random()*libres.length)]
  }

  function minimax(tablero, esMax) {
    if (ganador(tablero, 'O')) return 10
    if (ganador(tablero, 'X')) return -10
    if (tableroLleno(tablero)) return 0
    const ls = tablero.map((c,i)=>c===' '?i:-1).filter(i=>i>=0)
    let mejor = esMax ? -Infinity : Infinity
    for (const i of ls) {
      tablero[i] = esMax ? 'O' : 'X'
      const v = minimax(tablero, !esMax)
      tablero[i] = ' '
      mejor = esMax ? Math.max(mejor,v) : Math.min(mejor,v)
    }
    return mejor
  }

  let mejorVal = -Infinity, mejorPos = libres[0]
  for (const i of libres) {
    t[i] = 'O'
    const v = minimax([...t], false)
    t[i] = ' '
    if (v > mejorVal) { mejorVal = v; mejorPos = i }
  }
  return mejorPos
}

const handler = async (m, { conn, args, command }) => {
  const sender = m.sender
  const chat   = m.chat
  const key    = `${chat}:${sender}`
  const prefix = config.prefix.source.replace(/[\^\[\]\\]/g,'')[0] || '.'

  if (command === 'tttcancel' || command === 'cancelarttt') {
    if (!partidas.has(key)) return m.reply(`*『 ✙ 』SIN PARTIDA.*\n> No tenés ninguna partida activa.`)
    partidas.delete(key)
    return m.reply(`*『 🏳️ 』PARTIDA CANCELADA.*`)
  }

  if (command === 'ttt') {
    if (partidas.has(key)) return m.reply(`*『 ✙ 』YA EN JUEGO.*\n> Ya tenés una partida activa. Usá ${prefix}tttcancel para cancelarla.`)

    const dif = ALIAS_DIF[args[0]?.toLowerCase()] || 'medio'
    const tablero = [...TABLERO_VACIO]

    partidas.set(key, { tablero, dif })

    const txt = `*『 ❎ 』TRES EN RAYA*\n> *Dificultad:* ${DIF_LABEL[dif]}\n> Sos ❌ — La IA es ⭕\n> Enviá el número de la casilla para jugar.\n\n${dibujarTablero(tablero)}`
    return m.reply(txt)
  }

  const partida = partidas.get(key)
  if (!partida) return

  const pos = POS_MAP[args[0] || command]
  if (pos === undefined) return
  if (partida.tablero[pos] !== ' ') return m.reply(`*『 ✙ 』CASILLA OCUPADA.*\n> Elegí otra.`)

  partida.tablero[pos] = 'X'

  if (ganador(partida.tablero, 'X')) {
    partidas.delete(key)
    return m.reply(`*『 🏆 』GANASTE.*\n\n${dibujarTablero(partida.tablero)}`)
  }
  if (tableroLleno(partida.tablero)) {
    partidas.delete(key)
    return m.reply(`*『 🤝 』EMPATE.*\n\n${dibujarTablero(partida.tablero)}`)
  }

  const iaPos = mejorMovIA(partida.tablero, partida.dif)
  if (iaPos === -1) { partidas.delete(key); return }
  partida.tablero[iaPos] = 'O'

  if (ganador(partida.tablero, 'O')) {
    partidas.delete(key)
    return m.reply(`*『 🤖 』LA IA GANÓ.*\n\n${dibujarTablero(partida.tablero)}`)
  }
  if (tableroLleno(partida.tablero)) {
    partidas.delete(key)
    return m.reply(`*『 🤝 』EMPATE.*\n\n${dibujarTablero(partida.tablero)}`)
  }

  return m.reply(`${dibujarTablero(partida.tablero)}\n> Tu turno ❌`)
}

handler.help = ['ttt [facil|medio|dificil|imposible]']
handler.desc = 'Tres en raya contra la IA del bot, con 4 niveles de dificultad.'
handler.tags = ['juegos']
handler.command = ['ttt', 'tttcancel', 'cancelarttt', '1','2','3','4','5','6','7','8','9']

export default handler
