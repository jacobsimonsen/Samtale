# Opdatér GitHub Pages til 0.3.1 beta

1. Lav først **Download komplet backup (.json)** i den nuværende app.
2. Pak `samtalestotte-github-update-v0.3.1-beta1.zip` ud i en ny lokal mappe.
3. Åbn GitHub-repositoryet `Samtale`.
4. Vælg **Add file → Upload files**.
5. Træk **alt indhold** fra den udpakkede mappe ind i uploadfeltet, inklusive mapperne `icons`, `examples` og `tests`. Upload til repositoryets rod.
6. Skriv fx `Update to v0.3.1 beta1` og vælg **Commit changes**.
7. Åbn **Actions** og vent på grønt flueben ved `pages build and deployment`.
8. Åbn den eksisterende GitHub Pages-adresse. Genindlæs siden, hvis den gamle version stadig vises; service workeren har en ny cacheversion.
9. Kontroller at overskriften viser **Prototype 0.3.1 beta**, og at status viser **Dansk sprogmodel klar: 391.867 ordformer**.
10. Åbn **Redigér indhold**. Under **Personlige ord** bør tælleren være `0 personlige ord`, medmindre der faktisk lå eksplicit tilføjede/importerede ord fra tidligere.

Den ca. 7 MB store `language-data.json` skal uploades sammen med de øvrige filer. Personlige sætninger, kladde og brugslæring ligger fortsat kun lokalt i browseren og indgår ikke i GitHub-pakken.

Efter opdateringen er de vigtigste hurtigtests:

- `kaf` og `kaff`: ingen hele kaffesætninger alene.
- `kaffe`: relevante hele kaffesætninger kan vises.
- `ben`: relevant bensætning kan vises straks.
- vælg `kaffe` via **Fortsæt**: efter valget kan hele kaffesætninger vises.
