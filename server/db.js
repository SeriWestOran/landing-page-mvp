// server/db.js
require("dotenv").config();
const { createClient } = require("@libsql/client");

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("⚠️ Variables TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN manquantes dans .env !");
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initSchema() {
  try {
    await client.execute(`
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

    // Migration automatique : ajoute listing_type si la table existait déjà sans cette colonne.
    try {
      await client.execute("ALTER TABLE products ADD COLUMN listing_type TEXT NOT NULL DEFAULT 'stock'");
    } catch {
      // Ignore l'erreur si la colonne existe déjà.
    }

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_products_active_sort
        ON products (is_active, sort_order, created_at DESC);
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS product_images (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url     TEXT NOT NULL,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_product_images_product
        ON product_images (product_id, sort_order);
    `);

    await client.execute(`
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

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_services_active_sort
        ON services (is_active, sort_order, created_at DESC);
    `);

    console.log("✅ Schéma de base de données Turso initialisé et mis à jour.");
  } catch (err) {
    console.error("❌ Erreur lors de l'initialisation du schéma Turso :", err);
  }
}

const schemaReady = initSchema();

/* =========================================================
   Couche de compatibilité : imite l'API .prepare().get/all/run
   de better-sqlite3 par-dessus le client Turso (@libsql/client),
   pour que le reste du projet (products.js, services.js,
   index.js...) n'ait pas besoin d'être réécrit.

   Différence importante avec better-sqlite3 : ces méthodes sont
   asynchrones ici (Turso communique par le réseau). Chaque appel
   doit donc être précédé de `await` — ce qui est déjà le cas dans
   les routes fournies avec le projet.
   ========================================================= */

// Accepte soit des arguments positionnels (?), soit un seul objet
// pour les paramètres nommés (@nom), comme le fait better-sqlite3.
function normalizeArgs(args) {
  if (args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

// Convertit un BigInt (identifiants Turso) en Number classique pour
// rester compatible avec le reste du code, qui ne manipule pas de BigInt.
function toNumber(value) {
  return typeof value === "bigint" ? Number(value) : value;
}

function prepare(sql) {
  return {
    async get(...args) {
      await schemaReady;
      const result = await client.execute({ sql, args: normalizeArgs(args) });
      return result.rows[0] || undefined;
    },
    async all(...args) {
      await schemaReady;
      const result = await client.execute({ sql, args: normalizeArgs(args) });
      return result.rows;
    },
    async run(...args) {
      await schemaReady;
      const result = await client.execute({ sql, args: normalizeArgs(args) });
      return {
        lastInsertRowid: toNumber(result.lastInsertRowid),
        changes: result.rowsAffected,
      };
    },
  };
}

module.exports = { prepare };
// Accès direct au client Turso si besoin ailleurs (ex : requêtes en lot).
module.exports.db = client;
module.exports.client = client;
