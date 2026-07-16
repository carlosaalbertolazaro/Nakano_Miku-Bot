const BASE = 10 // xp needed for level 1 = (1 * BASE)^2 = 100

export function levelForXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp)) / BASE)
}

export function xpForLevel(level) {
  return Math.pow(level * BASE, 2)
}

export function getProgress(xp) {
  const level = levelForXp(xp)
  const currentFloor = xpForLevel(level)
  const nextFloor = xpForLevel(level + 1)
  const into = xp - currentFloor
  const span = nextFloor - currentFloor
  return {
    level,
    xp,
    currentFloor,
    nextFloor,
    into,
    span,
    progress: span > 0 ? Math.min(1, Math.max(0, into / span)) : 0,
  }
}

// Mutates userDoc.xp/userDoc.level/userDoc.coins in place — caller is responsible for .save().
export function grantXp(userDoc, amount) {
  const oldLevel = levelForXp(userDoc.xp)
  userDoc.xp += amount
  const newLevel = levelForXp(userDoc.xp)
  userDoc.level = newLevel

  let coinBonus = 0
  if (newLevel > oldLevel) {
    coinBonus = (newLevel - oldLevel) * 50
    userDoc.coins += coinBonus
  }

  return { leveledUp: newLevel > oldLevel, oldLevel, newLevel, coinBonus }
}

export function randomXpGain() {
  return Math.floor(Math.random() * 11) + 15 // 15-25 per message
}

// Perks temporales comprados en la tienda (.shop) — guardados como
// user.data.perks[key] = timestamp de expiración. Mismo mecanismo para
// cualquier perk con vencimiento (boost de XP, escudo anti-robo, etc.), sin
// necesitar un scheduler: se chequea contra Date.now() cuando hace falta.
export function isPerkActive(user, key) {
  const until = user.data?.perks?.[key]
  return typeof until === 'number' && until > Date.now()
}

export function activatePerk(user, key, durationMs) {
  if (!user.data.perks) user.data.perks = {}
  user.data.perks[key] = Date.now() + durationMs
}
