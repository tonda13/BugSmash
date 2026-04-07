# BugSmash!

Jednoduchá webová hra — klikej na barevné tečky dřív, než zmizí. Čím rychleji klikáš, tím víc bodů. Hra je navržená pro mobily i desktop, funguje offline jako PWA.

**[▶ Hrát online](https://smash.icx.cz)**

---

## Jak se hraje

Máš **90 sekund** a **5 životů**. Na hracím poli se objevují barevné tečky — každá má časový kroužek, který se postupně vyplňuje. Nestihneš-li tečku kliknout dřív, než kroužek dojde, přijdeš o život.

| Barva       | Body |
|-------------|------|
| 🟢 Zelená   | +1   |
| 🔵 Modrá    | +3   |
| 🟠 Oranžová | +5   |
| 🔴 Červená  | +10  |

Kliknutí mimo tečku = **−1 bod**.

Od **levelu 9** se na poli občas objeví srdce ❤️ — chyť ho pro obnovu jednoho života.

## Levely

Hra má 20 levelů. Každé 4 sekundy se posunete o level výš — tečky se spawnují rychleji, je jich víc a rychleji mizí. Od levelu 15 začne aréna třást a od levelu 10 se mění barevný filtr celé hry.

## Žebříček

Po skončení hry se uloží skóre **+ dosažený level** do lokálního TOP 10. Jméno hráče se pamatuje pro celou session, takže ho není třeba zadávat znovu.

## Sdílení výsledku

Po skončení hry lze výsledek sdílet jako PNG obrázek — přes nativní sdílovací menu (Messenger, WhatsApp, Instagram...) na mobilu, nebo stažením souboru na desktopu.

## PWA

Hru lze přidat na plochu telefonu nebo desktopu. Tlačítko **Přidat na plochu** se zobrazí na úvodní obrazovce, pokud to prohlížeč podporuje. Po instalaci funguje offline. Aktualizace proběhne automaticky při příštím spuštění po detekci nové verze.

## Technologie

- Čistý JavaScript (vanilla), HTML, CSS — žádné frameworky
- Web Audio API pro zvukové efekty (generováno programově, žádné soubory)
- PWA s offline podporou přes Service Worker, automatický auto-update
- `localStorage` pro perzistentní žebříček
- `sessionStorage` pro zapamatování jména hráče
- Canvas API pro generování sdíleného obrázku výsledku

## Instalace / spuštění lokálně

Stačí servírovat složku přes libovolný HTTP server:

```bash
npx serve .
# nebo
python3 -m http.server 8080
```

Pak otevři `http://localhost:8080/smash/`.

> Přímé otevření `index.html` jako souboru nebude fungovat kvůli Service Workeru.

## Struktura projektu

```
smash/
├── index.html        # Celá hra (HTML + CSS)
├── game.js           # Herní logika
├── manifest.json     # PWA manifest
├── sw.js             # Service Worker (offline cache + auto-update)
├── icon-192.png      # PWA ikona
└── icon-512.png      # PWA ikona (maskable)
```

## Verze

Aktuální verze je zobrazena v pravém dolním rohu hry. Při vydání nové verze je třeba zvýšit `VERSION` v `game.js` a `CACHE` v `sw.js`.

## Licence

MIT
