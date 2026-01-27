'use strict'

const { test } = require('brittle')
const SenecaSensor = require('../../workers/lib/sensor')
const { FUNCTION_CODES, PROTOCOL } = require('svc-facs-modbus/lib/constants')

test('SenecaSensor constructor throws error when getClient is not provided', async (t) => {
  t.exception(() => {
    const sensor = new SenecaSensor({
      address: '127.0.0.1',
      port: 502,
      unitId: 1,
      register: 3
    })
    return sensor
  }, 'ERR_NO_CLIENT')
})

test('SenecaSensor constructor creates instance with valid options', async (t) => {
  const mockGetClient = (opts) => {
    t.ok(opts.address === '127.0.0.1', 'address is passed correctly')
    t.ok(opts.port === 502, 'port is passed correctly')
    t.ok(opts.unitId === 1, 'unitId is passed correctly')
    t.ok(opts.protocol === PROTOCOL.TCP, 'protocol is TCP')
    return {
      end: () => {},
      read: () => Promise.resolve(Buffer.from([0x01, 0x2C])) // 300 = 30.0°C
    }
  }

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    getClient: mockGetClient
  })

  t.ok(sensor, 'sensor instance created')
  t.ok(sensor.client, 'client is set')
})

test('SenecaSensor close() calls client.end()', async (t) => {
  let endCalled = false
  const mockClient = {
    end: () => {
      endCalled = true
    },
    read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
  }

  const mockGetClient = () => mockClient

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    getClient: mockGetClient
  })

  sensor.close()
  t.ok(endCalled, 'client.end() was called')
})

test('SenecaSensor _prepErrors detects sensor error (850.0)', async (t) => {
  const mockGetClient = () => ({
    end: () => {},
    read: () => Promise.resolve(Buffer.from([0x03, 0x3A])) // 850 = 85.0°C
  })

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    getClient: mockGetClient
  })

  const result = sensor._prepErrors(850.0)
  t.ok(result.isErrored, 'error is detected')
  t.ok(result.errors.length > 0, 'errors array has items')
  t.ok(result.errors[0].name === 'sensor_error', 'error name is correct')
})

test('SenecaSensor _prepErrors does not detect error for normal values', async (t) => {
  const mockGetClient = () => ({
    end: () => {},
    read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
  })

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    getClient: mockGetClient
  })

  const result = sensor._prepErrors(30.0)
  t.ok(!result.isErrored, 'no error detected for normal value')
  t.ok(result.errors.length === 0, 'errors array is empty')
})

test('SenecaSensor _getTempValue reads temperature and caches it', async (t) => {
  const tempBuffer = Buffer.from([0x01, 0x2C]) // 300 = 30.0°C
  let readCalled = false

  const mockClient = {
    end: () => {},
    read: (funcCode, register) => {
      readCalled = true
      t.ok(funcCode === FUNCTION_CODES.READ_HOLDING_REGISTERS, 'correct function code')
      t.ok(register === 3, 'correct register')
      return Promise.resolve(tempBuffer)
    }
  }

  const mockGetClient = () => mockClient

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    timeout: 1000,
    getClient: mockGetClient
  })

  const temp = await sensor._getTempValue()
  t.ok(readCalled, 'client.read was called')
  t.ok(temp === 30.0, 'temperature is correctly parsed (300 / 10 = 30.0)')
  t.ok(sensor.cache === 30.0, 'temperature is cached')
})

test('SenecaSensor _getTempValue throws error when no value returned', async (t) => {
  const mockClient = {
    end: () => {},
    read: () => Promise.resolve(null)
  }

  const mockGetClient = () => mockClient

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    timeout: 1000,
    getClient: mockGetClient
  })

  await t.exception(async () => {
    await sensor._getTempValue()
  }, 'ERR_NO_VALUE')
})

test('SenecaSensor _prepSnap returns correct snapshot structure', async (t) => {
  const tempBuffer = Buffer.from([0x01, 0x2C]) // 300 = 30.0°C

  const mockClient = {
    end: () => {},
    read: () => Promise.resolve(tempBuffer)
  }

  const mockGetClient = () => mockClient

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    timeout: 1000,
    getClient: mockGetClient
  })

  const snap = await sensor._prepSnap()
  t.ok(snap.stats, 'snapshot has stats')
  t.ok(snap.stats.status === 'ok', 'status is ok')
  t.ok(snap.stats.temp_c === 30.0, 'temperature is correct')
  t.ok(snap.stats.errors === undefined, 'no errors for normal value')
  t.ok(snap.config, 'snapshot has config')
})

test('SenecaSensor _prepSnap returns error status when sensor error detected', async (t) => {
  const mockClient = {
    end: () => {},
    read: () => Promise.resolve(Buffer.from([0x03, 0x3A])) // 850 = 85.0°C
  }

  const mockGetClient = () => mockClient

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    timeout: 1000,
    getClient: mockGetClient
  })

  // Set cache to error value
  sensor.cache = 850.0

  const snap = await sensor._prepSnap(true) // readFromCache = true
  t.ok(snap.stats.status === 'error', 'status is error')
  t.ok(snap.stats.errors, 'errors are present')
  t.ok(snap.stats.errors.length > 0, 'errors array has items')
  t.ok(snap.stats.errors[0].name === 'sensor_error', 'error name is correct')
})

test('SenecaSensor _prepSnap uses cache when readFromCache is true', async (t) => {
  const mockClient = {
    end: () => {},
    read: () => Promise.resolve(Buffer.from([0x01, 0x2C]))
  }

  const mockGetClient = () => mockClient

  const sensor = new SenecaSensor({
    address: '127.0.0.1',
    port: 502,
    unitId: 1,
    register: 3,
    timeout: 1000,
    getClient: mockGetClient
  })

  sensor.cache = 25.5

  const snap = await sensor._prepSnap(true) // readFromCache = true
  t.ok(snap.stats.temp_c === 25.5, 'uses cached value')
})
