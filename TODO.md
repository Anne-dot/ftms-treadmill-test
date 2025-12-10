# FTMS Treadmill Test - TODO

## Avatud küsimused

- [ ] Kas Technogym sertifitseerimine maksab? (kontakt: developer@technogym.com)
- [ ] Kas Fitness 24/7 masinad toetavad FTMS-i? (testida homme)
- [ ] Kas saab masinal käsitsi programmi sisestada ja siis andmed veebiäpiga lugeda?
- [ ] Kas masinal peab Bluetooth käsitsi aktiveerima või on alati sees?

## Tehtud

- [x] PWA põhistruktuur
- [x] Offline tugi (service worker)
- [x] FTMS protokolli parser
- [x] Treeningute salvestamine localStorage'i
- [x] CSV eksport
- [x] Raw data logimine ja JSON eksport (debugging)
- [x] Akordion juhisega

## Järgmised sammud

1. **Testimine emulaatoriga** - https://ftmsemu.github.io/
2. **Testimine jõusaalis** - kas ühendus töötab?
3. **Ikoonid** - genereeri 192x192 ja 512x512 PNG-d
4. **GitHub Pages** - deploy

## Sarnased projektid (uurimiseks / panustamiseks)

- https://github.com/janposselt/treadmill-monitor - Web Bluetooth + FTMS
- https://github.com/lefty01/ESP32_TTGO_FTMS - ESP32 FTMS
- https://github.com/blak3r/treadspan - open source treadmill tracking

## Tuleviku ideed

- [ ] Intervalltreeningu taimer (häälega teated?)
- [ ] Progressi graafikud
- [ ] Treeningute võrdlus
- [ ] Südamerytmi integratsioon (kui masin toetab)
