# REGRESSION-TESTS.md — Samtalestøtte

Status: baseline for **0.3.2 beta1**

Formålet med denne fil er at gøre produktadfærd eksplicit. Nogle punkter er automatiserede tests i dag; andre er manuelle device-tests eller mål for næste ændring.

## 1. Obligatorisk automatisk baseline

Kør fra repository-roden:

```bash
npm test
python3 tests/static-check.py
```

På Windows kan den statiske kontrol køres som `py tests/static-check.py`, hvis `python3`
ikke peger på den rigtige lokale Python. Installer først Python-afhængighederne med:

```bash
python3 -m pip install -r requirements.txt
```

eller på Windows:

```bash
py -m pip install -r requirements.txt
```

Baseline ved oprettelsen af dette dokument:

- `npm test`: **42/42 bestået**
- `tests/static-check.py`: **bestået**
- statisk kontrol: 61 HTML-id'er, 46 JS-referencer, 3 ikoner

`npm test` kører bevidst kun testene i rodens `tests/`-mappe. Lokale arkivmapper
som `v031` og `v032` må ikke påvirke den aktuelle baseline.

En ændring må ikke merge, hvis en relevant eksisterende test fejler uden en eksplicit ændring af produktkravet.

## 2. Fortsæt — generelle invariants

### 2.1 Maksimum

For alle inputs:

- højst 3 Fortsæt-forslag.

### 2.2 COR uden personlig bank

Et almindeligt ord fra COR skal kunne autocomplete, selv om ordet ikke findes i den personlige sætningsbank.

### 2.3 `min` og `mit`

Begge ordformer skal være kendte af den generelle model.

Efter et komplet kendt ord må relevante næste-ord-forslag kunne vises, hvis modellen har kontekst.

### 2.4 `jeg kan i...`

Den bundlede real-model-smoke-test skal fortsat kunne finde et nyttigt kontekstforslag som `ikke` til `jeg kan i...`.

Dette er smoke coverage, ikke et krav om præcis top-1 i alle fremtidige modeller.

### 2.5 Mid-word editing

Hvis markøren står midt i et ord:

- valg af autocomplete må kun erstatte ordets relevante suffix,
- tekst efter ordet skal bevares,
- markøren skal lande efter den indsatte tekst.

### 2.6 Stale suggestion guard

Hvis teksten ændres efter et forslag er beregnet, må det gamle forslag ikke kunne overskrive den nye tekst.

## 3. Personlig læring

### 3.1 Specifik kontekst

Lær:

```text
stol er for -> lav
```

Forventning:

- `lav` løftes tydeligt i konteksten `stol er for`.
- Læringen må ikke alene skabe `lav` som forslag efter `kaffen er for`.

### 3.2 Fractional typed learning

Selvskrevet læring med vægt under 1 skal kunne gemmes og senere påvirke ranking.

### 3.3 Rettelse inden læring

Manuel browser-test:

1. skriv et forkert ord,
2. afslut ordet med mellemrum,
3. ret det inden ca. 1 sekund,
4. kontroller at den forkerte kontekst ikke senere får et tydeligt løft.

### 3.4 Bounded learning

Hvis læringstabellen vokser:

- højst 8 næste ord pr. kontekst,
- højst 300 kontekster.

## 4. Hele sætninger

### 4.1 Maksimum

Højst 3 Hele sætninger.

### 4.2 Kilde

Hele sætninger må kun komme fra den lokale/personlige sætningsbank.

Der må ikke vises en hel sætning, som kun findes i det generelle korpus.

### 4.3 Funktionsord

Input som kun giver et funktionsord-match, fx:

```text
har
er
for
den
```

må ikke i sig selv udløse en tilfældig hel sætning.

### 4.4 Ingen gammel 4-tegnsregel

Med en sætningsbank, der indeholder kaffe- og fjernsynssætninger:

```text
kaf
kaff
fjer
```

må ikke alene udløse Hele sætninger, blot fordi præfikset har nået en bestemt længde.

### 4.5 Komplet betydningsord

Med relevant sætningsbank:

```text
kaffe
```

må kunne vise relevante kaffesætninger.

```text
ben
```

må kunne vise relevant bensætning straks, selv om ordet kun har 3 bogstaver.

### 4.6 Valgt autocomplete -> sætningsforslag

Manuel/integrationstest:

1. skriv `kaf`,
2. vælg `kaffe` via Fortsæt,
3. kontroller at relevante kaffesætninger nu kan vises.

### 4.7 Reel flerordsfuldførelse

Hvis brugerens tekst er en ægte begyndelse på en gemt sætning, skal den sætning kunne vises som fuldførelse.

### 4.8 Ingen irrelevant kaffe-regression

Input som:

```text
regnskab er
hvordan har fili
```

må ikke få et kaffesætningsforslag alene på grund af funktionsordsoverlap.

## 5. Kendt ønsket sprogregression — næste rankingændring

Dette er **ikke bestået af 0.3.2** og skal derfor behandles som et mål for næste generelle rankingforbedring.

Input:

```text
Jeg vil gerne have noget at dr
```

Aktuel dårlig adfærd kan være:

```text
dræbe
dræbes
dræb
```

Ønsket:

- `drikke` skal være i top-3,
- helst top-1,
- uden at hardcode selve frasen eller præfikset `dr`.

Når den generelle mekanisme er rettet, skal dette eksempel promoveres til en obligatorisk automatisk regressionstest.

Tilføj samtidig mindst 5-10 andre eksempler, så en ændring ikke kun overfitter til `drikke`.

## 6. Personlige ord

### 6.1 Ny installation

Den synlige liste **Personlige ord** skal starte med 0 poster.

### 6.2 Personnavn uden for COR

Et tilføjet personnavn, der ikke findes i COR, skal kunne autocomplete.

### 6.3 Sætningsimport

Import af sætnings-CSV må ikke automatisk kopiere alle ord i sætningerne til den synlige liste **Personlige ord**.

### 6.4 Migration

Migration fra gammel version:

- gamle identificerbare starterord fjernes,
- eksplicit tilføjede/importerede personlige ord bevares så vidt de kan skelnes.

## 7. Tastatur

Disse tests bør automatiseres med browser-test, når projektet får en stabil browser-harness. Indtil da er de obligatoriske ved keyboard-relaterede ændringer.

### 7.1 Tab

- skriv tekst der giver Fortsæt,
- tryk `Tab`,
- øverste Fortsæt indsættes,
- skrivefeltet beholder fokus bagefter.

### 7.2 Pil ned

- fra skrivefeltet: `Pil ned` fokuserer første synlige forslag.

### 7.3 Pil op tilbage

- gå til første forslag,
- tryk `Pil op`,
- fokus går tilbage til skrivefeltet,
- oprindelig markør/selection gendannes.

### 7.4 Escape fra forslag

- `Esc` fra et forslag går tilbage til skrivefeltet,
- teksten ændres ikke.

### 7.5 Escape i skrivefeltet

- `Esc` rydder teksten,
- holdt `Esc` må ikke rydde/gendanne gentagne gange,
- **Gendan tekst** gendanner den sidst ryddede tekst.

### 7.6 Enter på forslag

- `Enter` aktiverer det fokuserede forslag via normal button-adfærd.

## 8. Personlig profil

### 8.1 Eksportformat

Eksportér profil og kontrollér:

```json
{
  "format": "samtalestotte-backup",
  "schemaVersion": 1
}
```

Profilen skal indeholde:

- `data`,
- `settings`,
- `usage`,
- `draft`.

### 8.2 Filnavn

Eksportfilen skal hedde:

```text
samtalestotte-personlig-profil-YYYY-MM-DD.json
```

### 8.3 Flet

På en enhed med egne data:

- importér profil med **Flet**,
- ord og sætninger flettes,
- usage/læring flettes,
- lokale indstillinger bevares,
- lokal kladde bevares.

### 8.4 Idempotens

Importér den samme profil to gange med **Flet**.

Forventning:

- læringstællinger fordobles ikke anden gang.

### 8.5 Erstat

Importér profil med **Erstat**.

Forventning:

- data gendannes,
- settings gendannes,
- usage gendannes,
- draft gendannes.

### 8.6 Bagudkompatibilitet

En gyldig 0.3.1 JSON-backup med schemaVersion 1 skal fortsat kunne importeres.

## 9. CSV

### 9.1 Separatorer

- kolonner: semikolon,
- stikord i en celle: komma,
- gammel `|`-separator i stikord accepteres ved import.

### 9.2 Round-trip

CSV eksporteret af appen skal kunne importeres igen uden at ødelægge tekst, prioritet eller stikord.

### 9.3 Citationstegn

Semikolon og citationstegn inde i felter skal håndteres korrekt.

## 10. Storage og snapshots

### 10.1 Dagligt snapshot

- højst ét nyt snapshot pr. lokal kalenderdag.

### 10.2 Maksimum

- højst 30 snapshots.

### 10.3 Quota

Hvis localStorage-kvoten rammes:

- drop ældste snapshots først,
- appens primære data må ikke bevidst slettes som løsning.

### 10.4 Ekstern backup reminder

Efter den relevante periode uden ekstern eksport skal backup-påmindelsen kunne vises.

## 11. PWA og offline

Manuel test efter service-worker- eller deploymentændringer.

### 11.1 GitHub Pages subpath

Appen skal virke under:

```text
https://<user>.github.io/<repo>/
```

uden antagelse om root `/`.

### 11.2 Første online-load

- app-shell indlæses,
- `language-data.json` indlæses,
- status viser at dansk sprogmodel er klar.

### 11.3 Offline reload

Efter mindst én succesfuld online-load:

- gå offline,
- reload,
- skrivefelt og UI virker,
- sprogmodel kan fortsat bruges fra cache.

### 11.4 Cache isolation

Ny service worker må kun slette caches med Samtalestøttes eget scope-prefix.

### 11.5 Version update

Efter deploy af ny version:

- reload må kunne hente ny app-shell,
- gammel cache må ikke holde brugeren permanent på gammel kode,
- localStorage-profil skal bevares.

## 12. Privatliv

Statisk check skal fortsat finde **ingen eksterne runtime-URLs** i den centrale appkode.

Manuel/repo-check:

- ingen personlig profil,
- ingen privat transskription,
- ingen lydfil,
- ingen konkret brugers private CSV/JSON

må ligge i public repo.

## 13. Device matrix

Før en version kaldes mere end beta, bør mindst denne matrix testes:

| Miljø | Browser | Input | Minimum |
|---|---|---|---|
| Windows/macOS | Chrome/Edge/Safari relevant | fysisk tastatur | Fortsæt, sætninger, profil import/eksport |
| iPad | Safari/PWA | fysisk tastatur | Tab, pile, Esc, offline, profil |
| Mobil | Safari/Chrome | touch + evt. keyboard | forslag, profilimport, layout |

Registrér browser/OS og konkrete fejl. "Virker på min computer" er ikke tilstrækkeligt.

## 14. Testdisciplin ved nye fejl

Når en bruger rapporterer en fejl:

1. Gem det præcise input.
2. Gem de faktiske top-3 forslag.
3. Beskriv det forventede resultat uden at antage en bestemt implementering.
4. Reproducer i en pure test, hvis muligt.
5. Tilføj mindst én nabotest, så fixet ikke bliver phrase-specifikt.
6. Implementér generel ændring.
7. Kør hele baseline.
8. Dokumentér stadig ukendte eller ikke-validerede effekter.

Eksempel: `... at dr -> drikke` skal ikke løses ved et enkelt opslag; testen skal bruges til at forbedre backoff/ranking generelt.
