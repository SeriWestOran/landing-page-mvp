// server/routes/products.js
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { createImageUpload } = require("../lib/upload");

const router = express.Router();
const upload = createImageUpload();

const ALLOWED_LISTING_TYPES = new Set(["stock", "on_order"]);

// --- Validation minimale, sans dépendance externe.
function validateProduct(body, { partial = false } = {}) {
  const errors = [];
  const clean = {};

  const requiredIfNotPartial = (present) => partial || present;

  if (requiredIfNotPartial(body.name !== undefined)) {
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 120) errors.push("Le nom est requis (max 120 caractères).");
    clean.name = name;
  }

  if (requiredIfNotPartial(body.price !== undefined)) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) errors.push("Le prix doit être un nombre positif.");
    clean.price = price;
  }

  if (body.description !== undefined) clean.description = String(body.description).slice(0, 2000);
  if (body.currency !== undefined) clean.currency = String(body.currency).slice(0, 10) || "DZD";
  if (body.image_url !== undefined) clean.image_url = String(body.image_url).slice(0, 500);
  if (body.category !== undefined) clean.category = String(body.category).slice(0, 80);
  if (body.facebook_url !== undefined) clean.facebook_url = String(body.facebook_url).slice(0, 500);
  if (body.is_active !== undefined) clean.is_active = body.is_active ? 1 : 0;
  if (body.in_stock !== undefined) clean.in_stock = body.in_stock ? 1 : 0;
  if (body.sort_order !== undefined) clean.sort_order = Number(body.sort_order) || 0;
  if (body.listing_type !== undefined) {
    const type = String(body.listing_type);
    if (!ALLOWED_LISTING_TYPES.has(type)) {
      errors.push("Type de fiche invalide (stock ou on_order attendu).");
    }
    clean.listing_type = type;
  }

  return { errors, clean };
}

// Charge la galerie de photos d'un produit et l'attache sous product.images.
async function attachImages(product) {
  if (!product) return product;
  const images = await db
    .prepare("SELECT id, image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id")
    .all(product.id);
  return { ...product, images };
}

async function attachImagesToAll(products) {
  return Promise.all(products.map(attachImages));
}

// GET /api/products — public, uniquement les produits actifs
// Filtres optionnels : ?category=... et ?type=stock|on_order
router.get("/", async (req, res) => {
  try {
    const { category, type } = req.query;
    const conditions = ["is_active = 1"];
    const params = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }
    if (type && ALLOWED_LISTING_TYPES.has(type)) {
      conditions.push("listing_type = ?");
      params.push(type);
    }

    const rows = await db
      .prepare(`SELECT * FROM products WHERE ${conditions.join(" AND ")} ORDER BY sort_order, created_at DESC`)
      .all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/products/admin/all — protégé, tous les produits (actifs + inactifs)
router.get("/admin/all", requireAuth, async (req, res) => {
  try {
    const rows = await db.prepare("SELECT * FROM products ORDER BY sort_order, created_at DESC").all();
    res.json(await attachImagesToAll(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/products/:id — public, avec la galerie de photos
router.get("/:id", async (req, res) => {
  try {
    const row = await db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Produit introuvable." });
    res.json(await attachImages(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/products — protégé, création
router.post("/", requireAuth, async (req, res) => {
  try {
    const { errors, clean } = validateProduct(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const info = await db
      .prepare(`
        INSERT INTO products (name, description, price, currency, image_url, category, facebook_url, is_active, in_stock, listing_type, sort_order)
        VALUES (@name, @description, @price, @currency, @image_url, @category, @facebook_url, @is_active, @in_stock, @listing_type, @sort_order)
      `)
      .run({
        name: clean.name,
        description: clean.description ?? "",
        price: clean.price,
        currency: clean.currency ?? "DZD",
        image_url: clean.image_url ?? "",
        category: clean.category ?? "",
        facebook_url: clean.facebook_url ?? "",
        is_active: clean.is_active ?? 1,
        in_stock: clean.in_stock ?? 1,
        listing_type: clean.listing_type ?? "stock",
        sort_order: clean.sort_order ?? 0,
      });

    const created = await db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(await attachImages(created));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PUT /api/products/:id — protégé, mise à jour partielle
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Produit introuvable." });

    const { errors, clean } = validateProduct(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });

    const merged = { ...existing, ...clean };

    await db
      .prepare(`
        UPDATE products SET
          name = @name, 
          description = @description, 
          price = @price, 
          currency = @currency,
          image_url = @image_url, 
          category = @category, 
          facebook_url = @facebook_url,
          is_active = @is_active, 
          in_stock = @in_stock, 
          listing_type = @listing_type,
          sort_order = @sort_order, 
          updated_at = datetime('now')
        WHERE id = @id
      `)
      .run({
        id: req.params.id,
        name: merged.name,
        description: merged.description ?? "",
        price: merged.price,
        currency: merged.currency ?? "DZD",
        image_url: merged.image_url ?? "",
        category: merged.category ?? "",
        facebook_url: merged.facebook_url ?? "",
        is_active: merged.is_active ?? 1,
        in_stock: merged.in_stock ?? 1,
        listing_type: merged.listing_type ?? "stock",
        sort_order: merged.sort_order ?? 0,
      });

    const updated = await db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    res.json(await attachImages(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /api/products/:id — protégé, suppression définitive
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const info = await db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Produit introuvable." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/products/upload — protégé, upload de l'image principale d'un produit
router.post("/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
    res.json({ url: req.file.path || `/images/uploads/${req.file.filename}` });
  });
});

// --- Galerie de photos supplémentaires d'un produit ---

// POST /api/products/:id/images — protégé, ajoute une photo à la galerie
router.post("/:id/images", requireAuth, async (req, res) => {
  try {
    const product = await db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id);
    if (!product) return res.status(404).json({ error: "Produit introuvable." });

    upload.single("image")(req, res, async (err) => {
      try {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });

        const imageUrl = req.file.path || `/images/uploads/${req.file.filename}`;
        const maxOrderRow = await db
          .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?")
          .get(product.id);
        const nextOrder = (maxOrderRow?.m ?? -1) + 1;

        const info = await db
          .prepare("INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)")
          .run(product.id, imageUrl, nextOrder);

        res.status(201).json({ id: info.lastInsertRowid, image_url: imageUrl, sort_order: nextOrder });
      } catch (innerErr) {
        console.error(innerErr);
        res.status(500).json({ error: "Erreur serveur." });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /api/products/:id/images/:imageId — protégé, retire une photo de la galerie
router.delete("/:id/images/:imageId", requireAuth, async (req, res) => {
  try {
    const info = await db
      .prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?")
      .run(req.params.imageId, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Photo introuvable." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
