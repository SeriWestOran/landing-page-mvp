// server/routes/products.js
const express = require("express");
const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { createImageUpload } = require("../lib/upload");

const router = express.Router();
const upload = createImageUpload();

const ALLOWED_LISTING_TYPES = new Set(["stock", "on_order"]);

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

async function attachImages(product) {
  if (!product) return product;
  const res = await db.execute({
    sql: "SELECT id, image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id",
    args: [product.id],
  });
  return { ...product, images: res.rows };
}

// GET /api/products
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

    const result = await db.execute({
      sql: `SELECT * FROM products WHERE ${conditions.join(" AND ")} ORDER BY sort_order, created_at DESC`,
      args: params,
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des produits." });
  }
});

// GET /api/products/admin/all
router.get("/admin/all", requireAuth, async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM products ORDER BY sort_order, created_at DESC");
    const productsWithImages = await Promise.all(result.rows.map(attachImages));
    res.json(productsWithImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM products WHERE id = ? AND is_active = 1",
      args: [req.params.id],
    });
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Produit introuvable." });

    const withImages = await attachImages(row);
    res.json(withImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/products
router.post("/", requireAuth, async (req, res) => {
  try {
    const { errors, clean } = validateProduct(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const result = await db.execute({
      sql: `
        INSERT INTO products (name, description, price, currency, image_url, category, facebook_url, is_active, in_stock, listing_type, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        clean.name,
        clean.description ?? "",
        clean.price,
        clean.currency ?? "DZD",
        clean.image_url ?? "",
        clean.category ?? "",
        clean.facebook_url ?? "",
        clean.is_active ?? 1,
        clean.in_stock ?? 1,
        clean.listing_type ?? "stock",
        clean.sort_order ?? 0,
      ],
    });

    const newId = Number(result.lastInsertRowid);
    const createdResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [newId],
    });

    const withImages = await attachImages(createdResult.rows[0]);
    res.status(201).json(withImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la création du produit." });
  }
});

// PUT /api/products/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existingResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [req.params.id],
    });
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ error: "Produit introuvable." });

    const { errors, clean } = validateProduct(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });

    const merged = { ...existing, ...clean };

    await db.execute({
      sql: `
        UPDATE products SET
          name = ?, description = ?, price = ?, currency = ?,
          image_url = ?, category = ?, facebook_url = ?,
          is_active = ?, in_stock = ?, listing_type = ?,
          sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
      args: [
        merged.name,
        merged.description,
        merged.price,
        merged.currency,
        merged.image_url,
        merged.category,
        merged.facebook_url,
        merged.is_active,
        merged.in_stock,
        merged.listing_type,
        merged.sort_order,
        req.params.id,
      ],
    });

    const updatedResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [req.params.id],
    });

    const withImages = await attachImages(updatedResult.rows[0]);
    res.json(withImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour." });
  }
});

// DELETE /api/products/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: "DELETE FROM products WHERE id = ?",
      args: [req.params.id],
    });

    if (result.rowsAffected === 0) return res.status(404).json({ error: "Produit introuvable." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la suppression." });
  }
});

// POST /api/products/upload
router.post("/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
    res.json({ url: req.file.path });
  });
});

// POST /api/products/:id/images
router.post("/:id/images", requireAuth, async (req, res) => {
  try {
    const productRes = await db.execute({
      sql: "SELECT id FROM products WHERE id = ?",
      args: [req.params.id],
    });
    const product = productRes.rows[0];
    if (!product) return res.status(404).json({ error: "Produit introuvable." });

    upload.single("image")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });

      const imageUrl = req.file.path;

      const maxRes = await db.execute({
        sql: "SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?",
        args: [product.id],
      });
      const maxOrder = Number(maxRes.rows[0].m);

      const insertRes = await db.execute({
        sql: "INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)",
        args: [product.id, imageUrl, maxOrder + 1],
      });

      res.status(201).json({
        id: Number(insertRes.lastInsertRowid),
        image_url: imageUrl,
        sort_order: maxOrder + 1,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});
// DELETE /api/products/:id/images/:imageId
router.delete("/:id/images/:imageId", requireAuth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: "DELETE FROM product_images WHERE id = ? AND product_id = ?",
      args: [req.params.imageId, req.params.id],
    });

    if (result.rowsAffected === 0) return res.status(404).json({ error: "Photo introuvable." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;