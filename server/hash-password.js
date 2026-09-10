// Utilitaire ponctuel : génère le hash bcrypt à mettre dans .env (ADMIN_PASSWORD_HASH)
// Usage : node server/hash-password.js "MonMotDePasseSuperSecret"
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node server/hash-password.js \"MonMotDePasse\"");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log("\nAjoute cette ligne dans ton fichier .env :\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
