// server/middleware/auth.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// Protège les routes d'écriture (POST/PUT/DELETE, upload).
// Le token est lu depuis un cookie httpOnly, jamais depuis le JS client :
// ça réduit la surface d'attaque XSS (le script d'une page piratée ne peut
// pas lire ce cookie pour se faire passer pour l'admin).
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") throw new Error("mauvais rôle");
    req.admin = true;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session invalide ou expirée." });
  }
}

module.exports = { requireAuth };
