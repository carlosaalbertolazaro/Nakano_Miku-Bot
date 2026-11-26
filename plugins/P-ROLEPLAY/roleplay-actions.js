import { fetchReactionGif, downloadReactionGifBuffer } from '../../lib/nekosbest.js'
import { gifToMp4 } from '../../lib/gifToMp4.js'
import { ACTIONS, ROLEPLAY_ACTION_COUNT } from '../../lib/roleplayCatalog.js'

const handler = async (m, { conn, command, usedPrefix = '.' }) => {
  const action = ACTIONS[command]
  if (!action) return

  const target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
  const senderTag = `@${m.sender.split('@')[0]}`

  if (!target && !action.standalone) {
    return m.reply(
      `*『 ${action.emoji} 』ROLEPLAY*\n` +
      `> Mencioná a alguien o respondé a su mensaje.\n` +
      `> Ejemplo: *${usedPrefix}${command} @usuario*`,
    )
  }

  let gif
  let gifBuffer = null
  let mp4Buffer = null
  try {
    gif = await fetchReactionGif(action.endpoint)
    gifBuffer = await downloadReactionGifBuffer(gif.url)
    // WhatsApp necesita un MP4 real para reproducir el GIF en loop y poder
    // descargarlo después; un archivo GIF enviado como video no es suficiente.
    mp4Buffer = await gifToMp4(gifBuffer)
  } catch (e) {
    if (!gif) {
      return m.reply(`*『 ❌ 』ERROR*\n> No se pudo obtener el gif ahora mismo. Probá de nuevo en un rato.\n> _${e.message}_`)
    }
    // Si falló la descarga o la conversión, todavía se puede intentar el
    // fallback estático y, como último recurso, el texto de la acción.
  }

  let caption
  if (target && !action.standalone) {
    caption = `${action.emoji} ${senderTag} ${action.verbo} @${target.split('@')[0]}`
  } else if (target) {
    caption = `${action.emoji} ${senderTag} ${action.verbo} (por @${target.split('@')[0]})`
  } else {
    caption = `${action.emoji} ${senderTag} ${action.verbo}`
  }

  const mentions = target ? [m.sender, target] : [m.sender]

  try {
    if (mp4Buffer) {
      await m.replyVideo(mp4Buffer, caption, true, { mentions })
    } else {
      await conn.sendMessage(m.chat, { image: gifBuffer || { url: gif.url }, caption, mentions }, { quoted: m })
    }
  } catch {
    await m.reply(caption)
  }
}

// El menú se genera desde el mismo catálogo y muestra todas las acciones en
// páginas legibles: .menu rol (o .rol) y .menu rol 2 (o .rol 2).
handler.help = ['<accion> [@user]']
handler.desc = 'Reacciones y GIFs de anime. Exploralas por páginas con .menu rol o .rol.'
handler.tags = ['roleplay']
handler.menuCount = ROLEPLAY_ACTION_COUNT
handler.command = Object.keys(ACTIONS)

export default handler
