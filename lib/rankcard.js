import Jimp from 'jimp'
import { getProgress } from './economy.js'

const COLORS = {
  bg: 0x1a1a2eff,
  accent: 0xff6fa5ff,
  barBg: 0x33334dff,
}

// new Jimp(w, h, color) is documented as callback-based — wrapping it
// explicitly avoids relying on it resolving "synchronously enough" in every
// Jimp version, which we can't verify by running Node in this environment.
function solidCanvas(w, h, color) {
  return new Promise((resolve, reject) => {
    new Jimp(w, h, color, (err, image) => (err ? reject(err) : resolve(image)))
  })
}

async function fetchBuffer(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'NakanoMikuBot (https://github.com/carlosaalbertolazaro/Nakano_Miku-Bot)' } })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

function truncate(str, max) {
  str = String(str || '')
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export async function generateRankCard({ avatarUrl, username, xp, coins, rank, totalInGroup }) {
  const W = 900
  const H = 260

  const canvas = await solidCanvas(W, H, COLORS.bg)

  const strip = await solidCanvas(14, H, COLORS.accent)
  canvas.composite(strip, 0, 0)

  // Avatar ring (colored circle behind the avatar) + avatar itself, both
  // built via .circle() which crops any square image into a circle in place.
  const ring = await solidCanvas(190, 190, COLORS.accent)
  ring.circle()
  canvas.composite(ring, 45, 35)

  const avatarSize = 170
  const avatarBuffer = await fetchBuffer(avatarUrl)
  let avatarImg = null
  if (avatarBuffer) {
    try { avatarImg = await Jimp.read(avatarBuffer) } catch { avatarImg = null }
  }
  if (!avatarImg) avatarImg = await solidCanvas(avatarSize, avatarSize, COLORS.barBg)

  avatarImg.cover(avatarSize, avatarSize).circle()
  canvas.composite(avatarImg, 55, 45)

  const fontBig = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
  const fontMed = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)

  const textX = 280
  const progress = getProgress(xp)

  canvas.print(fontBig, textX, 28, truncate(username, 22))
  canvas.print(fontMed, textX, 82, `Nivel ${progress.level}  •  #${rank} de ${totalInGroup} en el grupo`)
  canvas.print(fontMed, textX, 112, `${progress.into} / ${progress.span} XP para el siguiente nivel`)
  canvas.print(fontMed, textX, 142, `Monedas: ${coins}`)

  // XP progress bar
  const barX = textX
  const barY = 188
  const barW = W - textX - 60
  const barH = 28

  const barBg = await solidCanvas(barW, barH, COLORS.barBg)
  canvas.composite(barBg, barX, barY)

  const fillW = Math.max(6, Math.floor(barW * progress.progress))
  const barFill = await solidCanvas(fillW, barH, COLORS.accent)
  canvas.composite(barFill, barX, barY)

  return canvas.getBufferAsync(Jimp.MIME_PNG)
}
