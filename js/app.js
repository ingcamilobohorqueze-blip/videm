/**
 * VIDEM - Core Application Logic
 * Dynamic WhatsApp Link Generator, Speedtest Helper Modal, Interactive Pre-qualifier, and FAQs Accordion.
 */

// ==========================================================================
// 1. GLOBAL CONFIGURATION (Easily customize WhatsApp & n8n settings)
// ==========================================================================
const VIDEM_CONFIG = {
  // Configura aquí tu número de WhatsApp oficial (código de país + número, sin signos + ni espacios)
  // Configurado para: +57 301 5568904
  whatsappNumber: "573015568904",

  // Mensajes predeterminados del embudo
  defaultMessages: {
    heroValidation: "Hola, quiero validar si mi Smart TV o TV Box es compatible con Videm",
    qualifiedAccess: "Hola, cumplo con los requisitos técnicos (Smart TV/TV Box y Fibra Óptica) y deseo agendar mi acceso a Videm",
    portalRenovaciones: "Hola, soy cliente de Videm y deseo gestionar mi renovación",
    bajaDatos: "Hola, deseo solicitar la baja y supresión de mis datos de contacto de los registros de Videm"
  }
};

/**
 * Builds a direct WhatsApp click-to-chat URL with properly encoded message.
 */
function buildWhatsAppUrl(message) {
  const cleanNumber = VIDEM_CONFIG.whatsappNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

// ==========================================================================
// 2. DOM INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initWhatsAppLinks();
  initInteractiveQualifier();
  initSpeedtestModal();
  initFaqsAccordion();
  initCdnStatusPopover();
  initLegalModals();
});

/**
 * Initializes static and data-driven WhatsApp links across the page.
 */
function initWhatsAppLinks() {
  // Hero Main CTA
  const heroBtn = document.getElementById('heroCtaBtn');
  if (heroBtn) {
    heroBtn.href = buildWhatsAppUrl(VIDEM_CONFIG.defaultMessages.heroValidation);
  }

  // Footer Renewal Portal Link
  const renewalLink = document.getElementById('renewalPortalBtn');
  if (renewalLink) {
    renewalLink.href = buildWhatsAppUrl(VIDEM_CONFIG.defaultMessages.portalRenovaciones);
  }

  // Navbar Quick CTA
  const navCta = document.getElementById('navCtaBtn');
  if (navCta) {
    navCta.href = buildWhatsAppUrl(VIDEM_CONFIG.defaultMessages.heroValidation);
  }
}

/**
 * Interactive Pre-qualifier: Enhances user confidence and dynamically prepares
 * the secondary CTA WhatsApp message with their exact setup.
 */
let globalUpdateQualification = null;

function initInteractiveQualifier() {
  const tvSelect = document.getElementById('qualifierTvSelect');
  const speedSelect = document.getElementById('qualifierSpeedSelect');
  const resultBox = document.getElementById('qualifierResultBox');
  const secondaryBtn = document.getElementById('secondaryCtaBtn');

  if (!tvSelect || !speedSelect || !resultBox || !secondaryBtn) return;

  function updateQualification(explicitMbps = null) {
    const tvValue = tvSelect.value;
    const speedValue = speedSelect.value;
    const tvText = tvSelect.options[tvSelect.selectedIndex].text;
    const speedText = speedSelect.options[speedSelect.selectedIndex].text;

    let statusText = "";
    let isFullyQualified = true;
    let customMessage = "";

    if (explicitMbps !== null) {
      if (explicitMbps >= 100) {
        statusText = `✅ ¡Prueba Speedtest superada con éxito! Con ${explicitMbps} Mbps medidos y ${tvText}, tu hogar califica para Remux 4K nativo, Dolby Vision y Dolby Atmos con cero pausas.`;
        isFullyQualified = true;
        customMessage = `Hola, he realizado la prueba técnica: tengo una Smart TV con ${tvText} y una velocidad medida en Speedtest de ${explicitMbps} Mbps. Deseo agendar mi acceso a Videm.`;
      } else {
        statusText = `⚠️ Prueba Speedtest: Detectados ${explicitMbps} Mbps. Adecuado para 1080p y 4K Web-DL, pero evaluemos juntos si podemos optimizar la caché de tu red para Remux sin compresión.`;
        isFullyQualified = false;
        customMessage = `Hola, tengo una Smart TV con ${tvText} y medí ${explicitMbps} Mbps en Speedtest. Deseo asesoría técnica para optimizar mi acceso a Videm.`;
      }
    } else {
      if (speedValue === "low") {
        statusText = "⚠️ Velocidad ajustada: Recomendado para 1080p / 4K Web-DL, pero podría presentar demoras en Remux 4K sin compresión.";
        isFullyQualified = false;
        customMessage = `Hola, tengo una pantalla con ${tvText} y conexión de ${speedText}. Deseo asesoría técnica para evaluar si mi hogar califica para Videm.`;
      } else {
        statusText = `✅ ¡Excelente! Tu configuración (${tvText} + ${speedText}) califica con honores para la experiencia completa Videm en Remux 4K, Dolby Vision y Dolby Atmos.`;
        isFullyQualified = true;
        customMessage = `Hola, cumplo con los requisitos técnicos: Tengo ${tvText} y conexión de fibra óptica ${speedText}. Deseo agendar mi acceso a Videm.`;
      }
    }

    // Update Result Box UI
    resultBox.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${isFullyQualified 
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' 
          : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
      </svg>
      <span>${statusText}</span>
    `;

    resultBox.style.borderColor = isFullyQualified ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
    resultBox.style.color = isFullyQualified ? 'var(--color-status-success)' : 'var(--color-status-warning)';
    resultBox.style.backgroundColor = isFullyQualified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)';

    // Update Button WhatsApp Link
    secondaryBtn.href = buildWhatsAppUrl(customMessage);
  }

  globalUpdateQualification = updateQualification;

  // Bind change events
  tvSelect.addEventListener('change', () => updateQualification());
  speedSelect.addEventListener('change', () => updateQualification());

  // Initial trigger
  updateQualification();
}

/**
 * Speedtest Helper: Modal and manual numeric Mbps evaluator.
 */
function initSpeedtestModal() {
  const modal = document.getElementById('speedtestModal');
  const openBtn = document.getElementById('openSpeedtestModalBtn');
  const closeBtn = document.getElementById('closeSpeedtestModalBtn');
  const modalInput = document.getElementById('modalMbpsInput');
  const confirmModalBtn = document.getElementById('confirmModalSpeedBtn');
  const manualInlineInput = document.getElementById('manualSpeedInput');
  const applyInlineBtn = document.getElementById('applyManualSpeedBtn');
  const speedSelect = document.getElementById('qualifierSpeedSelect');

  function openModal() {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (modalInput) {
      setTimeout(() => modalInput.focus(), 200);
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function applySpeed(mbps) {
    if (isNaN(mbps) || mbps <= 0) return;

    // Sync select element to best matching tier
    if (speedSelect) {
      if (mbps < 100) {
        speedSelect.value = "low";
      } else if (mbps < 260) {
        speedSelect.value = "150";
      } else if (mbps < 500) {
        speedSelect.value = "300";
      } else {
        speedSelect.value = "500";
      }
    }

    // Sync both inputs
    if (modalInput) modalInput.value = mbps;
    if (manualInlineInput) manualInlineInput.value = mbps;

    // Run qualification logic with explicit measured value
    if (typeof globalUpdateQualification === 'function') {
      globalUpdateQualification(mbps);
    }

    closeModal();

    // Smooth scroll to results
    const resultBox = document.getElementById('qualifierResultBox');
    if (resultBox) {
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Open & Close triggers
  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close when clicking on backdrop outside modal card
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  // Modal button handler
  if (confirmModalBtn && modalInput) {
    confirmModalBtn.addEventListener('click', () => {
      const val = parseFloat(modalInput.value);
      applySpeed(val);
    });

    modalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = parseFloat(modalInput.value);
        applySpeed(val);
      }
    });
  }

  // Inline quick input handler
  if (applyInlineBtn && manualInlineInput) {
    applyInlineBtn.addEventListener('click', () => {
      const val = parseFloat(manualInlineInput.value);
      applySpeed(val);
    });

    manualInlineInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = parseFloat(manualInlineInput.value);
        applySpeed(val);
      }
    });
  }
}

/**
 * FAQs Accordion logic: Smooth expand/collapse with accessible ARIA states.
 */
function initFaqsAccordion() {
  const accordion = document.getElementById('faqsAccordion');
  if (!accordion) return;

  const items = accordion.querySelectorAll('.faq-item');

  items.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('is-active');

      // Close all other items for a clean single-open accordion feel
      items.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('is-active');
          const otherBtn = otherItem.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isActive) {
        item.classList.remove('is-active');
        questionBtn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('is-active');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/**
 * CDN Status Popover: Opens live network health monitor and thermometer gauge.
 */
function initCdnStatusPopover() {
  const trigger = document.getElementById('cdnStatusTrigger');
  const popover = document.getElementById('cdnStatusPopover');

  if (!trigger || !popover) return;

  function togglePopover(e) {
    e.stopPropagation();
    const isOpen = popover.classList.contains('is-open');
    if (isOpen) {
      popover.classList.remove('is-open');
      popover.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      popover.classList.add('is-open');
      popover.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
    }
  }

  function closePopover() {
    if (popover.classList.contains('is-open')) {
      popover.classList.remove('is-open');
      popover.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  trigger.addEventListener('click', togglePopover);

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !trigger.contains(e.target)) {
      closePopover();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePopover();
    }
  });
}

/**
 * Legal Modals Controller: Manages Terms and Privacy (Habeas Data) Modals.
 */
function initLegalModals() {
  // Terms Modal
  const openTermsBtn = document.getElementById('openTermsModalBtn');
  const closeTermsBtn = document.getElementById('closeTermsModalBtn');
  const termsModal = document.getElementById('termsModal');

  // Privacy Modal
  const openPrivacyBtn = document.getElementById('openPrivacyModalBtn');
  const closePrivacyBtn = document.getElementById('closePrivacyModalBtn');
  const privacyModal = document.getElementById('privacyModal');
  const bajaBtn = document.getElementById('bajaDataBtn');

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (openTermsBtn && termsModal) {
    openTermsBtn.addEventListener('click', () => openModal(termsModal));
  }
  if (closeTermsBtn && termsModal) {
    closeTermsBtn.addEventListener('click', () => closeModal(termsModal));
  }
  if (termsModal) {
    termsModal.addEventListener('click', (e) => {
      if (e.target === termsModal) closeModal(termsModal);
    });
  }

  if (openPrivacyBtn && privacyModal) {
    openPrivacyBtn.addEventListener('click', () => openModal(privacyModal));
  }
  if (closePrivacyBtn && privacyModal) {
    closePrivacyBtn.addEventListener('click', () => closeModal(privacyModal));
  }
  if (privacyModal) {
    privacyModal.addEventListener('click', (e) => {
      if (e.target === privacyModal) closeModal(privacyModal);
    });
  }

  // Link for direct WhatsApp data deletion request
  if (bajaBtn) {
    bajaBtn.href = buildWhatsAppUrl(VIDEM_CONFIG.defaultMessages.bajaDatos);
  }

  // Close any modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(termsModal);
      closeModal(privacyModal);
    }
  });
}

