// server/index.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const productRoutes = require("./routes/products");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Parsers pour intercepter le JSON du login
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serveur de fichiers statiques (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "../public")));
app.use("/images/uploads", express.static(path.join(__dirname, "../public/images/uploads")));

// Routes d'API
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);

// Page Admin
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

// Page Produit Dynamique
app.get("/produit/:id", async (req, res) => {
  try {
    const product = await db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1").get(req.params.id);
    
    // CORRECTION : Le chemin pointe vers public/product.html
    const productHtmlPath = path.join(__dirname, "../public/product.html");
    
    if (!fs.existsSync(productHtmlPath)) {
      return res.status(404).send("Fichier product.html introuvable dans /public.");
    }

    let html = fs.readFileSync(productHtmlPath, "utf8");

    if (!product) {
      return res.status(404).send("Produit non trouvé");
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
      .replace(/{{OG_DESCRIPTION}}/g, product.description || `Acheter ${product.name}`)
      .replace(/{{OG_IMAGE}}/g, imageUrl)
      .replace(/{{OG_URL}}/g, `${protocol}://${host}/produit/${product.id}`)
      .replace(/{{SITE_NAME}}/g, "BarakaShop");

    res.send(html);
  } catch (err) {
    console.error("Erreur serveur route produit :", err);
    res.status(500).send("Erreur serveur.");
  }
});

// Route par défaut (Accueil)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
