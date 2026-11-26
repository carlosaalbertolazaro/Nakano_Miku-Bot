import assert from 'node:assert/strict'
import test from 'node:test'
import config from '../config.js'
import { askAI, MODEL_FAST, SYSTEM_INSTRUCTION_LITE } from '../lib/ai.js'

test('los prompts mantienen una personalidad gastadora sin caer en tono motivacional', async t => {
  const originalFetch = globalThis.fetch
  const originalKeys = { ...config.ai }
  const requests = []
  t.after(() => {
    globalThis.fetch = originalFetch
    config.ai = originalKeys
  })

  config.ai.groqApiKey = 'prueba-local-sin-red'
  config.ai.geminiApiKey = null
  config.ai.nvidiaApiKey = null
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body))
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Respuesta de prueba' } }] }),
    }
  }

  const fullResponse = await askAI('Hola')
  const liteResponse = await askAI('Jaja, qué mala sos', [], MODEL_FAST, 100, SYSTEM_INSTRUCTION_LITE)
  assert.equal(fullResponse, 'Respuesta de prueba')
  assert.equal(liteResponse, 'Respuesta de prueba')
  assert.equal(requests.length, 2)

  for (const request of requests) {
    const systemPrompt = request.messages[0].content
    assert.ok(!systemPrompt.includes('MANDALO A LA MIERDA'))
    assert.ok(!systemPrompt.includes('insultá de vuelta'))
  }
  assert.ok(requests[1].messages[0].content.includes('insolente'))
  assert.ok(!requests[1].messages[0].content.includes('picardía amistosa'))
})

test('reintenta rechazos genéricos y respuestas empalagosas antes de mostrarlas', async t => {
  const originalFetch = globalThis.fetch
  const originalKeys = { ...config.ai }
  const requests = []
  const responses = [
    'Lo siento, pero no puedo seguir con ese tipo de comentarios.',
    'Jaja, qué payaso. Igual me hiciste reír.',
    '¡Bienvenido al club de los corazones anime! 💖✨ Hablemos sin malos rollos 🌈',
    'Jaja, mirá vos. Seguí así y te cobro entrada al show.',
  ]
  t.after(() => {
    globalThis.fetch = originalFetch
    config.ai = originalKeys
  })

  config.ai.groqApiKey = 'prueba-local-sin-red'
  config.ai.geminiApiKey = null
  config.ai.nvidiaApiKey = null
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body))
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: responses.shift() } }] }),
    }
  }

  assert.equal(await askAI('jajaja'), 'Jaja, qué payaso. Igual me hiciste reír.')
  assert.equal(await askAI('jajaja'), 'Jaja, mirá vos. Seguí así y te cobro entrada al show.')
  assert.equal(requests.length, 4)
  assert.match(requests[1].messages.at(-1).content, /Tu respuesta anterior fue una fórmula de asistente/)
  assert.match(requests[3].messages.at(-1).content, /Tu respuesta anterior fue una fórmula de asistente/)
})

test('un rechazo repetido en Groq permite usar el respaldo de Gemini', async t => {
  const originalFetch = globalThis.fetch
  const originalKeys = { ...config.ai }
  const urls = []
  t.after(() => {
    globalThis.fetch = originalFetch
    config.ai = originalKeys
  })

  config.ai.groqApiKey = 'prueba-local-sin-red'
  config.ai.geminiApiKey = 'prueba-local-sin-red'
  config.ai.nvidiaApiKey = null
  globalThis.fetch = async url => {
    urls.push(url)
    if (url.includes('groq.com')) {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Lo siento, pero no puedo ayudar con eso.' } }] }),
      }
    }
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Jaja, qué drama. Contame quién te hizo eso.' }] } }] }),
    }
  }

  const response = await askAI('jajaja')
  assert.equal(response, 'Jaja, qué drama. Contame quién te hizo eso.')
  assert.equal(urls.filter(url => url.includes('groq.com')).length, 2)
  assert.equal(urls.filter(url => url.includes('googleapis.com')).length, 1)
})
