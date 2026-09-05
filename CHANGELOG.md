# Ændringslog

## 0.2.0 — 2026-09-05

Testopdatering baseret på observationer fra den første brugstest.

### Kommunikation

- Ny kontekstuel **Fortsæt**-motor med højst 3 forslag.
  - `jeg` kan fx give `Jeg vil`, `Jeg kan`, `Jeg har` afhængigt af sætningsbanken.
  - `jeg kan i` kan fx give `Jeg kan ikke`.
  - Almindelig ord-autocomplete er stadig aktiv ved ufuldstændige ord.
- **Hele sætninger** er bevaret som en separat forslagstype med højst 3 forslag.
- Hele sætninger filtreres nu efter betydningsbærende ord. Funktionsord som `er`, `har`, `kan`, `jeg`, `til` osv. kan ikke alene udløse et sætningsforslag.
- Længere, selvskrevet tekst kræver et stærkere match, før en hel sætning vises.
- Næsten præcise begyndelser på gemte sætninger kan vises som sætningsfuldførelse.
- Regressioner dækket af tests:
  - `regnskab er` må ikke foreslå `Kaffen er for varm.`
  - `hvordan har fili` må ikke foreslå en sætning alene pga. `har`.
  - `er der kage til kaffen` må ikke foreslå `Kaffen er for varm.` alene pga. `kaffen`.
- `Esc` rydder nu teksten direkte, når skrivefeltet har fokus. Den senest ryddede tekst kan fortsat gendannes med knappen **Gendan tekst**.
- `Esc` fra et forslag går fortsat tilbage til skrivefeltet i stedet for at rydde.

### Redigering

- Prioritetsfelter er flyttet ind under **Avanceret**.
- Standardprioritet er fortsat 50.

### CSV

- CSV-kolonner er fortsat adskilt med semikolon (`;`).
- Stikord eksporteres nu med komma: `tid,klokken,hvad`.
- Import accepterer både komma og det gamle `|` som stikordsseparator, så eksisterende filer fortsat virker.

### Backup

- Automatisk lokalt snapshot én gang pr. dag ved første åbning den dag.
- De seneste 30 lokale snapshots beholdes.
- Snapshots kan vælges og gendannes under **Filer og indstillinger**.
- Ekstern JSON-backup indeholder også den aktuelle kladde.
- Appen registrerer tidspunktet for seneste eksterne JSON-backup og viser en påmindelse efter 7 dage.
- Lokale snapshots ligger kun i browserens lager og erstatter derfor ikke en ekstern backupfil.

### Opdatering

- App-shell/cache er versionsløftet til 0.2.0.
- Runtime-filer bruger versionsmarkering, så GitHub Pages-opdateringen lettere bryder den gamle browsercache.
- Eksisterende lokale ord, sætninger, brugsdata og kladde bruger de samme lagernøgler som 0.1 og bevares ved normal opdatering.

### Validering

- 17 automatiske enhedstests.
- Statisk kontrol af HTML-ID'er, lokale aktiver, manifest og ikoner.

## 0.1.0 — 2026-09-05

Første testversion.

- Præfiksbaserede ordforslag.
- Sætningsforslag efter valg eller indtastning af et helt ord.
- Tastaturnavigation med Tab, piletaster, Enter og Escape.
- Lokal læring af hyppigt valgte ord og sætninger.
- Redigering af ord og sætninger i appen.
- JSON- og CSV-import/-eksport.
- Lokal lagring af indhold, brugsstatistik og kladde.
- Offline app-shell via service worker.
- Responsiv, kontrastrig brugerflade med justerbar tekststørrelse.
