import axios from 'axios'

// Mismo proveedor que el resto de P-DESCARGAS (luxinfinity.vercel.app).
// Verificado en vivo antes de escribir esto: funciona bien para Pinterest
// (a diferencia de Facebook/Twitter, que devuelven 502 en este servicio
// ahora mismo — por eso esos dos no se implementaron).
const handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) return m.reply(`*『 ✙ 』FALTA EL ENLACE.*\n> Usá *${usedPrefix}pinterest <link de un pin>*`)
  if (!/pinterest\.com|pin\.it/i.test(text)) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> Asegurate de que sea de Pinterest.`)

  await m.reply(`*『 📥 』Descargando de Pinterest...*`)

  try {
    const { data: apiResponse } = await axios.get(`https://luxinfinity.vercel.app/api/pinterest?url=${encodeURIComponent(text)}`, { timeout: 15000 })

    if (!apiResponse.status || !apiResponse.data) {
      return m.reply(`*『 ❌ 』SIN CONTENIDO.*\n> No se pudo extraer la imagen de ese enlace.`)
    }

    const { data: pin } = apiResponse
    const imageUrl = pin.images?.orig || pin.image
    const caption = `*『 📌 』PINTEREST*\n> 📝 ${pin.title || 'Sin título'}${pin.pinner?.username ? `\n> 👤 @${pin.pinner.username}` : ''}`

    await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption }, { quoted: m })
  } catch (e) {
    m.reply(`*『 ❌ 』ERROR.*\n> No se pudo descargar la imagen. Intentá de nuevo.`)
  }
}

handler.help = ['pinterest <link>']
handler.desc = 'Descargar una imagen de un pin de Pinterest.'
handler.command = ['pinterest', 'pin']
handler.tags = ['descargas']

export default handler
