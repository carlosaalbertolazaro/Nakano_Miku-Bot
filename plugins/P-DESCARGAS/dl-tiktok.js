import fetch from 'node-fetch'
import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> Enviá un enlace válido de TikTok.`)
  if (!/tiktok\.com|vt\.tiktok\.com/i.test(text)) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> Asegurate de que sea de TikTok.`)

  const chatId = m.chat
  await m.reply(`*『 📥 』Descargando de TikTok...*`)
  
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    let response
    try {
      response = await fetch(`https://luxinfinity.vercel.app/api/tiktok?url=${encodeURIComponent(text)}`, { signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
    const json = await response.json()

    if (!json.status || !json.data) return m.reply(`*『 ❌ 』ERROR.*\n> No se pudo obtener respuesta del servidor.`)

    const data     = json.data
    const title    = data.title    || ''
    const author   = data.author   || data.music?.author || 'Anónimo'
    const music    = data.music?.title || 'Sonido original'
    const likes    = (data.likes    || 0).toLocaleString()
    const comments = (data.comments || 0).toLocaleString()
    const shares   = (data.shares   || 0).toLocaleString()
    const plays    = (data.plays    || 0).toLocaleString()
    
    if (Array.isArray(data.images) && data.images.length > 0) {
      const caption = `*『 🖼️ 』TIKTOK · ${data.images.length} IMÁGENES*\n> 👤 *${author}*\n> 📝 ${title}\n> 🎵 ${music}\n> ❤️ ${likes} · 💬 ${comments} · 🔁 ${shares} · 👁️ ${plays}`
      
      const album = generateWAMessageFromContent(chatId, {
        albumMessage: { expectedImageCount: data.images.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
      }, {})
      await conn.relayMessage(chatId, album.message, { messageId: album.key.id })

      await Promise.all(data.images.map(async (imgUrl, i) => {
        try {
          const imgBuf = Buffer.from(await (await fetch(imgUrl, { timeout: 60000 })).arrayBuffer())
          const msg = await generateWAMessage(chatId, {
            image: imgBuf,
            caption: i === 0 ? caption : ''
          }, { upload: conn.waUploadToServer })
          msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
          await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })
        } catch (err) { }
      }))
      
      if (data.audio) {
        const mp3Buf = Buffer.from(await (await fetch(data.audio, { timeout: 30000 })).arrayBuffer())
        await conn.sendMessage(chatId, { audio: mp3Buf, mimetype: 'audio/mpeg', ptt: false }, { quoted: m })
      }
    } else {
      if (!data?.nowatermark) return m.reply(`*『 ✙ 』SIN VIDEO.*\n> No se encontró video en ese enlace.`)
      
      const captionVid = `*『 🎵 』TIKTOK*\n> 👤 *${author}*\n> 📝 ${title}\n> 🎵 ${music}\n> ❤️ ${likes} · 💬 ${comments} · 🔁 ${shares} · 👁️ ${plays}`
      const buf = Buffer.from(await (await fetch(data.nowatermark, { timeout: 60000 })).arrayBuffer())
      
      await conn.sendMessage(chatId, { video: buf, mimetype: 'video/mp4', caption: captionVid }, { quoted: m })
    }
    

  } catch (e) { 
    console.error(e)
    m.reply(`*『 ❌ 』ERROR.*\n> Ocurrió un error inesperado. Intentá de nuevo.`) 
  }
}

handler.help = ['tt <link>']
handler.desc = 'Descargar un video de TikTok sin marca de agua.'
handler.command = ['ttkdl', 'tt', 'tiktok', 'tiktokdl', 'ttk']
handler.tags = ['descargas']

export default handler