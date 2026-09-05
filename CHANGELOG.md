# Ændringslog

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
