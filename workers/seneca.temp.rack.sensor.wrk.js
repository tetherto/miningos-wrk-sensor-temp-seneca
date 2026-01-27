'use strict'

const WrkSensorRack = require('./lib/worker-base.js')

class WrkSensorRackTempSeneca extends WrkSensorRack {
  getThingType () {
    return super.getThingType() + '-temp-seneca'
  }
}

module.exports = WrkSensorRackTempSeneca
