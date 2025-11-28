const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { exec } = require("child_process");

function startServer(userDataPath) {
  const app = express();
  const PORT = 3000;

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

  // --- 3. GET GIT COMMITS (Parsing avec octet Nul) ---
  app.get("/commits", (req, res) => {
    const { owner, repo } = req.query;
    
    // REMPLACER cette valeur par le chemin d'accès au dossier git que vous voulez suivre.
    const GIT_REPO_PATH = 'C:/Users/ps04egl/Desktop/cicd-todo-app'; 
    
    if (owner && repo) {
        console.log(`[GitJournal] Requête configurée pour: ${owner}/${repo}`);
    } 
    console.log(`[GitJournal] EXÉCUTION DE GIT LOG DANS LE DOSSIER: ${GIT_REPO_PATH}`);

    // NOUVELLE COMMANDE ROBUSTE: utilise l'octet nul (%x00) pour séparer chaque commit.
    // Format: Hash|||Date|||Message Complet (%B = Sujet + Corps) + Null Byte
    const cmd = `git log --pretty=format:"%H|||%ad|||%B%x00" --date=iso-strict`;

    exec(cmd, { cwd: GIT_REPO_PATH }, (error, stdout, stderr) => { 
      if (error) {
        console.error("Git error:", stderr);
        if (stderr.includes("not a git repository")) {
             return res.status(400).json({ error: `Dossier non trouvé ou non-git: ${GIT_REPO_PATH}` });
        }
        return res.json([]); 
      }
      
      // 1. Séparer par l'octet Nul (\x00)
      const rawCommits = stdout.split('\x00').filter((line) => line.trim() !== "");

      const parsedCommits = rawCommits.map((line) => {
        // La ligne contient: Hash|||Date|||Sujet + Corps
        const parts = line.split("|||");
        
        // Nous attendons 3 parties (Hash, Date, Sujet+Corps). Si l'une des parties est manquante, 
        // cela signifie que le commit entier n'a pas pu être parsé (problème rare dans le message lui-même).
        if (parts.length < 3) { 
            // Supprimé le console.warn pour ne pas inonder le log avec des fragments.
            return null;
        }

        const hash = parts[0].trim();
        const date = parts[1].trim(); 
        
        // Le message complet (Sujet + Corps) est le reste, au cas où le message contiendrait |||
        const fullMessage = parts.slice(2).join("|||").trim(); 
        
        // Séparer le sujet du corps (la première ligne est le sujet)
        const [subject, ...bodyLines] = fullMessage.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const body = bodyLines.join('\n');


        let time = null;
        let status = "DONE";
        let category = "general";

        // Extraction des tags du message complet (Sujet + Corps)
        const tags = fullMessage.match(/\[(.*?)\]/g);

        if (tags) {
          tags.forEach((tagRaw) => {
            const tag = tagRaw.replace(/[\[\]]/g, "").trim(); 
            if (/^\d+(h|m)?(\d+m?)?$/.test(tag)) {
              time = tag;
            } else if (["DONE", "WIP", "FIX", "FEAT", "BUG"].includes(tag.toUpperCase())) {
              status = tag.toUpperCase();
            } else {
              // Si ce n'est ni un temps ni un statut connu, c'est une catégorie.
              category = tag.toLowerCase(); 
            }
          });
        }
        
        // Si aucun tag de catégorie n'est trouvé, la catégorie reste 'general' (ou 'manual' si c'était une tâche manuelle)
        // Les commits avec [minutes] [status] sans autre tag de catégorie seront bien acceptés
        // et auront 'general' comme catégorie.

        return {
          id: hash,
          message: subject || "No Subject", 
          fullBody: body, 
          date,
          parsedTime: time,
          parsedStatus: status,
          category: category, 
        };
      }).filter(c => c !== null);

      res.json(parsedCommits);
    });
  });

  const server = app.listen(PORT, () => {
    console.log(`📡 Serveur backend actif sur http://localhost:${PORT}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;