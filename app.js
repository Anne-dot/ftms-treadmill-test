/* ===========================================
   FTMS Treadmill Test - Main Application
   =========================================== */

/* --- State --- */
let device = null;
let currentWorkout = {
    distance: 0,
    elapsedTime: 0,
    maxSpeed: 0,
    speedReadings: []
};

/* --- DOM Elements --- */
const elements = {
    status: document.getElementById('status'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    dataCard: document.getElementById('dataCard'),
    services: document.getElementById('services'),
    workouts: document.getElementById('workouts'),
    exportBtn: document.getElementById('exportBtn'),
    exportRawBtn: document.getElementById('exportRawBtn'),
    saveWorkoutBtn: document.getElementById('saveWorkoutBtn'),
    log: document.getElementById('log'),
    speed: document.getElementById('speed'),
    distance: document.getElementById('distance'),
    time: document.getElementById('time'),
    incline: document.getElementById('incline')
};

/* --- Initialization --- */
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Event listeners
    elements.connectBtn.addEventListener('click', connect);
    elements.disconnectBtn.addEventListener('click', disconnect);
    elements.saveWorkoutBtn.addEventListener('click', saveCurrentWorkout);
    elements.exportBtn.addEventListener('click', downloadWorkoutsCSV);
    elements.exportRawBtn.addEventListener('click', downloadRawDataJSON);

    // Load saved workouts
    displaySavedWorkouts();

    // Register service worker for offline support
    registerServiceWorker();

    // Check Web Bluetooth support
    if (!navigator.bluetooth) {
        log('Web Bluetooth ei ole toetatud selles brauseris!', 'error');
        setStatus('Brauser ei toeta Bluetoothi', 'error');
        elements.connectBtn.disabled = true;
        showBrowserHelp();
    }
}

/* --- Service Worker --- */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            log('Offline tugi aktiveeritud', 'success');
        } catch (error) {
            console.warn('Service worker registration failed:', error);
        }
    }
}

/* --- Bluetooth Connection --- */
async function connect() {
    try {
        log('Otsin Bluetooth seadmeid...');
        setStatus('Otsin seadmeid...', 'searching');

        device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [FTMS.SERVICE] }],
            optionalServices: [FTMS.SERVICE, 0x180D, 0x180F, 0x180A]
        });

        log(`Leitud seade: ${device.name || 'Nimetu'}`, 'success');
        device.addEventListener('gattserverdisconnected', onDisconnected);

        setStatus('Ühendun...', 'searching');
        const server = await device.gatt.connect();
        log('GATT server ühendatud', 'success');

        // Discover services
        const services = await server.getPrimaryServices();
        displayServices(services);

        // Look for FTMS
        for (const service of services) {
            if (isFTMSService(service.uuid)) {
                log('FTMS teenus leitud!', 'success');
                await setupFTMS(service);
            }
        }

        setStatus(`Ühendatud: ${device.name || 'Nimetu'}`, 'connected');
        elements.connectBtn.disabled = true;
        elements.disconnectBtn.disabled = false;

        // Reset current workout
        resetCurrentWorkout();

    } catch (error) {
        handleConnectionError(error);
    }
}

function disconnect() {
    if (device && device.gatt.connected) {
        device.gatt.disconnect();
    }
}

function onDisconnected() {
    log('Ühendus katkestatud', 'warn');
    setStatus('Ühendus katkestatud', 'waiting');
    elements.connectBtn.disabled = false;
    elements.disconnectBtn.disabled = true;
    elements.dataCard.hidden = true;
}

function handleConnectionError(error) {
    if (error.name === 'NotFoundError') {
        log('Seadet ei valitud', 'warn');
        setStatus('Tühistatud', 'waiting');
    } else {
        log(`Viga: ${error.message}`, 'error');
        setStatus('Viga ühendamisel', 'error');
    }
}

/* --- FTMS Setup --- */
async function setupFTMS(service) {
    try {
        const characteristics = await service.getCharacteristics();
        log(`FTMS-il on ${characteristics.length} karakteristikut`);

        for (const char of characteristics) {
            await processCharacteristic(char);
        }
    } catch (error) {
        log(`Viga FTMS seadistamisel: ${error.message}`, 'error');
    }
}

async function processCharacteristic(char) {
    const props = [];
    if (char.properties.read) props.push('read');
    if (char.properties.write) props.push('write');
    if (char.properties.notify) props.push('notify');

    // Treadmill Data
    if (char.uuid === FTMS.CHARS.TREADMILL_DATA) {
        log(`→ Treadmill Data (${props.join(', ')})`, 'success');

        if (char.properties.notify) {
            await char.startNotifications();
            char.addEventListener('characteristicvaluechanged', handleTreadmillData);
            log('Kuulan treeningu andmeid...', 'success');
            elements.dataCard.hidden = false;
        }
    }
    // Control Point
    else if (char.uuid === FTMS.CHARS.CONTROL_POINT) {
        log(`→ Control Point (${props.join(', ')})`, 'success');
        if (char.properties.write) {
            log('  ⚠️ Kirjutamine võimalik, aga vajab sertifitseerimist', 'warn');
        }
    }
    // Machine Feature
    else if (char.uuid === FTMS.CHARS.MACHINE_FEATURE) {
        log('→ Machine Feature', 'info');
        if (char.properties.read) {
            const value = await char.readValue();
            const features = value.getUint32(0, true);
            log(`  Funktsioonid: 0x${features.toString(16)}`, 'info');
        }
    }
    else {
        log(`→ ${char.uuid.substring(4, 8)} (${props.join(', ')})`, 'info');
    }
}

/* --- Data Handling --- */
function handleTreadmillData(event) {
    const value = event.target.value;
    const rawBytes = new Uint8Array(value.buffer);

    let data = null;
    try {
        data = parseTreadmillData(value);
    } catch (error) {
        log(`Parsing viga: ${error.message}`, 'error');
    }

    // Save raw data for later analysis
    saveRawData(event.target.uuid, rawBytes, data);

    if (!data) return;

    // Update display
    if (data.speed !== null) {
        elements.speed.textContent = data.speed;
        updateWorkoutSpeed(parseFloat(data.speed));
    }
    if (data.distance !== null) {
        elements.distance.textContent = data.distance;
        currentWorkout.distance = data.distance;
    }
    if (data.elapsedTime !== null) {
        elements.time.textContent = data.elapsedTime;
        currentWorkout.elapsedTime = data.elapsedTime;
    }
    if (data.incline !== null) {
        elements.incline.textContent = data.incline;
    }
}

function updateWorkoutSpeed(speed) {
    currentWorkout.speedReadings.push(speed);
    if (speed > currentWorkout.maxSpeed) {
        currentWorkout.maxSpeed = speed;
    }
}

function resetCurrentWorkout() {
    currentWorkout = {
        distance: 0,
        elapsedTime: 0,
        maxSpeed: 0,
        speedReadings: []
    };
}

/* --- Workout Management --- */
function saveCurrentWorkout() {
    if (currentWorkout.distance === 0 && currentWorkout.elapsedTime === 0) {
        log('Pole andmeid salvestamiseks', 'warn');
        return;
    }

    const avgSpeed = currentWorkout.speedReadings.length > 0
        ? (currentWorkout.speedReadings.reduce((a, b) => a + b, 0) / currentWorkout.speedReadings.length).toFixed(2)
        : null;

    const workout = {
        distance: currentWorkout.distance,
        elapsedTime: currentWorkout.elapsedTime,
        maxSpeed: currentWorkout.maxSpeed.toFixed(2),
        avgSpeed: avgSpeed
    };

    if (saveWorkout(workout)) {
        log('Treening salvestatud!', 'success');
        displaySavedWorkouts();
        resetCurrentWorkout();
    } else {
        log('Salvestamine ebaõnnestus', 'error');
    }
}

function displaySavedWorkouts() {
    const workouts = getWorkouts();

    if (workouts.length === 0) {
        elements.workouts.innerHTML = '<p class="placeholder">Treeninguid pole veel salvestatud</p>';
        elements.exportBtn.hidden = true;
        return;
    }

    // Show newest first
    const sorted = workouts.slice().reverse();
    elements.workouts.innerHTML = sorted.map(formatWorkoutHTML).join('');
    elements.exportBtn.hidden = false;

    // Show raw export if data exists
    const rawData = getRawData();
    elements.exportRawBtn.hidden = rawData.length === 0;
}

/* --- Services Display --- */
function displayServices(services) {
    if (services.length === 0) {
        elements.services.innerHTML = '<p class="placeholder">Teenuseid ei leitud</p>';
        return;
    }

    elements.services.innerHTML = services.map(service => {
        const name = getServiceName(service.uuid);
        const isFTMS = isFTMSService(service.uuid);
        const className = isFTMS ? 'service-ftms' : 'service-other';

        return `
            <div class="service-item ${className}">
                <strong>${name}</strong>
                <small>${service.uuid}</small>
            </div>
        `;
    }).join('');

    log(`Leitud ${services.length} teenust`, 'info');
}

/* --- UI Helpers --- */
function setStatus(msg, type = 'waiting') {
    elements.status.textContent = msg;
    elements.status.className = 'status ' + type;
}

function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('et-EE');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${time}] ${msg}`;
    elements.log.appendChild(entry);
    elements.log.scrollTop = elements.log.scrollHeight;
    console.log(`[${type}] ${msg}`);
}

function showBrowserHelp() {
    const helpDiv = document.createElement('div');
    helpDiv.className = 'browser-help';
    helpDiv.innerHTML = `
        <p><strong>Proovi:</strong></p>
        <ul>
            <li><strong>Arvutis:</strong> Chrome, Edge või Opera</li>
            <li><strong>Android:</strong> Chrome</li>
            <li><strong>iPhone/Mac:</strong> <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank">Bluefy brauser</a></li>
        </ul>
        <p>Kontrolli ka, et Bluetooth on sisse lülitatud.</p>
    `;
    elements.status.after(helpDiv);
}
