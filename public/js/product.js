// public/js/product.js

document.addEventListener("DOMContentLoaded", async () => {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  const productId = pathSegments[pathSegments.length - 1];

  if (!productId || isNaN(productId)) return;

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error("Produit introuvable.");

    const product = await response.json();
    renderProduct(product);
  } catch (err) {
    console.error("Erreur de chargement du produit :", err);
  }
});

function renderProduct(product) {
  const titleEl = document.getElementById("product-title");
  const descEl = document.getElementById("product-description");
  const catEl = document.getElementById("product-category");
  const priceEl = document.getElementById("product-price");

  if (titleEl) titleEl.textContent = product.name;
  if (descEl) descEl.textContent = product.description || "";
  if (catEl) catEl.textContent = product.category || "";
  if (priceEl) priceEl.textContent = `${product.price} ${product.currency || "DZD"}`;

  const mainImgEl = document.getElementById("main-product-image");
  if (mainImgEl && product.image_url) {
    mainImgEl.src = product.image_url;
    mainImgEl.alt = product.name;
  }

  // Gestion des images secondaires
  const galleryContainer = document.getElementById("product-gallery");
  if (galleryContainer) {
    galleryContainer.innerHTML = "";

    const allImages = [];
    if (product.image_url) {
      allImages.push({ image_url: product.image_url });
    }
    if (Array.isArray(product.images) && product.images.length > 0) {
      allImages.push(...product.images);
    }

    if (allImages.length > 1) {
      allImages.forEach((imgObj, index) => {
        const thumb = document.createElement("img");
        thumb.src = imgObj.image_url;
        thumb.alt = `${product.name} - Vue ${index + 1}`;
        thumb.className = "gallery-thumb" + (index === 0 ? " active" : "");

        thumb.addEventListener("click", () => {
          if (mainImgEl) mainImgEl.src = imgObj.image_url;
          document.querySelectorAll(".gallery-thumb").forEach(t => t.classList.remove("active"));
          thumb.classList.add("active");
        });

        galleryContainer.appendChild(thumb);
      });
    }
  }
}
