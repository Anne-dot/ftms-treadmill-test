/* ===========================================
   FTMS Protocol Handler
   Bluetooth Fitness Machine Service
   =========================================== */

/**
 * FTMS UUIDs (Bluetooth SIG assigned numbers)
 * Spec: https://www.bluetooth.com/specifications/specs/fitness-machine-service-1-0/
 */
const FTMS = {
    SERVICE: 0x1826,
    CHARS: {
        TREADMILL_DATA: '00002acd-0000-1000-8000-00805f9b34fb',
        ROWER_DATA: '00002ad1-0000-1000-8000-00805f9b34fb',
        INDOOR_BIKE_DATA: '00002ad2-0000-1000-8000-00805f9b34fb',
        CROSS_TRAINER_DATA: '00002ad3-0000-1000-8000-00805f9b34fb',
        STEP_CLIMBER_DATA: '00002ad4-0000-1000-8000-00805f9b34fb',
        STAIR_CLIMBER_DATA: '00002ad5-0000-1000-8000-00805f9b34fb',
        CONTROL_POINT: '00002ad9-0000-1000-8000-00805f9b34fb',
        MACHINE_STATUS: '00002ada-0000-1000-8000-00805f9b34fb',
        MACHINE_FEATURE: '00002acc-0000-1000-8000-00805f9b34fb'
    }
};

const MACHINE_TYPES = {
    '00002acd-0000-1000-8000-00805f9b34fb': 'Treadmill (jooksulint)',
    '00002ad1-0000-1000-8000-00805f9b34fb': 'Rower (sõudemasin)',
    '00002ad2-0000-1000-8000-00805f9b34fb': 'Indoor Bike (velotrenažöör)',
    '00002ad3-0000-1000-8000-00805f9b34fb': 'Cross Trainer (elliptiline)',
    '00002ad4-0000-1000-8000-00805f9b34fb': 'Step Climber',
    '00002ad5-0000-1000-8000-00805f9b34fb': 'Stair Climber'
};

function getMachineType(uuid) {
    return MACHINE_TYPES[uuid] || null;
}

/**
 * Known Bluetooth service UUIDs for display
 */
const KNOWN_SERVICES = {
    '00001826-0000-1000-8000-00805f9b34fb': 'FTMS (Fitness Machine)',
    '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate',
    '0000180f-0000-1000-8000-00805f9b34fb': 'Battery',
    '0000180a-0000-1000-8000-00805f9b34fb': 'Device Info',
    '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
    '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute'
};

/**
 * Parse FTMS Treadmill Data characteristic
 * Per Bluetooth SIG spec section 4.9
 * @param {DataView} value - Raw characteristic value
 * @returns {Object} Parsed treadmill data
 */
function parseTreadmillData(value) {
    const data = {
        speed: null,
        distance: null,
        incline: null,
        elapsedTime: null
    };

    // Flags field (16 bits)
    const flags = value.getUint16(0, true);

    // Instantaneous Speed - always present (uint16, resolution 0.01 km/h)
    const speedRaw = value.getUint16(2, true);
    data.speed = (speedRaw * 0.01).toFixed(2);

    let offset = 4;

    // Average Speed (flag bit 1)
    if (flags & 0x0002) {
        offset += 2;
    }

    // Total Distance (flag bit 2) - 24 bits, meters
    if (flags & 0x0004) {
        const distLow = value.getUint16(offset, true);
        const distHigh = value.getUint8(offset + 2);
        data.distance = distLow + (distHigh << 16);
        offset += 3;
    }

    // Inclination and Ramp Angle (flag bit 3)
    if (flags & 0x0008) {
        const inclineRaw = value.getInt16(offset, true);
        data.incline = (inclineRaw * 0.1).toFixed(1);
        offset += 4; // inclination (2) + ramp angle (2)
    }

    // Elevation Gain (flag bit 4)
    if (flags & 0x0010) {
        offset += 4;
    }

    // Instantaneous Pace (flag bit 5)
    if (flags & 0x0020) {
        offset += 1;
    }

    // Average Pace (flag bit 6)
    if (flags & 0x0040) {
        offset += 1;
    }

    // Expended Energy (flag bit 7)
    if (flags & 0x0080) {
        offset += 5;
    }

    // Heart Rate (flag bit 8)
    if (flags & 0x0100) {
        offset += 1;
    }

    // Metabolic Equivalent (flag bit 9)
    if (flags & 0x0200) {
        offset += 1;
    }

    // Elapsed Time (flag bit 10)
    if (flags & 0x0400) {
        data.elapsedTime = value.getUint16(offset, true);
    }

    return data;
}

/**
 * Get human-readable service name
 * @param {string} uuid - Service UUID
 * @returns {string} Service name or 'Unknown'
 */
function getServiceName(uuid) {
    return KNOWN_SERVICES[uuid] || 'Tundmatu teenus';
}

/**
 * Check if service is FTMS
 * @param {string} uuid - Service UUID
 * @returns {boolean}
 */
function isFTMSService(uuid) {
    return uuid === '00001826-0000-1000-8000-00805f9b34fb';
}
