'use strict'

const { testExecutor, getDefaultConf } = require('miningos-tpl-wrk-sensor/tests/sensor.test')
const TempSensor = require('../workers/lib/sensor')
const ModbusFacility = require('svc-facs-modbus')

let mock

const conf = getDefaultConf()
if (!conf.settings.live) {
  conf.settings.host = '127.0.0.1'
  const srv = require('../mock/server')
  mock = srv.createServer({
    host: conf.settings.host,
    port: conf.settings.port,
    type: 'Seneca'
  })
}

const fac = new ModbusFacility({ ctx: { env: 'test', root: '.' } }, {}, { env: 'test', root: '.' })
const sensor = new TempSensor({
  address: conf.settings.host,
  port: conf.settings.port,
  unitId: 1,
  register: 3,
  getClient: fac.getClient.bind(fac)
})

conf.cleanup = () => {
  if (mock) {
    mock.cleanup()
    mock.server.close()
  }
  sensor.close()
}

async function execute () {
  testExecutor(sensor, conf)
}

execute()
