import axios from 'axios'
import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { generateWAMessageFromContent, generateWAMessage } = pkg

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> Enviá un enlace válido de Instagram.`)
  if (!text.includes('instagram.com')) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> Asegurate de que sea de Instagram.`)

  const chatId = m.chat
  await m.reply(`*『 📥 』Descargando de Instagram...*`)
  
  try {
    const { data: apiResponse } = await axios.get(`https://luxinfinity.vercel.app/api/ig?url=${encodeURIComponent(text)}`, { timeout: 15000 })
    
    if (!apiResponse.status || !apiResponse.data || !apiResponse.data.items || apiResponse.data.items.length === 0) {
      return m.reply(`*『 ✙ 』SIN CONTENIDO.*\n> No se encontró media en ese enlace o es un perfil privado.`)
    }
    
    const mediaItems = apiResponse.data.items.filter(i => i.type === 'video' || i.type === 'image')
    
    if (mediaItems.length === 0) {
      return m.reply(`*『 ✙ 』SIN CONTENIDO.*\n> No se encontró media compatible en ese enlace.`)
    }
    
    if (mediaItems.length === 1) {
      const item = mediaItems[0]
      const mediaRes = await axios.get(item.url, { responseType: 'arraybuffer', timeout: 60000 })
      const buf = Buffer.from(mediaRes.data)
      const captionMsg = item.type === 'video' ? `*『 🎬 』INSTAGRAM*` : `*『 📸 』INSTAGRAM*`
      await conn.sendMessage(chatId, { [item.type]: buf, caption: captionMsg }, { quoted: m })
    } else {
      const album = generateWAMessageFromContent(chatId, {
        albumMessage: { expectedImageCount: mediaItems.length, contextInfo: { stanzaId: m.key.id, participant: m.key.participant || m.key.remoteJid, quotedMessage: m.message } }
      }, {})
      await conn.relayMessage(chatId, album.message, { messageId: album.key.id })

      await Promise.all(mediaItems.map(async (item, i) => {
        try {
          const mediaRes = await axios.get(item.url, { responseType: 'arraybuffer', timeout: 60000 })
          const buf = Buffer.from(mediaRes.data)
          const msg = await generateWAMessage(chatId, {
            [item.type]: buf,
            caption: i === 0 ? `*『 📚 』INSTAGRAM CARRUSEL*\n> 🖼️ Álbum descargado.` : ''
          }, { upload: conn.waUploadToServer })
          msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
          await conn.relayMessage(chatId, msg.message, { messageId: msg.key.id })
        } catch (err) {}
      }))
    }
    
    
  } catch (e) {
    if (e.message.includes('404') || e.message.includes('500')) {
      return m.reply(`*『 🔒 』PERFIL PRIVADO O ERROR.*\n> No se pudo extraer la información del enlace.`)
    }
    m.reply(`*『 ❌ 』ERROR.*\n> No se pudo completar la descarga. Intentá de nuevo.`)
  }
}

handler.help = ['ig <link>']
handler.desc = 'Descargar posts, reels o carruseles de Instagram.'
handler.command = ['ig', 'instagram', 'igdl', 'instagramdl', 'reel', 'reeldl']
handler.tags = ['descargas']

export default handler