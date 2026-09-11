const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Utilisation de path.resolve pour cibler la racine du projet
const PUBLIC_DIR = path.resolve(__dirname, "..", "public"); 
// Remarque : Si server.js est à la racine, utilisez : path.join(__dirname, "public")

// 1. Servir les fichiers statiques
app.use(express.static(PUBLIC_DIR));

// 2. Route Health Check
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// 3. Fallback pour l'accueil (index.html)
app.get("*", (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Erreur lors de l'envoi de index.html:", err.message);
      res.status(404).send("Fichier index.html introuvable sur le serveur.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré avec succès sur le port ${PORT}`);
});
