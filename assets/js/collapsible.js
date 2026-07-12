// Contract: SCRIPTS_CONTRACT.md (v0.6.17).
// Hook: .rd-js-collapsible (trigger), .rd-js-collapsible-content (content).
// State: .rd-is-open + aria-expanded. No inline styles, no icon glyph swaps —
// the open state is styled by CSS (including icon rotation via [aria-expanded="true"]).
document.addEventListener('DOMContentLoaded', function() {
    // Resolve the content element for a trigger:
    // 1. explicit aria-controls id, 2. trigger's next sibling, 3. trigger's parent's next sibling
    function resolveContent(trigger) {
        const id = trigger.getAttribute('aria-controls');
        if (id) {
            const byId = document.getElementById(id);
            if (byId) return byId;
        }

        const sibling = trigger.nextElementSibling;
        if (sibling && sibling.classList.contains('rd-js-collapsible-content')) {
            return sibling;
        }

        const parentSibling = trigger.parentElement && trigger.parentElement.nextElementSibling;
        if (parentSibling && parentSibling.classList.contains('rd-js-collapsible-content')) {
            return parentSibling;
        }

        return null;
    }

    document.querySelectorAll('.rd-js-collapsible').forEach(trigger => {
        const content = resolveContent(trigger);
        if (!content) return;

        // Initialize ARIA from the authored state
        const isOpen = content.classList.contains('rd-is-open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (content.id && !trigger.getAttribute('aria-controls')) {
            trigger.setAttribute('aria-controls', content.id);
        }

        function toggle() {
            const open = content.classList.toggle('rd-is-open');
            trigger.classList.toggle('rd-is-open', open);
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        trigger.addEventListener('click', toggle);

        // Keyboard access when the trigger is not a native button:
        // make it focusable and respond to Enter / Space
        if (trigger.tagName !== 'BUTTON') {
            if (!trigger.hasAttribute('tabindex')) trigger.setAttribute('tabindex', '0');
            if (!trigger.hasAttribute('role')) trigger.setAttribute('role', 'button');
            trigger.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        }
    });
});
