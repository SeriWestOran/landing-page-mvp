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
  const rawId = req.params.id;
  const produitHtmlPath = path.join(__dirname, '../public/produit.html');

  try {
    // Essayer la recherche avec l'ID tel quel, puis converti en nombre si nécessaire
    let result = await tursoClient.execute({
      sql: 'SELECT * FROM products WHERE id = ? OR id = ?',
      args: [rawId, Number(rawId) || 0],
    });

    let product = result.rows[0];

    // Vérifier si le fichier HTML existe
    if (!fs.existsSync(produitHtmlPath)) {
      return res.status(404).send('Page non trouvée');
    }

    let html = fs.readFileSync(produitHtmlPath, 'utf8');

    if (product) {
      const name = String(product.name || 'Produit');
      const desc = String(product.description || 'Découvrez nos articles chez Baraka Shop.');
      const imageUrl = String(
        product.image_url || 'https://barakashopaadl.onrender.com/images/placeholder-1.svg'
      );
      const fullUrl = `https://barakashopaadl.onrender.com/produit/${rawId}`;

      // Injection dynamique des métadonnées pour Facebook
      html = html
        .replace(/<title>.*?<\/title>/i, `<title>${name} — Baraka Shop</title>`)
        .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${name} — Baraka Shop" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${imageUrl}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${fullUrl}" />`);
    }

    res.send(html);
  } catch (err) {
    console.error('Erreur lors du traitement Open Graph:', err);
    res.sendFile(produitHtmlPath);
  }
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});