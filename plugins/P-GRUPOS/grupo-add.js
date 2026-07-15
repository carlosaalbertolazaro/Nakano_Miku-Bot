import * as baileysMod from '@whiskeysockets/baileys'

const pkg = baileysMod.default && Object.keys(baileysMod).length === 1 ? baileysMod.default : baileysMod
const { jidNormalizedUser } = pkg

const handler = async (m, { conn, text, usedPrefix, participants }) => {
  let num = text ? text.replace(/[^0-9]/g, '') : ''
  
  if (!num) {
    return m.reply(`*『 ⚠️ 』NÚMERO REQUERIDO.*\n> Ingresá el número del usuario a agregar.\n> Ejemplo: *${usedPrefix}add 5491112345678*`)
  }
  if (num.startsWith('54') && num[2] !== '9') {
    num = '549' + num.slice(2)
  }
  if (num.startsWith('52') && num[2] !== '1') {
    num = '521' + num.slice(2)
  }
  const targetJid = jidNormalizedUser(`${num}@s.whatsapp.net`)
  const targetNum = targetJid.split('@')[0]
  const senderNum = m.sender.split('@')[0]

  const isAlreadyHere = participants.some(p => 
    jidNormalizedUser(p.id) === targetJid || (p.lid && jidNormalizedUser(p.lid) === targetJid)
  )
  
  if (isAlreadyHere) {
    return m.reply(`*『 ℹ️ 』YA EN EL GRUPO.*\n> Ese usuario ya es miembro del grupo.`)
  }

  try {
    const res = await conn.groupParticipantsUpdate(m.chat, [targetJid], 'add')
    
    let status = 200
    if (Array.isArray(res) && res.length > 0) {
      status = res[0]?.status || 200
    } else if (typeof res === 'object' && res !== null) {
      status = res[targetJid] || 200
    }

    if (status == 403 || status == 401) {
      const code = await conn.groupInviteCode(m.chat)
      return m.reply(`*『 🔒 』PRIVACIDAD ACTIVADA.*\n> El usuario tiene restringido quién puede agregarlo o te tiene bloqueado.\n> Compartile este link para que entre:\n> https://chat.whatsapp.com/${code}`)
    }
    if (status == 408) {
      return m.reply(`*『 ⏳ 』ESPERA REQUERIDA.*\n> Esa persona salió del grupo recientemente. WhatsApp no permite volver a agregarla tan pronto.`)
    }
    if (status == 409) {
      return m.reply(`*『 ℹ️ 』YA EN EL GRUPO.*\n> Ese usuario ya es miembro del grupo.`)
    }

    const txt = `*『 🪂 』NUEVO INTEGRANTE.*\n▢ *Agregado:* @${targetNum}\n▢ *Por:* @${senderNum}`

    await conn.sendMessage(m.chat, { 
      text: txt, 
      mentions: [targetJid, m.sender] 
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`*『 ❌ 』ERROR.*\n> No se pudo agregar al usuario. ¿El número existe en WhatsApp?`)
  }
}

handler.help = ['agregar <numero>']
handler.desc = 'Agregar a alguien al grupo por su número.'
handler.tags = ['group']
handler.command = ['add', 'agregar', 'añadir', 'invitar']
handler.groupOnly = true
handler.adminOnly = true
handler.botAdminOnly = true
handler.noRegister = true

export default handler
