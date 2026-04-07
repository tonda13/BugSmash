# CLAUDE.md — BugSmash! kontext pro AI

Tento soubor popisuje architekturu a logiku hry BugSmash pro rychlou orientaci při budoucích změnách.

## Co hra dělá

Webová tap/click hra. Hráč má 90 sekund a 5 životů. Na hracím poli se náhodně spawnují barevné tečky s odpočítávacím kroužkem. Hráč musí tečku kliknout/tapnout dřív, než kroužek dojde — jinak přijde o život. Cílem je maximalizovat skóre.

## Soubory

- `index.html` — veškeré HTML + CSS (žádný externí stylesheet). Obsahuje i definici obrazovek (start, gameover, leaderboard).
- `game.js` — veškerá herní logika. Žádné závislosti, vanilla JS.
- `manifest.json` + `sw.js` — PWA podpora, offline cache.

## Klíčové konstanty (game.js, začátek souboru)

```js
GAME_DURATION = 90        // délka hry v sekundách
LEVEL_UP_INTERVAL = 4     // každých N sekund = nový level
MAX_LIVES = 5
HEART_LIFETIME = 1000     // jak dlouho srdce vydrží (ms)
HEART_INTERVAL_MIN/MAX    // rozmezí pro spawn srdce (8–15s)
```

`LEVELS` — pole 21 objektů (index 0 je null, index 1–20 jsou levely):
- `spawnInterval` — ms mezi spawny teček
- `maxDots` — max teček najednou na poli
- `dotLifetime` — ms než tečka expiruje

`DOT_TYPES` — 4 typy teček: green(+1), cyan(+3), orange(+5), red(+10), každý s vahou pro `weightedRandom()`.

## Herní stav (`state`)

```js
state = {
  running,        // bool — hra běží
  score,          // aktuální skóre
  lives,          // zbývající životy (0 = konec)
  level,          // aktuální level (1–20)
  timeLeft,       // zbývající sekundy
  activeDots,     // pole aktivních teček { id, el, type, rafId, timeout }
  activeHeart,    // objekt aktivního srdce nebo null
  spawnTimer,     // setTimeout handle pro spawn teček
  gameTimer,      // setInterval handle (každou sekundu)
  heartTimer,     // setTimeout handle pro spawn srdce
  lastNewScoreIndex, // index nového záznamu v top10 (pro highlight)
}
```

## Klíčové funkce

### Spawn & lifecycle teček
- `spawnDot()` — vytvoří tečku, přidá ji do DOM i `state.activeDots`, spustí animaci kroužku přes `requestAnimationFrame`. Po `dotLifetime` ms zavolá `loseLife()`.
- `removeDot(id, expired)` — vyjme tečku ze `state.activeDots`, spustí CSS animaci zmizení, odstraní z DOM.
- `weightedRandom()` — vrátí typ tečky podle vah.

### Herní smyčka
- `startGame()` — resetuje state, spustí `scheduleSpawn()` a `setInterval` gameTimer.
- `scheduleSpawn()` — rekurzivní `setTimeout` volaný znovu po každém spawnu (interval se mění dle levelu).
- gameTimer (každou sekundu): dekrementuje `timeLeft`, vypočítá nový level (`1 + floor((90 - timeLeft) / 4)`), při level-upu zavolá `playLevelUp()`, spustí vizuální efekty, od levelu 9 spustí `scheduleHeart()`.
- `endGame()` — zastaví vše, zobrazí game over screen, zkontroluje zda skóre patří do top10.

### Srdce (od levelu 9)
- `scheduleHeart()` — naplánuje spawn srdce za 8–15s (pokud level >= 9).
- `spawnHeart()` — vytvoří srdce v DOM, po `HEART_LIFETIME` (1000ms) expiruje.
- Chycení srdce = +1 život (max MAX_LIVES), pak `scheduleHeart()` znovu.
- Trigger: v gameTimer při přechodu z levelu <9 na >=9.

### Životy
- `loseLife(x, y)` — sníží `state.lives`, zavolá `renderLives()`, při 0 zavolá `endGame()`.
- `renderLives()` — překreslí ikonky ❤️ v `#lives-display` (vždy MAX_LIVES ikonek, ztracené mají třídu `.lost`).

### Leaderboard
- Data v `localStorage` klíč `bugsmash_top10` jako JSON pole.
- Každý záznam: `{ name, score, level, date }`.
- `saveScore()` — uloží jméno do `sessionStorage` klíč `bugsmash_player` (persistence jména v rámci session), přidá záznam, seřadí, ořízne na 10, zavolá `showLeaderboard()`.
- `endGame()` — předvyplní input jménem ze `sessionStorage`.
- `renderLeaderboard()` — generuje `.lb-row` elementy; rank, name, level (`Lv.X`), score.

### Audio
Vše generováno přes Web Audio API, žádné soubory:
- `playHit(points)` — sine, výška dle bodů
- `playMiss()` — sawtooth, klesající
- `playExpire()` — triangle, klesající
- `playLevelUp()` — stoupající fanfára (4 tóny)
- `playHeartCatch()` — 5 tónů s chorus efektem
- `playLoseLife()` — square, hluboce klesající

`resumeAC()` se volá před každým zvukem kvůli autoplay policy prohlížečů.

## DOM struktura (index.html)

```
#app
  #header
    #score-wrap → #score (živé skóre)
    #lives-display (srdíčka)
    #meta → #level-display, #time-display
  #arena (herní plocha, relativně pozicovaná)

#miss-flash (červený overlay při miss/expire)
#levelup-flash (overlay s textem při level-upu)

#screen-start .screen
#screen-gameover .screen
  #gameover-score
  #name-section → #player-name input
#screen-leaderboard .screen
  #leaderboard
```

Tečky, srdce a částice se přidávají přímo do `#arena` jako absolutně pozicované `div` elementy.

## Časté změny a kde hledat

| Změna | Kde |
|---|---|
| Rychlost / obtížnost levelů | `LEVELS` pole, začátek game.js |
| Počet životů | `MAX_LIVES` konstanta |
| Délka hry | `GAME_DURATION` |
| Od jakého levelu srdce | `scheduleHeart()` a gameTimer podmínka (`state.level < 9` / `>= 9`) |
| Frekvence srdeček | `HEART_INTERVAL_MIN/MAX`, `HEART_LIFETIME` |
| Body za tečky / jejich velikost | `DOT_TYPES` pole |
| Vizuál levelu (barevný filtr) | gameTimer blok `if (newLevel >= 10)` |
| Třesení arény | `if (newLevel >= 15)` |
| Label level-up flashe | `labels` pole v gameTimer |
| Leaderboard CSS | `.lb-*` třídy v `<style>` v index.html |
| Verze hry | konstanta `VERSION` v game.js + `CACHE` v sw.js (vždy měnit obojí) + README.md |
| Sdílení výsledku | funkce `shareResult()` v game.js, canvas generování v `buildResultCanvas()` |
| Font | Nunito 900 — jediný display font, plná podpora češtiny. Fredoka One ani Boogaloo nepoužívat. |
| Instalace PWA | tlačítko `#install-btn` na start screenu, skryté přes `.hidden`, zobrazí se jen při `beforeinstallprompt` |

## Možná rozšíření

### Možnost A — globální žebříček na serveru

Synchronizovat TOP 10 přes backend, aby se přátelé mohli hecovat.

**Co by bylo potřeba:**
- Jednoduchý REST endpoint na `icx.cz`: `POST /smash/api/score` (uloží záznam), `GET /smash/api/scores` (vrátí TOP 10)
- Backend: PHP s SQLite nebo JSON souborem stačí (hra nemá velký provoz)
- V `game.js`: `saveScore()` volá fetch na API místo/vedle localStorage; `getTop10()` fetchuje z API s fallbackem na localStorage
- Ochrana před spamem: rate-limit dle IP nebo jednoduchý token v requestu
- Zvážit: moderace jmen (maxlength=16 je nutné i na serveru)
