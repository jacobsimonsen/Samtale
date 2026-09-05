# ARCHITECTURE.md — Samtalestøtte

Status: **0.3.2 beta1**

Dette dokument beskriver den aktuelle runtime-arkitektur og de vigtigste designvalg. Det er ikke en roadmap; forslag til fremtidige ændringer skal holdes adskilt fra det, der faktisk er implementeret.

## 1. Systemoversigt

Samtalestøtte er en statisk PWA uden backend.

```text
Fysisk tastatur / touch
        |
        v
     index.html
        |
        v
      app.js
      /   \
     /     \
 lib.js   language-model.js
   |             |
   |             v
   |      language-data.json
   |      (COR + Dynaword/spont)
   |
   +--> default-data.js
   |
   +--> localStorage
          |
          +-- personlige ord
          +-- sætningsbank
          +-- brugslæring
          +-- kladde
          +-- snapshots
          +-- backup-metadata

sw.js cacher app-shell + language-data.json til offline-brug.
```

Der er ingen serverkomponent, konto, automatisk synkronisering eller cloud-AI i runtime.

## 2. Centrale filer

| Fil | Ansvar |
|---|---|
| `index.html` | Semantisk UI, faner, skrivefelt, forslagspaneler, editor og dataindstillinger |
| `styles.css` | Layout og visuel præsentation |
| `app.js` | State, DOM-events, keyboard, persistence, import/eksport, snapshots, modelindlæsning og orkestrering |
| `lib.js` | Pure funktioner: tokenisering, ord-/sætningsrangering, CSV, datasanitering, migration og merge |
| `language-model.js` | Pure funktioner/klasse for næste-ord-model, modelindsættelse og personlig kontekstlæring |
| `default-data.js` | Tom standardliste for personlige ord + demonstrationssætninger |
| `language-data.json` | Bygget generel dansk model; må ikke redigeres manuelt |
| `manifest.webmanifest` | PWA metadata |
| `sw.js` | Offline-cache, scoped cache cleanup og navigation fallback |
| `tests/language-model.test.js` | Unit-tests af model, indsættelse og personlig læring |
| `tests/lib.test.js` | Unit-tests af ord, sætninger, CSV, migration og profilmerge |
| `tests/real-model-smoke.test.js` | Smoke-tests mod den faktiske bundlede `language-data.json` |
| `tests/static-check.py` | Statisk kontrol af HTML-id'er, assets, manifest, ikoner, SW og eksterne runtime-URLs |

## 3. Dataområder

Systemet skelner bevidst mellem tre typer sprogdata.

### 3.1 Generelt dansk ordgrundlag

`language-data.json` indeholder den statiske generelle model.

Aktuel modelmetadata:

- format: `samtalestotte-language-model`
- schemaVersion: `1`
- COR-lexikon: 391.867 ordformer
- træningskorpus: Danish Dynaword/spont
- træningsdokumenter: 364
- rensede træningsordtokens: 550.420
- observerede former i korpus: 6.920
- gemte n-gram-kontekster: 27.408
- maksimal kontekst: 3 foregående ord
- minimum n-gram-tælling: 2

Modellen er et rangeringssystem, ikke en neural generativ model og ikke en sandsynlighedsmodel.

### 3.2 Personligt indhold

`state.data` har grundformen:

```js
{
  schemaVersion: 1,
  appVersion: "...",
  words: [...],
  sentences: [...]
}
```

- `words`: synlige **Personlige ord**. Starter tomt på ny installation.
- `sentences`: personlig/redigerbar sætningsbank. I prototypen leveres 18 demonstrationssætninger som startdata.

Ord i sætningsbanken kan bruges internt af den personlige predictor, men de bliver ikke kopieret til den synlige liste `words`.

### 3.3 Personlig brugslæring

`state.usage`:

```js
{
  words: {},
  sentences: {},
  contexts: {}
}
```

- `words`: brugsfrekvens/recency for ord.
- `sentences`: brugsfrekvens/recency for hele sætninger.
- `contexts`: lærte næste-ord-observationer for en specifik kontekst på op til 3 ord.

Kontekstnøgler bruger en intern separator (`U+001F`) mellem ord.

## 4. LocalStorage

Aktuelle keys i `app.js`:

```text
samtalestotte.data.v1
samtalestotte.settings.v1
samtalestotte.usage.v1
samtalestotte.draft.v1
samtalestotte.snapshots.v2
samtalestotte.backup-meta.v2
```

De er en del af den praktiske kompatibilitet mellem versioner. Omdøb dem ikke uden eksplicit migration.

## 5. Forslagsflow

`renderSuggestions()` i `app.js` beregner to uafhængige lister.

### 5.1 Fortsæt

Hvis v0.3-motoren er aktiv og den generelle model er indlæst:

```text
DanishPredictor.predict(...)
```

Ellers bruges v0.2-fallback:

```text
rankContinuationSuggestions(...)
```

Maksimum er 3 resultater.

### 5.2 Hele sætninger

Hele sætninger beregnes altid separat med:

```text
rankWholeSentenceSuggestions(...)
```

Kilden er kun `state.data.sentences`.

Den generelle korpusmodel leverer ikke hele sætninger.

## 6. Næste-ord-modellen

`DanishPredictor` kombinerer fire signaltyper:

1. **Korpus-n-grammer**
   - op til 3 foregående ord,
   - længste kontekst scorer væsentligt højere end kortere backoff,
   - kandidater filtreres efter aktuelt ordpræfiks.

2. **COR-lexikon / dictionary completion**
   - binær søgning i et sorteret lexikon,
   - korpusfrekvens bruges som svagt ranking-signal, når den findes.

3. **Personlig sætningsbank og personlige ord**
   - `setPersonal()` bygger personlige ord og op til 3-ords kontekster fra brugerens sætninger,
   - navne og andre ord uden for COR kan derfor foreslås.

4. **Lokal brugslæring**
   - `usage.contexts` kan løfte et ord i en konkret kontekst,
   - `usage.words` giver et begrænset ekstra ranking-signal.

Scores er heuristiske ranking-scores. De må ikke fortolkes som sandsynligheder.

## 7. Parsing og kontekstgrænser

`parseInput()`:

- finder præfiks/suffix omkring markøren,
- bruger højst de sidste 3 ord som kontekst,
- krydser ikke punktum, udråbstegn, spørgsmålstegn, linjeskift eller talgrænser.

Når et kendt ord er skrevet uden trailing space, kan predictor både:

- foreslå næste ord, hvis der findes en observeret kontekst,
- foreslå længere ord med samme præfiks.

Arbitrære frekvente næste ord må ikke sættes efter et ord blot fordi ordet findes i lexikonet.

## 8. Personlig læring

Der er tre hovedveje.

### 8.1 Eksplicit valgt model-forslag

Ved valg af et v0.3-model-forslag:

```js
recordContextChoice(..., weight = 1)
```

Dette er den stærkeste løbende observation.

### 8.2 Selvskrevet ord afsluttet med mellemrum/tegnsætning

Efter cirka 1 sekund, hvis den indfangede tekst ikke er blevet rettet:

```js
recordContextChoice(..., weight = 0.35)
```

### 8.3 Sidste selvskrevne ord ved rydning

Hvis teksten ryddes uden afsluttende mellemrum/tegnsætning:

```js
recordContextChoice(..., weight = 0.2)
```

`recordContextChoice()`:

- gemmer kun den mest specifikke tilgængelige kontekst,
- begrænser kontekst til de sidste 3 ord,
- begrænser hver kontekst til 8 næste ord,
- begrænser den lokale tabel til 300 kontekster.

Det reducerer risikoen for, at en specifik læring generaliseres uhensigtsmæssigt.

## 9. Sætningsforslag

`rankWholeSentenceSuggestions()` er en separat ranker.

Principper:

- stop-/funktionsord skaber ikke relevans alene,
- ét komplet betydningsord kan give et bredt match,
- længere input kræver stærkere indholdsoverlap,
- en ægte tekstprefix af en gemt sætning får høj prioritet,
- prioritet og lokal sætningsbrug påvirker ranking,
- højst 3 sætninger returneres.

Vigtigt: triggerlogikken er semantisk/ordbaseret, ikke en fast "4 bogstaver"-regel.

## 10. Indsættelse og markør

Model-forslag bærer:

- original tekst,
- replaceStart/replaceEnd,
- mode (`complete` eller `next`),
- context og nextToken.

`applyModelSuggestion()` afviser et stale forslag, hvis teksten er ændret siden forslaget blev beregnet.

Det beskytter mod, at et gammelt forslag overskriver nyere tekst.

Ved redigering midt i et ord erstattes kun ordets suffixområde, ikke resten af beskeden.

## 11. Keyboard state

Når fokus flyttes fra skrivefelt til forslag, gemmes:

```js
state.composerSelection
```

`returnToComposer()` gendanner markør/selection.

Forslagene behandles som én samlet keyboard-række på tværs af Fortsæt og Hele sætninger.

## 12. Personlig profil og backup

Eksportformat:

```js
{
  format: "samtalestotte-backup",
  schemaVersion: 1,
  appVersion: "...",
  exportedAt: "...",
  data: {...},
  settings: {...},
  usage: {...},
  draft: "..."
}
```

Filnavn:

```text
samtalestotte-personlig-profil-YYYY-MM-DD.json
```

### Flet

- `data` flettes,
- `usage` flettes idempotent,
- lokal kladde og lokale indstillinger bevares.

### Erstat

- data erstattes,
- indstillinger gendannes,
- usage gendannes,
- kladde gendannes.

### Snapshots

Appen forsøger at gemme ét lokalt snapshot pr. dag og højst 30 snapshots. Ved localStorage-kvotaproblemer kasseres ældre snapshots først.

Snapshots ligger på samme enhed og er derfor ikke en ekstern backup.

## 13. CSV

- kolonneseparator: semikolon,
- stikord i en celle: komma,
- ældre `|` i stikord accepteres fortsat ved import.

Ord-CSV og sætnings-CSV er redigeringsformater. JSON-profilen er det komplette flytte-/backupformat.

## 14. Offline/PWA

`sw.js`:

- bruger et cache-prefix baseret på `self.registration.scope`,
- cacher app-shell,
- forsøger at cache `language-data.json`,
- sletter kun gamle caches med eget prefix,
- bruger network-first til navigation og fallback til cached `index.html`,
- bruger cache-first/fetch fallback til øvrige lokale GET-requests.

Dette er vigtigt for GitHub Pages, hvor appen ligger under en substi.

## 15. Fallback-motor

Under **Filer og indstillinger -> Avanceret -> Forslagsmotor** kan brugeren vælge v0.2-motoren.

Skiftet må ikke slette data.

Fallback skal fortsat virke, hvis den generelle v0.3-model ikke kan indlæses.

## 16. Tests

Aktuel baseline verificeret mod 0.3.2 beta1:

```bash
npm test
# 42/42 bestået

python3 tests/static-check.py
# bestået
```

Testtyper:

- pure unit-tests,
- smoke-test med den faktiske `language-data.json`,
- statisk kontrol af PWA-struktur.

Det er ikke det samme som end-to-end validering på iPad/Safari.

## 17. Kendte begrænsninger

### Datagrundlag

Dynaword/spont er et lille og emneskævt samtalekorpus. Det kan give grammatisk eller semantisk svage backoff-resultater.

### Kendt diagnostisk eksempel

Aktuel model kan ved:

```text
Jeg vil gerne have noget at dr
```

rangere `dræbe`, `dræbes`, `dræb` over `drikke`.

Personlig kontekstlæring kan rette det lokalt, men den generelle model bør forbedres via en mere robust backoff/ranking-mekanisme eller bedre data.

### Grammatik

Systemet har ikke en fuld grammatisk parser. Eventuel grammatisk omrangering bør i første omgang være blød ranking, ikke hårde filtre, så telegramstil og brugerens egne formuleringer ikke blokeres.

### Enhedssynkronisering

Der er ingen automatisk synkronisering. Personlig profil flyttes manuelt via JSON.

## 18. Foretrukken retning for videre udvikling

Når nye features overvejes, bør rækkefølgen normalt være:

1. mål konkret fejl eller brugerfriktion,
2. skriv regressionstest,
3. forbedr generel mekanisme,
4. bevar personlig læring,
5. test desktop-browser,
6. test iPad/Safari + fysisk tastatur,
7. deploy først derefter.

Nye serverkomponenter, cloud-synk, cloud-AI eller TTS er selvstændige produktbeslutninger og må ikke snige sig ind som implementeringsdetaljer.
