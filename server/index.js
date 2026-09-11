const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// 1. Gestion dynamique du Port attribué par Render
const PORT = process.env.PORT || 3000;

// 2. Middlewares de base & CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serveur les fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, "public")));

// 3. Route de contrôle de santé (Health Check pour Render)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// 4. Exemple d'APIs pour vos produits et services
app.get("/api/products", (req, res) => {
  // Remplacez ou reliez cette réponse à votre base de données
  res.json([]);
});

app.get("/api/services", (req, res) => {
  // Remplacez ou reliez cette réponse à votre base de données
  res.json([]);
});

app.get("/api/products/:id", (req, res) => {
  const productId = req.params.id;
  // Logique pour récupérer un produit spécifique
  res.json({ id: productId, name: "Produit exemple", price: 0, in_stock: true });
});

// 5. Redirection de la fiche produit vers product.html
app.get("/produit/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product.html"));
});

// 6. Redirection Admin
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Route par défaut (fallback SPA / Accueil)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Lancement du serveur sur process.env.PORT
app.listen(PORT, () => {
  console.log(`Serveur démarré avec succès sur le port ${PORT}`);
});
