import { jidNormalizedUser } from '@whiskeysockets/baileys'
import { fetchImageBuffer } from '../../lib/sendImageSafe.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
    let who
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null
    } else {
        who = m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.chat
    }

    if (!who) return m.reply(`*『 📸 』USO CORRECTO*\n> Etiquetá a alguien, respondé a su mensaje o escribí su número.\n> Ejemplos:\n> *${usedPrefix + command} @user*\n> *${usedPrefix + command} 54911...*`)

    const user = jidNormalizedUser(who)
    const name = `@${user.split('@')[0]}`

    try {
        const pp = await conn.profilePictureUrl(user, 'image')
        const buffer = await fetchImageBuffer(pp)
        if (!buffer) throw new Error('No se pudo descargar la foto a tiempo.')
        await conn.sendMessage(m.chat, {
            image: buffer,
            caption: `*『 ✨ 』FOTO EN ALTA RESOLUCIÓN*\n> Aquí tenés la foto de ${name}`,
            mentions: [user]
        }, { quoted: m })

    } catch (e) {
        try {
            const ppPreview = await conn.profilePictureUrl(user, 'preview')
            const bufferPreview = await fetchImageBuffer(ppPreview)
            if (!bufferPreview) throw new Error('No se pudo descargar la miniatura a tiempo.')
            await conn.sendMessage(m.chat, {
                image: bufferPreview,
                caption: `*『 ⚠️ 』FOTO MINIATURA*\n> No pude obtener la imagen original por privacidad, pero aquí tenés la de miniatura para ${name}`,
                mentions: [user]
            }, { quoted: m })
        } catch (err) {
            m.reply(`*『 ❌ 』SIN ACCESO*\n> No se pudo obtener ninguna foto. El usuario no tiene foto de perfil o tiene la privacidad máxima.`)
        }
    }
}

handler.help = ['getpp [@user]']
handler.desc = 'Ver la foto de perfil de alguien en alta resolución.'
handler.tags = ['tools']
handler.command = ['getpp', 'pfp', 'pp', 'foto']
handler.groupOnly = false

export default handler