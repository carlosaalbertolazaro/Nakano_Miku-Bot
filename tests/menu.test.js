import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import * as caches from '../lib/caches.js'
import roleplayHandler from '../plugins/P-ROLEPLAY/roleplay-actions.js'
import {
  buildCategoryMenu,
  buildMainMenu,
  buildRoleplayMenu,
  MAX_IMAGE_CAPTION_LENGTH,
} from '../plugins/P-INFO/info-menu.js'
import {
  ACTIONS,
  ROLEPLAY_ACTION_COUNT,
  ROLEPLAY_MENU_PAGES,
} from '../lib/roleplayCatalog.js'

// info-menu importa el índice del handler, cuyas cachés tienen temporizadores.
// Se cierran al terminar para que `npm test` finalice sin forzar la salida.
after(() => {
  for (const cache of Object.values(caches)) cache.close()
})

test('el menú principal entra en un caption de WhatsApp y conserva todas las categorías', () => {
  const tags = [
    'info', 'group', 'descargas', 'convertidores', 'stickers', 'juegos',
    'economia', 'perfiles', 'casino', 'anime', 'pokemon', 'cartas',
    'roleplay', 'ia', 'tools', 'otros',
  ]
  const text = buildMainMenu({
    conteos: Object.fromEntries(tags.map(tag => [tag, 99])),
    total: 1584,
    ordenFinal: tags,
    nombreUsuario: 'Un usuario con un nombre bastante largo',
    currentBotName: 'Nakano Miku Bot',
    prefix: '.',
    uptime: '999d 23h 59m 59s',
  })

  assert.ok(text.length <= MAX_IMAGE_CAPTION_LENGTH, `Caption de ${text.length} caracteres`)
  assert.ok(text.includes('*.menu rol*'))
  assert.ok(text.includes('*.menu grupos*'))
  assert.equal((text.match(/▸/g) || []).length, tags.length)
})

test('las categorías largas se dividen en páginas y acortan descripciones', () => {
  const comandos = Array.from({ length: 23 }, (_, index) => ({
    cmd: `comando${index}`,
    desc: 'Descripción muy larga. '.repeat(12),
  }))
  const first = buildCategoryMenu({ tag: 'juegos', comandos, page: 1 })
  const last = buildCategoryMenu({ tag: 'juegos', comandos, page: 3 })

  assert.ok(first.includes('1/3'))
  assert.ok(first.includes('*.comando0*'))
  assert.ok(first.includes('*.comando9*'))
  assert.ok(!first.includes('*.comando10*'))
  assert.ok(first.includes('▶️ *.menu juegos 2*'))
  assert.ok(last.includes('3/3'))
  assert.ok(last.includes('*.comando20*'))
  assert.ok(last.includes('*.comando22*'))
  assert.ok(last.includes('…'))
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
