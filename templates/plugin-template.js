// Plantilla para un plugin nuevo de Miku.
//
// IMPORTANTE: este archivo vive en templates/, NO en plugins/. El loader de
// handler.js carga recursivamente TODO archivo .js dentro de plugins/ (con
// hot-reload vía fs.watch), así que si copiás esta plantilla, pegala dentro
// de la carpeta de categoría correspondiente en plugins/P-<CATEGORIA>/ con
// un nombre de archivo descriptivo (ej. plugins/P-ECONOMIA/economia-daily.js).
//
// Convención de carpetas: plugins/P-<CATEGORIA>/ (mayúsculas, en español),
// ej. P-ECONOMIA, P-ANIME, P-IA, P-ATERNOS, P-STICKERS, P-TRIVIA.
// handler.tags[0] (en minúsculas) debe coincidir con el sufijo de la carpeta,
// porque ese tag es la clave que usa handler.js para habilitar/deshabilitar
// la categoría entera por grupo (groupDb.disabledCategories).

const handler = async (m, ctx) => {
  // ctx = { conn, args, text, command, usedPrefix, participants, groupMetadata,
  //         groupDb, isOwner, isAdmin, isBotAdmin, config }
  //
  // m = mensaje serializado, con helpers: m.reply(), m.replyImg(), m.replyVideo(),
  //     m.replyAudio(), m.replyDoc(), m.replySticker(), m.react(), m.edit(),
  //     m.delete(), m.sendPoll(), m.sendAlbum(), m.download(), m.quoted (si aplica)

  await m.reply(`Hola, ejecutaste el comando *${ctx.command}*.`)
}

// --- Propiedades estáticas ---
handler.help = ['micomando <args>']       // string o array — sin esto, el plugin no aparece en .menu
handler.command = ['micomando', 'alias']  // string, array, o RegExp
handler.tags = ['categoria']              // primer elemento = categoría del menú y clave de disable/enable

// --- Flags opcionales ---
// handler.groupOnly = true       // solo funciona en grupos
// handler.adminOnly = true       // solo admins del grupo
// handler.botAdminOnly = true    // requiere que el bot sea admin
// handler.ownerOnly = true       // solo el owner del bot
// handler.expectedArgs = '{p}{cmd} <arg>'  // mensaje de uso si faltan args
// handler.alwaysBefore = true    // hace que .before corra en TODO mensaje, no solo en el comando (ej. antilink)

// --- Hooks opcionales ---
// handler.before = async (m, ctx) => { /* return truthy para abortar antes de execute */ }
// handler.after  = async (m, ctx) => { /* corre después de execute */ }
// handler.all    = async (m, ctx) => { /* corre en CADA mensaje/respuesta de botón, de TODOS los plugins */ }

export default handler
