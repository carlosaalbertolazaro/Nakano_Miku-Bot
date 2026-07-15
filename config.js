const config = {
  botName: 'Miku',
  botFullName: 'Nakano Miku',
  ownerName: 'Carlos',
  version: '1.0.0',
  // Prefijo de comandos. Antes aceptaba . # / ! juntos, pero '#' se cruzaba
  // con el prefijo de otro bot (Nekos Club) en grupos donde conviven los
  // dos — se dejó solo el punto. Cambialo vos mismo si querés (ej. volver a
  // /^[.#/!]/ para aceptar varios, o /^!/ para usar solo "!").
  prefix: /^\./,
  ownerNumber: ['549XXXXXXXXXX'],  // ← Cambia por tu número
  MODE: 'public',
  usePairingCode: true,
  antiSpam: {
    enabled: true,
    maxCmds: 5,
    ventanaMs: 8000,
    muteMs: 15000,
  },
  groupLink: '',  // ← Tu canal/grupo de WhatsApp, cuando lo tengas
  packname: 'Miku',
  author: 'Carlos',
  ai: {
    groqApiKey: process.env.GROQ_API_KEY || null,
  },
  aternos: {
    host: process.env.ATERNOS_SERVER_HOST || null,
    port: process.env.ATERNOS_SERVER_PORT || null,
  },
}

export default config
