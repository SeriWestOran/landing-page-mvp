const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;

const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API pour récupérer un produit avec sa galerie d'images
app.get('/api/products/:id', async (req, res) => {
  const rawId = req.params.id;
  try {
    const prodRes = await tursoClient.execute({
      sql: 'SELECT * FROM products WHERE id = ? OR id = ?',
      args: [rawId, Number(rawId) || 0],
    });

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const product = prodRes.rows[0];

    // Récupérer les images secondaires
    const imgRes = await tursoClient.execute({
      sql: 'SELECT image_url FROM product_images WHERE product_id = ? OR product_id = ?',
      args: [rawId, Number(rawId) || 0],
    });

    product.images = imgRes.rows;
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route d'affichage de la page Produit + Open Graph pour Facebook
app.get(['/produit/:id', '/produit'], async (req, res) => {
  const rawId = req.params.id || req.query.id;
  const produitHtmlPath = path.join(__dirname, '../public/produit.html');

  try {
    let product = null;
    if (rawId) {
      const result = await tursoClient.execute({
        sql: 'SELECT * FROM products WHERE id = ? OR id = ?',
        args: [rawId, Number(rawId) || 0],
      });
      product = result.rows[0];
    }

    if (!fs.existsSync(produitHtmlPath)) {
      return res.status(404).send('Fichier produit.html introuvable');
    }

    let html = fs.readFileSync(produitHtmlPath, 'utf8');

    if (product) {
      const name = String(product.name || 'Produit');
      const desc = String(product.description || 'Découvrez cet article chez Baraka Shop.');
      const imageUrl = String(
        product.image_url || 'https://barakashopaadl.onrender.com/images/placeholder-1.svg'
      );
      const fullUrl = `https://barakashopaadl.onrender.com/produit/${product.id}`;

      html = html
        .replace(/<title>.*?<\/title>/i, `<title>${name} — Baraka Shop</title>`)
        .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${name} — Baraka Shop" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${imageUrl}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${fullUrl}" />`);
    }

    res.send(html);
  } catch (err) {
    console.error('Erreur Open Graph:', err);
    res.sendFile(produitHtmlPath);
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
