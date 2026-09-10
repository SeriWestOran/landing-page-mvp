# Landing Page MVP — Catalogue produits

Landing page pour présenter les produits d'une boutique, avec un mini
back-office pour les gérer, sans avoir à toucher au code. Chaque produit
renvoie vers la page Facebook (ou un post précis) pour la commande.

## 1. Installation

```bash
npm install
cp .env.example .env
```

Génère le hash du mot de passe admin (ne mets jamais le mot de passe en
clair dans `.env`) :

```bash
node server/hash-password.js "TonMotDePasseSuperSecret"
```

Copie le résultat dans `.env` (`ADMIN_PASSWORD_HASH=...`), et remplace
`JWT_SECRET` par une chaîne aléatoire longue, par exemple :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 2. Démarrage

```bash
npm run seed   # (optionnel) ajoute 3 produits de démo
npm start
```

Landing page : http://localhost:3000
Back-office : http://localhost:3000/admin

## 3. Personnalisation rapide

- `public/js/config.js` : nom de la boutique, texte du hero, **lien vers
  ta page Facebook**, et **ton numéro WhatsApp** (`whatsappNumber`).
- `/admin` : ajoute/modifie/supprime les produits, upload des images,
  active/désactive leur affichage.
- `public/css/style.css` : couleurs et typographies (variables CSS en haut
  du fichier).

### Format du numéro WhatsApp

Dans `config.js`, `whatsappNumber` doit être au format international,
**sans** `+`, sans espace, et sans le `0` initial du numéro local :

```
Numéro local (Algérie) : 05 55 12 34 56
whatsappNumber          : "213555123456"
```

Le bouton "Commander" ouvre alors directement une conversation WhatsApp
avec un message pré-rempli mentionnant le nom du produit, son prix et le
lien vers sa fiche — le client n'a plus qu'à envoyer.

## 4. Architecture

```
Navigateur (landing page statique)
      │  fetch()
      ▼
Express (Node.js)
  ├── /api/products   → lecture publique du catalogue
  ├── /api/auth       → login admin (JWT en cookie httpOnly)
  ├── /produit/:id    → page produit avec balises Open Graph générées
  │                     côté serveur (pour l'aperçu Facebook/WhatsApp)
  └── /api/products   (POST/PUT/DELETE, protégés) → gestion depuis /admin
      │
      ▼
SQLite (server/data/store.db)
```

### Partager un produit sur Facebook

Chaque produit a sa propre page à l'adresse `tonsite.com/produit/ID`. Dans
`/admin`, un bouton **"Copier le lien"** te donne cette URL directement.

⚠️ Depuis 2017, Facebook ne permet plus de modifier manuellement l'aperçu
(titre/image) d'un lien collé dans un post, sauf pour certains comptes
médias vérifiés. La route `/produit/:id` contourne ce problème : elle
génère automatiquement les bonnes balises Open Graph (titre, prix, photo
du produit) **avant** que Facebook ne lise la page, donc l'aperçu est
déjà correct dès que tu colles le lien — rien à modifier à la main.

À savoir :
- Si un lien a déjà été partagé une fois avec une ancienne image (produit
  modifié depuis), utilise le [Sharing Debugger de Facebook](https://developers.facebook.com/tools/debug/)
  pour forcer une actualisation de l'aperçu.
- Sur un post **photo**, Facebook ne rend pas cliquable un lien collé
  uniquement dans le texte de la légende. Pour un lien cliquable : colle-le
  dans la zone de rédaction du post (Facebook génère alors une carte
  cliquable), ou mets-le en premier commentaire.
- Pour de meilleurs aperçus, utilise des photos en JPG ou PNG (pas les SVG
  de démonstration) — c'est déjà ce que impose l'upload d'image dans
  `/admin`.

- **Pas de framework front-end** : HTML/CSS/JS natifs, donc zéro build,
  déploiement instantané, et facile à faire reprendre par n'importe qui.
- **SQLite** : un seul fichier, aucune base de données à administrer.
  Pour grossir plus tard (plus de trafic, plusieurs instances serveur),
  remplace `server/db.js` par une connexion Postgres/MySQL — les routes
  n'ont pas à changer, elles passent toutes par ce module.
- **Authentification** : un seul compte admin (mot de passe haché avec
  bcrypt), session via JWT stocké dans un cookie `httpOnly` + `sameSite:
  strict`. Suffisant pour un seul gérant de boutique ; si plusieurs
  personnes doivent se connecter avec des rôles différents, ajouter une
  table `admin_users` est la prochaine étape naturelle.

## 5. Schéma de base de données

```sql
CREATE TABLE products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  price         REAL NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'DZD',
  image_url     TEXT DEFAULT '',
  category      TEXT DEFAULT '',
  facebook_url  TEXT DEFAULT '',   -- lien vers un post précis (optionnel)
  is_active     INTEGER NOT NULL DEFAULT 1,
  in_stock      INTEGER NOT NULL DEFAULT 1,  -- 0 = rupture de stock (visible mais non commandable)
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 6. Points d'accès API

| Méthode | Route                      | Accès    | Description                              |
|---------|-----------------------------|----------|-------------------------------------------|
| GET     | `/api/products`             | public   | Liste des produits actifs (`?category=`) |
| GET     | `/api/products/:id`         | public   | Détail d'un produit actif                |
| GET     | `/api/products/admin/all`   | protégé  | Tous les produits (actifs + inactifs)    |
| GET     | `/produit/:id`               | public   | Page produit + balises Open Graph (partage Facebook) |
| POST    | `/api/products`             | protégé  | Créer un produit                         |
| PUT     | `/api/products/:id`         | protégé  | Modifier un produit                      |
| DELETE  | `/api/products/:id`         | protégé  | Supprimer un produit                     |
| POST    | `/api/products/upload`      | protégé  | Upload d'image produit (jpg/png/webp, 3 Mo max) |
| POST    | `/api/auth/login`           | public   | Connexion admin (`{ password }`)         |
| POST    | `/api/auth/logout`          | public   | Déconnexion                              |
| GET     | `/api/auth/status`          | public   | Session admin active ou non              |

## 7. Sécurité mise en place

- Mot de passe admin haché (bcrypt), jamais stocké en clair.
- Session JWT en cookie `httpOnly`, `sameSite: strict`, `secure` en prod.
- Limitation du débit sur `/api/auth/login` (anti brute-force) et sur
  l'ensemble de l'API.
- En-têtes de sécurité via `helmet`.
- Upload d'images : type MIME vérifié, taille limitée, nom de fichier
  généré côté serveur (pas de traversée de répertoire).
- Requêtes SQL uniquement via requêtes préparées (`better-sqlite3`),
  aucune concaténation de chaînes → pas d'injection SQL.
- Échappement HTML systématique côté client avant injection dans le DOM
  → pas de faille XSS via un nom/description de produit.

## 8. Déploiement

Cette appli est un simple process Node.js + un fichier SQLite : elle
tourne telle quelle sur Render, Railway, Fly.io ou un VPS classique.
Pense à :

1. Définir `NODE_ENV=production` et `FRONTEND_ORIGIN` avec ton vrai
   domaine.
2. Monter un volume persistant pour `server/data/` et
   `public/images/uploads/` (sinon les données sont perdues à chaque
   redéploiement).
3. Mettre le site derrière HTTPS (obligatoire pour le cookie `secure`).

## 9. Prochaines évolutions naturelles

- Table `admin_users` si plusieurs comptes sont nécessaires.
- Passage à Postgres si le trafic ou le nombre de produits grossit.
- Ajout d'un vrai formulaire de commande (au lieu du simple lien
  Facebook) si tu veux capter les commandes directement sur le site.
