// Hero headline flourish. "Car Painter" is already in the static markup; on
// load we run the alliterative list once (Perfection → Professionals →
// Precision) and settle back on the brand word "Painter", then stop. No
// infinite loop — the animation plays a single pass and leaves the canonical
// headline in place, matching the no-JS state.
(() => {
    const wordElement = document.querySelector('.hero h1');
    if (!wordElement) return;

    const words = ['Painter', 'Perfection', 'Professionals', 'Precision'];
    const baseText = 'Car ';
    const typeDelay = 100;    // ms per character
    const holdBetween = 2000; // ms a finished word stays before the next

    let currentIndex = 1;     // Painter (index 0) is already shown statically
    let settled = false;

    const render = (text) => {
        wordElement.innerHTML = `<span class="yellow">German</span><br>${baseText}${text}`;
    };

    const typeWord = (word, onDone) => {
        let charIndex = 0;
        const interval = setInterval(() => {
            if (charIndex < word.length) {
                render(word.slice(0, ++charIndex));
            } else {
                clearInterval(interval);
                onDone();
            }
        }, typeDelay);
    };

    const next = () => {
        typeWord(words[currentIndex], () => {
            if (settled) return;                  // came back to "Painter" — done
            if (currentIndex < words.length - 1) {
                currentIndex++;
            } else {
                settled = true;
                currentIndex = 0;                 // settle back on the brand word
            }
            setTimeout(next, holdBetween);
        });
    };

    setTimeout(next, holdBetween);
})();
