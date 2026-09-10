// server/db.js
require("dotenv").config();
const { createClient } = require("@libsql/client");

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("⚠️ Variables TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN manquantes dans .env !");
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initSchema() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        description   TEXT DEFAULT '',
        price         REAL NOT NULL,
        currency      TEXT NOT NULL DEFAULT 'DZD',
        image_url     TEXT DEFAULT '',
        category      TEXT DEFAULT '',
        facebook_url  TEXT DEFAULT '',
        is_active     INTEGER NOT NULL DEFAULT 1,
        in_stock      INTEGER NOT NULL DEFAULT 1,
        listing_type  TEXT NOT NULL DEFAULT 'stock',
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migration automatique : Ajoute listing_type si la table existait déjà sans cette colonne
    try {
      await db.execute("ALTER TABLE products ADD COLUMN listing_type TEXT NOT NULL DEFAULT 'stock'");
    } catch (e) {
      // Ignore l'erreur si la colonne existe déjà
    }

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_products_active_sort
        ON products (is_active, sort_order, created_at DESC);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS product_images (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url     TEXT NOT NULL,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_product_images_product
        ON product_images (product_id, sort_order);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        description   TEXT DEFAULT '',
        price_text    TEXT DEFAULT '',
        image_url     TEXT DEFAULT '',
        is_active     INTEGER NOT NULL DEFAULT 1,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_services_active_sort
        ON services (is_active, sort_order, created_at DESC);
    `);

    console.log("✅ Schéma de base de données Turso initialisé et mis à jour.");
  } catch (err) {
    console.error("❌ Erreur lors de l'initialisation du schéma Turso :", err);
  }
}

// Lancement automatique de l'initialisation du schéma
initSchema();

module.exports = { db };