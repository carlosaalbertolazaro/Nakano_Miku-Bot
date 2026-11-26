import { spawn } from 'child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises'
import path from 'path'
import { addExif } from './sticker.js'

export const SOUND_STICKER_DURATION = 5
export const MAX_STICKER_BYTES = 500 * 1024
export const MAX_AUDIO_BYTES = 100 * 1024

// Deja margen para el bloque EXIF sin superar los 500 KB finales.
const STICKER_TARGET_BYTES = 490 * 1024
const TMP_ROOT = path.resolve('./tmp')

function run(command, args, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    let finished = false

    const timer = setTimeout(() => {
      if (finished) return
      finished = true
      child.kill()
      reject(new Error(`${command} superó el tiempo máximo de procesamiento.`))
    }, timeoutMs)

    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', error => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', code => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      if (code === 0) return resolve({ stdout, stderr })
      reject(new Error(`${command} terminó con código ${code}: ${stderr.trim().slice(-800)}`))
    })
  })
}

async function hasAudioTrack(inputPath) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a',
    '-show_entries', 'stream=index',
    '-of', 'json',
    inputPath,
  ])
  return (JSON.parse(stdout).streams || []).length > 0
}

async function convertSticker(inputPath, outputPath) {
  // Se baja calidad y después FPS solo cuando hace falta. Los videos con mucho
  // movimiento no entran en 500 KB con una única conversión de calidad fija.
  const attempts = [
    { quality: 40, fps: 15 },
    { quality: 25, fps: 12 },
    { quality: 15, fps: 10 },
    { quality: 5, fps: 8 },
  ]

  for (const { quality, fps } of attempts) {
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', inputPath,
      '-t', String(SOUND_STICKER_DURATION),
      '-vf', `scale=512:512:force_original_aspect_ratio=decrease,fps=${fps},format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
      '-loop', '0',
      '-an',
      '-fps_mode', 'passthrough',
      '-c:v', 'libwebp_anim',
      '-q:v', String(quality),
      outputPath,
    ])

    if ((await stat(outputPath)).size <= STICKER_TARGET_BYTES) break
  }
}

async function convertAudio(inputPath, outputPath) {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', inputPath,
    '-t', String(SOUND_STICKER_DURATION),
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '64k',
    '-ac', '1',
    '-ar', '48000',
    outputPath,
  ])
}

/**
 * Convierte un video en los dos archivos que WhatsApp cifra por separado.
 * El llamador debe ejecutar cleanup() en un finally.
 */
export async function createSoundStickerMedia(videoBuffer, { packname = '', author = '' } = {}) {
  if (!Buffer.isBuffer(videoBuffer) || !videoBuffer.length) {
    throw new Error('El video está vacío o no se pudo descargar.')
  }

  await mkdir(TMP_ROOT, { recursive: true })
  const workdir = await mkdtemp(path.join(TMP_ROOT, 'sound-sticker-'))
  const inputPath = path.join(workdir, 'input.mp4')
  const stickerPath = path.join(workdir, 'sticker.webp')
  const audioPath = path.join(workdir, 'audio.ogg')
  let cleaned = false
  const cleanup = async () => {
    if (cleaned) return
    cleaned = true
    await rm(workdir, { recursive: true, force: true }).catch(() => {})
  }

  try {
    await writeFile(inputPath, videoBuffer)
    const withAudio = await hasAudioTrack(inputPath)

    const conversions = [convertSticker(inputPath, stickerPath)]
    if (withAudio) conversions.push(convertAudio(inputPath, audioPath))
    await Promise.all(conversions)

    let sticker = await readFile(stickerPath)
    if (packname || author) sticker = await addExif(sticker, packname, author)
    const audio = withAudio ? await readFile(audioPath) : null

    if (sticker.length > MAX_STICKER_BYTES) {
      throw new Error(`El sticker quedó en ${Math.ceil(sticker.length / 1024)} KB; supera el máximo de 500 KB.`)
    }
    if (audio && audio.length > MAX_AUDIO_BYTES) {
      throw new Error(`El audio quedó en ${Math.ceil(audio.length / 1024)} KB; supera el máximo de 100 KB.`)
    }

    return { sticker, audio, cleanup }
  } catch (error) {
    await cleanup()
    throw error
  }
}
