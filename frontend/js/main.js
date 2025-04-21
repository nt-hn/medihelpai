/**
 * MedicAI Assistant - Main JavaScript
 * Shared functionality across all pages
 */

// API Base URL - Change this to your actual backend URL
const API_BASE_URL = 'http://localhost:5000/api';
// For production deployment, you would use something like:
// const API_BASE_URL = 'https://api.medicai.org/api';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode
    initDarkMode();
    
    // Initialize mobile menu
    initMobileMenu();
    
    // Check for any saved notifications to display
    const savedNotification = sessionStorage.getItem('notification');
    if (savedNotification) {
        const notification = JSON.parse(savedNotification);
        showNotification(notification.message, notification.type);
        sessionStorage.removeItem('notification');
    }
});

/**
 * Initialize dark mode functionality
 */
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    
    // Check for saved theme preference or respect OS preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    // Toggle dark mode on click
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Update icon
        darkModeToggle.innerHTML = isDarkMode ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
        
        // Save preference to localStorage
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

/**
 * Initialize mobile menu
 */
function initMobileMenu() {
    // Check if we're on mobile or desktop
    const isMobile = window.innerWidth <= 768;
    
    // Only create menu toggle button if it doesn't exist and we're on mobile
    if (isMobile && !document.querySelector('.menu-toggle')) {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.setAttribute('aria-label', 'Toggle menu');
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Append to header
        const header = document.querySelector('.content-header');
        if (header) {
            header.prepend(menuToggle);
        }
    } else if (!isMobile && document.querySelector('.menu-toggle')) {
        // Remove menu toggle if we're on desktop and it exists
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.remove();
        }
    }
    
    // Create overlay if it doesn't exist
    if (!document.querySelector('.overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);
    }
    
    // Set up toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    
    if (menuToggle && sidebar && overlay) {
        // Clear any existing event listeners
        const newMenuToggle = menuToggle.cloneNode(true);
        if (menuToggle.parentNode) {
            menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
        }
        
        // Add event listener to new button
        newMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // Change icon based on sidebar state
            if (sidebar.classList.contains('active')) {
                newMenuToggle.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                newMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
        
        // Close sidebar when clicking on overlay
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            if (newMenuToggle) {
                newMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
        
        // Close sidebar when clicking on a nav link (on mobile)
        const navLinks = sidebar.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                    if (newMenuToggle) {
                        newMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
                    }
                }
            });
        });
    }
    
    // Update on window resize
    window.addEventListener('resize', function() {
        // Check if we crossed the mobile threshold
        const wasMobile = document.querySelector('.menu-toggle') !== null;
        const isMobileNow = window.innerWidth <= 768;
        
        if (wasMobile !== isMobileNow) {
            // Reload the menu setup
            initMobileMenu();
            
            // Close sidebar if going from mobile to desktop
            if (!isMobileNow) {
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.overlay');
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        }
    });
}

/**
 * Show a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, warning, info)
 * @param {number} duration - How long to show the notification in ms
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Get or create notification container
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    let icon;
    switch (type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'error':
            icon = 'exclamation-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        default:
            icon = 'info-circle';
    }
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // Add to DOM
    container.appendChild(notification);
    
    // Remove after duration
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

/**
 * Save a notification to session storage to display on another page
 * @param {string} message - The message to display
 * @param {string} type - The type of notification
 */
function saveNotification(message, type = 'info') {
    sessionStorage.setItem('notification', JSON.stringify({
        message,
        type
    }));
}

/**
 * Get the session ID from URL parameters
 * @returns {string|null} - The session ID or null if not found
 */
function getSessionId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session_id');
}

/**
 * Handle API error response
 * @param {Error} error - The error object
 * @returns {string} - Formatted error message
 */
function handleApiError(error) {
    console.error('API Error:', error);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
        // The request was made and the server responded with an error
        try {
            // Try to parse error message from response
            const errorData = error.response.json();
            errorMessage = errorData.error || `Error: ${error.response.status}`;
        } catch (e) {
            errorMessage = `Server error: ${error.response.status}`;
        }
    } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your internet connection.';
    } else {
        // Something happened in setting up the request that triggered an error
        errorMessage = error.message || 'Request failed';
    }
    
    return errorMessage;
}

/**
 * Format a string by replacing with HTML tags for display
 * @param {string} text - Text to format
 * @returns {string} - Formatted HTML
 */
function formatTextForDisplay(text) {
    if (!text) return '';
    
    // Convert newlines to <br>
    text = text.replace(/\n/g, '<br>');
    
    // Convert basic markdown
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert bullet points
    text = text.replace(/^- (.*)/gm, '<li>$1</li>');
    text = text.replace(/<li>(.*?)<\/li>(?:\s*<li>|$)/gs, '<ul><li>$1</li></ul>');
    
    return text;
}

/**
 * Make an API call with fetch
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options
 * @returns {Promise} - Promise that resolves to response data
 */
async function callApi(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${endpoint}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            // Try to get error message from response
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

/**
 * Enhanced print functionality
 * Add this to your main.js file or to the specific page JS files
 */

// Function to prepare page for printing
function preparePrint() {
    // Set current date for printing
    const currentDate = new Date().toLocaleDateString();
    
    // Add date to containers
    const containers = document.querySelectorAll('.upload-container, .summary-container, .diagnosis-container');
    containers.forEach(container => {
        container.setAttribute('data-print-date', currentDate);
    });
    
    // Expand all content areas to ensure everything is visible
    const soapSections = document.querySelectorAll('.soap-section');
    soapSections.forEach(section => {
        section.style.display = 'block';
        section.style.overflow = 'visible';
    });
    
    const diagnosisCards = document.querySelectorAll('.diagnosis-card');
    diagnosisCards.forEach(card => {
        card.style.display = 'block';
        card.style.overflow = 'visible';
    });
    
    // Make sure content is visible
    const contentAreas = document.querySelectorAll('.soap-content, .diagnosis-explanation, .evidence-list, .followup-list');
    contentAreas.forEach(area => {
        area.style.display = 'block';
        area.style.overflow = 'visible';
    });
    
    // Force a layout calculation to ensure all content is rendered
    document.body.offsetHeight;
}

// Set up print buttons
document.addEventListener('DOMContentLoaded', function() {
    const printButtons = document.querySelectorAll('#printSummary, #printDiagnosis');
    
    printButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Prepare for printing
            preparePrint();
            
            // Trigger print dialog
            window.print();
        });
    });
    
    // Also prepare when browser print is called directly
    window.addEventListener('beforeprint', preparePrint);
});


/**
 * Enhanced print functionality with protection against duplicate dialogs
 */

// Flag to prevent multiple print dialogs
let isPrinting = false;
let printTimeout = null;

// Function to prepare page for printing
function preparePrint() {
    console.log("Preparing document for printing...");
    
    // Add print header with date
    const currentDate = new Date().toLocaleDateString();
    let printHeader = document.querySelector('.print-header');
    
    if (!printHeader) {
        printHeader = document.createElement('div');
        printHeader.className = 'print-header';
        
        // Insert at the beginning of the container
        const container = document.querySelector('.summary-container, .diagnosis-container');
        if (container) {
            container.insertBefore(printHeader, container.firstChild);
        } else {
            document.body.insertBefore(printHeader, document.body.firstChild);
        }
    }
    
    printHeader.textContent = `Printed on ${currentDate}`;
    
    // Ensure all SOAP sections are visible and expanded
    document.querySelectorAll('.soap-section').forEach(section => {
        section.style.display = 'block';
        section.style.height = 'auto';
        section.style.overflow = 'visible';
        section.style.pageBreakInside = 'avoid';
        section.style.breakInside = 'avoid';
    });
    
    // Ensure all diagnosis cards are visible and expanded
    document.querySelectorAll('.diagnosis-card').forEach(card => {
        card.style.display = 'block';
        card.style.height = 'auto';
        card.style.overflow = 'visible';
        card.style.pageBreakInside = 'avoid';
        card.style.breakInside = 'avoid';
    });
    
    // Ensure content sections are fully visible
    document.querySelectorAll('.soap-content, .diagnosis-explanation, .evidence-list, .followup-list').forEach(content => {
        content.style.display = 'block';
        content.style.height = 'auto';
        content.style.overflow = 'visible';
        content.style.maxHeight = 'none';
    });
    
    // Force a layout recalculation
    document.body.offsetHeight;
}

// Reset the printing state
function resetPrintState() {
    if (printTimeout) {
        clearTimeout(printTimeout);
    }
    isPrinting = false;
    console.log("Print state reset");
}

// Setup print buttons
document.addEventListener('DOMContentLoaded', function() {
    // Find all print buttons
    const printButtons = document.querySelectorAll('#printSummary, #printDiagnosis');
    
    printButtons.forEach(button => {
        // Remove any existing event listeners
        const newButton = button.cloneNode(true);
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
        
        // Add our new single event listener
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Don't trigger if already printing
            if (isPrinting) {
                console.log("Print already in progress, ignoring click");
                return;
            }
            
            console.log("Print button clicked, setting isPrinting=true");
            isPrinting = true;
            
            // Prepare for printing
            preparePrint();
            
            // Wait a moment to ensure preparation is complete
            setTimeout(() => {
                // Trigger browser print once
                window.print();
                
                // Set a timeout to reset the printing flag if afterprint doesn't fire
                printTimeout = setTimeout(() => {
                    resetPrintState();
                }, 2000);
            }, 100);
        });
    });
    
    // Reset printing flag after print dialog is closed or canceled
    window.addEventListener('afterprint', function(e) {
        console.log("After print event triggered, resetting state");
        resetPrintState();
    });
});