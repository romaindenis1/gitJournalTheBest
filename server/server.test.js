const request = require("supertest");
const fs = require("fs");
const path = require("path");
// Importe l'app sans lancer le serveur grâce à la modif ci-dessus
const app = require("./server");

// On mocke 'fs' pour ne pas toucher au vrai disque dur
jest.mock("fs");

describe("API Backend GitJournal", () => {
  const mockFilePath = path.join(__dirname, "modifications.json");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Test de la Route GET /edits ---
  describe("GET /edits", () => {
    it("doit retourner un objet vide {} si le fichier n'existe pas", async () => {
      // Simulation : fs.existsSync renvoie false
      fs.existsSync.mockReturnValue(false);

      const res = await request(app).get("/edits");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({});
    });

    it("doit retourner le contenu JSON si le fichier existe", async () => {
      const mockData = { commit123: { duration: 60, message: "Test" } };

      // Simulation : le fichier existe et contient du JSON valide
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const res = await request(app).get("/edits");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockData);
      // Vérifie que le serveur a bien lu le bon fichier
      expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, "utf8");
    });
  });

  // --- Test de la Route POST /edits ---
  describe("POST /edits", () => {
    it("doit sauvegarder les données et retourner success", async () => {
      const payload = { commitABC: { message: "Test Update" } };

      // Simulation : l'écriture fonctionne (appelle le callback null => pas d'erreur)
      fs.writeFile.mockImplementation((file, data, cb) => cb(null));

      const res = await request(app)
        .post("/edits")
        .send(payload)
        .set("Content-Type", "application/json");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: "success" });

      // Vérifie qu'on a bien essayé d'écrire les données formatées
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockFilePath,
        JSON.stringify(payload, null, 2),
        expect.any(Function)
      );
    });

    it("doit retourner une erreur 500 si l'écriture échoue", async () => {
      // Simulation : l'écriture échoue (disque plein, droits, etc.)
      fs.writeFile.mockImplementation((file, data, cb) =>
        cb(new Error("Erreur disque"))
      );

      const res = await request(app).post("/edits").send({});

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Erreur écriture fichier" });
    });
  });
});
