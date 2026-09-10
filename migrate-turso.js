require("dotenv").config();
const { createClient } = require("@libsql/client");

// Vérification de la présence des variables d'environnement
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("❌ Erreur : TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN absent dans le fichier .env !");
  process.exit(1);
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  console.log("Connexion à Turso en cours...");
  
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
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log("✅ Succès : La table 'products' a été créée sur Turso !");
}

initDb().catch((err) => {
  console.error("❌ Erreur lors de la migration :", err);
});