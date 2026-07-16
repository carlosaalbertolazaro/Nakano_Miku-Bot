import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'
import { pipeline } from 'stream/promises'
import config from '../../config.js'
import { fetchImageBuffer } from '../../lib/sendImageSafe.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`*『 ✙ 』USO.*\n> Ingresa un enlace o nombre de video.\n\n> *Ejemplo:* ${usedPrefix}${command} https://youtu.be/xxx`)

  if (command === 'ytmp4dl') {

    const [type, ...idParts] = text.split(' ')
    const videoQuery = idParts.join(' ')
    if (!type || !videoQuery) return
    
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    
    const isDoc = type === 'doc'
    
    await m.reply(`*『 ⏳ 』DESCARGANDO VIDEO*\n\n> _Esto puede tardar un poco dependiendo del peso del archivo..._`)

    const tmpDir = path.resolve('./tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
    const localFilePath = path.join(tmpDir, `ytmp4_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`)
    
    let isDownloaded = false
    let dlTitle = 'YouTube Video'

    try {
      const queryToFetch = videoQuery.length === 11 && !videoQuery.includes(' ') ? `https://youtu.be/${videoQuery}` : videoQuery
      const { data: apiResponse } = await axios.get(`https://luxinfinity.vercel.app/api/youtube?query=${encodeURIComponent(queryToFetch)}&type=video`, { timeout: 15000 })
      
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
      return m.reply(`*『 ✙ 』ERROR.*\n> No se pudo descargar el video. Es posible que tenga restricción de edad o copyright.`)
    }

    try {
      if (isDoc) {
        await conn.sendMessage(m.chat, { document: { url: localFilePath }, mimetype: 'video/mp4', fileName: `${dlTitle}.mp4`, caption: `*『 🎬 』YOUTUBE VIDEO DOC*` }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, { video: { url: localFilePath }, caption: `*『 🎬 』YOUTUBE VIDEO*\n\n> *Título:* ${dlTitle}`, mimetype: 'video/mp4', fileName: `${dlTitle}.mp4` }, { quoted: m })
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

  const infoText = `*『 🎬 』YOUTUBE MP4*\n\n> *Título:* ${videoInfo.title}\n> *Autor:* ${videoInfo.channel}\n> *Duración:* ${videoInfo.duration}\n> *Vistas:* ${videoInfo.views}\n\n> *Elige el formato para descargar:*`

  const isLid = sender.includes('@lid')

  const nativeFlowButtons = [{
    text: `Elegir formato ⚙️`,
    sections: [{
      title: `✧ Formatos de Video ✧`,
      rows: [
        { header: '', title: `📽️ | Video (MP4)`, description: `» Reproductor de video estándar`, id: `${usedPrefix}ytmp4dl norm ${videoInfo.id}` },
        { header: '', title: `📄 | Video (Documento)`, description: `» Archivo original descargable`, id: `${usedPrefix}ytmp4dl doc ${videoInfo.id}` }
      ]
    }]
  }]

  const thumbBuffer = await fetchImageBuffer(videoInfo.thumbnail)

  await conn.sendMessage(m.chat, {
    ...(thumbBuffer ? { image: thumbBuffer } : {}),
    caption: infoText,
    footer: global.botname || config.botName,
    buttons: nativeFlowButtons,
    headerType: thumbBuffer ? 4 : 1,
    mentions: isLid ? [] : [sender]
  }, { quoted: m })
}

handler.help = ['ytmp4 <link>']
handler.desc = 'Descargar un video de YouTube en MP4.'
handler.command = ['ytmp4', 'ytv', 'ytvideo', 'ytmp4dl']
handler.tags = ['descargas']

export default handler