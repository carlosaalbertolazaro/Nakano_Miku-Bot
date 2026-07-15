import { translateText } from '../../lib/translate.js'

const IDIOMAS = {
  es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés', de: 'Alemán',
  it: 'Italiano', ja: 'Japonés', ko: 'Coreano', zh: 'Chino', ru: 'Ruso', ar: 'Árabe',
}

const handler = async (m, { args, text, usedPrefix, command }) => {
  const idioma = (args[0] || '').toLowerCase()
  if (!idioma || !/^[a-z]{2}$/.test(idioma)) {
    return m.reply(
      `*『 🌐 』TRADUCTOR*\n` +
      `> *Uso:* ${usedPrefix}${command} <idioma> <texto>\n` +
      `> También podés responder a un mensaje: ${usedPrefix}${command} <idioma>\n\n` +
      `> *Idiomas:* ${Object.entries(IDIOMAS).map(([c, n]) => `${c} (${n})`).join(', ')}\n` +
      `> _(también acepta cualquier otro código de 2 letras soportado por Google Translate)_`
    )
  }

  const textoAtraducir = args.slice(1).join(' ') || m.quoted?.body
  if (!textoAtraducir) {
    return m.reply(`*『 ⚠️ 』FALTA TEXTO*\n> Escribí el texto después del idioma, o respondé a un mensaje.`)
  }

  try {
    const { text: traducido, detectedLang } = await translateText(textoAtraducir, idioma)
    await m.reply(
      `*『 🌐 』TRADUCCIÓN*\n` +
      `> ${detectedLang} → ${idioma}\n\n` +
      `> ${traducido}`
    )
  } catch (e) {
    await m.reply(`*『 ❌ 』ERROR*\n> No se pudo traducir ahora mismo. Probá de nuevo en un rato.\n> _${e.message}_`)
  }
}

handler.help = ['translate <idioma> <texto|responder a un mensaje>']
handler.desc = 'Traducir texto a cualquier idioma (ej: .translate en Hola como estas).'
handler.tags = ['tools']
handler.command = ['translate', 'traducir', 'tr']

export default handler
