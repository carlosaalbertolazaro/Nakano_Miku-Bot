import * as baileysMod from '@whiskeysockets/baileys'
import { sendVideoAsSticker } from './sticker.js'
import { createSoundStickerMedia, SOUND_STICKER_DURATION } from './soundStickerMedia.js'

const pkg = baileysMod.default && typeof baileysMod.default === 'object'
  ? { ...baileysMod.default, ...baileysMod }
  : baileysMod
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = pkg

export function isSoundStickerSupported() {
  const StickerMessage = proto?.Message?.StickerMessage
  if (
    typeof prepareWAMessageMedia !== 'function' ||
    typeof generateWAMessageFromContent !== 'function' ||
    !StickerMessage
  ) return false

  if (StickerMessage.fields?.audioMessage?.id === 26) return true

  // El fork 0.5.x usa clases propias y no publica `fields`. Comprobamos el
  // descriptor real: campo 26 + wire type 2 se codifica como varint d2 01.
  if (
    typeof StickerMessage.encode !== 'function' ||
    !Object.prototype.hasOwnProperty.call(StickerMessage.prototype || {}, 'audioMessage')
  ) return false

  try {
    const encoded = StickerMessage.encode({
      audioMessage: { mimetype: 'audio/ogg; codecs=opus' },
    }).finish()
    return encoded[0] === 0xd2 && encoded[1] === 0x01
  } catch {
    return false
  }
}

export async function sendComposite(conn, jid, sticker, audio, quoted) {
  const stickerMedia = await prepareWAMessageMedia(
    { sticker },
    { upload: conn.waUploadToServer },
  )
  const audioMedia = await prepareWAMessageMedia(
    {
      audio,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: false,
      seconds: SOUND_STICKER_DURATION,
    },
    { upload: conn.waUploadToServer },
  )

  const stickerMessage = stickerMedia?.stickerMessage
  const audioMessage = audioMedia?.audioMessage
  if (!stickerMessage || !audioMessage) {
    throw new Error('Baileys no pudo preparar los archivos del sound sticker.')
  }

  stickerMessage.isAnimated = true
  stickerMessage.audioMessage = {
    ...audioMessage,
    mimetype: 'audio/ogg; codecs=opus',
    seconds: SOUND_STICKER_DURATION,
    ptt: false,
  }

  const waMessage = generateWAMessageFromContent(
    jid,
    { stickerMessage },
    { quoted },
  )
  await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
}

/**
 * Intenta enviar un sound sticker y siempre conserva un fallback animado.
 * Devuelve el motivo del fallback para que el comando pueda informarlo.
 */
export async function sendVideoAsSoundSticker(conn, jid, videoBuffer, m, options = {}) {
  if (!isSoundStickerSupported()) {
    await sendVideoAsSticker(conn, jid, videoBuffer, m, options)
    return { sound: false, reason: 'unsupported' }
  }

  let media
  try {
    media = await createSoundStickerMedia(videoBuffer, options)
  } catch (error) {
    console.error('[SOUND STICKER] Falló la conversión dual; se usará sticker normal:', error.message)
    await sendVideoAsSticker(conn, jid, videoBuffer, m, options)
    return { sound: false, reason: 'conversion-failed', error }
  }

  try {
    if (!media.audio) {
      await conn.sendMessage(jid, { sticker: media.sticker }, { quoted: m })
      return { sound: false, reason: 'no-audio' }
    }

    try {
      await sendComposite(conn, jid, media.sticker, media.audio, m)
      return { sound: true }
    } catch (error) {
      console.error('[SOUND STICKER] Falló el envío compuesto; se usará sticker normal:', error.message)
      await conn.sendMessage(jid, { sticker: media.sticker }, { quoted: m })
      return { sound: false, reason: 'send-failed', error }
    }
  } finally {
    await media.cleanup()
  }
}
