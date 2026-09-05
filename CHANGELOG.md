# Ændringslog

## 0.3.2-beta1 — 2026-09-05

- Brugerfladen kalder nu JSON-backuppen **Personlig profil** og forklarer, at den kan flyttes mellem enheder.
- Eksportfilen hedder nu `samtalestotte-personlig-profil-YYYY-MM-DD.json`.
- JSON-import med **Flet** fletter nu også ord-, sætnings- og kontekstlæring. Sammenfletningen bruger maksimum pr. observation og er derfor idempotent ved gentagen import.
- JSON-import med **Erstat** gendanner fortsat hele profilen inklusive indstillinger, kladde og læring.
- Det underliggende backupformat er fortsat `samtalestotte-backup` schemaVersion 1, så eksisterende JSON-backups kan importeres.

## 0.3.1-beta1 — 2026-09-05

Mindre betaopdatering efter praktisk afprøvning af 0.3.0-beta1.

### Sætningsforslag

- Den skjulte 4-tegns præfiksregel er fjernet fra relevansen for hele sætninger.
- Hele sætninger udløses af et helt meningsbærende ord, fx `ben` eller `kaffe`, eller af en egentlig flerords-sætningsfuldførelse.
- Ufuldstændige ord som `kaf`, `kaff` og `fjer` giver derfor ikke alene hele sætninger. De håndteres først og fremmest af **Fortsæt**.
- Funktionsord alene udløser fortsat ikke hele sætninger.

### Personlige ord

- Den synlige ordliste hedder nu **Personlige ord** og starter tom på en ny installation.
- COR/sprogmodellen er fortsat det generelle danske ordgrundlag.
- Ord fra sætningsbanken bruges fortsat internt i den personlige forudsigelse, men kopieres ikke til den synlige personlige ordliste.
- Ved opdatering fra den tidligere beta fjernes medfølgende `starter-word-*` samt identificerbare autoord fra demonstrationssætninger. Eksplicit tilføjede/importerede ord bevares så vidt de kan skelnes fra de gamle starterdata.
- Sætningsbank, kladde, indstillinger og brugslæring bruger fortsat samme lokale lagernøgler.

### Test

- Nye regressionstests dækker `kaf`/`kaff` kontra `kaffe`, korte hele betydningsord som `ben`, separat personlig ordliste og migration af gamle starterord.

## 0.3.0-beta1 — 2026-09-05

Første integration af den nye danske sprogmodel i den almindelige PWA. Denne version er en beta til praktisk afprøvning.

### Forslag

- COR 1.5.1.0 bruges som generelt dansk ordgrundlag med 391.867 ordformer i den byggede model.
- En lokal statistisk næste-ord-model bygget på Danish Dynaword/spont giver kontekstafhængige forslag uden internet eller cloudtjeneste.
- Højst 3 **Fortsæt**-forslag og højst 3 **Hele sætninger** bevares.
- Hele sætninger kommer fortsat fra den personlige sætningsbank og rangeres separat fra næste-ord-forslag.
- Den nye motor kan slås fra under **Filer og indstillinger → Avanceret → Forslagsmotor**. V0.2-motoren kan vælges uden datatab.
- Hvis den generelle model ikke kan indlæses, falder appen automatisk tilbage til den enkle v0.2-motor.

### Personlig læring

- Valgte næste-ord-forslag lærer den konkrete foregående kontekst lokalt.
- Ord, som brugeren selv skriver færdigt med mellemrum eller tegnsætning, lærer også konteksten efter en kort forsinkelse og med lavere vægt end et eksplicit valgt forslag. Rettes det netop skrevne tekststykke straks, gemmes observationen ikke.
- Når teksten ryddes, kan det sidste selvskrevne ord lære med lav vægt, hvis beskeden ikke sluttede med mellemrum eller tegnsætning.
- Kun den længste tilgængelige kontekst på op til 3 ord læres. Det reducerer risikoen for, at fx `stol er for → lav` påvirker den mere generelle kontekst `er for`.
- Personlig læring gemmes lokalt i de eksisterende brugsdata og følger med JSON-backup og daglige snapshots.
- Den generelle sprogmodel ændres aldrig af brugerens data.

### Tastatur

- `Pil ned` går fra tekstfeltet til forslag.
- `Pil op` fra det første forslag går tilbage til tekstfeltet og gendanner markørplaceringen.
- `Esc` fra et forslag går tilbage til tekstfeltet uden at rydde.
- `Esc` i tekstfeltet rydder teksten; den kan fortsat gendannes med knappen **Gendan tekst**.
- `Tab` vælger det øverste fortsættelsesforslag.

### Tidligere v0.2-funktioner bevaret

- CSV-stikord eksporteres med komma, mens import også accepterer det gamle `|`.
- Prioritet ligger under **Avanceret**.
- Dagligt lokalt snapshot, op til 30 snapshots og 7-dages påmindelse om ekstern JSON-backup.
- Eksisterende lokale ord, sætninger, kladde og brugsdata bruger samme lagernøgler og bevares ved normal opdatering.

### Kendte begrænsninger

- Dynaword/spont er et lille og emneskævt samtalekorpus. Forslag kan derfor være grammatisk eller emnemæssigt mindre passende.
- V0.3 bruger endnu ikke en fuld grammatisk parser. Personlig læring forventes især at forbedre gentagne formuleringer, ikke at løse al dansk grammatik.
- Appen må aldrig indsætte eller oplæse et forslag automatisk. Brugeren vælger altid selv.

### Test

- Eksisterende enhedstests for ord, sætninger, CSV og regressioner bevares.
- Nye tests dækker sprogmodel, personlig kontekstlæring og at specifik læring ikke lækker til kortere, uvedkommende kontekster.
- Statisk kontrol dækker HTML-ID'er, lokale assets, manifest og service worker.
