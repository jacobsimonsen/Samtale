# Opdatér GitHub Pages til 0.3.2 beta

1. Eksportér først **Personlig profil (.json)** fra den nuværende app.
2. Pak `samtalestotte-github-update-v0.3.2-beta1.zip` ud i en ny lokal mappe.
3. Åbn GitHub-repositoryet `Samtale`.
4. Vælg **Add file → Upload files**.
5. Træk alt indhold fra den udpakkede mappe ind i repositoryets rod, inklusive `icons`, `examples` og `tests`.
6. Skriv fx `Update to v0.3.2 beta1` og vælg **Commit changes**.
7. Vent på grønt flueben ved **pages build and deployment** under Actions.
8. Genindlæs GitHub Pages-siden og kontroller, at overskriften viser **Prototype 0.3.2 beta**.

## Hurtig kontrol af personlig profil

- På pc: vælg **Eksportér personlig profil (.json)**.
- På mobil/iPad: vælg den samme JSON-fil under **Importér personlig profil eller CSV**.
- Vælg **Flet med eksisterende indhold**, hvis enheden allerede har egne data. Ord, sætninger og brugslæring flettes; enhedens lokale indstillinger og kladde bevares.
- Vælg **Erstat denne enheds personlige profil / indhold**, hvis JSON-filen skal være den fulde gendannelse.

Eksisterende JSON-backups fra 0.3.1 er fortsat kompatible.
