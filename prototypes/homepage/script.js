const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const header = document.querySelector("[data-header]");
const setHeaderState = () => header?.classList.toggle("scrolled", window.scrollY > 14);
setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  nav?.classList.toggle("open", !isOpen);
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navToggle?.setAttribute("aria-expanded", "false");
    nav?.classList.remove("open");
  });
});

const billingButtons = document.querySelectorAll("[data-billing]");
const price = document.querySelector("[data-price]");
const suffix = document.querySelector("[data-price-suffix]");
const billingNote = document.querySelector("[data-billing-note]");

billingButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const yearly = button.dataset.billing === "yearly";
    billingButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    if (price) price.textContent = yearly ? "6" : "8";
    if (suffix) suffix.textContent = "/ month";
    if (billingNote) billingNote.textContent = yearly ? "Billed $72 yearly" : "Billed monthly";
  });
});

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const revealElements = document.querySelectorAll(".fade-up");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );
  revealElements.forEach((element) => revealObserver.observe(element));
}

const stage = document.querySelector("[data-chaos-stage]");
const hint = document.querySelector("[data-cursor-hint]");
const chaosIcons = [...document.querySelectorAll("[data-chaos-icon]")];

if (stage && chaosIcons.length && !reduceMotion) {
  let pointer = null;
  let hoveredIcon = null;
  let stageSize = { width: 0, height: 0 };
  let lastTime = performance.now();
  const animationStartedAt = lastTime;

  const icons = chaosIcons.map((element, index) => ({
    element,
    x: Number(element.dataset.x) || 0.1,
    y: Number(element.dataset.y) || 0.1,
    vx: (index % 2 ? 1 : -1) * (0.150 + index * 0.010),
    vy: (index % 3 ? 1 : -1) * (0.115 + index * 0.010),
    phase: index * 0.86,
    size: 84,
    loadOffsetX: (index % 2 ? 1 : -1) * (10 + index * 2),
    loadOffsetY: (index % 3 ? 1 : -1) * (8 + index * 2),
  }));

  const measureStage = () => {
    const rect = stage.getBoundingClientRect();
    stageSize = { width: rect.width, height: rect.height };
    icons.forEach((icon) => {
      icon.size = icon.element.getBoundingClientRect().width || 84;
      icon.x = Math.min(icon.x, Math.max(0, stageSize.width - icon.size));
      icon.y = Math.min(icon.y, Math.max(0, stageSize.height - icon.size));
    });
  };

  const resetIconPositions = () => {
    measureStage();
    icons.forEach((icon) => {
      icon.x = Number(icon.element.dataset.x) * Math.max(0, stageSize.width - icon.size);
      icon.y = Number(icon.element.dataset.y) * Math.max(0, stageSize.height - icon.size);
    });
  };

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    hoveredIcon = event.target.closest("[data-chaos-icon]");
    if (hint) hint.style.opacity = "0";
  });
  stage.addEventListener("pointerleave", () => {
    pointer = null;
    hoveredIcon = null;
  });
  window.addEventListener("resize", measureStage, { passive: true });
  resetIconPositions();

  const animateChaos = (time) => {
    const delta = Math.min(2, (time - lastTime) / 16.67);
    lastTime = time;
    const loadProgress = Math.min(1, (time - animationStartedAt) / 850);
    const loadEase = 1 - (1 - loadProgress) ** 3;

    icons.forEach((icon) => {
      if (pointer) {
        const centerX = icon.x + icon.size / 2;
        const centerY = icon.y + icon.size / 2;
        const dx = centerX - pointer.x;
        const dy = centerY - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        const repelRange = 130;
        if (distance < repelRange) {
          const force = ((repelRange - distance) / repelRange) * 0.16;
          icon.vx += (dx / distance) * force;
          icon.vy += (dy / distance) * force;
        }
      }

      icon.vx = Math.max(-0.45, Math.min(0.45, icon.vx)) * 0.9995;
      icon.vy = Math.max(-0.45, Math.min(0.45, icon.vy)) * 0.9995;
      icon.x += icon.vx * delta;
      icon.y += icon.vy * delta;

      const maxX = Math.max(0, stageSize.width - icon.size);
      const maxY = Math.max(0, stageSize.height - icon.size);
      if (icon.x <= 0 || icon.x >= maxX) {
        icon.x = Math.max(0, Math.min(maxX, icon.x));
        icon.vx *= -1;
      }
      if (icon.y <= 0 || icon.y >= maxY) {
        icon.y = Math.max(0, Math.min(maxY, icon.y));
        icon.vy *= -1;
      }

      const wobble = Math.sin(time / 700 + icon.phase);
      const isHovered = icon.element === hoveredIcon;
      const rotation = wobble * 5 + (isHovered ? wobble * 7 : 0);
      const scale = 1 + Math.sin(time / 900 + icon.phase) * 0.045 + (isHovered ? 0.16 : 0);
      const startX = icon.x + icon.loadOffsetX * (1 - loadEase);
      const startY = icon.y + icon.loadOffsetY * (1 - loadEase);
      icon.element.style.transform = `translate3d(${startX}px, ${startY}px, 0) rotate(${rotation}deg) scale(${scale})`;
    });

    requestAnimationFrame(animateChaos);
  };

  requestAnimationFrame(animateChaos);
}
