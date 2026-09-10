// public/js/product.js
(function () {
  const cfg = window.SITE_CONFIG || {};
  const container = document.getElementById("product-container");

  document.getElementById("brand-name").textContent = cfg.storeName || "Ma Boutique";
  ["fb-header-link", "fb-footer-link"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && cfg.facebookPageUrl) el.href = cfg.facebookPageUrl;
  });

  const waFloat = document.getElementById("whatsapp-float");
  if (waFloat) {
    const number = (cfg.whatsappNumber || "").replace(/\D/g, "");
    const message = `Bonjour, j'ai une question sur vos produits (${cfg.storeName || "votre boutique"}).`;
    waFloat.href = number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "#";
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

  function whatsappLink(product) {
    const number = (cfg.whatsappNumber || "").replace(/\D/g, "");
    const productUrl = window.location.href;
    const message = `Bonjour, je suis intéressé(e) par "${product.name}" (${money(product.price, product.currency || "DZD")}) — ${productUrl}`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  // Fonction pour injecter dynamiquement les balises Open Graph (Facebook)
  function updateOpenGraphTags(p, imageUrl) {
    const ogData = {
      "og:title": `${p.name} — ${cfg.storeName || "Baraka Shop"}`,
      "og:description": p.description || "Découvrez nos produits en magasin.",
      "og:image": imageUrl.startsWith("http") ? imageUrl : `${window.location.origin}${imageUrl}`,
      "og:url": window.location.href,
      "og:type": "product"
    };

    Object.entries(ogData).forEach(([property, content]) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    });
  }

  const params = new URLSearchParams(window.location.search);
  let id = params.get("id");
  if (!id) {
    const match = window.location.pathname.match(/\/produit\/([^/?#]+)/);
    if (match) id = decodeURIComponent(match[1]);
  }

  if (!id) {
    renderNotFound();
  } else {
    fetch(`/api/products/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(renderProduct)
      .catch(renderNotFound);
  }

  function renderProduct(p) {
    document.title = `${p.name} — ${cfg.storeName || "Ma Boutique"}`;
    const isOnOrder = p.listing_type === "on_order";
    const outOfStock = !isOnOrder && !p.in_stock;

    const coverImage = p.image_url || "/images/placeholder-1.svg";
    const gallery = Array.isArray(p.images) ? p.images : [];
    const allImages = [coverImage, ...gallery.map((img) => img.image_url)];

    // Injection des méta-balises Open Graph pour l'aperçu Facebook
    updateOpenGraphTags(p, coverImage);

    const thumbsHtml =
      allImages.length > 1
        ? `<div class="gallery-thumbs" id="gallery-thumbs">
            ${allImages
              .map(
                (src, i) => `
              <button type="button" data-src="${escapeHtml(src)}" class="${i === 0 ? "active" : ""}">
                <img src="${escapeHtml(src)}" alt="Photo ${i + 1} de ${escapeHtml(p.name)}" />
              </button>`
              )
              .join("")}
          </div>`
        : "";

    container.innerHTML = `
      <a class="breadcrumb" href="/">&larr; Retour au catalogue</a>
      <div class="product-detail">
        <div>
          <div class="image">
            <img id="main-product-image" src="${escapeHtml(coverImage)}" alt="${escapeHtml(p.name)}" />
          </div>
          ${thumbsHtml}
        </div>
        <div>
          ${p.category ? `<span class="category-tag">${escapeHtml(p.category)}</span>` : ""}
          ${isOnOrder ? `<div class="on-order-tag">Disponible sur commande</div>` : ""}
          ${outOfStock ? `<div class="stock-badge">Rupture de stock</div>` : ""}
          <h1>${escapeHtml(p.name)}</h1>
          <div class="price">${money(p.price, p.currency || "DZD")}</div>
          ${p.description ? `<p class="desc">${escapeHtml(p.description)}</p>` : ""}
          ${
            outOfStock
              ? `<span class="btn" aria-disabled="true">Actuellement indisponible</span>`
              : `<a class="btn btn-primary" href="${escapeHtml(whatsappLink(p))}" target="_blank" rel="noopener">Commander sur WhatsApp</a>`
          }
        </div>
      </div>
    `;

    const thumbsContainer = document.getElementById("gallery-thumbs");
    if (thumbsContainer) {
      thumbsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-src]");
        if (!btn) return;
        document.getElementById("main-product-image").src = btn.dataset.src;
        thumbsContainer.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    }
  }

  function renderNotFound() {
    container.innerHTML = `
      <div class="not-found">
        <h1 style="font-family:var(--font-display);">Produit introuvable</h1>
        <p style="color:var(--muted);">Ce produit n'existe plus ou le lien est incorrect.</p>
        <a class="btn btn-primary" href="/">Voir tout le catalogue</a>
      </div>
    `;
  }
})();