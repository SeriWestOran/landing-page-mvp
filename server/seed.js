// Insère quelques produits de démonstration. À lancer une fois : `npm run seed`
const db = require("./db");

const sample = [
  {
    name: "Produit vedette",
    description: "Décris ici ce qui rend ce produit intéressant, en une ou deux phrases.",
    price: 2500,
    currency: "DZD",
    image_url: "/images/placeholder-1.svg",
    category: "Nouveautés",
    facebook_url: "",
    is_active: 1,
    in_stock: 1,
    listing_type: "stock",
    sort_order: 1,
  },
  {
    name: "Deuxième produit",
    description: "Une courte description convaincante, orientée bénéfice pour le client.",
    price: 1800,
    currency: "DZD",
    image_url: "/images/placeholder-2.svg",
    category: "Populaires",
    facebook_url: "",
    is_active: 1,
    in_stock: 1,
    listing_type: "stock",
    sort_order: 2,
  },
  {
    name: "Troisième produit",
    description: "Un dernier exemple à remplacer depuis le back-office /admin.",
    price: 3200,
    currency: "DZD",
    image_url: "/images/placeholder-3.svg",
    category: "Populaires",
    facebook_url: "",
    is_active: 1,
    in_stock: 1,
    listing_type: "stock",
    sort_order: 3,
  },
];

async function seed() {
  // Laisse le temps au schéma (créé de façon asynchrone dans db.js) de se
  // mettre en place avant la première requête.
  await new Promise((r) => setTimeout(r, 500));

  const countRow = await db.prepare("SELECT COUNT(*) AS n FROM products").get();
  if (countRow.n > 0) {
    console.log(`La table products contient déjà ${countRow.n} ligne(s). Rien n'a été inséré.`);
    return;
  }

  const insert = db.prepare(`
    INSERT INTO products (name, description, price, currency, image_url, category, facebook_url, is_active, in_stock, listing_type, sort_order)
    VALUES (@name, @description, @price, @currency, @image_url, @category, @facebook_url, @is_active, @in_stock, @listing_type, @sort_order)
  `);

  for (const product of sample) {
    await insert.run(product);
  }

  console.log(`${sample.length} produits de démonstration insérés.`);
}

seed()
  .catch((err) => {
    console.error("Erreur lors du seed :", err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Turso communique par le réseau : on force la sortie du process une
    // fois le seed terminé, plutôt que d'attendre une fermeture explicite.
    setTimeout(() => process.exit(), 300);
  });
