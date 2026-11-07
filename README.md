# Tractions — suivi des tractions assistées

Petite appli web installable (PWA) pour noter chaque séance de tractions avec élastiques et suivre ses progrès.
Aucun compte, aucun serveur : les données restent dans le navigateur du téléphone.

## Fonctionnalités

- **Séance** : choix de l'élastique (ou de plusieurs combinés, ou « sans »), nombre de répétitions, plusieurs séries par séance, note, date modifiable.
- **Progrès** : aide moyenne par séance (en kg, pondérée par les répétitions), répétitions par séance, records par configuration d'élastiques, jalons (premier passage à un élastique plus fin, première traction sans aide…).
- **Historique** : modifier ou supprimer une séance.
- **Réglages** : aide en kg de chaque élastique (par défaut, le milieu de la fourchette du fabricant), export et import JSON, remise à zéro.

| Élastique | Fourchette fabricant | Valeur par défaut |
|-----------|---------------------|-------------------|
| Jaune     | 2–7 kg              | 4,5 kg            |
| Rouge     | 7–16 kg             | 11,5 kg           |
| Noir      | 11–30 kg            | 20,5 kg           |
| Violet    | 16–38 kg            | 27 kg             |
| Vert      | 23–57 kg            | 40 kg             |

## Lancer en local

```bash
python -m http.server 8765
```
puis ouvrir http://localhost:8765

## Mettre en ligne sur GitHub Pages

1. Créer un dépôt vide sur GitHub (par exemple `tractions`).
2. Dans ce dossier :
   ```bash
   git add .
   git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/<ton-pseudo>/tractions.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Source : Deploy from a branch → main / (root)**.
4. Au bout d'une minute environ, l'appli est accessible à l'adresse `https://<ton-pseudo>.github.io/tractions/`.

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir l'adresse, puis Partager → « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ → « Installer l'application ».

Une fois installée, l'appli fonctionne hors ligne.

## Mettre à jour l'appli

Après une modification, incrémenter `CACHE` dans `sw.js` (`tractions-v2`, etc.) puis pousser sur GitHub.

## Sauvegarde

Les données sont stockées dans le navigateur du téléphone (localStorage). Si l'appli est supprimée ou les données du navigateur effacées, elles sont perdues : pense à faire **Réglages → Exporter** de temps en temps.
