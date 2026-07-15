export const MIN_BET = 10
export const MAX_BET = 5000

// Chequeo compartido por todos los juegos de casino: valida el formato de la
// apuesta y el saldo, pero NO descuenta nada — cada juego decide cuándo
// descontar (algunos al toque, blackjack al repartir las cartas).
export function validateBet(user, betArg) {
  const bet = parseInt(betArg, 10)
  if (!Number.isInteger(bet) || bet < MIN_BET) {
    return { ok: false, error: `La apuesta mínima es *${MIN_BET} monedas*.` }
  }
  if (bet > MAX_BET) {
    return { ok: false, error: `La apuesta máxima es *${MAX_BET} monedas*.` }
  }
  if (user.coins < bet) {
    return { ok: false, error: `No tenés suficientes monedas. Tenés *${user.coins}*, necesitás *${bet}*.` }
  }
  return { ok: true, bet }
}
