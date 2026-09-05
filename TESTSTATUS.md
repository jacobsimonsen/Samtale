# Teststatus — prototype 0.3 beta1

## Gennemført

- 37 JavaScript-enhedstests består.
- Testene dækker den eksisterende ord-/sætningslogik, CSV, kendte v0.2-regressioner, den nye sprogmodel, specifik personlig kontekstlæring og den medfølgende rigtige model.
- Den medfølgende `language-data.json` er valideret som en rigtig model og indeholder mere end 300.000 ordformer og mere end 20.000 kontekster.
- Smoke-test med den rigtige model bekræfter bl.a., at `mit` og `min` findes, og at `jeg kan i...` kan foreslå `ikke`.
- En konkret kontrol viser, at læring af `stol er for → lav` løfter `lav` til første forslag i netop den tre-ords-kontekst uden at gøre `lav` til forslag efter `kaffen er for`.
- Statisk kontrol af HTML-id'er, lokale aktiver, manifest og ikoner består.
- JavaScript-syntaks er kontrolleret for `app.js`, `language-model.js` og `lib.js`.

## Datagrundlag

Den medfølgende model er den model, der tidligere i denne test blev bygget fra de uploadede filer:

- COR 1.5.1.0, SHA-256 `1c4d1c06bd676e66be8e8c0af68615c8a892472a05af3b261ba8a9d1f2d2b82b`
- Danish Dynaword/spont, SHA-256 `a449836c80c99f439fd8b43205f164c2f16ffe8aa7793026a19200cf6aedab40`

Modelmetadata angiver 391.867 ordformer, 27.408 gemte kontekster og 550.420 rensede træningsordtokens.

## Ikke valideret endnu

- Den fulde v0.3-beta er ikke kørt end-to-end på den konkrete iPad/Safari og det fysiske tastatur.
- Service-worker/offlineopdatering fra den allerede installerede GitHub Pages-version skal derfor afprøves i praksis.
- Det lille Dynaword/spont-korpus er emneskævt. Enhedstests dokumenterer korrekt programadfærd, ikke at alle danske forslag er sprogligt gode eller at kommunikationshastigheden forbedres.
- Den nye grammatiske omrangering er endnu ikke en fuld parser. Denne beta fokuserer på bredt ordforråd, statistisk kontekst og personlig læring.
