/**
 * MedicAI Assistant - Summary Page JavaScript
 * Handles fetching and displaying patient summary
 */

document.addEventListener('DOMContentLoaded', function() {
    const noSessionMessage = document.getElementById('noSessionMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const soapSummary = document.getElementById('soapSummary');
    const actionButtons = document.getElementById('actionButtons');
    const printSummaryBtn = document.getElementById('printSummary');
    
    // Get session ID from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id') || localStorage.getItem('medicai_session_id');
    
    if (!sessionId) {
        // No session ID, show message
        noSessionMessage.style.display = 'block';
        return;
    }
    
    // Add session ID to diagnosis link
    const diagnosisLink = document.querySelector('a[href="diagnosis.html"]');
    if (diagnosisLink) {
        const url = new URL(diagnosisLink.href, window.location.origin);
        url.searchParams.set('session_id', sessionId);
        diagnosisLink.href = url.toString();
    }
    
    // Set up print button
    if (printSummaryBtn) {
        printSummaryBtn.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Fetch patient summary
    fetchPatientSummary(sessionId);
});

/**
 * Fetch patient summary data from API
 * @param {string} sessionId - Session ID for the patient
 */
async function fetchPatientSummary(sessionId) {
    const noSessionMessage = document.getElementById('noSessionMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const soapSummary = document.getElementById('soapSummary');
    const actionButtons = document.getElementById('actionButtons');
    
    // Show loading indicator
    noSessionMessage.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    
    try {
        // Call patient summary API
        const response = await callApi(`patient-summary?session_id=${sessionId}`);
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (response.status === 'success' && response.summary) {
            displaySummary(response.summary);
            soapSummary.style.display = 'grid';
            actionButtons.style.display = 'flex';
        } else {
            throw new Error(response.error || 'Failed to retrieve patient summary');
        }
    } catch (error) {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        // Show error notification
        showNotification(`Error: ${error.message}`, 'error');
        
        // Show no data message
        noSessionMessage.style.display = 'block';
    }
}

/**
 * Display the patient summary in SOAP format
 * @param {Object} summary - Summary data in SOAP format
 */
function displaySummary(summary) {
    const subjectiveContent = document.getElementById('subjectiveContent');
    const objectiveContent = document.getElementById('objectiveContent');
    const assessmentContent = document.getElementById('assessmentContent');
    const planContent = document.getElementById('planContent');
    
    // Check if summary is valid
    if (!summary) {
        showNotification('Invalid summary data received', 'error');
        return;
    }
    
    // Format and display subjective section
    if (subjectiveContent) {
        const subjective = summary.subjective || 'No subjective information provided';
        subjectiveContent.innerHTML = formatSummaryContent(subjective);
    }
    
    // Format and display objective section
    if (objectiveContent) {
        const objective = summary.objective || 'No objective information provided';
        objectiveContent.innerHTML = formatSummaryContent(objective);
    }
    
    // Format and display assessment section
    if (assessmentContent) {
        const assessment = summary.assessment || 'No assessment provided';
        assessmentContent.innerHTML = formatSummaryContent(assessment);
    }
    
    // Format and display plan section
    if (planContent) {
        const plan = summary.plan || 'No plan provided';
        planContent.innerHTML = formatSummaryContent(plan);
    }
}

/**
 * Format summary content for display
 * @param {string|Array} content - Content to format (string or array)
 * @returns {string} - Formatted HTML content
 */
function formatSummaryContent(content) {
    // If content is an array, convert to bullet points
    if (Array.isArray(content)) {
        if (content.length === 0) {
            return '<p>None provided</p>';
        }
        
        return '<ul>' + content.map(item => `<li>${formatTextForDisplay(item)}</li>`).join('') + '</ul>';
    }
    
    // If content is a string, format it
    return formatTextForDisplay(content);
}