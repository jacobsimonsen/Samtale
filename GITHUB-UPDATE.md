# Opdater GitHub Pages fra 0.1 til 0.2

Den nemmeste metode via GitHubs webside:

1. Tag gerne først en **komplet JSON-backup** i den nuværende app.
2. Pak `samtalestotte-github-update-v0.2.zip` ud på computeren.
3. Åbn dit GitHub-repository `Samtale` og vælg **Code**.
4. Vælg **Add file → Upload files**.
5. Træk **filerne inde i den udpakkede mappe** ind i uploadfeltet. De skal ligge i repositoryets rod — ikke i en ny undermappe.
6. GitHub viser de eksisterende filer som ændrede/erstattede. Skriv fx `Update to v0.2` og vælg **Commit changes**.
7. Åbn fanen **Actions** og vent på grønt flueben ved `pages build and deployment`.
8. Åbn appen igen. Genindlæs siden. Øverst skal der stå **Prototype 0.2**.

`github-update`-pakken indeholder kun de root-filer, der skal erstattes for at køre version 0.2. Den ændrer ikke lokale data på din iPad/computer. Personlige sætninger, der allerede er gemt i browseren, bør derfor blive liggende.

Hvis browseren mod forventning viser den gamle version, genindlæs siden en ekstra gang. Version 0.2 bruger nye cache-identifikatorer og versionsmarkering på runtime-filerne.
