// public/js/product.js

document.addEventListener("DOMContentLoaded", async () => {
  // Récupérer l'ID du produit depuis l'URL (ex: /produit/8)
  const pathSegments = window.location.pathname.split("/");
  const productId = pathSegments[pathSegments.length - 1];

  if (!productId) return;

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error("Produit introuvable");

    const product = await response.json();
    renderProduct(product);
  } catch (err) {
    console.error("Erreur de chargement du produit :", err);
  }
});

function renderProduct(product) {
  // 1. Image principale
  const mainImgEl = document.getElementById("main-product-image");
  if (mainImgEl && product.image_url) {
    mainImgEl.src = product.image_url;
    mainImgEl.alt = product.name;
  }

  // 2. Galerie de photos secondaires
  const galleryContainer = document.getElementById("product-gallery");
  if (galleryContainer) {
    galleryContainer.innerHTML = ""; // Vider le conteneur

    // Regrouper l'image principale et la galerie complète
    const allImages = [];
    if (product.image_url) allImages.push({ image_url: product.image_url });
    if (Array.isArray(product.images)) {
      allImages.push(...product.images);
    }

    // Générer les vignettes si plus d'une photo existe
    if (allImages.length > 1) {
      allImages.forEach((imgObj, index) => {
        const thumb = document.createElement("img");
        thumb.src = imgObj.image_url;
        thumb.alt = `${product.name} - Vue ${index + 1}`;
        thumb.className = "gallery-thumbnail" + (index === 0 ? " active" : "");
        
        // Au clic sur une vignette, remplacer l'image principale
        thumb.addEventListener("click", () => {
          if (mainImgEl) mainImgEl.src = imgObj.image_url;
          document.querySelectorAll(".gallery-thumbnail").forEach(t => t.classList.remove("active"));
          thumb.classList.add("active");
        });

        galleryContainer.appendChild(thumb);
      });
    }
  }
}
