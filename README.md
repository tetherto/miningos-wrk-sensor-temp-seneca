# miningos-wrk-sensor-temp-seneca

Worker for SENECA temperature sensors in Bitcoin mining infrastructure, providing real-time temperature monitoring for mining equipment. This worker interfaces with SENECA temperature sensors using the Modbus TCP protocol. It collects temperature readings from configurable holding registers, processes the data, stores it in a distributed database (Hyperbee), and updates it to the mining network.

## Table of Contents

1. [Overview](#overview)
2. [Introduction](#introduction)
3. [Setup](#setup)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Mock Server](#mock-server)
7. [Alert System](#alert-system)

## Overview

The SENECA temperature sensor worker is part of the MiningOS mining infrastructure ecosystem. It provides:

- **Real-time temperature monitoring** via Modbus TCP protocol
- **Alert management** for critical temperature thresholds
- **Historical data collection** with configurable intervals
- **Device management** through RPC interface
- **Mock server support** for testing and development

### Use Cases

- Monitor transformer oil temperature
- Track electrical cabinet temperatures
- Oversee mining equipment thermal conditions
- Trigger alerts on temperature anomalies

## Setup

### Prerequisites

```bash
node >= 20.0
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tetherto/miningos-wrk-sensor-temp-seneca.git
cd miningos-wrk-sensor-temp-seneca
```

2. Install dependencies:
```bash
npm install
```

3. Setup configuration files:
```bash
bash setup-config.sh
```

This creates configuration files from examples:
- `config/base.thing.json` (worker settings)
- `config/common.json` (logging and debug)
- `config/facs/net.config.json` (network settings)
- `config/facs/store.config.json` (storage settings)

## Configuration

### Base Configuration

**File:** `config/base.thing.json.example`

The base configuration file controls sensor polling behavior, logging, and alert thresholds. After setup, copy this file to `config/base.thing.json` for use.

```json
{
  "collectSnapTimeoutMs": 10000,
  "collectSnapsItvMs": 10000,
  "logRotateMaxLength": 10000,
  "logKeepCount": 3,
  "alerts": {
    "sensor-temp-seneca": {
      "cabinet_temp_high": {
        "description": "LV Cabinet temperature is above 60 degrees.",
        "severity": "high",
        "params": {
          "temp": 60
        }
      },
      "cabinet_temp_alert": {
        "description": "LV Cabinet temperature is above 70 degrees.",
        "severity": "critical",
        "params": {
          "temp": 70
        }
      },
      "oil_temp_high": {
        "description": "Transformer oil temperature is above 80 degrees.",
        "severity": "high",
        "params": {
          "temp": 80
        }
      },
      "oil_temp_critical": {
        "description": "Transformer oil temperature is above 90 degrees. Transformer will trip at 95 degrees.",
        "severity": "critical",
        "params": {
          "temp": 90
        }
      },
      "sensor_error": {
        "description": "Sensor reading is faulty",
        "severity": "medium"
      }
    }
  },
  "sensor": {
    "timeout": 10000
  }
}
```

#### Core Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `collectSnapTimeoutMs` | number | 10000 | Maximum time to wait for sensor reading before timeout (10 seconds) |
| `collectSnapsItvMs` | number | 10000 | Interval for collecting sensor snapshots (10 seconds) |
| `logRotateMaxLength` | number | 10000 | Maximum number of entries before log rotation |
| `logKeepCount` | number | 3 | Number of rotated log files to retain |
| `sensor.timeout` | number | 10000 | Modbus communication timeout in milliseconds (10 seconds) |

#### Understanding Configuration Timing

The Seneca worker inherits from the thing template, which provides several timing-related configuration options. Here's how they work together:

**Collection Cycle:** Every `collectSnapsItvMs` milliseconds, the worker attempts to read all registered sensors. Each individual sensor read must complete within `collectSnapTimeoutMs` or it times out.

**Storage Behavior:** Sensor readings are stored to the database at an interval controlled by `storeSnapItvMs`, which defaults to 300000 milliseconds (5 minutes) if not specified in the configuration. This means sensors are polled every 10 seconds, but only persisted to storage every 5 minutes to reduce disk I/O.

**Real-time Data:** Despite the storage interval, the most recent reading is always cached in memory and available immediately through the `getRealtimeData()` method, which is polled every 10 seconds as defined by the sensor template's real-time data schedule.

### Alert Configuration

The alert system monitors temperature thresholds and generates notifications when limits are exceeded. Alerts are position-aware, meaning different thresholds apply based on sensor location.

#### Alert Types

| Alert Type | Applies To | Severity | Description |
|------------|-----------|----------|-------------|
| `cabinet_temp_high` | Cabinet sensors (position starts with 'lv') | high | Warning level for electrical cabinet temperature |
| `cabinet_temp_alert` | Cabinet sensors (position starts with 'lv') | critical | Critical level for electrical cabinet temperature |
| `oil_temp_high` | Transformer sensors (position starts with 'tr') | high | Warning level for transformer oil temperature |
| `oil_temp_critical` | Transformer sensors (position starts with 'tr') | critical | Critical level approaching transformer trip point |
| `sensor_error` | All sensors | medium | Sensor communication or reading failure |

#### Alert Conditions

Alerts are triggered when specific conditions are met. The alert system examines each sensor reading and applies rules based on the sensor's position property:

**Cabinet Alerts:** These alerts activate for sensors whose position information ends with a segment starting with "lv" (low voltage). For example, a position like "rack-1_row-2_lv-cabinet-3" would trigger cabinet alerts. The system checks if the temperature exceeds the configured threshold and that the reading is valid (not the error value of 850°C).

**Transformer Oil Alerts:** These alerts activate for sensors whose position ends with a segment starting with "tr" (transformer). For example, "facility-north_transformer-1_tr-oil-temp" would trigger oil temperature alerts. Transformer oil has different thermal characteristics than air, so separate thresholds are appropriate.

**Sensor Error Alert:** This alert triggers automatically when the sensor returns a reading of 850.0°C, which is the Seneca's indicator for a faulty or disconnected probe.

#### Customizing Alert Thresholds

You can modify alert thresholds to match your facility's requirements. Temperature values are in degrees Celsius:

```json
{
  "alerts": {
    "sensor-temp-seneca": {
      "cabinet_temp_high": {
        "description": "Custom description for high cabinet temperature",
        "severity": "high",
        "params": {
          "temp": 55
        }
      }
    }
  }
}
```

### Sensor Registration

Sensors are registered dynamically via RPC calls. Each sensor requires connection parameters that tell the worker how to communicate via Modbus TCP.

#### Registration Parameters

```javascript
{
  "id": "sensor-cabinet-north-1",     // Unique sensor identifier
  "info": {
    "pos": "rack-1_row-2_lv-cabinet"  // Position for alert routing
  },
  "opts": {
    "address": "192.168.1.100",       // Sensor IP address
    "port": 502,                       // Modbus TCP port
    "unitId": 1,                       // Modbus unit/slave ID
    "register": 3                      // Holding register address
  }
}
```

#### Connection Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | IP address or hostname of the Seneca sensor |
| `port` | number | Yes | Modbus TCP port number (typically 502) |
| `unitId` | number | Yes | Modbus unit/slave identifier (typically 0 or 1) |
| `register` | number | Yes | Holding register address to read temperature from (typically 2-5) |

#### Position Naming Convention

The position string in the `info` object determines which alerts apply to the sensor. Use these patterns:

- **Cabinet sensors:** End position with `lv-cabinet-X` or similar segment starting with "lv"
- **Transformer sensors:** End position with `tr-oil-X` or similar segment starting with "tr"

Example positions:
- `facility-a_rack-1_row-2_lv-cabinet-3`
- `facility-a_transformer-1_tr-oil-temp`
- `building-north_electrical-room-1_lv-panel-main`

#### Register Address Mapping

Seneca temperature sensors expose multiple temperature channels on consecutive holding registers. The Seneca Z-4RTD unit provides four temperature inputs on registers 2 through 5:

| Register | Channel | Description |
|----------|---------|-------------|
| 2 | Input 1 | First RTD temperature sensor |
| 3 | Input 2 | Second RTD temperature sensor |
| 4 | Input 3 | Third RTD temperature sensor |
| 5 | Input 4 | Fourth RTD temperature sensor |

When you register a sensor, specify which register (2-5) corresponds to the physical sensor location you want to monitor.

#### Temperature Data Format

The Seneca returns temperature values as unsigned 16-bit integers in tenths of degrees Celsius. The worker automatically converts these to decimal degrees:

- Raw value: `235` → Converted value: `23.5°C`
- Raw value: `1050` → Converted value: `105.0°C`
- Raw value: `8500` → Converted value: `850.0°C` (error condition)

### Network Configuration

**File:** `config/facs/net.config.json.example`

This configuration controls RPC access permissions:

```json
{
  "r0": {
    "allow": [],
    "allowLocal": true
  }
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `allow` | array | [] | List of allowed RPC public keys (empty = allow none) |
| `allowLocal` | boolean | true | Allow connections from localhost |

#### Security Considerations

In production environments, you should populate the `allow` array with specific RPC public keys of authorized clients and set `allowLocal` to false if remote access is required. The worker generates its own RPC public key on startup, which can be found in the status file at `status/wrk-sensor-rack-temp-seneca-{rack-name}.json`.

### Additional Configuration Files

#### Common Configuration

**File:** `config/common.json.example`

```json
{
  "dir_log": "logs",
  "debug": 0
}
```

This file controls logging directory and debug level settings inherited from the base worker framework.

#### Store Configuration

**File:** `config/facs/store.config.json.example`

```json
{}
```

This empty configuration uses default storage settings. The worker automatically creates storage in the `store/{rack-name}` directory.

## API Reference

### RPC Methods

All RPC methods are called via the Hyperswarm RPC interface. You can use the `hp-rpc-cli` command-line tool for manual testing, or integrate programmatically through the Hyperswarm RPC client libraries.

#### Getting Started: Obtaining the Worker's RPC Public Key

Before you can call any RPC methods, you need to know the worker's public key. This key is automatically generated when the worker starts and is saved in a status file. Here's how to find it:

**Step 1:** Start your Seneca sensor worker for a specific rack. For example, to start a worker for rack zero:

```bash
node worker.js --wtype wrk-sensor-rack-temp-seneca --env development --rack rack-0
```

**Step 2:** Once the worker is running, locate its status file. The file will be named according to the pattern: `status/wrk-sensor-rack-temp-seneca-{rack-name}.json`

For our example, this would be:
```bash
cat status/wrk-sensor-rack-temp-seneca-rack-0.json
```

**Step 3:** Extract the `rpcPublicKey` field from the JSON output. This is a hexadecimal string that uniquely identifies your worker on the network. You'll use this value in all subsequent RPC calls.

---

#### registerThing

When you register a sensor, you're essentially telling a worker process about a new device it should monitor. The worker will then attempt to connect to that Seneca sensor using the Modbus protocol and begin collecting temperature readings at regular intervals.

The registration process is inherited from the base "thing" template, which means the same fundamental API works for registering miners, PDUs, sensors, and any other device type in the system. What makes each device type unique are the specific connection parameters it requires in the `opts` field.

##### Method Signature

```bash
hp-rpc-cli -s <RPC_PUBLIC_KEY> -m registerThing -d '{...}'
```

Replace `<RPC_PUBLIC_KEY>` with the actual hexadecimal public key you obtained from the worker's status file.

##### Parameters

The `registerThing` method accepts a JSON object with the following structure:

```javascript
{
  "id": "optional-custom-id",        // Optional: Custom identifier for the sensor
  "info": {
    "pos": "string",                 // Recommended: Position identifier for the sensor
    "meta": {                        // Optional: Any additional metadata you want to store
      // Custom fields as needed
    }
  },
  "opts": {
    "address": "string",             // Required: IP address of the Modbus sensor
    "port": number,                  // Required: Modbus TCP port (typically 502)
    "unitId": number,                // Required: Modbus unit ID (device address)
    "register": number               // Required: Register address to read temperature from
  },
  "tags": ["string"]                 // Optional: Additional tags for filtering and grouping
}
```

###### Field Descriptions

**id** (optional string)
A custom identifier for this sensor. If you don't provide one, the system will automatically generate a UUID. Custom IDs can be useful when you have your own naming scheme or need to reference sensors by meaningful names rather than UUIDs.

**info.pos** (recommended string)
The physical position identifier for the sensor. This field is particularly important for SENECA sensors because the alert system uses position naming conventions to determine which temperature thresholds to apply. The position string should follow these patterns:

- Prefix with `lv` for sensors in low-voltage cabinets (e.g., `rack-01_lv-cabinet-1`)
- Prefix with `tr` for sensors monitoring transformer oil (e.g., `rack-01_tr-transformer-1`)

The underscore separates the rack location from the specific component. The prefix after the underscore tells the alert system what type of equipment is being monitored, which determines which temperature alerts will be triggered.

**info.meta** (optional object)
Any additional metadata you want to associate with the sensor. This could include maintenance notes, installation dates, or references to other systems. The structure is completely flexible and won't affect the sensor's operation.

**opts.address** (required string)
The IP address where the Modbus sensor can be reached on your network.

**opts.port** (required number)
The TCP port for Modbus communication. For standard Modbus TCP, this is typically port 502.

**opts.unitId** (required number)
The Modbus unit identifier, also known as the slave address. This tells the Modbus protocol which device to communicate with when multiple devices share the same network connection. Valid values are typically zero through two hundred forty-seven.

**opts.register** (required number)
The specific holding register address where the temperature data is stored. For SENECA sensors, this is typically register three, but consult your sensor's documentation to confirm the correct address for your model.

**tags** (optional array of strings)
Additional tags for organizing and filtering sensors. The system automatically generates tags based on the sensor type and hierarchy, but you can add your own custom tags here. Tags are used extensively in the query and statistics systems to group related sensors together.

##### Response

Upon successful registration, the method returns the integer `1`. The simplicity of this response reflects the RPC architecture's focus on efficiency. If registration fails for any reason, the method will throw an error with a descriptive message rather than returning a failure status.

**Success Response:**
```javascript
1
```

**Error Responses:**
Instead of returning error codes, the method throws exceptions. Common errors include:

- `ERR_SLAVE_BLOCK` - Attempted to register a thing on a slave worker (registration only works on master workers)
- `ERR_THING_TAGS_INVALID` - The tags parameter was provided but is not a valid array

##### Complete Working Examples

###### Example: Registering a Cabinet Temperature Sensor

This example registers a sensor monitoring the temperature in a low-voltage electrical cabinet. Notice how the position identifier starts with "lv" to indicate this is a cabinet sensor.

```bash
hp-rpc-cli -s a1b2c3d4e5f6... -m registerThing -d '{
  "info": {
    "pos": "rack-01_lv-cabinet-1",
    "meta": {
      "location": "Facility A - Row 3",
      "installation_date": "2024-01-15",
      "notes": "Main power distribution cabinet"
    }
  },
  "opts": {
    "address": "192.168.1.100",
    "port": 502,
    "unitId": 1,
    "register": 3
  }
}'
```

With this configuration, the alert system will monitor the cabinet temperature and trigger alerts if it exceeds sixty degrees Celsius (high severity) or seventy degrees Celsius (critical severity), based on the default configuration in `config/base.thing.json`.

##### What Happens After Registration

Once you successfully register a sensor, several things happen automatically:

1. The worker stores the sensor configuration in its embedded database. This ensures the sensor remains registered even if the worker restarts.
2. The worker immediately attempts to connect to the sensor using the Modbus parameters you provided. If the connection succeeds, it will read an initial temperature value to verify communication is working properly.
3. The worker adds the sensor to its collection schedule. From this point forward, it will poll the sensor at the interval specified in `collectSnapsItvMs` (which defaults to 60 seconds). Each reading is cached in memory and also stored to the time-series log database for historical analysis.
4. The alert monitoring system begins evaluating each temperature reading against the configured thresholds. If a reading exceeds a threshold, an alert is created and can be retrieved through the `listThings` method with status information enabled.

##### Troubleshooting Registration Issues

If your sensor doesn't appear to be working after registration, here are the most common causes:

**Network connectivity:** Verify that the worker can reach the sensor's IP address on your network. Try pinging the address from the machine running the worker.

**Incorrect Modbus parameters:** Double-check that the port, unit ID, and register address match your sensor's configuration. Consult the SENECA sensor documentation or use a Modbus testing tool to verify these values independently.

**Firewall rules:** Ensure that TCP port 502 (or whatever port you specified) is open between the worker and the sensor.

**Unit ID conflicts:** If you have multiple Modbus devices on the same network segment, ensure each has a unique unit ID.

You can check whether a sensor connected successfully by using the `listThings` method with the status flag enabled, which will show you the last successful reading time and any error messages.

---

## Mock Server

For development and testing, use the built-in mock server that simulates SENECA sensors.

### Start Mock Server

```bash
node mock/server.js --type Seneca -p 5020 -h 0.0.0.0
```

**Arguments:**

| Argument | Alias | Default | Description |
|----------|-------|---------|-------------|
| `--type` | - | - | Sensor type (required: "Seneca") |
| `--port` | `-p` | 5020 | TCP port |
| `--host` | `-h` | 127.0.0.1 | Bind address |
| `--error` | - | false | Simulate error conditions |
| `--mockControlPort` | - | 9999 | Control port for bulk operations |

**Examples:**

```bash
# Basic mock server
node mock/server.js --type Seneca -p 5020

# Mock with errors
node mock/server.js --type Seneca -p 5020 --error

# Mock with control agent
node mock/server.js --type Seneca -p 5020 --mockControlPort 9999

# Bulk mock instances from file
node mock/server.js --bulk ./config/mock-sensors.json --mockControlPort 9999
```

### Mock Server Features

- **Random Temperature Generation:** Simulates realistic temperature readings (30-40°C)
- **Error Simulation:** `--error` flag returns 850°C (error condition)
- **Modbus Protocol:** Responds to READ_HOLDING_REGISTERS (function code 3)
- **Register Range:** Supports registers 2-5
- **Control Agent:** Bulk instance management via control port

**Mock Documentation:** [docs/mock.md](./docs/mock.md)

### Test with Mock

```bash
# Terminal 1: Start mock server
node mock/server.js --type Seneca -p 5020 -h 0.0.0.0

# Terminal 2: Start worker
node worker.js --wtype wrk-sensor-rack-temp-seneca --env=development --rack rack-0

# Terminal 3: Register mock sensor
hp-rpc-cli -s wrk -m registerThing -d '{
  "info": {"pos": "test_lv-1"},
  "opts": {
    "address": "127.0.0.1",
    "port": 5020,
    "unitId": 0,
    "register": 3
  }
}'
```

## Alert System

The worker includes a sophisticated alert system for temperature monitoring.

### Alert Specifications

Alerts are position-aware and apply different thresholds based on sensor location:

#### Cabinet Sensors (position starts with 'lv')

```javascript
{
  "cabinet_temp_high": {
    "params": { "temp": 60 },    // Warning at 60°C
    "severity": "high"
  },
  "cabinet_temp_alert": {
    "params": { "temp": 70 },    // Critical at 70°C
    "severity": "critical"
  }
}
```

#### Transformer Sensors (position starts with 'tr')

```javascript
{
  "oil_temp_high": {
    "params": { "temp": 80 },    // Warning at 80°C
    "severity": "high"
  },
  "oil_temp_critical": {
    "params": { "temp": 90 },   // Critical at 90°C
    "severity": "critical"
  }
}
```

### Alert Validation

Alerts are only triggered when:
1. Snapshot is valid (not null/undefined)
2. Sensor is online (not timed out)
3. Configuration exists for alert type
4. Position matches alert requirements
5. Temperature is below error threshold (< 850°C. Above that can be assumed to be sensor malfunction)
