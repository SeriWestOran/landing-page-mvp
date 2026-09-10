// server/site-config.js
// Pour ne pas dupliquer les réglages (nom de la boutique, lien Facebook...)
// à la fois côté client et côté serveur, on relit directement le seul
// fichier que l'utilisateur est censé modifier : public/js/config.js.
// On l'exécute dans un bac à sable isolé (vm), sans accès au reste du
// serveur, juste pour en extraire l'objet SITE_CONFIG.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CONFIG_PATH = path.join(__dirname, "..", "public", "js", "config.js");

function loadSiteConfig() {
  try {
    const code = fs.readFileSync(CONFIG_PATH, "utf8");
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { timeout: 1000 });
    return sandbox.window.SITE_CONFIG || {};
  } catch (err) {
    console.error("Impossible de lire public/js/config.js :", err.message);
    return {};
  }
}

module.exports = { loadSiteConfig };
