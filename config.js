const config = {
  botName: 'Miku',
  botFullName: 'Nakano Miku',
  ownerName: 'Carlos',
  version: '1.0.0',
  prefix: /^[.#/!]/,
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
