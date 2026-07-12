// Contract: SCRIPTS_CONTRACT.md (v0.6.17).
// Hooks: .rd-js-carousel (root/scope), .rd-js-carousel-track (its element
// children are the slides), .rd-js-carousel-prev / -next (arrow buttons),
// .rd-js-carousel-dots (container the script populates).
// State: .rd-is-active on the current slide and its dot.
// Each carousel is initialized independently, so any number can coexist on a
// page (the original schnellreich version collected every image on the page
// into one shared list — a single carousel only).
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.rd-js-carousel').forEach(initCarousel);
});

function initCarousel(root) {
    const track = root.querySelector('.rd-js-carousel-track');
    if (!track) return;

    // Slides are the track's element children — the caption travels with the
    // image because both live inside the same slide element.
    const slides = Array.prototype.filter.call(track.children, function (el) {
        return el.nodeType === 1;
    });
    if (slides.length === 0) return;

    const prev = root.querySelector('.rd-js-carousel-prev');
    const next = root.querySelector('.rd-js-carousel-next');
    const dotsBox = root.querySelector('.rd-js-carousel-dots');

    let idx = Math.max(0, slides.findIndex(function (s) {
        return s.classList.contains('rd-is-active');
    }));

    // Region semantics for assistive tech
    if (!root.getAttribute('role')) root.setAttribute('role', 'group');
    if (!root.getAttribute('aria-roledescription')) root.setAttribute('aria-roledescription', 'carousel');

    // Build one dot per slide (skipped for a single-slide carousel)
    const dots = [];
    if (dotsBox && slides.length > 1) {
        slides.forEach(function (_, i) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'carousel-dot';
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.addEventListener('click', function () { go(i); });
            dotsBox.appendChild(dot);
            dots.push(dot);
        });
    }

    function go(index) {
        idx = (index + slides.length) % slides.length;
        slides.forEach(function (slide, i) {
            const active = i === idx;
            slide.classList.toggle('rd-is-active', active);
            slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
        dots.forEach(function (dot, i) {
            const active = i === idx;
            dot.classList.toggle('rd-is-active', active);
            dot.setAttribute('aria-current', active ? 'true' : 'false');
        });
    }

    if (prev) prev.addEventListener('click', function () { go(idx - 1); });
    if (next) next.addEventListener('click', function () { go(idx + 1); });

    // Keyboard: arrow keys move between slides when the carousel has focus
    root.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    });

    // Single-slide carousels need no controls
    if (slides.length < 2) {
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
    }

    go(idx);
}
