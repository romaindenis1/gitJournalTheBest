const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

function startServer(userDataPath) {
  const app = express();
  const PORT = 3000;
  
  // IMPORTANT : On stocke le fichier là où on a la permission (AppData)
  // Si userDataPath n'est pas fourni (mode dev classique), on utilise __dirname
  const DATA_DIR = userDataPath || __dirname;
  const DATA_FILE = path.join(DATA_DIR, "modifications.json");

  console.log("📁 Stockage des données dans :", DATA_FILE);

  app.use(cors());
  app.use(express.json());

  app.get("/edits", (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      res.json(JSON.parse(data || "{}"));
    } else {
      res.json({});
    }
  });

  app.post("/edits", (req, res) => {
    const newEdits = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(newEdits, null, 2), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur écriture fichier" });
      }
      res.json({ status: "success" });
    });
  });

  const server = app.listen(PORT, () => {
    console.log(`📡 Serveur backend actif sur http://localhost:${PORT}`);
  });
  
  return server;
}

// Si lancé directement via "node server.js"
if (require.main === module) {
  startServer();
}

module.exports = startServer;