// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const isProd = process.env.NODE_ENV === "production";

// Limite les tentatives de connexion pour freiner le brute-force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessaie plus tard." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { password } = req.body || {};

  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Mot de passe requis." });
  }

  if (!ADMIN_PASSWORD_HASH) {
    // Mauvaise config serveur : on ne laisse jamais passer par défaut.
    return res.status(500).json({ error: "Authentification non configurée." });
  }

  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });

  res.cookie("token", token, {
    httpOnly: true,        // inaccessible en JS côté navigateur
    secure: isProd,        // cookie envoyé en HTTPS uniquement en prod
    sameSite: "strict",    // protection CSRF de base
    maxAge: 12 * 60 * 60 * 1000,
  });

  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

router.get("/status", (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ authenticated: false });
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

module.exports = router;
