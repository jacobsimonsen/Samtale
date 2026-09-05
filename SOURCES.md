# Kilder og dataproveniens

## COR 1.5.1.0

Udgiver: Dansk Sprognævn. Versionssiden angiver 1.5.1.0 som svarende til
Retskrivningsordbogen 5.1. Dansk Sprognævn oplyser, at COR er frit tilgængeligt
og må anvendes til alle formål.

- Produkt og aktuel version: https://ordregister.dk/
- Udgiverens tilladelse: https://dsn.dk/forskning/sprogteknologi-og-fagsprog/cor/
- Format: https://ordregister.dk/doc/COR-README.html
- Data: https://ordregister.dk/files/cor1.5.1.0.tsv

Bemærk: Den aktuelle versionsside angiver normeringsflag N/K/U. Den ældre
formatmanual omtaler stadig 1/0. Parseren tager udgangspunkt i den nyere version.

## Danish Dynaword / spont

Udgiver/vedligeholder: Danish Foundation Models. Datakortet beskriver
anonymiserede transskriptioner af spontane og pseudo-spontane samtaler fra
forskningsprojekter ved Aarhus Universitet. Datakortet angiver 411 dokumenter,
ca. 1,56 millioner Llama-3-tokens og licensen CC0-1.0.

- Datakort: https://huggingface.co/datasets/danish-foundation-models/danish-dynaword/blob/main/data/spont/spont.md
- Fast revision brugt i byggeprogrammet: c2f51be06848df26b5aad71cafeec1bc6064b1cc
- Samlingen: https://huggingface.co/datasets/danish-foundation-models/danish-dynaword

Byggeren beregner sit eget antal **ordtokens efter rensning**. Dette tal er ikke
samme størrelse som datakortets Llama-tokenantal.

De bibliografiske henvisninger i datakortet omfatter:
Derczynski et al. (2021), *The Danish Gigaword Corpus*, NoDaLiDa 2021.

## Afledte filer

Modellen indeholder ordformer og beskårne n-gram-tællinger, ikke de komplette
korpustekster. Efter download gemmes URL, revision, filstørrelse og SHA-256 i
`raw-data/download-manifest.json`; proveniens kopieres til modelrapporten.

Programkoden har MIT-licens. Denne licens erstatter ikke kildernes licenser.
Der anvendes ikke OpenSubtitles, Hestenettet, private beskeder eller en ekstern
AI-tjeneste i denne første byggekonfiguration.

## Python-afhængighed

PyArrow bruges kun til at læse Parquet. Installation fra binære PyPI-pakker sker i
et separat virtuelt miljø, med versionsintervallet >=21,<25. Der downloades ikke
eller eksekveres kildekode fra korpussets repository.
Officiel vejledning: https://arrow.apache.org/docs/24.0/python/install.html
