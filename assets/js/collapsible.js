document.addEventListener('DOMContentLoaded', function() {
    // Find all trigger elements
    const triggers = document.querySelectorAll('.collapsible-trigger');
    
    // Add click handler to each trigger
    triggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            // Try to find related content element
            let content;
            
            // Check if trigger and content are siblings
            if (this.nextElementSibling && this.nextElementSibling.classList.contains('collapsible-content')) {
                content = this.nextElementSibling;
            } 
            // Check if content is the next sibling of trigger's parent
            else if (this.parentElement && 
                     this.parentElement.nextElementSibling && 
                     this.parentElement.nextElementSibling.classList.contains('collapsible-content')) {
                content = this.parentElement.nextElementSibling;
            }
            
            // Exit if no content found
            if (!content) return;
            
            // Find the icon (if it exists)
            const icon = this.querySelector('.collapsible-icon');
            
            // Check if content is currently visible
            const isVisible = window.getComputedStyle(content).display !== 'none';
            
            // Toggle visibility
            if (isVisible) {
                content.style.display = 'none';
                if (icon) icon.textContent = 'keyboard_arrow_down';
            } else {
                content.style.display = 'block';
                if (icon) icon.textContent = 'keyboard_arrow_up';
            }
        });
    });
});