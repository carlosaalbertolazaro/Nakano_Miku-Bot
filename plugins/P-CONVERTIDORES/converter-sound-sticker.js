import config from '../../config.js'
import UserDb from '../../lib/database/UserDb.js'
import { sendVideoAsSoundSticker } from '../../lib/soundSticker.js'

const FALLBACK_MESSAGES = {
  unsupported: 'Tu versión actual de Baileys no admite sound stickers. Envié el sticker animado normal.',
  'no-audio': 'El video no tiene pista de audio. Envié el sticker animado normal.',
  'conversion-failed': 'No se pudo generar el par WebP + OGG. Envié el sticker animado normal.',
  'send-failed': 'WhatsApp no aceptó el mensaje compuesto. Envié el sticker animado normal.',
}

const handler = async (m, { conn }) => {
  const q = m.quoted || m
  const mime = (q.msg || q).mimetype || ''
  const esVideo = q.mtype === 'videoMessage' || /video/i.test(mime)

  if (!esVideo) {
    return m.reply(`*『 ✙ 』SIN VIDEO.*\n> Enviá o respondé a un video con audio para crear un sound sticker de 5 segundos.`)
  }

  const user = await UserDb.findOrCreate(m.sender)
  const packname = user.data?.stickers?.packname || config.packname || 'Miku'
  const author = user.data?.stickers?.author || config.author || 'Carlos'

  await m.reply(`*『 ⏳ 』Creando sound sticker (experimental)...*`)

  try {
    const buffer = await q.download()
    if (!buffer) throw new Error('No se pudo descargar el video.')

    const result = await sendVideoAsSoundSticker(conn, m.chat, buffer, m, { packname, author })
    if (!result.sound) await m.reply(`*『 ℹ️ 』STICKER NORMAL ENVIADO.*\n> ${FALLBACK_MESSAGES[result.reason] || 'Se usó el modo de compatibilidad.'}`)
  } catch (error) {
    console.error('[SOUND STICKER COMMAND ERROR]', error.stack || error.message)
    await m.reply(`*『 ❌ 』ERROR.*\n> No se pudo crear el sticker. Intentá con otro video más corto o liviano.`)
  }
}

handler.help = ['saudio <video>']
handler.desc = 'Crear un sound sticker experimental de 5s; usa sticker animado normal si no es compatible o el video no tiene audio.'
handler.command = ['saudio', 'stickeraudio', 'soundsticker']
handler.tags = ['convertidores']

export default handler
