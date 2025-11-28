# 📘 GitJournal - Générateur de Rapports Automatisé

GitJournal est un outil fullstack (Vue.js + Node.js) qui transforme l'historique de vos commits GitHub en un journal de travail précis, éditable et exportable en PDF.

## 🚀 Fonctionnalités Clés

### 1. ⏱️ Time Tracking Algorithmique
Contrairement aux outils classiques où il faut déclarer ses heures manuellement, GitJournal **calcule le temps automatiquement** :
- Il analyse l'heure de chaque commit.
- Il la compare au commit précédent.
- **Règle métier :** Si l'écart est inférieur à 3h, il est comptabilisé comme temps de travail. Sinon, une nouvelle session démarre (début de journée ou retour de pause).

### 2. ✏️ Édition & Persistance Serveur
Vous pouvez corriger les imperfections de l'historique Git directement dans l'interface :
- Renommer un commit ("Fix typo" -> "Correction orthographique").
- Ajuster une durée manuellement.
- **Sauvegarde automatique :** Toutes vos modifications sont envoyées à un serveur Node.js local (`modifications.json`). Si vous rafraîchissez la page, vos corrections sont conservées.

### 3. 📄 Export PDF Professionnel
Générez un rapport propre (A4) prêt à être envoyé à un client ou un manager, incluant :
- Le total des heures par jour.
- Le détail des tâches effectuées.
- Une mise en page claire sans les éléments d'interface.

### 4. ⚙️ Zéro Config Fichier
Aucun fichier `.env` ou `.config.js` compliqué à gérer.
- Les identifiants (Token, Repo, User) sont stockés localement grâce au backend qui enregistre chaque modification.
- L'interface se souvient de votre dernier projet ouvert.

---

## 🛠️ Installation & Démarrage

Ce projet nécessite deux terminaux (un pour le Frontend, un pour le Backend).

### Pré-requis
- Node.js (v22+)
- Git

### 1. Lancer le Backend (Serveur de sauvegarde)
Ce petit serveur gère le fichier `modifications.json`.

```bash
cd server
npm install
node server.js
```

### 2. Lancer le frontend 
```bash
cd gitjournal-vue
npm i
npm run dev
```
