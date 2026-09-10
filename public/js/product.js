// public/js/product.js

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = window.SITE_CONFIG || {};

  // Mise à jour des liens réseaux sociaux depuis config.js
  const fbLink = document.getElementById("fb-header-link");
  if (fbLink && cfg.facebookPageUrl) fbLink.href = cfg.facebookPageUrl;

  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  let productId = pathSegments[pathSegments.length - 1];

  if (!productId || isNaN(productId)) {
    const urlParams = new URLSearchParams(window.location.search);
    productId = urlParams.get("id");
  }

  if (!productId || isNaN(productId)) {
    const titleEl = document.getElementById("product-title");
    if (titleEl) titleEl.textContent = "Produit introuvable";
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error("Produit introuvable.");

    const product = await response.json();
    renderProduct(product, cfg);
  } catch (err) {
    console.error("Erreur de chargement du produit :", err);
    const titleEl = document.getElementById("product-title");
    if (titleEl) titleEl.textContent = "Erreur de chargement";
  }
});

function renderProduct(product, cfg) {
  document.title = `${product.name} — BarakaShop`;

  const titleEl = document.getElementById("product-title");
  const descEl = document.getElementById("product-description");
  const catEl = document.getElementById("product-category");
  const priceEl = document.getElementById("product-price");

  if (titleEl) titleEl.textContent = product.name;
  if (descEl) descEl.textContent = product.description || "Aucune description disponible.";
  if (catEl) catEl.textContent = product.category || "Général";
  if (priceEl) priceEl.textContent = `${product.price} ${product.currency || "DZD"}`;

  const mainImgEl = document.getElementById("main-product-image");
  const mainUrl = product.image_url || "/images/placeholder-1.svg";
  if (mainImgEl) {
    mainImgEl.src = mainUrl;
    mainImgEl.alt = product.name;
  }

  // Traitement de la Galerie
  const galleryContainer = document.getElementById("product-gallery");
  if (galleryContainer) {
    galleryContainer.innerHTML = "";

    let rawImages = product.images || [];
    if (typeof rawImages === "string") {
      try { rawImages = JSON.parse(rawImages); } catch (e) { rawImages = []; }
    }

    const allImages = [mainUrl];

    rawImages.forEach(img => {
      const url = typeof img === "string" ? img : (img.image_url || img.url);
      if (url && !allImages.includes(url)) {
        allImages.push(url);
      }
    });

    if (allImages.length > 1) {
      allImages.forEach((imgUrl, idx) => {
        const thumb = document.createElement("img");
        thumb.src = imgUrl;
        thumb.className = `gallery-thumb ${idx === 0 ? "active" : ""}`;
        thumb.alt = `${product.name} - Vue ${idx + 1}`;

        thumb.addEventListener("click", () => {
          if (mainImgEl) mainImgEl.src = imgUrl;
          document.querySelectorAll(".gallery-thumb").forEach(t => t.classList.remove("active"));
          thumb.classList.add("active");
        });

        galleryContainer.appendChild(thumb);
      });
    }
  }

  // Génération du lien WhatsApp
  const waBtn = document.getElementById("btn-whatsapp");
  if (waBtn) {
    const number = (cfg.whatsappNumber || "213779991160").replace(/\D/g, "");
    const message = `Bonjour, je souhaite commander le produit : "${product.name}" (${product.price} ${product.currency || "DZD"}) — ${window.location.href}`;
    waBtn.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
}
