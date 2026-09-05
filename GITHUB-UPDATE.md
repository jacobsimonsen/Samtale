# Opdatér GitHub Pages til 0.3.2 beta

1. Eksportér først **Personlig profil (.json)** fra den nuværende app.
2. Pak `samtalestotte-github-update-v0.3.2-beta1.zip` ud i en ny lokal mappe.
3. Åbn GitHub-repositoryet `Samtale`.
4. Vælg **Add file → Upload files**.
5. Upload kun public app-filerne: `.nojekyll`, `AGENTS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `GITHUB-UPDATE.md`, `LICENSE`, `README.md`, `REGRESSION-TESTS.md`, `SOURCES.md`, `TESTSTATUS.md`, `app.js`, `default-data.js`, `index.html`, `language-data.json`, `language-model.js`, `lib.js`, `manifest.webmanifest`, `package.json`, `requirements.txt`, `styles.css`, `sw.js`, `.gitignore`, samt mapperne `examples`, `icons` og `tests`.
   Upload ikke `Privat data`, `Arkiv`, `v031`, `v032`, JSON-profiler, private regneark, lyd, transskriptioner eller zip-filer.
6. Skriv fx `Update to v0.3.2 beta1` og vælg **Commit changes**.
7. Vent på grønt flueben ved **pages build and deployment** under Actions.
8. Genindlæs GitHub Pages-siden og kontroller, at overskriften viser **Prototype 0.3.2 beta**.

## Hurtig kontrol af personlig profil

- På pc: vælg **Eksportér personlig profil (.json)**.
- På mobil/iPad: vælg den samme JSON-fil under **Importér personlig profil eller CSV**.
- Vælg **Flet med eksisterende indhold**, hvis enheden allerede har egne data. Ord, sætninger og brugslæring flettes; enhedens lokale indstillinger og kladde bevares.
- Vælg **Erstat denne enheds personlige profil / indhold**, hvis JSON-filen skal være den fulde gendannelse.

Eksisterende JSON-backups fra 0.3.1 er fortsat kompatible.
