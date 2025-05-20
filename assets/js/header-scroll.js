document.addEventListener('DOMContentLoaded', function() {
  var shrinkHeader = 40;
  
  window.addEventListener('scroll', function() {
    var scroll = getCurrentScroll();
    if (scroll >= shrinkHeader) {
      document.querySelector('.header-container').classList.add('border-bottom');
    } else {
      document.querySelector('.header-container').classList.remove('border-bottom');
    }
  });
  
  function getCurrentScroll() {
    return window.pageYOffset || document.documentElement.scrollTop;
  }
});