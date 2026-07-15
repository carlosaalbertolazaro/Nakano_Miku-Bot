import fetch from 'node-fetch'

const handler = async (m, { conn, text }) => {
  if (!text) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> Enviá un enlace de Facebook válido.`)
  if (!/facebook\.com|fb\.watch/i.test(text)) return m.reply(`*『 ✙ 』ENLACE INVÁLIDO.*\n> Asegurate de que sea de Facebook.`)

  await m.reply(`*『 📥 』Descargando video de Facebook...*`)

  try {
    const response = await fetch(`https://luxinfinity.vercel.app/api/facebook?url=${encodeURIComponent(text)}`)
    const json = await response.json()

    if (!json.status || !json.data) return m.reply(`*『 ❌ 』ERROR.*\n> No se pudo obtener respuesta del servidor.`)

    const data = json.data
    const videoUrl = data.hd || data.sd

    if (!videoUrl) return m.reply(`*『 ✙ 』SIN VIDEO.*\n> No se encontró video en ese enlace.`)

    const caption = `*『 📘 』FACEBOOK*\n> 📝 ${data.description || 'Sin descripción'}\n> ⏱️ *Duración:* ${data.duration || '—'}\n> 🎬 *Calidad:* ${data.hd ? 'HD' : 'SD'}`
    const buf = Buffer.from(await (await fetch(videoUrl, { timeout: 60000 })).arrayBuffer())
    await conn.sendMessage(m.chat, { video: buf, mimetype: 'video/mp4', caption }, { quoted: m })
  } catch (e) {
    m.reply(`*『 ❌ 』ERROR.*\n> No se pudo completar. Intentá de nuevo.`)
  }
}

handler.help = ['fb <link>']
handler.desc = 'Descargar un video de Facebook (HD o SD).'
handler.command = ['fbdl', 'fb', 'facebook', 'facebookdl']
handler.tags = ['descargas']

export default handler
