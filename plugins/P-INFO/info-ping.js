const handler = async (m) => {
  const inicio = Date.now()
  const sent = await m.reply(`*『 🏓 』Ping...*`)
  const ms = Date.now() - inicio

  if (sent?.key) {
    await m.edit(`*『 🏓 』PONG*\n> Velocidad: *${ms}ms*`, sent.key)
  }
}

handler.help = ['ping']
handler.desc = 'Medir el tiempo de respuesta del bot.'
handler.tags = ['tools']
handler.command = ['ping', 'p']

export default handler
