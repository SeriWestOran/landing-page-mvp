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

["JWT_SECRET", "ADMIN_PASSWORD_HASH"].forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️ Variable d'environnement manquante : ${key} (voir .env.example)`);
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
        scriptSrc: ["'self'", "'unsafe-inline'", "blob:"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://res.cloudinary.com"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    credentials: true,
  })
);
app.use(morgan("tiny"));
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

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

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const PRODUCT_TEMPLATE_PATH = path.join(__dirname, "templates", "product.html");
const SERVICE_TEMPLATE_PATH = path.join(__dirname, "templates", "service.html");

// Fonction utilitaire pour garantir qu'une URL d'image renvoie une vraie image valide
function resolveValidImageUrl(rawUrl, fallback, origin) {
  if (!rawUrl) {
    return new URL(fallback, origin).toString();
  }

  // Si c'est une URL absolue (Cloudinary, Imgur, etc.)
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }

  // Si c'est un chemin relatif (/images/uploads/...)
  const localFilePath = path.join(__dirname, "..", "public", rawUrl);
  
  // Si le fichier n'existe pas localement sur le disque de Render
  if (!fs.existsSync(localFilePath)) {
    return new URL(fallback, origin).toString();
  }

  return new URL(rawUrl, origin).toString();
}

app.get("/produit/:id", async (req, res) => {
  let product = null;
  try {
    product = await db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1").get(req.params.id);
  } catch (err) {
    console.error("Erreur de lecture produit pour /produit/:id :", err.message);
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
      ? product.description.slice(0, 200)
      : `${product.name} — ${product.price} ${product.currency}`;
    
    imageUrl = resolveValidImageUrl(product.image_url, fallbackImage, origin);
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

app.get("/service/:id", async (req, res) => {
  let service = null;
  try {
    service = await db.prepare("SELECT * FROM services WHERE id = ? AND is_active = 1").get(req.params.id);
  } catch (err) {
    console.error("Erreur de lecture service pour /service/:id :", err.message);
    service = null;
  }

  const site = loadSiteConfig();
  const origin = `${req.protocol}://${req.get("host")}`;
  const storeName = site.storeName || "Boutique";
  const fallbackImage = site.heroImage || "/images/placeholder-1.svg";

  let title, description, imageUrl;

  if (service) {
    title = `${service.name} — ${storeName}`;
    description = service.description
      ? service.description.slice(0, 200)
      : service.price_text || `Service proposé par ${storeName}`;

    imageUrl = resolveValidImageUrl(service.image_url, fallbackImage, origin);
  } else {
    title = `Service introuvable — ${storeName}`;
    description = "Ce service n'existe plus ou le lien est incorrect.";
    imageUrl = new URL(fallbackImage, origin).toString();
  }

  const canonicalUrl = `${origin}/service/${encodeURIComponent(req.params.id)}`;

  fs.readFile(SERVICE_TEMPLATE_PATH, "utf8", (err, html) => {
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

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

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
