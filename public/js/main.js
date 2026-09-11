(function () {
  const cfg = window.SITE_CONFIG || {};

  function setContent(id, text) {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  function setHref(id, href) {
    const el = document.getElementById(id);
    if (el && href) el.href = href;
  }

  function money(amount, currency) {
    if (amount === undefined || amount === null || amount === "") return "";
    const num = Number(amount);
    if (Number.isNaN(num)) return `${amount} ${currency || "DZD"}`;
    return `${num.toLocaleString("fr-FR")} ${currency || "DZD"}`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function whatsappLink(item) {
    const phone = (cfg.whatsappNumber || "").replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Bonjour, je souhaite commander : ${item.name} (${money(item.price, item.currency)})`
    );
    return `https://wa.me/${phone}?text=${text}`;
  }

  function renderProductCard(p) {
    const outOfStock = !p.in_stock;
    const imageUrl = escapeHtml(p.image_url || "/images/placeholder-1.svg");
    return `
      <article class="card">
        <div class="card-image">
          <img src="${imageUrl}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='/images/placeholder-1.svg';" />
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

  function renderServiceCard(s) {
    const imageUrl = escapeHtml(s.image_url || "/images/placeholder-1.svg");
    return `
      <article class="card">
        <div class="card-image">
          <img src="${imageUrl}" alt="${escapeHtml(s.title)}" loading="lazy" onerror="this.onerror=null;this.src='/images/placeholder-1.svg';" />
        </div>
        <h3>${escapeHtml(s.title)}</h3>
        ${s.description ? `<p class="desc">${escapeHtml(s.description)}</p>` : ""}
        <div class="card-actions">
          <a class="btn btn-primary" href="${escapeHtml(
            `https://wa.me/${(cfg.whatsappNumber || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
              `Bonjour, je suis intéressé par le service : ${s.title}`
            )}`
          )}" target="_blank" rel="noopener">Se renseigner</a>
        </div>
      </article>`;
  }

  async function loadData() {
    const pGrid = document.getElementById("products-grid");
    const sGrid = document.getElementById("services-grid");
    if (!pGrid || !sGrid) return;

    try {
      const [resP, resS] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/services")
      ]);

      const products = resP.ok ? await resP.json() : [];
      const services = resS.ok ? await resS.json() : [];

      window.allProducts = products;
      window.allServices = services;

      renderAll();
    } catch (err) {
      console.error("Erreur de chargement :", err);
      pGrid.innerHTML = "<p>Erreur lors du chargement des données.</p>";
    }
  }

  function renderAll() {
    const pGrid = document.getElementById("products-grid");
    const sGrid = document.getElementById("services-grid");
    const categorySelect = document.getElementById("category-filter");

    const currentTab = window.currentTab || "catalog";
    const selectedCategory = categorySelect ? categorySelect.value : "all";

    if (currentTab === "services") {
      pGrid.style.display = "none";
      sGrid.style.display = "grid";
      sGrid.innerHTML = (window.allServices || []).map(renderServiceCard).join("") || "<p>Aucun service disponible.</p>";
      return;
    }

    sGrid.style.display = "none";
    pGrid.style.display = "grid";

    let filtered = window.allProducts || [];

    if (currentTab === "custom") {
      filtered = filtered.filter(p => p.is_custom === true || p.is_custom === 1 || p.is_custom === "1");
    } else {
      filtered = filtered.filter(p => !p.is_custom);
    }

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    pGrid.innerHTML = filtered.map(renderProductCard).join("") || "<p>Aucun produit trouvé.</p>";
  }

  function setupTabsAndFilters() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        window.currentTab = tab.dataset.tab;
        renderAll();
      });
    });

    const categorySelect = document.getElementById("category-filter");
    if (categorySelect) {
      categorySelect.addEventListener("change", renderAll);
    }
  }

  function initConfig() {
    setContent("site-title", cfg.storeName);
    setContent("hero-title", cfg.heroTitle);
    setContent("hero-subtitle", cfg.heroSubtitle);
    setContent("contact-text", cfg.contactText);

    const heroImg = document.getElementById("hero-image");
    if (heroImg && cfg.heroImage) {
      heroImg.src = cfg.heroImage;
      heroImg.onerror = function() {
        this.onerror = null;
        this.src = "/images/placeholder-1.svg";
      };
    }

    const waPhone = (cfg.whatsappNumber || "").replace(/[^0-9]/g, "");
    setHref("wa-float-btn", `https://wa.me/${waPhone}`);
    setHref("fb-link", cfg.facebookPageUrl);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initConfig();
    setupTabsAndFilters();
    loadData();
  });
})();
