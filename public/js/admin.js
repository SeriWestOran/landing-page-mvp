(function () {
  const TOKEN_KEY = "admin_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function getAuthHeaders() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
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

  function showSection(isLoggedIn) {
    const loginSec = document.getElementById("login-section");
    const adminSec = document.getElementById("admin-section");
    if (loginSec && adminSec) {
      if (isLoggedIn) {
        loginSec.style.display = "none";
        adminSec.style.display = "block";
      } else {
        loginSec.style.display = "block";
        adminSec.style.display = "none";
      }
    }
  }

  async function checkAuth() {
    const token = getToken();
    if (!token) {
      showSection(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/verify", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showSection(true);
        loadAdminData();
      } else {
        setToken(null);
        showSection(false);
      }
    } catch (err) {
      console.error("Erreur de vérification auth:", err);
      showSection(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const passwordInput = document.getElementById("admin-password");
    const errorEl = document.getElementById("login-error");
    const password = passwordInput ? passwordInput.value : "";

    if (errorEl) errorEl.style.display = "none";

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        if (passwordInput) passwordInput.value = "";
        showSection(true);
        loadAdminData();
      } else {
        if (errorEl) {
          errorEl.textContent = data.error || "Mot de passe incorrect";
          errorEl.style.display = "block";
        }
      }
    } catch (err) {
      console.error("Erreur connexion:", err);
      if (errorEl) {
        errorEl.textContent = "Erreur de connexion au serveur";
        errorEl.style.display = "block";
      }
    }
  }

  function handleLogout() {
    setToken(null);
    showSection(false);
  }

  async function loadAdminData() {
    await Promise.all([loadProducts(), loadServices()]);
  }

  async function loadProducts() {
    const listEl = document.getElementById("admin-products-list");
    if (!listEl) return;

    try {
      const res = await fetch("/api/products");
      const products = res.ok ? await res.json() : [];

      if (products.length === 0) {
        listEl.innerHTML = "<p>Aucun produit enregistré.</p>";
        return;
      }

      listEl.innerHTML = products
        .map((p) => {
          const imgUrl = escapeHtml(p.image_url || "/images/placeholder-1.svg");
          const prodLink = `${window.location.origin}/produit/${p.id}`;
          return `
          <div class="admin-item-card" data-id="${p.id}">
            <div class="admin-item-img">
              <img src="${imgUrl}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null;this.src='/images/placeholder-1.svg';" />
            </div>
            <div class="admin-item-details">
              <h4>${escapeHtml(p.name)} ${p.is_custom ? '<span class="badge">Sur commande</span>' : ''}</h4>
              <p><strong>Prix :</strong> ${money(p.price, p.currency)} | <strong>Stock :</strong> ${p.in_stock ? 'En stock' : 'Rupture'}</p>
              <p><strong>Catégorie :</strong> ${escapeHtml(p.category || 'Aucune')}</p>
              <p class="direct-link"><strong>Lien :</strong> <a href="${prodLink}" target="_blank">${prodLink}</a> 
                 <button type="button" class="btn-sm btn-copy" onclick="navigator.clipboard.writeText('${prodLink}')">Copier</button>
              </p>
            </div>
            <div class="admin-item-actions">
              <button type="button" class="btn btn-secondary btn-edit-product" data-product='${JSON.stringify(p).replace(/'/g, "&apos;")}'>Éditer</button>
              <button type="button" class="btn btn-danger btn-delete-product" data-id="${p.id}">Supprimer</button>
            </div>
          </div>`;
        })
        .join("");

      attachProductEvents();
    } catch (err) {
      console.error("Erreur chargement produits admin:", err);
      listEl.innerHTML = "<p>Erreur lors du chargement des produits.</p>";
    }
  }

  async function loadServices() {
    const listEl = document.getElementById("admin-services-list");
    if (!listEl) return;

    try {
      const res = await fetch("/api/services");
      const services = res.ok ? await res.json() : [];

      if (services.length === 0) {
        listEl.innerHTML = "<p>Aucun service enregistré.</p>";
        return;
      }

      listEl.innerHTML = services
        .map((s) => {
          const imgUrl = escapeHtml(s.image_url || "/images/placeholder-1.svg");
          return `
          <div class="admin-item-card" data-id="${s.id}">
            <div class="admin-item-img">
              <img src="${imgUrl}" alt="${escapeHtml(s.title)}" onerror="this.onerror=null;this.src='/images/placeholder-1.svg';" />
            </div>
            <div class="admin-item-details">
              <h4>${escapeHtml(s.title)}</h4>
              <p>${escapeHtml(s.description || '')}</p>
            </div>
            <div class="admin-item-actions">
              <button type="button" class="btn btn-secondary btn-edit-service" data-service='${JSON.stringify(s).replace(/'/g, "&apos;")}'>Éditer</button>
              <button type="button" class="btn btn-danger btn-delete-service" data-id="${s.id}">Supprimer</button>
            </div>
          </div>`;
        })
        .join("");

      attachServiceEvents();
    } catch (err) {
      console.error("Erreur chargement services admin:", err);
      listEl.innerHTML = "<p>Erreur lors du chargement des services.</p>";
    }
  }

  function attachProductEvents() {
    document.querySelectorAll(".btn-delete-product").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
        const id = btn.dataset.id;
        try {
          const res = await fetch(`/api/products/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            loadProducts();
          } else {
            alert("Erreur lors de la suppression.");
          }
        } catch (err) {
          console.error(err);
        }
      });
    });

    document.querySelectorAll(".btn-edit-product").forEach((btn) => {
      btn.addEventListener("click", () => {
        const product = JSON.parse(btn.dataset.product);
        fillProductForm(product);
      });
    });
  }

  function attachServiceEvents() {
    document.querySelectorAll(".btn-delete-service").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Voulez-vous vraiment supprimer ce service ?")) return;
        const id = btn.dataset.id;
        try {
          const res = await fetch(`/api/services/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            loadServices();
          } else {
            alert("Erreur lors de la suppression.");
          }
        } catch (err) {
          console.error(err);
        }
      });
    });

    document.querySelectorAll(".btn-edit-service").forEach((btn) => {
      btn.addEventListener("click", () => {
        const service = JSON.parse(btn.dataset.service);
        fillServiceForm(service);
      });
    });
  }

  function fillProductForm(p) {
    document.getElementById("prod-id").value = p.id || "";
    document.getElementById("prod-name").value = p.name || "";
    document.getElementById("prod-price").value = p.price || "";
    document.getElementById("prod-category").value = p.category || "Electronique";
    document.getElementById("prod-description").value = p.description || "";
    document.getElementById("prod-instock").checked = !!p.in_stock;
    document.getElementById("prod-custom").checked = !!p.is_custom;
    document.getElementById("prod-form-title").textContent = "Modifier le Produit";
    document.getElementById("prod-cancel-btn").style.display = "inline-block";
    window.scrollTo({ top: document.getElementById("product-form-section").offsetTop - 20, behavior: "smooth" });
  }

  function resetProductForm() {
    document.getElementById("prod-id").value = "";
    document.getElementById("product-form").reset();
    document.getElementById("prod-instock").checked = true;
    document.getElementById("prod-form-title").textContent = "Ajouter un Produit";
    document.getElementById("prod-cancel-btn").style.display = "none";
  }

  function fillServiceForm(s) {
    document.getElementById("serv-id").value = s.id || "";
    document.getElementById("serv-title").value = s.title || "";
    document.getElementById("serv-description").value = s.description || "";
    document.getElementById("serv-form-title").textContent = "Modifier le Service";
    document.getElementById("serv-cancel-btn").style.display = "inline-block";
  }

  function resetServiceForm() {
    document.getElementById("serv-id").value = "";
    document.getElementById("service-form").reset();
    document.getElementById("serv-form-title").textContent = "Ajouter un Service";
    document.getElementById("serv-cancel-btn").style.display = "none";
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const id = document.getElementById("prod-id").value;

    formData.set("in_stock", document.getElementById("prod-instock").checked ? "true" : "false");
    formData.set("is_custom", document.getElementById("prod-custom").checked ? "true" : "false");

    const url = id ? `/api/products/${id}` : "/api/products";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        resetProductForm();
        loadProducts();
      } else {
        const data = await res.json();
        alert(`Erreur : ${data.error || 'Impossible d enregistrer le produit'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion lors de l enregistrement.");
    }
  }

  async function handleServiceSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const id = document.getElementById("serv-id").value;

    const url = id ? `/api/services/${id}` : "/api/services";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        resetServiceForm();
        loadServices();
      } else {
        const data = await res.json();
        alert(`Erreur : ${data.error || 'Impossible d enregistrer le service'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion lors de l enregistrement.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    checkAuth();

    const loginForm = document.getElementById("login-form");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

    const productForm = document.getElementById("product-form");
    if (productForm) productForm.addEventListener("submit", handleProductSubmit);

    const serviceForm = document.getElementById("service-form");
    if (serviceForm) serviceForm.addEventListener("submit", handleServiceSubmit);

    const prodCancelBtn = document.getElementById("prod-cancel-btn");
    if (prodCancelBtn) prodCancelBtn.addEventListener("click", resetProductForm);

    const servCancelBtn = document.getElementById("serv-cancel-btn");
    if (servCancelBtn) servCancelBtn.addEventListener("click", resetServiceForm);
  });
})();
