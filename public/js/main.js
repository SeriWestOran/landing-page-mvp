// public/js/main.js
(function () {
  const cfg = window.SITE_CONFIG || {};

  // Applique la config au reste de la page.
  document.title = `${cfg.storeName || "Boutique"} — Catalogue`;
  setText("brand-name", cfg.storeName);
  setText("hero-title", cfg.heroTitle);
  setText("hero-subtitle", cfg.heroSubtitle);
  setText("footer-contact", cfg.contactText);
  setSrc("hero-image", cfg.heroImage);

  ["fb-header-link", "fb-hero-link", "fb-footer-link"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && cfg.facebookPageUrl) el.href = cfg.facebookPageUrl;
  });

  const waFloat = document.getElementById("whatsapp-float");
  if (waFloat) {
    const number = (cfg.whatsappNumber || "").replace(/\D/g, "");
    const message = `Bonjour, j'ai une question sur vos produits (${cfg.storeName || "votre boutique"}).`;
    waFloat.href = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "#";
  }

  const fbFooter = document.getElementById("fb-footer-link");
  if (fbFooter && cfg.facebookPageUrl) {
    try {
      fbFooter.textContent = new URL(cfg.facebookPageUrl).hostname + new URL(cfg.facebookPageUrl).pathname;
    } catch {
      fbFooter.textContent = cfg.facebookPageUrl;
    }
  }

  function setText(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function setSrc(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.src = value;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function money(price, currency) {
    try {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
    } catch {
      return `${price} ${currency}`;
    }
  }

  // Construit un lien "wa.me" qui ouvre directement une conversation
  // WhatsApp avec un message pré-rempli mentionnant le produit ou le service.
  function whatsappLink(item, { isService = false } = {}) {
    const number = (cfg.whatsappNumber || "").replace(/\D/g, "");
    const label = isService
      ? `le service "${item.name}"`
      : `"${item.name}" (${money(item.price, item.currency || "DZD")})`;
    const url = isService ? "" : ` — ${window.location.origin}/produit/${item.id}`;
    const message = `Bonjour, je suis intéressé(e) par ${label}${url}`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  // ---------------- Onglets ----------------
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // ---------------- Catalogue (produits en stock) ----------------
  const grid = document.getElementById("product-grid");
  const filtersNav = document.getElementById("filters");
  let stockProducts = [];

  function renderProductCard(p) {
    const outOfStock = !p.in_stock;
    return `
      <article class="card">
        <div class="card-image">
          <img src="${escapeHtml(p.image_url || "/images/placeholder-1.svg")}" alt="${escapeHtml(p.name)}" loading="lazy" />
        </div>
        ${outOfStock ? `<span class="stock-badge">Rupture de stock</span>` : ""}
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price">${money(p.price, p.currency || "DZD")}</div>
        ${p.description ? `<p class="desc">${escapeHtml(p.description)}</p>` : ""}
        <div class="card-actions">
          <a class="btn btn-secondary" href="/produit/${p.id}">Voir la fiche</a>
          ${
            outOfStock
              ? `<span class="btn" aria-disabled="true">Indisponible</span>`
              : `<a class="btn btn-primary" href="${escapeHtml(whatsappLink(p))}" target="_blank" rel="noopener">Commander sur WhatsApp</a>`
          }
        </div>
      </article>`;
  }

  function renderProducts(products) {
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state">Aucun produit à afficher pour le moment.</div>`;
      return;
    }
    grid.innerHTML = products.map(renderProductCard).join("");
  }

  function renderFilters(products) {
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    if (!categories.length) return;

    filtersNav.innerHTML =
      `<button class="active" data-category="">Tout</button>` +
      categories.map((c) => `<button data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");

    filtersNav.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-category]");
      if (!btn) return;
      filtersNav.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.category;
      renderProducts(cat ? stockProducts.filter((p) => p.category === cat) : stockProducts);
    });
  }

  // ---------------- Produits sur commande ----------------
  const onOrderGrid = document.getElementById("on-order-grid");

  function renderOnOrder(products) {
    if (!products.length) {
      onOrderGrid.innerHTML = `<div class="empty-state">Aucun produit sur commande pour le moment.</div>`;
      return;
    }
    onOrderGrid.innerHTML = products
      .map(
        (p) => `
      <article class="card">
        <div class="card-image">
          <img src="${escapeHtml(p.image_url || "/images/placeholder-1.svg")}" alt="${escapeHtml(p.name)}" loading="lazy" />
        </div>
        <span class="on-order-tag">Sur commande</span>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price">${money(p.price, p.currency || "DZD")}</div>
        ${p.description ? `<p class="desc">${escapeHtml(p.description)}</p>` : ""}
        <div class="card-actions">
          <a class="btn btn-secondary" href="/produit/${p.id}">Voir la fiche</a>
          <a class="btn btn-primary" href="${escapeHtml(whatsappLink(p))}" target="_blank" rel="noopener">Commander sur WhatsApp</a>
        </div>
      </article>`
      )
      .join("");
  }

  // ---------------- Services ----------------
  const servicesGrid = document.getElementById("services-grid");

  function renderServices(services) {
    if (!services.length) {
      servicesGrid.innerHTML = `<div class="empty-state">Aucun service à afficher pour le moment.</div>`;
      return;
    }
    servicesGrid.innerHTML = services
      .map(
        (s) => `
      <article class="card service-card">
        <div class="card-image">
          <img src="${escapeHtml(s.image_url || "/images/placeholder-1.svg")}" alt="${escapeHtml(s.name)}" loading="lazy" />
        </div>
        <h3>${escapeHtml(s.name)}</h3>
        ${s.price_text ? `<div class="price">${escapeHtml(s.price_text)}</div>` : ""}
        ${s.description ? `<p class="desc">${escapeHtml(s.description)}</p>` : ""}
        <div class="card-actions">
          <a class="btn btn-primary" href="${escapeHtml(whatsappLink(s, { isService: true }))}" target="_blank" rel="noopener">Demander sur WhatsApp</a>
        </div>
      </article>`
      )
      .join("");
  }

  // ---------------- Chargement des données ----------------
  async function loadAll() {
    grid.innerHTML = `<div class="empty-state">Chargement du catalogue…</div>`;
    onOrderGrid.innerHTML = `<div class="empty-state">Chargement…</div>`;
    servicesGrid.innerHTML = `<div class="empty-state">Chargement…</div>`;

    try {
      const [allProducts, services] = await Promise.all([
        fetch("/api/products").then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch("/api/services").then((r) => (r.ok ? r.json() : Promise.reject())),
      ]);

      stockProducts = allProducts.filter((p) => (p.listing_type || "stock") === "stock");
      const onOrderProducts = allProducts.filter((p) => p.listing_type === "on_order");

      renderFilters(stockProducts);
      renderProducts(stockProducts);
      renderOnOrder(onOrderProducts);
      renderServices(services);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state">Impossible de charger le catalogue pour le moment.</div>`;
      onOrderGrid.innerHTML = "";
      servicesGrid.innerHTML = "";
      console.error(err);
    }
  }

  loadAll();
})();
