# Samtalestøtte PWA — prototype 0.2

En enkel, tastaturorienteret PWA til hurtigere tekstkommunikation. Version 0.2 har ingen tekst-til-tale og ingen cloud/AI-afhængighed.

## Kommunikation

Appen viser højst:

- 3 **fortsættelser**
- 3 **hele sætninger**

Eksempler:

- `ka` → almindelige ord-autocomplete-forslag som fx `kan`, `kage`, `kaffe` afhængigt af ordlisten og læring.
- `jeg` → fortsættelser udledt af sætningsbanken, fx `Jeg vil`, `Jeg kan`, `Jeg har`.
- `jeg kan i` → kan fx give `Jeg kan ikke`.
- `kaffe` → kan give hele sætninger om kaffe.

Hele sætninger kræver betydningsbærende match. Små funktionsord som `er`, `har`, `jeg`, `kan`, `til` osv. kan ikke alene udløse en hel sætning.

### Tastatur

- `Tab`: vælg øverste fortsættelse.
- `Pil ned`: gå til forslag.
- Piletaster: bevæg dig mellem forslag.
- `Enter`: vælg fokuseret forslag.
- `Esc` fra et forslag: tilbage til skrivefeltet.
- `Esc` i skrivefeltet: ryd hele teksten med det samme.
- Knappen **Gendan tekst** kan gendanne senest ryddede tekst.

## Redigering

Ord og sætninger kan redigeres direkte i appen. Prioritet er flyttet til **Avanceret**; standardværdien 50 er normalt tilstrækkelig.

## CSV

CSV er beregnet til offline-redigering i fx Excel.

### Sætninger

Semikolon er kolonneseparator, og stikord er kommaseparerede:

```csv
sætning;stikord;prioritet
Hvad er klokken?;tid,klokken,hvad;50
Jeg vil gerne have kaffe.;kaffe,drikke;50
```

Import accepterer også det gamle format `tid|klokken|hvad`.

### Ord

```csv
ord;prioritet
kaffe;90
kage;80
```

## JSON og backup

**JSON** er appens komplette eksterne backupformat. Den indeholder:

- ord
- sætninger
- indstillinger
- lokal brugs-/læringsstatistik
- aktuel kladde

Appen laver desuden ét **lokalt snapshot pr. dag** ved første åbning den dag og beholder de seneste 30. Snapshots kan gendannes i appen.

Lokale snapshots ligger kun i browserens lager. De beskytter derfor ikke mod tab af hele enheden eller rydning af browserdata. Download en ekstern JSON-backup med jævne mellemrum. Appen viser en påmindelse efter 7 dage uden ekstern JSON-backup.

## Privatliv

Ord, sætninger, kladde, læringsdata og lokale snapshots gemmes lokalt i browseren. Appen sender ikke kommunikationsteksten til en server.

Læg ikke personlige eller medicinske sætninger direkte i et offentligt GitHub-repository. Hold repositoryet generisk, og importér den personlige sætningsbank lokalt.

## Lokal test på computer

I projektmappen:

```powershell
py -m http.server 8080
```

Åbn derefter:

```text
http://localhost:8080/
```

## GitHub Pages

Hvis projektet ligger i repositoryets rod:

1. **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`
4. Folder: `/ (root)`
5. Gem og vent på grønt flueben under **Actions**.

Se `GITHUB-UPDATE.md` for den korte opdateringsprocedure fra 0.1 til 0.2.

## Eksisterende data ved opdatering

Version 0.2 genbruger de lokale lagernøgler fra 0.1 for ord, sætninger, brug og kladde. En normal kodeopdatering på samme GitHub Pages-adresse bør derfor bevare eksisterende lokale data.

Lav alligevel en JSON-backup før større opdateringer.

## Test

Kræver Node.js til enhedstests:

```bash
npm test
```

Statisk kontrol:

```bash
python3 tests/static-check.py
```

Version 0.2 har 17 automatiske enhedstests, inklusive regressionstests for de malplacerede sætningsforslag fundet under første brugstest.
