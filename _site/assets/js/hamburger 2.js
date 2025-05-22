document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navGlobal = document.querySelector('.nav-hamburger');

  // Toggle the hamburger menu on click
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navGlobal.classList.toggle('active');
  });

  // Closing the menu when clicking outside
  document.addEventListener('click', (event) => {
    if (!navGlobal.contains(event.target) && !hamburger.contains(event.target)) {
      hamburger.classList.remove('active');
      navGlobal.classList.remove('active');
    }
  });
});