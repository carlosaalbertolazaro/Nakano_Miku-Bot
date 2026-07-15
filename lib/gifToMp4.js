import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync } from 'fs'
import { rm } from 'fs/promises'
import { execSync } from 'child_process'
import { v4 as uuidv4 } from 'uuid'

// WhatsApp reproduce los "GIF" como videos MP4 cortos en loop
// (gifPlayback: true) — no como archivos .gif de verdad. Un .gif real
// mandado como si fuera video se ve una vez en el chat pero no se puede
// descargar ni reproducir de nuevo, porque no es un contenedor de video
// válido para el cliente. Se convierte con ffmpeg (mismo patrón que ya usa
// converter-tovideo.js) antes de mandarlo.
export async function gifToMp4(gifBuffer) {
  const i = join(tmpdir(), `gif_${uuidv4()}.gif`)
  const o = join(tmpdir(), `gif_${uuidv4()}.mp4`)
  try {
    writeFileSync(i, gifBuffer)
    execSync(
      `ffmpeg -y -i "${i}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 "${o}"`,
      { stdio: 'pipe', timeout: 30000 }
    )
    return readFileSync(o)
  } finally {
    for (const p of [i, o]) await rm(p, { force: true }).catch(() => {})
  }
}
