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