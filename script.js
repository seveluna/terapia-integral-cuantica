const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.18 }
);

document
  .querySelectorAll(".section, .hero, .book-hero, .trust-strip")
  .forEach((node) => {
    node.classList.add("reveal");
    observer.observe(node);
  });

const stickyHeader = document.querySelector(".modern-redesign .site-header");

if (stickyHeader) {
  const updateHeaderAppearance = () => {
    stickyHeader.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  updateHeaderAppearance();
  window.addEventListener("scroll", updateHeaderAppearance, { passive: true });
}

document.querySelectorAll("[data-slider]").forEach((slider) => {
  const track = slider.querySelector("[data-slider-track]");
  const slides = [...track.children];
  const prev = slider.querySelector("[data-slider-prev]");
  const next = slider.querySelector("[data-slider-next]");
  let index = 0;

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
  };

  prev?.addEventListener("click", () => {
    index = (index - 1 + slides.length) % slides.length;
    render();
  });

  next?.addEventListener("click", () => {
    index = (index + 1) % slides.length;
    render();
  });
});

const paypalCheckoutForm = document.querySelector("form.checkout-form");

if (paypalCheckoutForm) {
  const bumpToggle = paypalCheckoutForm.querySelector("[data-order-bump]");
  const totalNode = paypalCheckoutForm.querySelector("[data-checkout-total]");
  const bookOnlyUrl = paypalCheckoutForm.dataset.paypalBookOnly;
  const bookWithBumpUrl = paypalCheckoutForm.dataset.paypalBookBump;

  const renderCheckoutTotal = () => {
    if (!totalNode || !bumpToggle) return;
    totalNode.textContent = bumpToggle.checked ? "34 EUR" : "7 EUR";
  };

  renderCheckoutTotal();
  bumpToggle?.addEventListener("change", renderCheckoutTotal);

  paypalCheckoutForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const paypalUrl = bumpToggle?.checked ? bookWithBumpUrl : bookOnlyUrl;

    if (!paypalUrl || paypalUrl === "https://www.paypal.com/") {
      window.alert(
        "Falta configurar el enlace de PayPal. Añade los dos links en libro.html antes de publicar."
      );
      return;
    }

    window.location.href = paypalUrl;
  });
}

document.querySelectorAll("[data-paypal-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");

    if (!href || href === "https://www.paypal.com/") {
      event.preventDefault();
      const label = link.dataset.paypalLabel || "este pago";
      window.alert(
        `Falta configurar el enlace de PayPal para ${label}. Pega el link real en index.html antes de publicar.`
      );
    }
  });
});

const modalTriggers = document.querySelectorAll("[data-open-modal]");

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const modalId = trigger.dataset.openModal;
    const modal = document.getElementById(modalId);

    if (!modal) return;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
});

const closeModal = (modal) => {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

document.querySelectorAll(".retreat-modal").forEach((modal) => {
  modal.querySelectorAll("[data-close-modal]").forEach((node) => {
    node.addEventListener("click", () => closeModal(modal));
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  document.querySelectorAll(".retreat-modal.is-open").forEach((modal) => {
    closeModal(modal);
  });
});

const firebaseRetreatFormConfig = {
  projectId: "terapias-78b5e",
  apiKey: "AIzaSyDmJdabu_lCYy1DWI9UP8tS1j5abGIj27o",
  collection: "retreatLeads",
};

const saveRetreatLead = async (payload) => {
  if (!firebaseRetreatFormConfig.apiKey) {
    return { saved: false, reason: "missing-api-key" };
  }

  const endpoint = `https://firestore.googleapis.com/v1/projects/${firebaseRetreatFormConfig.projectId}/databases/(default)/documents/${firebaseRetreatFormConfig.collection}?key=${firebaseRetreatFormConfig.apiKey}`;

  const fields = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, { stringValue: String(value ?? "") }])
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error("No se pudo guardar el lead del retiro.");
  }

  return { saved: true };
};

document.querySelectorAll("[data-retreat-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const note = form.querySelector("[data-retreat-form-note]");
    const paypalUrl = form.dataset.paypalUrl;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    payload.createdAt = new Date().toISOString();
    payload.origin = window.location.href;

    submitButton?.setAttribute("disabled", "disabled");
    if (note) {
      note.textContent = "Estamos preparando tu siguiente paso…";
      note.classList.remove("is-success");
    }

    try {
      localStorage.setItem("retreatInterestDraft", JSON.stringify(payload));
      await saveRetreatLead(payload);

      if (note) {
        note.textContent = "Todo listo. Te llevamos ahora a PayPal para completar la reserva.";
        note.classList.add("is-success");
      }

      window.setTimeout(() => {
        window.location.href = paypalUrl;
      }, 700);
    } catch (error) {
      console.error(error);
      if (note) {
        note.textContent =
          "Tus datos se han preparado, pero ha fallado el guardado automático. Revisa la configuración de Firebase antes de publicar.";
      }
      submitButton?.removeAttribute("disabled");
    }
  });
});
