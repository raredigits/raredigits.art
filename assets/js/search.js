// Contract: SCRIPTS_CONTRACT.md (v0.6.17).
// Hook: .rd-js-search (toggle button), .rd-js-search-bar (bar), .rd-js-search-ui (Pagefind mount).
// State: .rd-is-open on the bar + aria-expanded on the button.
// The Pagefind UI rebuild itself is out of scope here (CSS-050).
function initSearchUI() {
    if (document.body.classList.contains('page-search')) return;
    var btn = document.querySelector('.rd-js-search');
    var bar = document.querySelector('.rd-js-search-bar');
    var container = document.querySelector('.rd-js-search-ui');
    if (!btn || !bar) return;
    var initialized = false;

    btn.setAttribute('aria-expanded', 'false');
    if (bar.id) btn.setAttribute('aria-controls', bar.id);

    function openSearch() {
        bar.classList.add('rd-is-open');
        btn.setAttribute('aria-expanded', 'true');

        if (!initialized && window.PagefindUI && container) {
            if (!container.id) container.id = 'rd-search-ui';
            new PagefindUI({
                element: '#' + container.id,
                showSubResults: true,
                translations: { placeholder: 'Search…' }
            });
            initialized = true;
        }

        setTimeout(function() {
            if (container) {
                var input = container.querySelector('input[type="text"]') || container.querySelector('input');
                if (input && input.focus) input.focus();
            }
        }, 50);

        document.addEventListener('keydown', escListener);
    }

    function closeSearch() {
        bar.classList.remove('rd-is-open');
        btn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('keydown', escListener);
    }

    function escListener(e) {
        if (e.key === 'Escape') closeSearch();
    }

    btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (bar.classList.contains('rd-is-open')) {
            closeSearch();
        } else {
            openSearch();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchUI);
} else {
    initSearchUI();
}
