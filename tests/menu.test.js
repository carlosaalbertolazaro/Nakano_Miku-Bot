import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import * as caches from '../lib/caches.js'
import { plugins } from '../handler.js'
import roleplayHandler from '../plugins/P-ROLEPLAY/roleplay-actions.js'
import menuHandler, { buildRoleplayMenu } from '../plugins/P-INFO/info-menu.js'
import {
  ACTIONS,
  ROLEPLAY_ACTION_COUNT,
  ROLEPLAY_MENU_PAGES,
} from '../lib/roleplayCatalog.js'

// info-menu importa el índice del handler, cuyas cachés tienen temporizadores.
after(() => {
  for (const cache of Object.values(caches)) cache.close()
})

test('el menú detallado responde por texto sin depender del envío de imágenes', async () => {
  const sent = []
  const replies = []
  const m = {
    chat: 'test@s.whatsapp.net',
    pushName: 'Carlos',
    reply: async text => replies.push(text),
  }
  const conn = {
    botname: 'Miku',
    sendMessage: async (_chat, payload) => sent.push(payload),
  }

  await menuHandler(m, { conn, usedPrefix: '.', isOwner: false, command: 'menu', args: [], groupDb: null })

  assert.equal(sent.length, 0)
  assert.equal(replies.length, 1)
  assert.match(replies[0], /^\*┏━━•❈ 🤖 Miku ❈•━━┓\*/)
  assert.ok(replies[0].includes('*『 📊 ESTADÍSTICAS 』*'))
  assert.ok(replies[0].includes('*Creador:*'))
  assert.ok(replies[0].includes('*Activo:*'))
  assert.ok(replies[0].includes('*『 📁 CATEGORÍAS 』*'))
})

test('las categorías conservan su diseño y también responden sin imágenes', async t => {
  plugins['test/info.js'] = {
    help: ['ping'],
    desc: 'Comprobar la latencia del bot.',
    tags: ['info'],
    command: ['ping'],
  }
  t.after(() => { delete plugins['test/info.js'] })
  const sent = []
  const replies = []
  const m = { chat: 'test@s.whatsapp.net', reply: async text => replies.push(text) }
  const conn = { sendMessage: async (_chat, payload) => sent.push(payload) }

  await menuHandler(m, {
    conn,
    usedPrefix: '.',
    isOwner: false,
    command: 'menu',
    args: ['info'],
    groupDb: null,
  })

  assert.equal(sent.length, 0)
  assert.equal(replies.length, 1)
  assert.ok(replies[0].includes('INFORMACIÓN'))
  assert.ok(replies[0].includes('✧ *.ping*'))
  assert.ok(replies[0].includes('Comprobar la latencia del bot.'))
})

test('el menú de roleplay muestra cada comando una sola vez, incluidos kill y bleh', () => {
  const listedCommands = ROLEPLAY_MENU_PAGES.flatMap(page => page.actions).flat()
  assert.equal(ROLEPLAY_ACTION_COUNT, 60)
  assert.equal(new Set(listedCommands).size, listedCommands.length)
  assert.deepEqual(listedCommands.sort(), Object.keys(ACTIONS).sort())
  assert.equal(ACTIONS.kill.endpoint, 'shoot')
  assert.equal(ACTIONS.matar.endpoint, 'shoot')
  assert.equal(ACTIONS.bleh.endpoint, 'bleh')

  const pages = ROLEPLAY_MENU_PAGES.map((_, index) => buildRoleplayMenu(index + 1))
  assert.ok(!pages[0].includes('*.nya*'))
  assert.ok(pages[1].includes('*.kill* / *.matar*'))
  assert.ok(pages[1].includes('▶️ *.menu rol 3*'))
  assert.ok(pages[2].includes('*.bleh* / *.lengua*'))
  assert.ok(pages[3].includes('*.nya*'))
  for (const page of pages) assert.ok(page.length < 2000)
})

test('rol sigue abriendo el listado independiente después de restaurar el menú', async t => {
  plugins['test/roleplay.js'] = roleplayHandler
  t.after(() => { delete plugins['test/roleplay.js'] })
  const replies = []
  const m = {
    chat: 'test@s.whatsapp.net',
    reply: async text => replies.push(text),
  }

  await menuHandler(m, {
    conn: { botname: 'Miku' },
    usedPrefix: '.',
    isOwner: false,
    command: 'rol',
    args: ['2'],
    groupDb: null,
  })

  assert.equal(replies.length, 1)
  assert.ok(replies[0].includes('*.kill* / *.matar*'))
})

test('kill está registrado y explica cómo elegir el destinatario', async () => {
  assert.deepEqual(roleplayHandler.command, Object.keys(ACTIONS))
  const replies = []
  const m = {
    sender: '123@s.whatsapp.net',
    mentionedJid: [],
    quoted: null,
    reply: async text => replies.push(text),
  }

  await roleplayHandler(m, { conn: {}, command: 'kill', usedPrefix: '.' })

  assert.equal(replies.length, 1)
  assert.match(replies[0], /Mencioná a alguien o respondé a su mensaje/)
  assert.match(replies[0], /\.kill @usuario/)
})
