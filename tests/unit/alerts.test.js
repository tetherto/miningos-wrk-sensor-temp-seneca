'use strict'

const { test } = require('brittle')
const libUtils = require('miningos-tpl-wrk-thing/workers/lib/utils')

libUtils.isValidSnap = (snap) => {
  return snap?.stats?.temp_c != null
}

libUtils.isOffline = (snap) => {
  return false // Assume online for tests
}

const alerts = require('../../workers/lib/alerts')

test('alerts module exports libAlerts with sensor specs', async (t) => {
  t.ok(alerts, 'alerts module exists')
  t.ok(alerts.specs, 'alerts has specs')
  t.ok(alerts.specs.sensor, 'alerts has sensor specs')
})

test('cabinet_temp_high valid returns true for valid cabinet sensor', async (t) => {
  const ctx = {
    info: { pos: 'rack-0_lv-1' },
    conf: {
      cabinet_temp_high: {
        params: { temp: 60 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 30.0
    },
    timestamp: Date.now()
  }

  const isValid = alerts.specs.sensor.cabinet_temp_high.valid(ctx, snap)
  t.ok(isValid, 'valid returns true for valid cabinet sensor')
})

test('cabinet_temp_high valid returns false for transformer sensor', async (t) => {
  const ctx = {
    info: { pos: 'rack-0_tr-1' },
    conf: {
      cabinet_temp_high: {
        params: { temp: 60 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 30.0
    },
    timestamp: Date.now()
  }

  const isValid = alerts.specs.sensor.cabinet_temp_high.valid(ctx, snap)
  t.ok(!isValid, 'valid returns false for transformer sensor')
})

test('cabinet_temp_high valid returns false when temp >= 850', async (t) => {
  const ctx = {
    info: { pos: 'rack-0_lv-1' },
    conf: {
      cabinet_temp_high: {
        params: { temp: 60 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 850.0
    },
    timestamp: Date.now()
  }

  const isValid = alerts.specs.sensor.cabinet_temp_high.valid(ctx, snap)
  t.ok(!isValid, 'valid returns false when temp >= 850')
})

test('cabinet_temp_high probe returns true when temp exceeds threshold', async (t) => {
  const ctx = {
    conf: {
      cabinet_temp_high: {
        params: { temp: 60 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 65.0
    }
  }

  const shouldAlert = alerts.specs.sensor.cabinet_temp_high.probe(ctx, snap)
  t.ok(shouldAlert, 'probe returns true when temp exceeds threshold')
})

test('cabinet_temp_high probe returns false when temp below threshold', async (t) => {
  const ctx = {
    conf: {
      cabinet_temp_high: {
        params: { temp: 60 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 55.0
    }
  }

  const shouldAlert = alerts.specs.sensor.cabinet_temp_high.probe(ctx, snap)
  t.ok(!shouldAlert, 'probe returns false when temp below threshold')
})

test('cabinet_temp_alert valid returns true for valid cabinet sensor', async (t) => {
  const ctx = {
    info: { pos: 'rack-0_lv-2' },
    conf: {
      cabinet_temp_alert: {
        params: { temp: 70 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 30.0
    },
    timestamp: Date.now()
  }

  const isValid = alerts.specs.sensor.cabinet_temp_alert.valid(ctx, snap)
  t.ok(isValid, 'valid returns true for valid cabinet sensor')
})

test('cabinet_temp_alert probe returns true when temp exceeds threshold', async (t) => {
  const ctx = {
    conf: {
      cabinet_temp_alert: {
        params: { temp: 70 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 75.0
    }
  }

  const shouldAlert = alerts.specs.sensor.cabinet_temp_alert.probe(ctx, snap)
  t.ok(shouldAlert, 'probe returns true when temp exceeds threshold')
})

test('oil_temp_high valid returns true for valid transformer sensor', async (t) => {
  const ctx = {
    info: { pos: 'rack-0_tr-1' },
    conf: {
      oil_temp_high: {
        params: { temp: 80 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 30.0
    },
    timestamp: Date.now()
  }

  const isValid = alerts.specs.sensor.oil_temp_high.valid(ctx, snap)
  t.ok(isValid, 'valid returns true for valid transformer sensor')
})

test('oil_temp_high valid returns false for cabinet sensor', async (t) => {
  const ctx = {
    info: { pos: 'rack-0_lv-1' },
    conf: {
      oil_temp_high: {
        params: { temp: 80 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 30.0
    },
    timestamp: Date.now()
  }

  const isValid = alerts.specs.sensor.oil_temp_high.valid(ctx, snap)
  t.ok(!isValid, 'valid returns false for cabinet sensor')
})

test('oil_temp_high probe returns true when temp exceeds threshold', async (t) => {
  const ctx = {
    conf: {
      oil_temp_high: {
        params: { temp: 80 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 85.0
    }
  }

  const shouldAlert = alerts.specs.sensor.oil_temp_high.probe(ctx, snap)
  t.ok(shouldAlert, 'probe returns true when temp exceeds threshold')
})

test('oil_temp_critical valid returns true for valid transformer sensor', async (t) => {
  const ctx = {
    info: { pos: 'rack-0_tr-2' },
    conf: {
      oil_temp_critical: {
        params: { temp: 90 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 30.0
    },
    timestamp: Date.now()
  }

  const isValid = alerts.specs.sensor.oil_temp_critical.valid(ctx, snap)
  t.ok(isValid, 'valid returns true for valid transformer sensor')
})

test('oil_temp_critical probe returns true when temp exceeds threshold', async (t) => {
  const ctx = {
    conf: {
      oil_temp_critical: {
        params: { temp: 90 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 95.0
    }
  }

  const shouldAlert = alerts.specs.sensor.oil_temp_critical.probe(ctx, snap)
  t.ok(shouldAlert, 'probe returns true when temp exceeds threshold')
})

test('oil_temp_critical probe returns false when temp below threshold', async (t) => {
  const ctx = {
    conf: {
      oil_temp_critical: {
        params: { temp: 90 }
      }
    }
  }
  const snap = {
    stats: {
      temp_c: 85.0
    }
  }

  const shouldAlert = alerts.specs.sensor.oil_temp_critical.probe(ctx, snap)
  t.ok(!shouldAlert, 'probe returns false when temp below threshold')
})
