import fetch from 'node-fetch'
import { format } from 'util'

const MAX_GET_SIZE = 100 * 1024 * 1024

const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return m.reply(`*『 ✙ 』FALTA EL ENLACE.*\n> Usá *${usedPrefix}get <url>*`)
  if (!/^https?:\/\//.test(text)) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> El enlace debe comenzar con *https://* o *http://*`)
  
  // Un solo AbortController cubriendo tanto el fetch() como la lectura del
  // body (arrayBuffer): antes no había ningún límite de tiempo acá, y como
  // la URL la manda el usuario, un servidor que nunca responde (o que
  // manda el body clavado) colgaba la promesa para siempre.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  let response
  try {
    response = await fetch(text, { signal: controller.signal })
  } catch (e) {
    clearTimeout(timer)
    return m.reply(`*『 ❌ 』ERROR.*\n> No se pudo conectar a la URL.\n> ${e.message}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const contentLength = parseInt(response.headers.get('content-length') || '0')
  const ext = text.split('.').pop().split('?')[0].toLowerCase()

  if (contentLength > MAX_GET_SIZE) {
    clearTimeout(timer)
    return m.reply(`*『 ✙ 』ARCHIVO MUY GRANDE.*\n> El límite es 100 MB.`)
  }

  let buffer
  try {
    buffer = Buffer.from(await response.arrayBuffer())
  } catch (e) {
    return m.reply(`*『 ❌ 』ERROR.*\n> No se pudo descargar el archivo.\n> ${e.message}`)
  } finally {
    clearTimeout(timer)
  }
  
  if (/image\/(jpeg|png|gif|webp)/.test(contentType) || ['jpg','jpeg','png','gif','webp'].includes(ext))
    return conn.sendMessage(m.chat, { image: buffer }, { quoted: m })
  if (/video\/(mp4|webm|ogg)/.test(contentType) || ['mp4','webm','ogg'].includes(ext))
    return conn.sendMessage(m.chat, { video: buffer }, { quoted: m })
  if (/audio\/(mpeg|ogg|mp3|wav)/.test(contentType) || ['mp3','wav'].includes(ext) || contentType === 'application/octet-stream') {
    const mime = contentType.startsWith('audio/') ? contentType : 'audio/mpeg'
    return conn.sendMessage(m.chat, { audio: buffer, mimetype: mime }, { quoted: m })
  }
  
  let content = buffer.toString()
  try { content = format(JSON.parse(content)) } catch {}
  return m.reply(content)
}

handler.command = ['get']
handler.tags = ['tools']
handler.help = ['get <url>']
handler.desc = 'Descargar y mandar cualquier imagen/video/audio/JSON desde un link directo.'
export default handler