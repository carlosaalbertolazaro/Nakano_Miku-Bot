// Ruleta rusa clásica de Discord: 1/6 de probabilidad de "perder". WhatsApp
// no tiene forma de silenciar a un solo usuario (a diferencia de Discord),
// así que la única consecuencia posible es expulsar — por eso este comando
// SOLO se apunta a quien lo ejecuta (nunca a otra persona sin su permiso) y
// necesita que el bot sea admin para poder aplicar la consecuencia.
const handler = async (m, { conn }) => {
  await m.reply(`*『 🔫 』Girando el tambor...*`)

  const perdiste = Math.floor(Math.random() * 6) === 0

  if (!perdiste) {
    return m.reply(`*『 😮‍💨 』¡Click! Vacío.*\n> Sobreviviste esta vez. Probá suerte de nuevo cuando quieras.`)
  }

  try {
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    await conn.sendMessage(m.chat, {
      text: `*『 💥 』¡BANG!*\n> @${m.sender.split('@')[0]} perdió la ruleta rusa y fue expulsado del grupo.`,
      mentions: [m.sender]
    })
  } catch {
    await m.reply(`*『 💥 』¡BANG!*\n> Perdiste... pero no te pude expulsar (¿soy admin del grupo?). Salvado por técnicos.`)
  }
}

handler.help = ['ruletarusa']
handler.desc = 'Jugate 1/6 de ser expulsado del grupo. Solo te podés apuntar a vos mismo.'
handler.tags = ['juegos']
handler.command = ['ruletarusa', 'rusa']
handler.groupOnly = true

export default handler
