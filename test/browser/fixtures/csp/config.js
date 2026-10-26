// Runs before the bundle (K-18): records what the policy blocks, and — unless
// the page is opened with ?inject — turns the injected stylesheet off.
window.violations = [];
document.addEventListener('securitypolicyviolation', e => {
  window.violations.push({ directive: e.violatedDirective, blocked: e.blockedURI });
});
if (!new URLSearchParams(location.search).has('inject')) {
  window.RareChartsConfig = { injectStyles: false };
}
