function initSearchUI() {
    var btn = document.getElementById('search-button');
    var bar = document.getElementById('searchbar');
    var container = document.getElementById('search');
    var initialized = false;
    var inputListenerAdded = false;

    function openSearch() {
        if (bar) {
            bar.hidden = false;
        }
        
        if (!initialized && window.PagefindUI && container) {
            new PagefindUI({
                element: '#search',
                showSubResults: true,
                translations: { placeholder: 'Search…' }
            });
            initialized = true;
        }
        
        setTimeout(function() {
            if (container) {
                var input = container.querySelector('input[type="text"]') || container.querySelector('input');
                if (input) {
                    if (input.focus) input.focus();
                    
                    if (!inputListenerAdded) {
                        input.addEventListener('input', function() {
                            if (!bar) return;
                            if (input.value && input.value.trim().length > 0) {
                                bar.classList.add('has-query');
                            } else {
                                bar.classList.remove('has-query');
                            }
                        });
                        inputListenerAdded = true;
                    }
                }
            }
        }, 50);
        
        document.addEventListener('keydown', escListener);
    }

    function closeSearch() {
        if (bar) {
            bar.hidden = true;
            bar.classList.remove('has-query');
        }
        document.removeEventListener('keydown', escListener);
    }

    function escListener(e) {
        if (e.key === 'Escape') closeSearch();
    }

    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (bar && bar.hidden) {
                openSearch();
            } else {
                closeSearch();
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchUI);
} else {
    initSearchUI();
}