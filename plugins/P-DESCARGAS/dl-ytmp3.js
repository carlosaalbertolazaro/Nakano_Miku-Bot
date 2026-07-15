import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import config from '../../config.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*『 ✙ 』USO.*\n> Ingresa el nombre de una canción o un enlace.\n\n> *Ejemplo:* ${usedPrefix}${command} linkin park numb`)

  if (command === 'ytmp3dl') {
    
    const [type, ...idParts] = text.split(' ')
    const videoQuery = idParts.join(' ')
    if (!type || !videoQuery) return
    
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    
    const isDoc = type === 'doc'
    
    await m.reply(`*『 ⏳ 』DESCARGANDO AUDIO*\n\n> _Esto puede tardar un poco dependiendo del peso del archivo..._`)

    const tmpDir = path.resolve('./tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const localFilePath = path.join(tmpDir, `ytmp3_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`)
    
    let isDownloaded = false
    let dlTitle = 'YouTube Audio'

    try {
      const queryToFetch = videoQuery.length === 11 && !videoQuery.includes(' ') ? `https://youtu.be/${videoQuery}` : videoQuery
      const { data: apiResponse } = await axios.get(`https://luxinfinity.vercel.app/api/youtube?query=${encodeURIComponent(queryToFetch)}&type=audio`, { timeout: 15000 })
      
      if (!apiResponse.status || !apiResponse.data || !apiResponse.data.url) throw new Error('API failed')
      
      const mediaData = apiResponse.data
      dlTitle = mediaData.title || dlTitle

      const maxSize = isDoc ? (200 * 1024 * 1024) : (100 * 1024 * 1024)
      if (mediaData.sizeB > maxSize) {
        await rm(localFilePath, { force: true }).catch(() => {})
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply(`*『 ✙ 』ERROR.*\n> El archivo es demasiado pesado (${mediaData.size}).`)
      }

      const mediaRes = await axios.get(mediaData.url, { responseType: 'stream', timeout: 120000 })
      await pipeline(mediaRes.data, fs.createWriteStream(localFilePath))
      
      if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 1000) {
        isDownloaded = true
      }
    } catch (e) {}

    if (!isDownloaded || !fs.existsSync(localFilePath)) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return m.reply(`*『 ✙ 』ERROR.*\n> No se pudo descargar el audio. Es posible que tenga restricción.`)
    }

    try {
      if (isDoc) {
        await conn.sendMessage(m.chat, { document: { url: localFilePath }, mimetype: 'audio/mpeg', fileName: `${dlTitle}.mp3`, caption: `*『 🎧 』YOUTUBE AUDIO DOC*` }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, { audio: { url: localFilePath }, mimetype: 'audio/mpeg', fileName: `${dlTitle}.mp3` }, { quoted: m })
      }
      
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (error) {
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await m.reply(`*『 ✙ 』ERROR.*\n> Hubo un error al enviar el archivo.`)
    } finally {
      await rm(localFilePath, { force: true }).catch(() => {})
    }
    return
  }

  const sender = m.sender
  await m.reply(`🔍 *Buscando información...*`)
  
  let videoInfo = {}
  try {
    const { data: apiResponse } = await axios.get(`https://luxinfinity.vercel.app/api/youtube?query=${encodeURIComponent(text)}&type=video`, { timeout: 15000 })
    if (!apiResponse.status || !apiResponse.data) throw new Error()
    
    const res = apiResponse.data
    const vidIdMatch = res.thumb.match(/vi\/([a-zA-Z0-9_-]{11})/)
    const videoId = vidIdMatch ? vidIdMatch[1] : encodeURIComponent(text)

    videoInfo = {
      id: videoId, 
      title: res.title, 
      channel: res.uploader,
      duration: res.duration, 
      views: res.views, 
      thumbnail: res.thumb
    }
  } catch (e) {
    return m.reply(`*『 ✙ 』ERROR.*\n> No se pudo obtener la información del medio.`)
  }

  const infoText = `*『 🎧 』YOUTUBE MP3*\n\n> *Título:* ${videoInfo.title}\n> *Autor:* ${videoInfo.channel}\n> *Duración:* ${videoInfo.duration}\n> *Vistas:* ${videoInfo.views}\n\n> *Elige el formato para descargar:*`

  const isLid = sender.includes('@lid')

  const nativeFlowButtons = [{
    text: `Elegir formato ⚙️`,
    sections: [{
      title: `✧ Formatos de Audio ✧`,
      rows: [
        { header: '', title: `🎧 | Audio (MP3)`, description: `» Reproductor de audio estándar`, id: `${usedPrefix}ytmp3dl norm ${videoInfo.id}` },
        { header: '', title: `📁 | Audio (Documento)`, description: `» Archivo original descargable`, id: `${usedPrefix}ytmp3dl doc ${videoInfo.id}` }
      ]
    }]
  }]

  await conn.sendMessage(m.chat, {
    image: { url: videoInfo.thumbnail },
    caption: infoText,
    footer: global.botname || config.botName,
    buttons: nativeFlowButtons,
    headerType: 4,
    mentions: isLid ? [] : [sender]
  }, { quoted: m })
}

handler.help = ['ytmp3 <link>']
handler.desc = 'Descargar el audio de un video de YouTube en MP3.'
handler.command = ['ytmp3', 'yta', 'ytaudio', 'ytmp3dl']
handler.tags = ['descargas']

export default handler