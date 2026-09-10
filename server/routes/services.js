// server/routes/services.js
const express = require("express");
const router = express.Router();
const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { createImageUpload } = require("../lib/upload");

const upload = createImageUpload();

// GET /api/services (Public)
router.get("/", async (req, res) => {
  try {
    const result = await db.execute(
      "SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur GET /services :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/services/admin/all (Admin)
router.get("/admin/all", requireAuth, async (req, res) => {
  try {
    const result = await db.execute(
      "SELECT * FROM services ORDER BY sort_order ASC, created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur GET /services/admin/all :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/services/upload
router.post("/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
    res.json({ url: req.file.path });
  });
});

// POST /api/services
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description, price_text, image_url, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Le nom du service est requis." });
    }

    const result = await db.execute({
      sql: `INSERT INTO services (name, description, price_text, image_url, is_active)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        name,
        description || "",
        price_text || "",
        image_url || "",
        is_active ? 1 : 0,
      ],
    });

    res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error("Erreur POST /services :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// PUT /api/services/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { name, description, price_text, image_url, is_active } = req.body;

    await db.execute({
      sql: `UPDATE services 
            SET name = ?, description = ?, price_text = ?, image_url = ?, is_active = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        name,
        description || "",
        price_text || "",
        image_url || "",
        is_active ? 1 : 0,
        req.params.id,
      ],
    });

    res.json({ message: "Service mis à jour avec succès." });
  } catch (err) {
    console.error("Erreur PUT /services :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// DELETE /api/services/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM services WHERE id = ?",
      args: [req.params.id],
    });
    res.json({ message: "Service supprimé." });
  } catch (err) {
    console.error("Erreur DELETE /services :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;