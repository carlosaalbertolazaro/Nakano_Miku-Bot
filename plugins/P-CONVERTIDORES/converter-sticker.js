import { sendImageAsSticker, sendVideoAsSticker } from '../../lib/sticker.js'
import config from '../../config.js'
import UserDb from '../../lib/database/UserDb.js'

const handler = async (m, { conn }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || ''

  const esImg = q.mtype === 'imageMessage' || /image/i.test(mime)
  const esVid = q.mtype === 'videoMessage' || /video/i.test(mime)

  if (!esImg && !esVid) {
    return m.reply(`*『 ✙ 』SIN MEDIA.*\n> Enviá o respondé a una imagen o video.`)
  }

  // .setstickermeta permite personalizar el pack/autor por usuario — si no
  // configuró nada, se usan los valores por defecto del bot.
  const user = await UserDb.findOrCreate(m.sender)
  const packname = user.data?.stickers?.packname || config.packname || 'Miku'
  const author   = user.data?.stickers?.author || config.author || 'Carlos'

  await m.reply(`*『 ⏳ 』Creando sticker...*`)

  try {
    const buffer = await q.download()
    if (!buffer) throw new Error('No se pudo descargar la media')

    if (esImg) {
      await sendImageAsSticker(conn, m.chat, buffer, m, { packname, author })
    } else {
      if ((q.msg?.seconds || 0) > 11) {
        return m.reply(`*『 ✙ 』VIDEO MUY LARGO.*\n> El video debe durar menos de 11 segundos.`)
      }
      await sendVideoAsSticker(conn, m.chat, buffer, m, { packname, author })
    }
  } catch (e) {
    console.error('[STICKER ERROR]', e.message)
    m.reply(`*『 ❌ 』ERROR.*\n> No se pudo crear el sticker. Intentá enviando la imagen/video nuevamente.`)
  }
}

handler.help = ['sticker <img/vid>']
handler.desc = 'Convertir una imagen o video (hasta 11s) en sticker.'
handler.command = ['sticker', 's', 'stiker', 'stic', 'figurinha']
handler.tags = ['convertidores']

export default handler