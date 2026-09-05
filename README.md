# Samtalestøtte — prototype 0.3 beta

En tastaturorienteret PWA til hurtig tekstkommunikation. Version 0.3 beta kombinerer tre lag:

1. et stort dansk ordgrundlag,
2. en lokal statistisk næste-ord-model,
3. en personlig sætningsbank og lokal brugslæring.

Appen viser højst tre **Fortsæt**-forslag og højst tre **Hele sætninger**. Der er ingen tekst-til-tale i denne version.

## Tastatur

- `Tab`: vælg øverste fortsættelsesforslag.
- `Pil ned`: gå fra skrivefelt til forslag / gå ned gennem forslag.
- `Pil op`: gå op gennem forslag; fra første forslag tilbage til skrivefeltet.
- `Enter`: vælg et forslag, når et forslag har fokus.
- `Esc`: fra forslag tilbage til skrivefelt; i skrivefeltet ryd tekst.

## Forslagsmotor

Den nye v0.3-motor er standard. Under **Filer og indstillinger → Avanceret → Forslagsmotor** kan man skifte til den enkle v0.2-motor. Skiftet sletter ingen data.

Sprogmodellen fungerer lokalt og sender ikke skrevet tekst til en server. Den generelle model er statisk. Personlig læring gemmes i browserens lokale lager og medtages i JSON-backup.

## Data

- JSON: komplet backup af personlige ord, sætninger, indstillinger, brugsdata og læring.
- CSV: praktisk redigering af ord og sætninger i et regneark.
- CSV-kolonner er semikolonseparerede; stikord i en celle er kommaseparerede. Ældre `|` accepteres fortsat ved import.

## Sprogdata

Se `SOURCES.md`. Den medfølgende model er bygget fra COR 1.5.1.0 og Danish Dynaword/spont. Kildedataene i sig selv ligger ikke i repositoryet; kun den kompilerede model `language-data.json` distribueres med appen.

## Beta-status

Modellen er ikke et færdigt dansk predictive keyboard. Det lille samtalekorpus kan give skæve eller grammatisk svage forslag. Versionen er beregnet til afprøvning af den samlede arbejdsgang og den personlige læring.
