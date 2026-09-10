// server/index.js
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const productsRouter = require("./routes/products");
const servicesRouter = require("./routes/services");
const authRouter = require("./routes/auth");
const db = require("./db");
const { loadSiteConfig } = require("./site-config");

// Vérifie tôt que les secrets essentiels sont bien définis : mieux vaut
// planter au démarrage qu'accepter des requêtes avec une config cassée.
["JWT_SECRET", "ADMIN_PASSWORD_HASH"].forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️  Variable d'environnement manquante : ${key} (voir .env.example)`);
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.cloudinary.com", "https://*.turso.io"],
      },
    },
  })
);
app.use(morgan("tiny"));
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// Limite générale anti-abus sur toute l'API.
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/services", servicesRouter);

// Échappe une valeur avant de l'insérer dans un attribut HTML (title, meta content...).
function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const PRODUCT_TEMPLATE_PATH = path.join(__dirname, "templates", "product.html");

// Page produit partageable (ex: sur un post Facebook). Le HTML est généré
// avec les vraies balises Open Graph (titre, image, prix) AVANT d'être
// envoyé, car les robots qui génèrent les aperçus de liens (Facebook,
// WhatsApp...) n'exécutent pas le JavaScript : sans ça, ils ne verraient
// qu'un titre générique et aucune image.
app.get("/produit/:id", async (req, res) => {
  let product = null;
  try {
    const result = await db.execute({
      sql: "SELECT * FROM products WHERE id = ? AND is_active = 1",
      args: [req.params.id],
    });
    product = result.rows[0] || null;
  } catch {
    product = null;
  }

  const site = loadSiteConfig();
  const origin = `${req.protocol}://${req.get("host")}`;
  const storeName = site.storeName || "Boutique";
  const fallbackImage = site.heroImage || "/images/placeholder-1.svg";

  let title, description, imageUrl;

  if (product) {
    title = `${product.name} — ${storeName}`;
    description = product.description
      ? String(product.description).slice(0, 200)
      : `${product.name} — ${product.price} ${product.currency}`;
    try {
      imageUrl = new URL(product.image_url || fallbackImage, origin).toString();
    } catch {
      imageUrl = new URL(fallbackImage, origin).toString();
    }
  } else {
    title = `Produit introuvable — ${storeName}`;
    description = "Ce produit n'existe plus ou le lien est incorrect.";
    imageUrl = new URL(fallbackImage, origin).toString();
  }

  const canonicalUrl = `${origin}/produit/${encodeURIComponent(req.params.id)}`;

  fs.readFile(PRODUCT_TEMPLATE_PATH, "utf8", (err, html) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Erreur serveur.");
    }

    const filled = html
      .replaceAll("{{PAGE_TITLE}}", escapeAttr(title))
      .replaceAll("{{OG_TITLE}}", escapeAttr(title))
      .replaceAll("{{OG_DESCRIPTION}}", escapeAttr(description))
      .replaceAll("{{OG_IMAGE}}", escapeAttr(imageUrl))
      .replaceAll("{{OG_URL}}", escapeAttr(canonicalUrl))
      .replaceAll("{{SITE_NAME}}", escapeAttr(storeName));

    res.set("Cache-Control", "no-cache");
    res.send(filled);
  });
});
// Fichiers statiques (landing page, admin, images)
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

// 404 JSON pour les routes /api inconnues
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint introuvable." });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur." });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
