// Contract: SCRIPTS_CONTRACT.md (v0.6.17).
// Hook: .rd-js-hamburger (trigger), .rd-js-hamburger-nav (panel).
// State: .rd-is-active on both + aria-expanded on the trigger.
// The menu/close icon swap is pure CSS (.hamburger__icon-menu / .hamburger__icon-close).
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.rd-js-hamburger');
  const navGlobal = document.querySelector('.rd-js-hamburger-nav');
  if (!hamburger || !navGlobal) return;

  // Closing the menu when clicking outside — attached only while open
  const outsideListener = (event) => {
    if (!navGlobal.contains(event.target) && !hamburger.contains(event.target)) {
      setState(false);
    }
  };

  const escListener = (event) => {
    if (event.key === 'Escape') setState(false);
  };

  const setState = (open) => {
    hamburger.classList.toggle('rd-is-active', open);
    navGlobal.classList.toggle('rd-is-active', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      document.addEventListener('click', outsideListener);
      document.addEventListener('keydown', escListener);
    } else {
      document.removeEventListener('click', outsideListener);
      document.removeEventListener('keydown', escListener);
    }
  };

  if (navGlobal.id) hamburger.setAttribute('aria-controls', navGlobal.id);
  setState(false);

  // Toggle the hamburger menu on click
  hamburger.addEventListener('click', () => {
    setState(!navGlobal.classList.contains('rd-is-active'));
  });
});
