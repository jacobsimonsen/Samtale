# Opdatér GitHub Pages til 0.3 beta

1. Lav gerne først **Download komplet backup (.json)** i den nuværende app.
2. Pak `samtalestotte-github-update-v0.3-beta1.zip` ud i en ny lokal mappe.
3. Åbn GitHub-repositoryet `Samtale`.
4. Vælg **Add file → Upload files**.
5. Træk alle filerne fra den udpakkede mappe ind i uploadfeltet. Upload filerne til repositoryets rod, ikke til en ny undermappe.
6. Skriv fx `Update to v0.3 beta1` som commit-besked og vælg **Commit changes**.
7. Åbn **Actions** og vent på grønt flueben ved `pages build and deployment`.
8. Åbn den eksisterende GitHub Pages-adresse. Hvis den gamle version stadig vises, genindlæs siden. Service workeren bruger en ny cacheversion.
9. Kontroller at overskriften viser **Prototype 0.3 beta**, og at status viser **Dansk sprogmodel klar: 391.867 ordformer**.

Den nye `language-data.json` er ca. 7 MB og skal uploades sammen med de øvrige filer. Personlige sætninger og brugsdata ligger fortsat kun lokalt i browseren og indgår ikke i GitHub-filerne.
