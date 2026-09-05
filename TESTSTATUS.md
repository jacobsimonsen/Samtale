# Teststatus — prototype 0.3.2 beta1

## Gennemført

- JavaScript-enhedstests for eksisterende ord-/sætningslogik, sprogmodel, personlig læring og 0.3.1-regressioner kører sammen med en ny profil-flettetest.
- `npm test` peger eksplicit på testene i rodens `tests/`-mappe, så lokale arkivmapper ikke ændrer den aktuelle baseline.
- Ny test bekræfter, at JSON-profilens brugslæring kan flettes idempotent: gentagen import af samme profil fordobler ikke tællingerne.
- Statisk kontrol af HTML-id'er, lokale aktiver, manifest, service worker og ikoner gennemføres ved build.
- Python-afhængigheder til den statiske kontrol er dokumenteret i `requirements.txt`.
- `language-data.json` er uændret fra 0.3.1; denne version ændrer profil-/backupflowet, ikke den generelle danske model.

## Fortsat ikke valideret

- Automatisk synkronisering mellem enheder findes ikke. Profilflytning er fortsat manuel via JSON.
- End-to-end import/eksport på den konkrete iPad/Safari skal fortsat afprøves i praksis.
