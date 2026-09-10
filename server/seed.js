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
    sort_order: 3,
  },
];

const insert = db.prepare(`
  INSERT INTO products (name, description, price, currency, image_url, category, facebook_url, sort_order)
  VALUES (@name, @description, @price, @currency, @image_url, @category, @facebook_url, @sort_order)
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (count > 0) {
  console.log(`La table products contient déjà ${count} ligne(s). Rien n'a été inséré.`);
} else {
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  insertMany(sample);
  console.log(`${sample.length} produits de démonstration insérés.`);
}
