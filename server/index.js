// server/index.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. ROUTE D'INJECTION OPEN GRAPH (Placée AVANT express.static)
app.get(['/produit/:id', '/produit'], async (req, res) => {
  const rawId = req.params.id || req.query.id;
  const produitHtmlPath = path.join(__dirname, '../public/produit.html');

  try {
    let product = null;

    if (rawId) {
      const result = await db.execute({
        sql: 'SELECT * FROM products WHERE id = ? OR id = ?',
        args: [rawId, Number(rawId) || 0],
      });
      if (result.rows && result.rows.length > 0) {
        product = result.rows[0];
      }
    }

    if (!fs.existsSync(produitHtmlPath)) {
      return res.status(404).send('Fichier produit.html introuvable');
    }

    let html = fs.readFileSync(produitHtmlPath, 'utf8');

    if (product) {
      const name = String(product.name || 'Produit');
      
      // Nettoyage de la description pour éviter de casser le HTML
      const desc = String(product.description || 'Découvrez cet article chez BarakaShop.')
        .replace(/"/g, '&quot;')
        .replace(/[\r\n]+/g, ' ');

      let imageUrl = String(product.image_url || '').trim();

      // Formatage de l'URL d'image
      if (!imageUrl) {
        imageUrl = 'https://barakashopaadl.onrender.com/images/placeholder-1.svg';
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        imageUrl = imageUrl.startsWith('/') 
          ? `https://barakashopaadl.onrender.com${imageUrl}` 
          : `https://barakashopaadl.onrender.com/${imageUrl}`;
      }

      const fullUrl = `https://barakashopaadl.onrender.com/produit/${product.id}`;

      // Injection dynamique dans le HTML
      html = html
        .replace(/<title>.*?<\/title>/gi, `<title>${name} — BarakaShop</title>`)
        .replace(/<meta property="og:title" content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${name} — BarakaShop" />`)
        .replace(/<meta property="og:description" content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${desc}" />`)
        .replace(/<meta property="og:image" content=".*?"\s*\/?>/gi, `<meta property="og:image" content="${imageUrl}" />`)
        .replace(/<meta property="og:url" content=".*?"\s*\/?>/gi, `<meta property="og:url" content="${fullUrl}" />`);
    }

    res.send(html);
  } catch (err) {
    console.error('Erreur Serveur Open Graph:', err);
    res.sendFile(produitHtmlPath);
  }
});

// 2. SERVICE DES FICHIERS STATIQUES (Placé APRES les routes HTML dynamiques)
app.use(express.static(path.join(__dirname, '../public')));

// 3. API PRODUIT : Données JSON + Galerie d'images
app.get('/api/products/:id', async (req, res) => {
  const rawId = req.params.id;
  try {
    const prodRes = await db.execute({
      sql: 'SELECT * FROM products WHERE id = ? OR id = ?',
      args: [rawId, Number(rawId) || 0],
    });

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const product = prodRes.rows[0];

    const imgRes = await db.execute({
      sql: 'SELECT image_url FROM product_images WHERE product_id = ? OR product_id = ?',
      args: [rawId, Number(rawId) || 0],
    });

    product.images = imgRes.rows;
    res.json(product);
  } catch (err) {
    console.error('Erreur API Produit:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Lancement du serveur Express
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
