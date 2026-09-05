# Teststatus — prototype 0.3.1 beta1

## Gennemført

- 41 JavaScript-enhedstests består.
- Testene dækker den eksisterende ord-/sætningslogik, CSV, v0.2-regressioner, sprogmodellen, personlig kontekstlæring og den medfølgende rigtige model.
- Nye 0.3.1-regressionstests bekræfter:
  - `kaf` og `kaff` udløser ikke hele kaffesætninger.
  - `kaffe` kan udløse hele kaffesætninger.
  - det korte hele ord `ben` kan udløse en relevant bensætning straks.
  - `fjer` udløser ikke fjernsynssætningen, mens `fjernsyn` kan.
  - en rigtig flerords-sætningsstart som `Kaffen er for` kan fortsat fuldføres som hel sætning.
  - sætningsimport kopierer ikke længere ord ind i den synlige personlige ordliste.
  - migration fjerner gamle starterord og bevarer et eksplicit personligt testord.
- En migrationskontrol mod de faktiske 0.3.0-beta1-standarddata reducerer 492 gamle synlige ord til 0 personlige ord og bevarer alle 18 demonstrationssætninger.
- En kontrol med den rigtige 391.867-ords model viser `kaf` → bl.a. `kaffe`; efter valg af `kaffe` vises relevante hele kaffesætninger.
- `node --check` består for `app.js`, `lib.js` og `language-model.js`.
- Statisk kontrol består: HTML-id'er, lokale assets, manifest, tre ikoner og service-worker shell.
- Den medfølgende `language-data.json` er valideret med 391.867 ordformer og 27.408 gemte kontekster.

## Datagrundlag

Den generelle sprogmodel er uændret fra 0.3.0-beta1 og stammer fra de tidligere uploadede kilder:

- COR 1.5.1.0, SHA-256 `1c4d1c06bd676e66be8e8c0af68615c8a892472a05af3b261ba8a9d1f2d2b82b`
- Danish Dynaword/spont, SHA-256 `a449836c80c99f439fd8b43205f164c2f16ffe8aa7793026a19200cf6aedab40`

## Ikke valideret endnu

- Forsøg på en end-to-end Chromium-test via lokal `http://127.0.0.1` blev blokeret af miljøets administratorpolitik (`ERR_BLOCKED_BY_ADMINISTRATOR`); derfor er browser-flowet ikke markeret som valideret her.
- Den fulde 0.3.1-beta er ikke kørt end-to-end på den konkrete iPad/Safari og det fysiske tastatur.
- Service-worker-opdateringen fra den allerede installerede GitHub Pages-version skal derfor stadig afprøves i praksis.
- Det lille Dynaword/spont-korpus er emneskævt. Testene dokumenterer programadfærd, ikke at alle danske forslag er sprogligt gode eller at kommunikationshastigheden forbedres.
- V0.3.1 ændrer ikke den grammatiske model; grammatiske skævheder i den generelle næste-ord-model kan derfor stadig forekomme.
