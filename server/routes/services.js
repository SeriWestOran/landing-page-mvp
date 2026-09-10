// server/routes/services.js
const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { createImageUpload } = require("../lib/upload");

const router = express.Router();
const upload = createImageUpload();

function validateService(body, { partial = false } = {}) {
  const errors = [];
  const clean = {};

  const requiredIfNotPartial = (present) => partial || present;

  if (requiredIfNotPartial(body.name !== undefined)) {
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 120) errors.push("Le nom est requis (max 120 caractères).");
    clean.name = name;
  }

  if (body.description !== undefined) clean.description = String(body.description).slice(0, 2000);
  if (body.price_text !== undefined) clean.price_text = String(body.price_text).slice(0, 120);
  if (body.image_url !== undefined) clean.image_url = String(body.image_url).slice(0, 500);
  if (body.is_active !== undefined) clean.is_active = body.is_active ? 1 : 0;
  if (body.sort_order !== undefined) clean.sort_order = Number(body.sort_order) || 0;

  return { errors, clean };
}

// GET /api/services — public, uniquement les services actifs
router.get("/", async (req, res) => {
  try {
    const rows = await db
      .prepare("SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order, created_at DESC")
      .all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/services/admin/all — protégé, tous les services
router.get("/admin/all", requireAuth, async (req, res) => {
  try {
    const rows = await db.prepare("SELECT * FROM services ORDER BY sort_order, created_at DESC").all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/services/:id — public
router.get("/:id", async (req, res) => {
  try {
    const row = await db.prepare("SELECT * FROM services WHERE id = ? AND is_active = 1").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Service introuvable." });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/services — protégé, création
router.post("/", requireAuth, async (req, res) => {
  try {
    const { errors, clean } = validateService(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const info = await db
      .prepare(`
        INSERT INTO services (name, description, price_text, image_url, is_active, sort_order)
        VALUES (@name, @description, @price_text, @image_url, @is_active, @sort_order)
      `)
      .run({
        name: clean.name,
        description: clean.description ?? "",
        price_text: clean.price_text ?? "",
        image_url: clean.image_url ?? "",
        is_active: clean.is_active ?? 1,
        sort_order: clean.sort_order ?? 0,
      });

    const created = await db.prepare("SELECT * FROM services WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PUT /api/services/:id — protégé, mise à jour partielle
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Service introuvable." });

    const { errors, clean } = validateService(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });

    const merged = { ...existing, ...clean };
    await db
      .prepare(`
        UPDATE services SET
          name = @name, description = @description, price_text = @price_text,
          image_url = @image_url, is_active = @is_active, sort_order = @sort_order,
          updated_at = datetime('now')
        WHERE id = @id
      `)
      .run({ ...merged, id: req.params.id });

    const updated = await db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /api/services/:id — protégé
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const info = await db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Service introuvable." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/services/upload — protégé, upload de l'image d'un service
router.post("/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
    res.json({ url: req.file.path });
  });
});

module.exports = router;
