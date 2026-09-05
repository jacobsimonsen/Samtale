# Samtalestøtte — prototype 0.3.2 beta

En tastaturorienteret PWA til hurtig tekstkommunikation. Version 0.3.2 beta kombinerer:

1. et stort skrivebeskyttet dansk COR-ordgrundlag,
2. en lokal statistisk næste-ord-model,
3. en personlig sætningsbank, en separat liste med personlige ord og lokal brugslæring.

Appen viser højst tre **Fortsæt**-forslag og højst tre **Hele sætninger**. Der er ingen tekst-til-tale i denne version.

## Ændret i 0.3.2

- **Komplet backup** er omdøbt til **Personlig profil** i brugerfladen. JSON-formatet er fortsat kompatibelt.
- Profilen kan bruges til backup eller flytning mellem pc, mobil og iPad.
- Ved **Flet** af en JSON-profil flettes nu også brugslæringen idempotent; gentagen import fordobler derfor ikke tællingerne. Enhedens aktuelle indstillinger og kladde bevares ved fletning.
- Ved **Erstat** gendannes hele JSON-profilen inklusive indstillinger, kladde og brugslæring.

## Ændret i 0.3.1

- Den synlige liste **Personlige ord** starter tom. Almindelige danske ord kommer fra COR/sprogmodellen.
- Ord i sætningsbanken bruges fortsat af den personlige forudsigelse, men kopieres ikke automatisk ind i **Personlige ord**.
- Hele sætningsforslag kræver nu et helt betydningsord (eller en egentlig flerords-sætningsfuldførelse). Den skjulte 4-tegns præfiksregel er fjernet. Derfor giver `kaf`/`kaff` ikke i sig selv kaffesætninger, mens `kaffe` kan gøre det; `ben` kan give bensætninger straks.
- Ved opdatering fjernes de gamle medfølgende starterord fra den synlige personlige ordliste. Sætninger, kladde og brugslæring bevares.

## Tastatur

- `Tab`: vælg øverste fortsættelsesforslag.
- `Pil ned`: gå fra skrivefelt til forslag / gå ned gennem forslag.
- `Pil op`: gå op gennem forslag; fra første forslag tilbage til skrivefeltet.
- `Enter`: vælg et forslag, når et forslag har fokus.
- `Esc`: fra forslag tilbage til skrivefelt; i skrivefeltet ryd tekst.

## Forslagsmotor

V0.3.2-motoren er standard. Under **Filer og indstillinger → Avanceret → Forslagsmotor** kan man skifte til den enkle v0.2-motor. Skiftet sletter ingen data.

Sprogmodellen fungerer lokalt og sender ikke skrevet tekst til en server. Den generelle model er statisk. Personlig læring gemmes i browserens lokale lager og medtages i JSON-backup.

## Data

- JSON: personlig profil og backup med personlige ord, sætninger, indstillinger, kladde, brugsdata og læring.
- CSV: praktisk redigering af personlige ord og sætninger i et regneark.
- CSV-kolonner er semikolonseparerede; stikord i en celle er kommaseparerede. Ældre `|` accepteres fortsat ved import.

## Sprogdata

Se `SOURCES.md`. Den medfølgende model er bygget fra COR 1.5.1.0 og Danish Dynaword/spont. Kildedataene i sig selv ligger ikke i repositoryet; kun den kompilerede model `language-data.json` distribueres med appen.

## Beta-status

Modellen er ikke et færdigt dansk predictive keyboard. Det lille samtalekorpus kan give skæve eller grammatisk svage forslag. Versionen er beregnet til praktisk afprøvning af den samlede arbejdsgang og den personlige læring.
