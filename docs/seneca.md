# SENECA APIs

This document describes the functions exposed by the `sensor.js` library for SENECA. Below are functions common to all sensors. Look at individual sensor documentation for specific changes if any. As of now we are not aware of any sensor specific changes

## Sensor specific documentation
- [Seneca](./seneca.md)

## Common Functions
- [SENECA APIs](#seneca-apis)
  - [`constructor(host, port, unitId = 0)` -\> `SenecaSensor`](#constructorhost-port-unitid--0---senecasensor)
    - [Parameters](#parameters)
  - [`getSnap()` -\> `Object`](#getsnap---object)
    - [Returns](#returns)

## `constructor(host, port, unitId = 0)` -> `SenecaSensor`
Creates a new `SenecaSensor` instance.

### Parameters
| Param  | Type | Description | Default |
| -- | -- | -- | -- |
| host | `string` | Hostname or IP address of the sensor. | |
| port | `number` | Port of the sensor. | |
| unitId | `number` | Unit ID of the sensor. | `0` |

## `getSnap()` -> `Object`
Gets a snapshot of the sensor.

### Returns
| Key | Type | Description |
| -- | -- | -- |
| success | `boolean` | `true` if the snapshot was successfully retrieved. |
| stats.sensor_specific.temperatures_c | `Array<number>` | Array of temperatures in Celsius. |
