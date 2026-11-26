import assert from 'node:assert/strict'
import test from 'node:test'
import config from '../config.js'
import { askAI, MODEL_FAST, SYSTEM_INSTRUCTION_LITE } from '../lib/ai.js'

test('el prompt lite no contiene la orden agresiva que provocaba rechazos', async t => {
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
  assert.ok(requests[1].messages[0].content.includes('picardía amistosa'))
})
