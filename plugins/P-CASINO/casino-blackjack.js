import UserDb from '../../lib/database/UserDb.js'
import { validateBet } from '../../lib/casino.js'

// Blackjack real (no simplificado): mazo de 52 cartas, ases valen 1 u 11
// según convenga, blackjack natural paga 3:2, dealer pide hasta 17. Sesión
// por usuario+chat (no por chat solo, a diferencia de ttt/trivia/torneo,
// porque acá cada uno juega su propia mano individual con su propia plata).
const sessions = new Map() // "chat:sender" -> session

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS = ['♠️', '♥️', '♦️', '♣️']

function newDeck() {
  const deck = []
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function cardValue(card) {
  if (card.r === 'A') return 11
  if (['J', 'Q', 'K'].includes(card.r)) return 10
  return parseInt(card.r, 10)
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0)
  let aces = hand.filter(c => c.r === 'A').length
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function formatHand(hand) {
  return hand.map(c => `${c.r}${c.s}`).join(' ')
}

function isBlackjack(hand) {
  return hand.length === 2 && handValue(hand) === 21
}

function sessionKey(chat, sender) { return `${chat}:${sender}` }

function mostrarEstado(session, { revelarDealer = false } = {}) {
  const playerTotal = handValue(session.playerHand)
  const dealerDisplay = revelarDealer
    ? `${formatHand(session.dealerHand)} (${handValue(session.dealerHand)})`
    : `${session.dealerHand[0].r}${session.dealerHand[0].s} 🂠`

  return `*┏━━•❈ 🃏 BLACKJACK ❈•━━┓*\n\n` +
    `> 🤵 Dealer: ${dealerDisplay}\n` +
    `> 🙋 Vos: ${formatHand(session.playerHand)} (${playerTotal})\n\n` +
    (revelarDealer ? '' : `> 💰 Apuesta: ${session.bet}\n> Escribí *.blackjack hit* para pedir carta o *.blackjack stand* para plantarte.\n`) +
    `*┗━━━━•❅•°•❈•°•❅•━━━━┛*`
}

function resultadoRonda(playerTotal, dealerTotal, bet, playerBJ, dealerBJ) {
  if (playerBJ && dealerBJ) return { payout: bet, texto: '🤝 Empate (ambos Blackjack) — se devuelve tu apuesta.' }
  if (playerBJ) return { payout: Math.floor(bet * 2.5), texto: '🎉 *¡BLACKJACK!* Ganás 3:2.' }
  if (dealerBJ) return { payout: 0, texto: '💥 El dealer tiene Blackjack. Perdiste.' }
  if (playerTotal > 21) return { payout: 0, texto: '💥 Te pasaste de 21 (bust). Perdiste.' }
  if (dealerTotal > 21) return { payout: bet * 2, texto: '🎉 ¡El dealer se pasó de 21! Ganaste.' }
  if (playerTotal > dealerTotal) return { payout: bet * 2, texto: '🎉 ¡Ganaste!' }
  if (playerTotal < dealerTotal) return { payout: 0, texto: '💥 El dealer ganó.' }
  return { payout: bet, texto: '🤝 Empate — se devuelve tu apuesta.' }
}

async function finalizar(m, session, dealerBJHint = null) {
  sessions.delete(sessionKey(session.chat, session.sender))

  const playerTotal = handValue(session.playerHand)
  const dealerTotal = handValue(session.dealerHand)
  const playerBJ = isBlackjack(session.playerHand)
  const dealerBJ = dealerBJHint !== null ? dealerBJHint : isBlackjack(session.dealerHand)

  const { payout, texto } = resultadoRonda(playerTotal, dealerTotal, session.bet, playerBJ, dealerBJ)

  const user = await UserDb.findOrCreate(session.sender)
  user.coins += payout
  await user.save()

  const estadoFinal = mostrarEstado(session, { revelarDealer: true })
  await m.reply(`${estadoFinal}\n\n${texto}\n> 💰 Balance: *${user.coins}*`)
}

function dealerPlay(session) {
  while (handValue(session.dealerHand) < 17) {
    session.dealerHand.push(session.deck.pop())
  }
}

async function iniciar(m, ctx) {
  const key = sessionKey(m.chat, m.sender)
  if (sessions.has(key)) {
    return m.reply(`*『 ⚠️ 』Ya tenés una mano en curso.*\n> Usá *.blackjack hit* o *.blackjack stand*.`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const check = validateBet(user, ctx.args[0])
  if (!check.ok) return m.reply(`*『 🃏 』${check.error}*`)

  const { bet } = check
  user.coins -= bet
  await user.save()

  const deck = newDeck()
  const playerHand = [deck.pop(), deck.pop()]
  const dealerHand = [deck.pop(), deck.pop()]
  const session = { deck, playerHand, dealerHand, bet, chat: m.chat, sender: m.sender }

  // Blackjack natural del jugador: se resuelve al toque comparando solo las
  // 2 cartas iniciales del dealer (sin que el dealer pida más cartas).
  if (isBlackjack(playerHand)) {
    return finalizar(m, session, isBlackjack(dealerHand))
  }

  sessions.set(key, session)
  await m.reply(mostrarEstado(session))
}

async function hit(m) {
  const session = sessions.get(sessionKey(m.chat, m.sender))
  if (!session) return m.reply(`*『 ❕ 』No tenés ninguna mano activa. Usá *.blackjack <apuesta>* para empezar.*`)

  session.playerHand.push(session.deck.pop())
  const total = handValue(session.playerHand)

  if (total >= 21) return finalizarSiCorresponde(m, session)

  await m.reply(mostrarEstado(session))
}

async function finalizarSiCorresponde(m, session) {
  const total = handValue(session.playerHand)
  if (total > 21) return finalizar(m, session)
  // Con 21 exacto no tiene sentido seguir pidiendo: se planta automático.
  dealerPlay(session)
  return finalizar(m, session)
}

async function stand(m) {
  const session = sessions.get(sessionKey(m.chat, m.sender))
  if (!session) return m.reply(`*『 ❕ 』No tenés ninguna mano activa. Usá *.blackjack <apuesta>* para empezar.*`)

  dealerPlay(session)
  await finalizar(m, session)
}

const handler = async (m, ctx) => {
  const sub = (ctx.args[0] || '').toLowerCase()
  if (sub === 'hit' || sub === 'pedir') return hit(m)
  if (sub === 'stand' || sub === 'plantarse') return stand(m)
  return iniciar(m, ctx)
}

handler.help = ['blackjack <apuesta>', 'blackjack hit', 'blackjack stand']
handler.tags = ['casino']
handler.command = ['blackjack', 'bj']

export default handler
