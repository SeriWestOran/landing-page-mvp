// server/index.js
const express = require("express");
const path = require("path");
const db = require("./db");
const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve les fichiers statiques (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "../public")));
app.use("/images/uploads", express.static(path.join(__dirname, "../public/images/uploads")));

// Routes API
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);

// Route dynamique pour la page produit (Serve le HTML enrichi pour Facebook / OpenGraph)
app.get("/produit/:id", async (req, res) => {
  try {
    const product = await db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1").get(req.params.id);
    const fs = require("fs");
    let html = fs.readFileSync(path.join(__dirname, "templates/product.html"), "utf8");

    if (!product) {
      html = html
        .replace(/{{PAGE_TITLE}}/g, "Produit introuvable - BarakaShop")
        .replace(/{{OG_TITLE}}/g, "Produit introuvable")
        .replace(/{{OG_DESCRIPTION}}/g, "Ce produit n'est plus disponible.")
        .replace(/{{OG_IMAGE}}/g, "https://barakashopaadl.onrender.com/images/default.jpg")
        .replace(/{{OG_URL}}/g, `https://barakashopaadl.onrender.com/produit/${req.params.id}`)
        .replace(/{{SITE_NAME}}/g, "BarakaShop");
      return res.status(404).send(html);
    }

    const host = req.get("host");
    const protocol = req.protocol;
    let imageUrl = product.image_url || "";
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `${protocol}://${host}${imageUrl}`;
    }

    html = html
      .replace(/{{PAGE_TITLE}}/g, `${product.name} - BarakaShop`)
      .replace(/{{OG_TITLE}}/g, product.name)
      .replace(/{{OG_DESCRIPTION}}/g, product.description || `Acheter ${product.name} au meilleur prix.`)
      .replace(/{{OG_IMAGE}}/g, imageUrl)
      .replace(/{{OG_URL}}/g, `${protocol}://${host}/produit/${product.id}`)
      .replace(/{{SITE_NAME}}/g, "BarakaShop");

    res.send(html);
  } catch (err) {
    console.error("Erreur serveur sur /produit/:id :", err);
    res.status(500).send("Erreur serveur.");
  }
});

// Redirection globale vers l'accueil pour les autres routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
