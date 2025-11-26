const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "modifications.json");

// Middleware
app.use(cors()); // Autorise Vue.js (port 5173) à parler à ce serveur (port 3000)
app.use(express.json());

// Route 1 : Récupérer les modifications sauvegardées
app.get("/edits", (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    res.json(JSON.parse(data || "{}"));
  } else {
    res.json({});
  }
});

// Route 2 : Sauvegarder une modification
app.post("/edits", (req, res) => {
  const newEdits = req.body; // VueJS nous envoie l'objet complet des edits

  // On écrit directement dans le fichier (écrase l'ancien contenu)
  fs.writeFile(DATA_FILE, JSON.stringify(newEdits, null, 2), (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur écriture fichier" });
    }
    res.json({ status: "success" });
  });
});

// Modification pour permettre les tests sans lancer le serveur
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`📡 Serveur backend actif sur http://localhost:${PORT}`);
  });
}

module.exports = app; // Export indispensable pour les tests
