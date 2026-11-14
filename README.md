# Calisthénie — planning et suivi

Application web (PWA) en français pour planifier et suivre son entraînement de calisthénie.
Elle s'adapte à tes performances avec des règles simples (sans IA, sans clé d'API).

## Fonctions
- **Planning** de la semaine par catégorie (pousser, abdos, jambes, dos, bras, grip).
- **Fiches d'exercices** : séries, reps, repos, niveau, étapes, versions plus facile / plus difficile.
- **Suivi rapide** : « J'ai tout fait », « J'ai fait moins », « Trop dur », saisie détaillée, case douleur.
- **Adaptation** par double palier + règles de prudence en cas de douleur, toujours expliquées.
- **Saisie vocale** (micro du clavier ou bouton micro fr-FR), avec confirmation obligatoire.
- **Historique** et graphiques par exercice.
- **Sauvegarde** : export / import d'un fichier JSON.

## Les fichiers
| Fichier | Rôle |
|---|---|
| `programme.js` | **tes exercices, séances, planning et règles** — le seul fichier à modifier |
| `app.js` | le fonctionnement de l'app (commenté) |
| `index.html`, `style.css` | la page et son apparence (mode sombre automatique) |
| `manifest.json`, `sw.js`, `icones/` | installation sur l'écran d'accueil et mode hors connexion |

## Tes données
Elles restent **dans le navigateur de ton téléphone** (localStorage), jamais sur GitHub.
Exporte une sauvegarde régulièrement (Réglages → Exporter).

⚠️ Cette app ne remplace pas un avis médical. Après une pause, reprends progressivement.
