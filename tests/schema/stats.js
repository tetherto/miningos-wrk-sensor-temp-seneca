'use strict'

module.exports = (v) => {
  v.stats_validate.schema = {
    stats: {
      type: 'object',
      children: {
        status: { type: 'string' },
        temp_c: { type: 'number' },
        errors: { type: 'array', optional: true }
      }
    }
  }
}
