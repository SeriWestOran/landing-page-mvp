const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la base de données Turso
const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Route dynamique pour les pages produits (injection HTML pour Facebook / Open Graph)
app.get('/produit/:id', async (req, res) => {
  const productId = req.params.id;
  const produitHtmlPath = path.join(__dirname, '../public/produit.html');

  try {
    // 1. Récupérer les détails du produit depuis Turso
    const result = await tursoClient.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [productId],
    });

    const product = result.rows[0];

    // 2. Si le fichier HTML n'existe pas à cet endroit, tenter la racine du dossier public
    if (!fs.existsSync(produitHtmlPath)) {
      return res.sendFile(path.join(__dirname, '../public/index.html'));
    }

    let html = fs.readFileSync(produitHtmlPath, 'utf8');

    if (product) {
      const name = String(product.name || 'Produit');
      const desc = String(product.description || 'Découvrez nos articles disponibles en magasin.');
      const imageUrl = String(
        product.image_url || 'https://barakashopaadl.onrender.com/images/placeholder-1.svg'
      );
      const fullUrl = `https://barakashopaadl.onrender.com/produit/${productId}`;

      // Injection dynamique des métadonnées dans le fichier HTML
      html = html
        .replace(/<title>.*?<\/title>/i, `<title>${name} — Baraka Shop</title>`)
        .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${name} — Baraka Shop" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${imageUrl}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${fullUrl}" />`);
    }

    res.send(html);
  } catch (err) {
    console.error('Erreur lors de la préparation des balises Open Graph:', err);
    if (fs.existsSync(produitHtmlPath)) {
      res.sendFile(produitHtmlPath);
    } else {
      res.status(500).send('Erreur serveur');
    }
  }
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});