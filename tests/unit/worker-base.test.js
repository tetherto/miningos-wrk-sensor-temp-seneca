'use strict'

const { test } = require('brittle')
const SenecaSensor = require('../../workers/lib/sensor')

// Mock the base class
class MockWrkRack {
  constructor (ctx) {
    this.ctx = ctx || {}
    this.initFacs = []
    this.modbus_0 = {
      getClient: () => ({
        end: () => {},
        read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
      })
    }
    this.conf = {
      thing: {
        sensor: {}
      }
    }
  }

  init () {
    // Mock implementation
  }

  getThingType () {
    return 'sensor-rack'
  }

  setInitFacs (facs) {
    this.initFacs = facs
  }

  debugThingError (thg, e) {
    // Mock implementation
  }

  async disconnectThing (thg) {
    // Mock implementation
  }
}

// Clear cache and replace the base class with our mock before requiring worker-base
delete require.cache[require.resolve('miningos-tpl-wrk-sensor/workers/rack.sensor.wrk')]
delete require.cache[require.resolve('../../workers/lib/worker-base')]
require.cache[require.resolve('miningos-tpl-wrk-sensor/workers/rack.sensor.wrk')] = {
  exports: MockWrkRack
}

const WrkSensorRack = require('../../workers/lib/worker-base')

test('WrkSensorRack init calls super.init and sets initFacs', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  if (typeof worker.init === 'function') {
    worker.init()
    t.ok(worker.initFacs.length === 1, 'initFacs was set')
    t.ok(worker.initFacs[0][1] === 'svc-facs-modbus', 'modbus facility is configured')
  } else {
    t.skip('init method not available in test environment')
  }
})

test('WrkSensorRack getThingType appends -temp-seneca', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  const thingType = worker.getThingType()
  t.ok(thingType.includes('-temp-seneca'), 'thing type includes -temp-seneca')
})

test('WrkSensorRack getThingTags returns correct tags', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  const tags = worker.getThingTags()
  t.ok(Array.isArray(tags), 'tags is an array')
  t.ok(tags.includes('temp'), 'tags includes temp')
  t.ok(tags.includes('seneca'), 'tags includes seneca')
})

test('WrkSensorRack getSpecTags returns sensor', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  const specTags = worker.getSpecTags()
  t.ok(Array.isArray(specTags), 'specTags is an array')
  t.ok(specTags.includes('sensor'), 'specTags includes sensor')
})

test('WrkSensorRack collectThingSnap calls thg.ctrl.getSnap', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  let getSnapCalled = false
  const mockSnap = { stats: { temp_c: 30.0 } }

  const thg = {
    ctrl: {
      getSnap: async () => {
        getSnapCalled = true
        return mockSnap
      }
    }
  }

  const snap = await worker.collectThingSnap(thg)
  t.ok(getSnapCalled, 'getSnap was called')
  t.ok(snap === mockSnap, 'returns snapshot from ctrl')
})

test('WrkSensorRack selectThingInfo returns correct info', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  const thg = {
    opts: {
      address: '127.0.0.1',
      port: 502,
      unitId: 1,
      register: 3
    }
  }

  const info = worker.selectThingInfo(thg)
  t.ok(info.address === '127.0.0.1', 'address is correct')
  t.ok(info.port === 502, 'port is correct')
  t.ok(info.unitId === 1, 'unitId is correct')
})

test('WrkSensorRack selectThingInfo handles missing opts', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  const thg = {}

  const info = worker.selectThingInfo(thg)
  t.ok(info.address === undefined, 'address is undefined when opts missing')
  t.ok(info.port === undefined, 'port is undefined when opts missing')
  t.ok(info.unitId === undefined, 'unitId is undefined when opts missing')
})

test('WrkSensorRack connectThing returns 0 when address missing', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  worker.modbus_0 = {
    getClient: () => ({
      end: () => {},
      read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
    })
  }
  worker.conf = { thing: { sensor: {} } }

  const thg = {
    opts: {
      port: 502,
      unitId: 1,
      register: 3
    }
  }

  const result = await worker.connectThing(thg)
  t.ok(result === 0, 'returns 0 when address missing')
})

test('WrkSensorRack connectThing returns 0 when port missing', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  worker.modbus_0 = {
    getClient: () => ({
      end: () => {},
      read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
    })
  }
  worker.conf = { thing: { sensor: {} } }

  const thg = {
    opts: {
      address: '127.0.0.1',
      unitId: 1,
      register: 3
    }
  }

  const result = await worker.connectThing(thg)
  t.ok(result === 0, 'returns 0 when port missing')
})

test('WrkSensorRack connectThing returns 0 when unitId missing', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  worker.modbus_0 = {
    getClient: () => ({
      end: () => {},
      read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
    })
  }
  worker.conf = { thing: { sensor: {} } }

  const thg = {
    opts: {
      address: '127.0.0.1',
      port: 502,
      register: 3
    }
  }

  const result = await worker.connectThing(thg)
  t.ok(result === 0, 'returns 0 when unitId missing')
})

test('WrkSensorRack connectThing returns 0 when register missing', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  worker.modbus_0 = {
    getClient: () => ({
      end: () => {},
      read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
    })
  }
  worker.conf = { thing: { sensor: {} } }

  const thg = {
    opts: {
      address: '127.0.0.1',
      port: 502,
      unitId: 1
    }
  }

  const result = await worker.connectThing(thg)
  t.ok(result === 0, 'returns 0 when register missing')
})

test('WrkSensorRack connectThing creates sensor and returns 1', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  let getClientCalled = false

  worker.modbus_0 = {
    getClient: (opts) => {
      getClientCalled = true
      t.ok(opts.address === '127.0.0.1', 'getClient called with address')
      t.ok(opts.port === 502, 'getClient called with port')
      t.ok(opts.unitId === 1, 'getClient called with unitId')
      return {
        end: () => {},
        read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
      }
    }
  }
  worker.conf = { thing: { sensor: {} } }
  worker.debugThingError = () => {}
  worker.disconnectThing = async () => {}

  const thg = {
    opts: {
      address: '127.0.0.1',
      port: 502,
      unitId: 1,
      register: 3
    }
  }

  const result = await worker.connectThing(thg)
  t.ok(getClientCalled, 'getClient was called')
  t.ok(result === 1, 'returns 1 on success')
  t.ok(thg.ctrl instanceof SenecaSensor, 'sensor instance was created')
})

test('WrkSensorRack connectThing sets up error handler', async (t) => {
  const worker = new WrkSensorRack({ wtype: 'test' })
  let errorHandlerCalled = false
  let disconnectCalled = false

  worker.modbus_0 = {
    getClient: () => ({
      end: () => {},
      read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
    })
  }
  worker.conf = { thing: { sensor: {} } }
  worker.debugThingError = (thg, e) => {
    errorHandlerCalled = true
  }
  worker.disconnectThing = async (thg) => {
    disconnectCalled = true
  }

  const thg = {
    opts: {
      address: '127.0.0.1',
      port: 502,
      unitId: 1,
      register: 3
    }
  }

  await worker.connectThing(thg)
  t.ok(thg.ctrl, 'sensor was created')

  // Trigger error event
  thg.ctrl.emit('error', new Error('test error'))

  // Wait a bit for async handlers
  await new Promise(resolve => setTimeout(resolve, 10))

  t.ok(errorHandlerCalled, 'error handler was called')
  t.ok(disconnectCalled, 'disconnectThing was called')
})
