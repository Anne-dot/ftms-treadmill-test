# FTMS PWA Debugging Guide

## Pärast jõusaali - andmete analüüs

### 1. Leia eksporditud fail

Telefonis: Downloads kaust → `ftms_full_export_...json` või `ftms_raw_...json`

### 2. Kopeeri fail arvutisse

Variandid:
- USB kaabel
- Google Drive / Dropbox
- E-mail endale

### 3. Ava fail ja analüüsi

**Kiire ülevaade (terminal):**
```bash
# Mitu andmepaketti salvestati?
cat ftms_full_export_*.json | jq '.rawData | length'

# Mis masinatüüp tuvastati?
cat ftms_full_export_*.json | jq '.rawData[0].machineType'

# Esimesed 5 raw paketti (hex)
cat ftms_full_export_*.json | jq '.rawData[:5] | .[].hex'

# Kas oli vigu?
cat ftms_full_export_*.json | jq '.errors'

# Sessiooni info
cat ftms_full_export_*.json | jq '.session'
```

**VS Code / tekstiredaktor:**
- Ava JSON fail
- Otsi `rawData` - seal on kõik Bluetooth paketid
- Otsi `errors` - seal on vead
- Otsi `sessionEvents` - seal on ühenduse ajalugu

### 4. Mida otsida?

| Küsimus | Kust vaadata |
|---------|--------------|
| Kas ühendus õnnestus? | `sessionEvents` → `state_change` → `connected` |
| Mitu paketti sain? | `rawData.length` |
| Mis masin see oli? | `rawData[0].machineType` |
| Miks katkes? | `errors` ja `sessionEvents` lõpus |
| Kas andmed parsiti? | `rawData[].parsed` - kas `null` või andmed |

### 5. Raw hex analüüs

Kui `parsed` on `null`, siis parser ei osanud andmeid lugeda.

Vaata `hex` välja ja võrdle FTMS spetsifikatsiooniga:
- https://www.bluetooth.com/specifications/specs/fitness-machine-service-1-0/

Näide hex: `06 00 e8 03 00 00 00`
- Esimesed 2 baiti = flags
- Järgmised 2 baiti = kiirus (little-endian)

---

## Mobiilne debugging (jõusaalis)

### 1. Äpi sisene logi
Äpp salvestab kõik logid ja andmed automaatselt. Vaata "Logi" sektsiooni ekraanil.

### 2. Automaatne eksport
Andmed eksporditakse automaatselt:
- Ühenduse katkemisel
- Vea puhul
- 3 järjestikuse parsing vea puhul

### 3. Manuaalne eksport
Vajuta "Ekspordi kõik andmed" nuppu igal hetkel.

Eksport sisaldab:
- Sessiooni info (brauser, OS, ekraani suurus)
- Ühenduse ajalugu
- Raw Bluetooth andmed (hex + parsed)
- Vead
- Treeningud

---

## Remote debugging (arvuti + telefon USB kaudu)

### Eeldused
- Android telefon + Chrome
- USB kaabel
- Arvutis Chrome brauser

### Sammud

**1. Telefonis:**
- Settings → About phone → Vajuta "Build number" 7 korda
- Settings → Developer options → Lülita sisse
- Developer options → USB debugging → Lülita sisse

**2. Ühenda telefon arvutiga USB-ga**
- Telefonis ilmub "Allow USB debugging?" → OK

**3. Arvutis:**
- Ava Chrome
- Mine `chrome://inspect#devices`
- Näed oma telefoni ja avatud tabe
- Vajuta "inspect" soovitud tabi kõrval

**4. Debugging:**
- Avaneb DevTools telefoni lehe jaoks
- Console, Network, Elements jne töötavad
- Saad ka screencast'i näha (telefoni ekraani peegeldus)

### Bluetooth internals
Detailsem BLE debugging: `chrome://bluetooth-internals`

---

## PWA parimad tavad (Web Bluetooth)

### Toetatud brauserid
| Brauser | Tugi |
|---------|------|
| Chrome (Android) | ✅ Täielik |
| Chrome (Desktop) | ✅ Täielik |
| Edge | ✅ Täielik |
| Opera | ✅ Täielik |
| Safari (iOS) | ❌ Ei toeta |
| Firefox | ❌ Ei toeta |

**iOS jaoks:** Kasuta [Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) brauserit.

### Nõuded
1. HTTPS (localhost erand arenduseks)
2. Kasutaja peab ühenduse algatama (nupu klikk)
3. Bluetooth peab olema sisse lülitatud

### Levinud probleemid

| Probleem | Põhjus | Lahendus |
|----------|--------|----------|
| "Bluetooth not supported" | Vale brauser | Kasuta Chrome/Edge |
| Seadmeid ei leia | BT väljas või liiga kaugel | Kontrolli BT, liigu lähemale |
| Ühendus katkeb | Signaal nõrk / masin läheb unerežiimi | Hoia telefon masina lähedal |
| GATT timeout | Masin ei vasta | Taaskäivita masin, proovi uuesti |

### Aku säästmine
- Katkesta ühendus, kui ei kasuta
- Ära hoia äppi taustal aktiivsena

---

## Testimine ilma jõusaalita

### FTMS Emulaator
https://ftmsemu.github.io/ - simuleerib FTMS masinat brauseris.

### BLE Peripheral Simulator (Android)
Google Play rakendus, mis simuleerib BLE seadmeid.

---

## Allikad

- [Chrome Remote Debugging](https://developer.chrome.com/docs/devtools/remote-debugging)
- [Web Bluetooth API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [PWA Best Practices (Microsoft)](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/best-practices)
- [PWA Capabilities (web.dev)](https://web.dev/learn/pwa/capabilities)
