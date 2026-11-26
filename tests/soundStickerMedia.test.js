import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import {
  createSoundStickerMedia,
  MAX_AUDIO_BYTES,
  MAX_STICKER_BYTES,
} from '../lib/soundStickerMedia.js'

const execFileAsync = promisify(execFile)
const TMP_ROOT = path.resolve('./tmp')

async function makeFixture(t, { withAudio }) {
  await mkdir(TMP_ROOT, { recursive: true })
  const workdir = await mkdtemp(path.join(TMP_ROOT, 'sound-sticker-test-'))
  t.after(() => rm(workdir, { recursive: true, force: true }))
  const inputPath = path.join(workdir, 'input.mp4')
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=160x120:rate=10',
  ]
  if (withAudio) args.push('-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000')
  args.push(
    '-t', '6',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    ...(withAudio ? ['-c:a', 'aac'] : ['-an']),
    inputPath,
  )
  await execFileAsync('ffmpeg', args, { windowsHide: true })
  return readFile(inputPath)
}

async function probe(file, entries) {
  const extension = file.subarray(0, 4).toString() === 'OggS' ? 'ogg' : 'webp'
  await mkdir(TMP_ROOT, { recursive: true })
  const workdir = await mkdtemp(path.join(TMP_ROOT, 'sound-sticker-probe-'))
  try {
    const inputPath = path.join(workdir, `media.${extension}`)
    await writeFile(inputPath, file)
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', entries, '-of', 'json', inputPath,
    ], { windowsHide: true })
    return JSON.parse(stdout)
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

test('genera WebP 512x512 y OGG Opus de 5 segundos dentro de los límites', async t => {
  const video = await makeFixture(t, { withAudio: true })
  const media = await createSoundStickerMedia(video, { packname: 'Miku', author: 'Prueba' })
  t.after(() => media.cleanup())

  assert.ok(media.sticker.length > 0 && media.sticker.length <= MAX_STICKER_BYTES)
  assert.ok(media.audio?.length > 0 && media.audio.length <= MAX_AUDIO_BYTES)
  assert.equal(media.sticker.subarray(0, 4).toString(), 'RIFF')
  assert.equal(media.sticker.subarray(8, 12).toString(), 'WEBP')
  assert.equal(media.audio.subarray(0, 4).toString(), 'OggS')

  const stickerInfo = await probe(
    media.sticker,
    'stream=codec_name,width,height:packet=pts_time,duration_time',
  )
  assert.equal(stickerInfo.streams[0].width, 512)
  assert.equal(stickerInfo.streams[0].height, 512)
  // WebP fusiona cuadros repetidos: la duración real se obtiene del último
  // timestamp + su duración, no dividiendo la cantidad de cuadros por los FPS.
  const lastPacket = stickerInfo.packets.at(-1)
  const stickerDuration = Number(lastPacket.pts_time) + Number(lastPacket.duration_time)
  assert.ok(
    stickerDuration >= 4.9 && stickerDuration <= 5.1,
    `Duración inesperada: ${stickerDuration}s`,
  )

  const audioInfo = await probe(media.audio, 'format=duration:stream=codec_name,sample_rate,channels')
  assert.equal(audioInfo.streams[0].codec_name, 'opus')
  assert.equal(audioInfo.streams[0].sample_rate, '48000')
  assert.equal(audioInfo.streams[0].channels, 1)
  assert.ok(Number(audioInfo.format.duration) >= 4.9)
  assert.ok(Number(audioInfo.format.duration) <= 5.1)
})

test('un video sin pista de audio conserva el sticker y omite el OGG', async t => {
  const video = await makeFixture(t, { withAudio: false })
  const media = await createSoundStickerMedia(video)
  t.after(() => media.cleanup())

  assert.ok(media.sticker.length > 0 && media.sticker.length <= MAX_STICKER_BYTES)
  assert.equal(media.audio, null)
})
