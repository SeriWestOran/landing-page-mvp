// public/js/admin.js

// --- Utilitaire API Authentifiée ---
async function api(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      showAuthSection();
    }
    throw new Error(data.error || "Une erreur est survenue.");
  }

  return data;
}

// --- Éléments DOM ---
const loginSection = document.getElementById("login-section");
const adminContent = document.getElementById("admin-content");
const loginForm = document.getElementById("login-form");
const loginMsg = document.getElementById("login-msg");
const logoutBtn = document.getElementById("logout-btn");

const productForm = document.getElementById("product-form");
const formTitle = document.getElementById("form-title");
const formMsg = document.getElementById("form-msg");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const productsList = document.getElementById("products-list");

const serviceForm = document.getElementById("service-form");
const serviceFormTitle = document.getElementById("service-form-title");
const serviceFormMsg = document.getElementById("service-form-msg");
const cancelServiceEditBtn = document.getElementById("cancel-service-edit-btn");
const servicesList = document.getElementById("services-list");

// --- Gestion de l'Affichage ---
function showAuthSection() {
  if (loginSection) loginSection.classList.remove("hidden");
  if (adminContent) adminContent.classList.add("hidden");
  if (logoutBtn) logoutBtn.classList.add("hidden");
}

function showAdminContent() {
  if (loginSection) loginSection.classList.add("hidden");
  if (adminContent) adminContent.classList.remove("hidden");
  if (logoutBtn) logoutBtn.classList.remove("hidden");
  loadProducts();
  loadServices();
}

async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    showAuthSection();
    return;
  }
  try {
    await api("/auth/status");
    showAdminContent();
  } catch (err) {
    showAuthSection();
  }
}

// --- Connexion & Déconnexion ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginMsg) loginMsg.textContent = "";

    const usernameInput = document.getElementById("username") || document.getElementById("email");
    const passwordInput = document.getElementById("password");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.value,
          password: passwordInput.value,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants incorrects");

      localStorage.setItem("token", data.token);
      if (usernameInput) usernameInput.value = "";
      if (passwordInput) passwordInput.value = "";
      showAdminContent();
    } catch (err) {
      if (loginMsg) {
        loginMsg.textContent = err.message;
        loginMsg.className = "msg error";
      }
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    showAuthSection();
  });
}

// ==========================================
// --- GESTION DES PRODUITS ---
// ==========================================

function resetProductForm() {
  if (productForm) productForm.reset();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal("product-id", "");
  setVal("image_url", "");
  setVal("gallery_urls", "");
  if (formTitle) formTitle.textContent = "Ajouter un produit";
  if (cancelEditBtn) cancelEditBtn.classList.add("hidden");
  if (formMsg) formMsg.textContent = "";
}

if (productForm) {
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formMsg) {
      formMsg.textContent = "";
      formMsg.className = "msg";
    }

    const imageUrlInput = document.getElementById("image_url");
    let imageUrl = imageUrlInput ? imageUrlInput.value.trim() : "";

    const galleryUrlsInput = document.getElementById("gallery_urls");
    let galleryUrls = [];
    if (galleryUrlsInput && galleryUrlsInput.value) {
      try {
        galleryUrls = JSON.parse(galleryUrlsInput.value);
      } catch (err) {
        galleryUrls = [];
      }
    }

    const fileInput = document.getElementById("image");
    const galleryFileInput = document.getElementById("gallery");
    const token = localStorage.getItem("token");

    try {
      // 1. Upload de l'image principale
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const fd = new FormData();
        fd.append("image", fileInput.files[0]);

        const res = await fetch("/api/products/upload", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: fd,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Échec de l'upload de l'image principale");
        imageUrl = data.url;
      }

      // 2. Upload des images de la galerie
      if (galleryFileInput && galleryFileInput.files && galleryFileInput.files.length > 0) {
        for (let file of galleryFileInput.files) {
          const fd = new FormData();
          fd.append("image", file);

          try {
            const res = await fetch("/api/products/upload", {
              method: "POST",
              headers: { "Authorization": `Bearer ${token}` },
              body: fd,
            });

            const data = await res.json();
            if (res.ok && data.url) {
              galleryUrls.push(data.url);
            }
          } catch (uploadErr) {
            console.warn("Échec upload d'une image de la galerie :", uploadErr);
          }
        }
      }

      // 3. Récupération & Validation des champs
      const nameEl = document.getElementById("name");
      const catEl = document.getElementById("category");
      const descEl = document.getElementById("description");
      const priceEl = document.getElementById("price");
      const currEl = document.getElementById("currency");
      const listEl = document.getElementById("listing_type");
      const fbEl = document.getElementById("facebook_url");
      const activeEl = document.getElementById("is_active");
      const stockEl = document.getElementById("in_stock");
      const productIdEl = document.getElementById("product-id");

      const name = nameEl ? nameEl.value.trim() : "";
      const priceVal = priceEl ? parseFloat(priceEl.value) : NaN;

      if (!name) {
        throw new Error("Le nom du produit est obligatoire.");
      }
      if (isNaN(priceVal) || priceVal < 0) {
        throw new Error("Veuillez saisir un prix valide.");
      }

      // 4. Construction du Payload
      const payload = {
        name: name,
        category: catEl ? catEl.value.trim() : "",
        description: descEl ? descEl.value.trim() : "",
        price: priceVal,
        currency: currEl ? currEl.value : "DZD",
        listing_type: listEl ? listEl.value : "stock",
        facebook_url: fbEl ? fbEl.value.trim() : "",
        is_active: activeEl ? activeEl.checked : true,
        in_stock: stockEl ? stockEl.checked : true,
        image_url: imageUrl,
        images: galleryUrls, // Envoyé sous forme de tableau
      };

      const id = productIdEl ? productIdEl.value : "";

      if (id) {
        await api(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        if (formMsg) {
          formMsg.textContent = "Produit mis à jour avec succès.";
          formMsg.className = "msg success";
        }
      } else {
        await api("/products", { method: "POST", body: JSON.stringify(payload) });
        if (formMsg) {
          formMsg.textContent = "Nouveau produit ajouté avec succès !";
          formMsg.className = "msg success";
        }
      }

      resetProductForm();
      loadProducts();

    } catch (err) {
      if (formMsg) {
        formMsg.textContent = err.message;
        formMsg.className = "msg error";
      }
    }
  });
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", resetProductForm);
}

async function loadProducts() {
  if (!productsList) return;
  try {
    const products = await api("/products/admin/all");
    productsList.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
      productsList.innerHTML = "<p>Aucun produit trouvé.</p>";
      return;
    }

    const baseUrl = window.location.origin;

    products.forEach((product) => {
      // Lien direct pour le partage Facebook (Exemple: http://localhost:3000/produit/3)
      const productUrl = `${baseUrl}/produit/${product.id}`;

      const card = document.createElement("div");
      card.className = "admin-card";
      card.innerHTML = `
        <div class="admin-card-img">
          <img src="${product.image_url || '/images/placeholder-1.svg'}" alt="${product.name}" />
        </div>
        <div class="admin-card-info">
          <h3>${product.name}</h3>
          <p><strong>Prix :</strong> ${product.price} ${product.currency || 'DZD'}</p>
          <p><strong>Catégorie :</strong> ${product.category || 'N/A'}</p>
          <p><strong>Statut :</strong> ${product.is_active ? 'Actif' : 'Inactif'}</p>
          <p style="margin-top:8px; font-size:12px; word-break:break-all;">
            <strong>Lien direct :</strong> <a href="${productUrl}" target="_blank">${productUrl}</a>
          </p>
        </div>
        <div class="admin-card-actions" style="flex-wrap: wrap;">
          <button class="btn-copy-link" style="background-color: #17a2b8;">🔗 Copier le lien</button>
          <button class="btn-edit">Éditer</button>
          <button class="btn-delete">Supprimer</button>
        </div>
      `;

      // Événements CSP-compliant
      card.querySelector(".btn-copy-link").addEventListener("click", function () {
        navigator.clipboard.writeText(productUrl).then(() => {
          this.textContent = "✓ Lien copié !";
          setTimeout(() => { this.textContent = "🔗 Copier le lien"; }, 2000);
        });
      });

      card.querySelector(".btn-edit").addEventListener("click", () => editProduct(product.id));
      card.querySelector(".btn-delete").addEventListener("click", () => deleteProduct(product.id));

      productsList.appendChild(card);
    });
  } catch (err) {
    productsList.innerHTML = `<p class="msg error">Erreur de chargement : ${err.message}</p>`;
  }
}

async function editProduct(id) {
  try {
    const products = await api("/products/admin/all");
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = Boolean(val); };

    setVal("product-id", product.id);
    setVal("name", product.name || "");
    setVal("category", product.category || "");
    setVal("description", product.description || "");
    setVal("price", product.price || 0);
    setVal("currency", product.currency || "DZD");
    setVal("listing_type", product.listing_type || "stock");
    setVal("facebook_url", product.facebook_url || "");
    setCheck("is_active", product.is_active);
    setCheck("in_stock", product.in_stock);
    setVal("image_url", product.image_url || "");
    
    // Support si les images sont retournées sous forme de chaîne JSON ou de tableau
    let imagesArr = product.images;
    if (typeof imagesArr === "string") {
      try { imagesArr = JSON.parse(imagesArr); } catch (e) { imagesArr = []; }
    }
    setVal("gallery_urls", JSON.stringify(imagesArr || []));

    if (formTitle) formTitle.textContent = `Modifier : ${product.name}`;
    if (cancelEditBtn) cancelEditBtn.classList.remove("hidden");
    if (productForm) window.scrollTo({ top: productForm.offsetTop - 20, behavior: "smooth" });
  } catch (err) {
    alert("Impossible de charger les données du produit.");
  }
}

async function deleteProduct(id) {
  if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
  try {
    await api(`/products/${id}`, { method: "DELETE" });
    loadProducts();
  } catch (err) {
    alert("Erreur lors de la suppression : " + err.message);
  }
}

// ==========================================
// --- GESTION DES SERVICES ---
// ==========================================

function resetServiceForm() {
  if (serviceForm) serviceForm.reset();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal("service-id", "");
  setVal("service_image_url", "");
  if (serviceFormTitle) serviceFormTitle.textContent = "Ajouter un service";
  if (cancelServiceEditBtn) cancelServiceEditBtn.classList.add("hidden");
  if (serviceFormMsg) serviceFormMsg.textContent = "";
}

if (serviceForm) {
  serviceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (serviceFormMsg) serviceFormMsg.textContent = "";

    const serviceImageUrlInput = document.getElementById("service_image_url");
    let imageUrl = serviceImageUrlInput ? serviceImageUrlInput.value : "";
    const fileInput = document.getElementById("service_image");

    try {
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const fd = new FormData();
        fd.append("image", fileInput.files[0]);
        const token = localStorage.getItem("token");

        const res = await fetch("/api/services/upload", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: fd,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Échec de l'upload d'image");
        imageUrl = data.url;
      }

      const sName = document.getElementById("service_name");
      const sDesc = document.getElementById("service_description");
      const sPrice = document.getElementById("service_price_text");
      const sActive = document.getElementById("service_is_active");
      const sId = document.getElementById("service-id");

      const payload = {
        name: sName ? sName.value.trim() : "",
        description: sDesc ? sDesc.value.trim() : "",
        price_text: sPrice ? sPrice.value.trim() : "",
        is_active: sActive ? sActive.checked : true,
        image_url: imageUrl,
      };

      const id = sId ? sId.value : "";

      if (id) {
        await api(`/services/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        if (serviceFormMsg) {
          serviceFormMsg.textContent = "Service mis à jour avec succès.";
          serviceFormMsg.className = "msg success";
        }
      } else {
        await api("/services", { method: "POST", body: JSON.stringify(payload) });
        if (serviceFormMsg) {
          serviceFormMsg.textContent = "Nouveau service ajouté avec succès !";
          serviceFormMsg.className = "msg success";
        }
      }

      resetServiceForm();
      loadServices();

    } catch (err) {
      if (serviceFormMsg) {
        serviceFormMsg.textContent = err.message;
        serviceFormMsg.className = "msg error";
      }
    }
  });
}

if (cancelServiceEditBtn) {
  cancelServiceEditBtn.addEventListener("click", resetServiceForm);
}

async function loadServices() {
  if (!servicesList) return;
  try {
    const services = await api("/services/admin/all");
    servicesList.innerHTML = "";

    if (!Array.isArray(services) || services.length === 0) {
      servicesList.innerHTML = "<p>Aucun service trouvé.</p>";
      return;
    }

    services.forEach((service) => {
      const card = document.createElement("div");
      card.className = "admin-card";
      card.innerHTML = `
        <div class="admin-card-img">
          <img src="${service.image_url || '/images/placeholder-1.svg'}" alt="${service.name}" />
        </div>
        <div class="admin-card-info">
          <h3>${service.name}</h3>
          <p><strong>Prix :</strong> ${service.price_text || 'Sur devis'}</p>
          <p><strong>Statut :</strong> ${service.is_active ? 'Actif' : 'Inactif'}</p>
        </div>
        <div class="admin-card-actions">
          <button class="btn-edit">Éditer</button>
          <button class="btn-delete">Supprimer</button>
        </div>
      `;

      card.querySelector(".btn-edit").addEventListener("click", () => editService(service.id));
      card.querySelector(".btn-delete").addEventListener("click", () => deleteService(service.id));

      servicesList.appendChild(card);
    });
  } catch (err) {
    servicesList.innerHTML = `<p class="msg error">Erreur de chargement : ${err.message}</p>`;
  }
}

async function editService(id) {
  try {
    const services = await api("/services/admin/all");
    const service = services.find((s) => s.id === id);
    if (!service) return;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = Boolean(val); };

    setVal("service-id", service.id);
    setVal("service_name", service.name || "");
    setVal("service_description", service.description || "");
    setVal("service_price_text", service.price_text || "");
    setCheck("service_is_active", service.is_active);
    setVal("service_image_url", service.image_url || "");

    if (serviceFormTitle) serviceFormTitle.textContent = `Modifier : ${service.name}`;
    if (cancelServiceEditBtn) cancelServiceEditBtn.classList.remove("hidden");
    if (serviceForm) window.scrollTo({ top: serviceForm.offsetTop - 20, behavior: "smooth" });
  } catch (err) {
    alert("Impossible de charger les données du service.");
  }
}

async function deleteService(id) {
  if (!confirm("Voulez-vous vraiment supprimer ce service ?")) return;
  try {
    await api(`/services/${id}`, { method: "DELETE" });
    loadServices();
  } catch (err) {
    alert("Erreur lors de la suppression : " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", checkAuth);