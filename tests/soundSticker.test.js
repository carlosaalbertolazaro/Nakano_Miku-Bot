import assert from 'node:assert/strict'
import test from 'node:test'
import { proto } from '@whiskeysockets/baileys'
import { isSoundStickerSupported, sendComposite } from '../lib/soundSticker.js'
import { SOUND_STICKER_DURATION } from '../lib/soundStickerMedia.js'

test('el fork instalado serializa StickerMessage.audioMessage en el campo 26', () => {
  assert.equal(isSoundStickerSupported(), true)

  const StickerMessage = proto.Message.StickerMessage
  const encoded = StickerMessage.encode({
    audioMessage: {
      mimetype: 'audio/ogg; codecs=opus',
      seconds: SOUND_STICKER_DURATION,
    },
  }).finish()

  assert.deepEqual([...encoded.subarray(0, 2)], [0xd2, 0x01])
  const decoded = StickerMessage.decode(encoded)
  assert.equal(decoded.audioMessage.mimetype, 'audio/ogg; codecs=opus')
  assert.equal(decoded.audioMessage.seconds, SOUND_STICKER_DURATION)
})

test('ensambla y cifra por separado el WebP y el OGG sin usar la red', async () => {
  const uploads = []
  let relayed
  const jid = '100000000000000@s.whatsapp.net'
  const conn = {
    waUploadToServer: async (_filePath, { mediaType }) => {
      uploads.push(mediaType)
      return {
        mediaUrl: `https://media.example.test/${mediaType}`,
        directPath: `/encrypted/${mediaType}`,
      }
    },
    relayMessage: async (target, message, options) => {
      relayed = { target, message, options }
    },
  }

  await sendComposite(
    conn,
    jid,
    Buffer.from('contenido-webp-de-prueba'),
    Buffer.from('contenido-ogg-de-prueba'),
    null,
  )

  assert.deepEqual(uploads.sort(), ['audio', 'sticker'])
  assert.equal(relayed.target, jid)
  assert.ok(relayed.options.messageId)

  const sticker = relayed.message.stickerMessage
  assert.equal(sticker.isAnimated, true)
  assert.equal(sticker.audioMessage.mimetype, 'audio/ogg; codecs=opus')
  assert.equal(sticker.audioMessage.seconds, SOUND_STICKER_DURATION)
  assert.equal(sticker.audioMessage.ptt, false)

  const decoded = proto.Message.StickerMessage.decode(
    proto.Message.StickerMessage.encode(sticker).finish(),
  )
  assert.equal(decoded.audioMessage.directPath, '/encrypted/audio')
  assert.equal(decoded.audioMessage.seconds, SOUND_STICKER_DURATION)
  assert.equal(decoded.directPath, '/encrypted/sticker')
})
