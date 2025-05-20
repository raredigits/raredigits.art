document.addEventListener('DOMContentLoaded', function() {
    // Find the link with id "toggle-noise"
    const noiseLink = document.getElementById('toggle-noise');
    
    // Find the grid-noise element
    const gridNoise = document.querySelector('.grid-noise');
    
    // Function to toggle grid visibility
    function toggleGridVisibility() {
        // Check current visibility state and toggle it
        if (gridNoise.style.display === 'none' || getComputedStyle(gridNoise).display === 'none') {
            gridNoise.style.display = 'block';
        } else {
            gridNoise.style.display = 'none';
        }
    }
    
    // Check if elements are found
    if (noiseLink && gridNoise) {
        // Add click event listener to the link
        noiseLink.addEventListener('click', function(event) {
            // Prevent default link behavior
            event.preventDefault();
            toggleGridVisibility();
        });
    }
    
    // Add keyboard shortcut (Ctrl + G) to toggle grid visibility
    document.addEventListener('keydown', function(event) {
        // Check if Ctrl + G is pressed (keyCode 71 is 'G')
        if (event.ctrlKey && event.keyCode === 71) {
            // Prevent default browser behavior for this key combination
            event.preventDefault();
            toggleGridVisibility();
        }
    });
});