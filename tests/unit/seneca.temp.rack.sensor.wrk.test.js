'use strict'

const { test } = require('brittle')

// Mock the base class
class MockWrkSensorRack {
  constructor (ctx) {
    this.ctx = ctx || {}
  }

  getThingType () {
    return 'sensor-rack-temp-seneca'
  }
}

// Replace the base class with our mock before requiring
require.cache[require.resolve('../../workers/lib/worker-base')] = {
  exports: MockWrkSensorRack
}

const WrkSensorRackTempSeneca = require('../../workers/seneca.temp.rack.sensor.wrk')

test('WrkSensorRackTempSeneca getThingType appends -temp-seneca', async (t) => {
  const worker = new WrkSensorRackTempSeneca({ wtype: 'test' })
  const thingType = worker.getThingType()
  t.ok(thingType.includes('-temp-seneca'), 'thing type includes -temp-seneca')
  t.ok(thingType.endsWith('-temp-seneca'), 'thing type ends with -temp-seneca')
})

test('WrkSensorRackTempSeneca extends WrkSensorRack', async (t) => {
  const worker = new WrkSensorRackTempSeneca({ wtype: 'test' })
  t.ok(worker instanceof MockWrkSensorRack, 'worker extends WrkSensorRack')
})
