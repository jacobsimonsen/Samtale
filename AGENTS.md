# AGENTS.md — Samtalestøtte

Denne fil gælder for hele repositoryet. Den beskriver produktregler og tekniske invariants, som en kodeagent ikke må ændre implicit.

## Formål

Samtalestøtte er en tastaturorienteret PWA til hurtig tekstkommunikation. Produktmålet er at reducere antal tastetryk og ventetid uden at gøre brugerens kommunikation uforudsigelig.

Prioritér i denne rækkefølge:

1. Hurtig og forudsigelig betjening med fysisk tastatur.
2. Brugerens kontrol over alt, der indsættes.
3. Lokal/offline funktion og privatliv.
4. Robust personlig læring.
5. Sproglig kvalitet.
6. Visuel finesse.

Dette er en prototype til kommunikationsstøtte, ikke et klinisk valideret eller medicinsk certificeret system. Undgå at beskrive kodeændringer som dokumenteret klinisk effekt.

## Ikke-forhandlingsbare produktregler

### Forslag

- Vis højst **3 Fortsæt-forslag**.
- Vis højst **3 Hele sætninger**.
- De to typer forslag er separate:
  - **Fortsæt** kommer fra den generelle sprogmodel, personlige ord, personlig sætningsbank og lokal læring.
  - **Hele sætninger** må kun komme fra den personlige sætningsbank. Den generelle korpusmodel må ikke generere eller kopiere hele sætninger til denne liste.
- Et forslag må aldrig indsættes, sendes eller oplæses automatisk. Brugeren vælger altid selv.
- Undgå at fylde tre pladser med dårlige forslag blot for at nå tre. Tre er et maksimum, ikke et krav.
- Funktionsord alene må ikke udløse tilfældige hele sætninger.
- Ufuldstændige ord som `kaf`, `kaff` og `fjer` må ikke udløse hele sætninger via en skjult minimumslængderegel.
- Et komplet meningsbærende ord som `kaffe` eller `ben` må kunne udløse relevante hele sætninger straks.
- En reel flerords-start på en gemt sætning må fortsat kunne fuldføres som hel sætning.

### Tastatur

Bevar disse handlinger, medmindre brugeren udtrykkeligt beslutter andet:

- `Tab`: vælg øverste Fortsæt-forslag.
- `Pil ned`: gå fra skrivefeltet til første synlige forslag.
- `Pil op` fra det første forslag: tilbage til skrivefeltet og gendan den oprindelige markørplacering.
- `Enter`: vælg et forslag, når et forslag har fokus.
- `Esc` fra forslag: tilbage til skrivefeltet uden at rydde teksten.
- `Esc` i skrivefeltet: ryd teksten.
- Et holdt/repeateret `Esc` må ikke rydde flere gange.
- Ryddet tekst skal kunne gendannes via **Gendan tekst**.
- Redigering midt i et ord må kun erstatte det aktuelle ords relevante del og må ikke overskrive resten af beskeden.

### Generelt ordforråd og personlige ord

- COR/sprogmodellen er det generelle danske ordgrundlag.
- Den synlige liste **Personlige ord** starter tom på en ny installation.
- **Personlige ord** er til navne, steder, særlige udtryk og andre brugerbestemte ord.
- Ord fra sætningsbanken må bruges internt af den personlige forudsigelse, men må ikke automatisk kopieres ind i den synlige liste **Personlige ord**.
- `language-data.json` er et bygget, skrivebeskyttet modelartefakt. Redigér det ikke manuelt.

### Personlig læring

- Personlig læring skal være lokal som standard.
- Den generelle `language-data.json` må ikke ændres automatisk af brugerens data.
- Et eksplicit valgt næste-ord-forslag må lære den konkrete kontekst.
- Selvskrevne, færdiggjorte ord må også lære kontekst, men med lavere vægt end et eksplicit valg.
- En hurtig rettelse efter et selvskrevet ord må forhindre, at den forkerte observation læres.
- Lær kun den længste tilgængelige kontekst på op til 3 ord. Lær ikke samtidig alle kortere backoff-kontekster.
- Specifik læring må ikke lække til uvedkommende kontekster. Eksempel:
  - `stol er for -> lav` må forbedres.
  - Det må ikke alene gøre `lav` til forslag efter `kaffen er for`.
- Lokale læringsdata skal medtages i den personlige JSON-profil.
- Profilfletning skal være idempotent: import af den samme profil igen må ikke fordoble læringstællinger.

### Privatliv

Følgende må **aldrig** committes til det offentlige repository:

- brugerens personlige profil/backup,
- personlige sætninger eller personlige ord, medmindre de er bevidst konstruerede demonstrationsdata,
- lydoptagelser,
- transskriptioner af private samtaler,
- rå testdata fra konkrete brugere,
- helbredsoplysninger eller andre private data.

Runtime må ikke sende skrevet tekst til en server. Tilføj ikke analytics, telemetry, cloud-AI eller eksterne runtime-kald uden en udtrykkelig produktbeslutning.

Der er ingen TTS i den aktuelle produktlinje. Tilføj ikke TTS som sideeffekt af andre ændringer.

## Arkitekturgrænser

Hold ansvar adskilt:

- `index.html` og `styles.css`: UI og layout.
- `app.js`: DOM, state, events, localStorage, import/eksport og orkestrering.
- `lib.js`: ren/pure domænelogik for ord, sætninger, CSV, migration og profilfletning.
- `language-model.js`: ren/pure logik for den statistiske næste-ord-model, indsættelse og kontekstlæring.
- `default-data.js`: demonstrationssætninger og tom personlig ordliste.
- `language-data.json`: bygget generel dansk model.
- `sw.js`: offline-cache og PWA-opdatering.
- `tests/`: regressions- og smoke-tests.

Hvis logik kan testes uden DOM, læg den i `lib.js` eller `language-model.js` frem for at gøre `app.js` større.

Undgå nye frameworks og build-kæder, medmindre de løser et konkret dokumenteret problem. Den nuværende app skal fortsat kunne hostes som statiske filer på GitHub Pages.

## Sprogmodel: ændringsregler

Den nuværende model er en lokal statistisk n-gram/backoff-model med op til 3 foregående ord plus et stort COR-lexikon. Scores er rangeringsscores, ikke kalibrerede sandsynligheder.

Når rangeringen forbedres:

- Foretræk generelle mekanismer frem for phrase-specifikke hardcodes.
- Tilføj ikke en regel som `dr -> drikke` alene for at få ét screenshot til at se rigtigt ud.
- Brug diagnostiske eksempler som regressionstests, men løs årsagen generelt.
- Bevar mulighed for personlige ord, som ikke findes i COR.
- Bevar mulighed for personlig kontekstlæring.
- Bevar v0.2-motoren som fallback, indtil brugeren udtrykkeligt beslutter at fjerne den.

Hvis `language-data.json` regenereres:

- dokumentér kilder og hashes i `SOURCES.md`,
- dokumentér modelmetadata og evalueringsbegrænsninger,
- opdatér relevante smoke-tests,
- undgå at committe de rå COR-/korpusfiler,
- fabricér aldrig en model eller provenance, hvis kildedata ikke er tilgængelige.

## Kendt sproglig svaghed, der skal behandles generelt

I 0.3.2 kan:

`Jeg vil gerne have noget at dr`

give forslag som `dræbe`, `dræbes`, `dræb`.

Det ønskede resultat er, at `drikke` ligger i top-3 og helst nr. 1. Årsagen er utilstrækkelig lang kontekst og for aggressiv backoff til korte korpuskontekster/frekvenser.

Løs dette via generel backoff/rangering, grammatisk blød omrangering eller bedre datagrundlag — ikke via en engangsregel for `dr`.

## Profil og kompatibilitet

Aktuelt profilformat:

- `format`: `samtalestotte-backup`
- `schemaVersion`: `1`

Profilen indeholder personlige data, indstillinger, brugslæring og kladde. Eksisterende profiler skal forblive importerbare, medmindre der implementeres en eksplicit og testet migration.

Ved **Flet**:

- flet personlige ord og sætninger,
- flet læringsdata idempotent,
- bevar denne enheds aktuelle indstillinger og kladde.

Ved **Erstat**:

- gendan hele profilen inklusive indstillinger, kladde og læring.

## PWA og GitHub Pages

- Brug relative URLs; appen skal virke under en GitHub Pages-substi som `/Samtale/`.
- Service worker må kun rydde caches med appens eget scope-baserede cache-prefix.
- `language-data.json` skal kunne caches til offline-brug.
- Runtime må ikke afhænge af eksterne CDN'er.
- Ved versionsskift skal cacheversion og versionsstrenge holdes synkroniserede.

Når versionen ændres, kontrollér mindst:

- `package.json`
- `app.js`
- `default-data.js`
- versionsquerystrings i `index.html`
- `sw.js`
- README/CHANGELOG/TESTSTATUS efter behov

## Arbejdsgang for kodeændringer

Før større ændringer:

1. Læs `AGENTS.md`.
2. Læs `ARCHITECTURE.md`.
3. Læs `REGRESSION-TESTS.md`.
4. Læs den relevante nuværende kode og eksisterende tests.
5. Beskriv kort hvilken invariant ændringen påvirker.

Under implementering:

- Lav den mindst komplekse generelle løsning.
- Undgå at ændre flere lag end nødvendigt.
- Tilføj eller opdatér regressionstest for alle fejl, der rettes.
- Bevar kompatibilitet med eksisterende profiler og lokale storage-nøgler, medmindre en migration er en del af opgaven.
- Lad ikke en kodeoprydning ændre produktadfærd uden eksplicit beslutning.

Efter implementering skal følgende som minimum køres:

```bash
npm test
python3 tests/static-check.py
```

Den aktuelle baseline er 42 bestående JavaScript-tests plus en bestående statisk kontrol. Hvis miljøet mangler Python-afhængigheder til `static-check.py`, så rapportér det eksplicit; markér ikke testen som bestået.

Ved ændringer i keyboard, service worker, import/eksport eller PWA-opdatering skal der desuden udføres relevante manuelle browser-/device-tests jf. `REGRESSION-TESTS.md`.

## Git-praksis

- Arbejd helst på en branch og vis diff/testresultater før merge til `main`.
- Deploy eller merge ikke automatisk til den offentlige GitHub Pages-version uden eksplicit besked fra brugeren.
- Commit aldrig private brugerdata.
- Hold commits fokuserede; modelændringer, UI-ændringer og migrationsændringer bør så vidt muligt kunne vurderes separat.

## Definition of done

En ændring er ikke færdig blot fordi UI'et ser rigtigt ud. Den er færdig når:

- den relevante produktregel er opfyldt,
- automatisk regressionstest findes, hvor det er muligt,
- `npm test` består,
- `tests/static-check.py` består eller en reel miljøblokering er dokumenteret,
- eksisterende profil-/storage-kompatibilitet er vurderet,
- privatlivsreglerne er bevaret,
- kendte ikke-validerede forhold er dokumenteret i stedet for at blive fremstillet som validerede.
