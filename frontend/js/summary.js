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
    
    // First, hide the "No Patient Data" message by default
    if (noSessionMessage) {
        noSessionMessage.style.display = 'none';
    }
    
    // Get session ID from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id') || localStorage.getItem('medicai_session_id');
    
    if (!sessionId) {
        // Only show "No Patient Data" message if there's no session ID
        if (noSessionMessage) {
            noSessionMessage.style.display = 'block';
        }
        return;
    }
    
    console.log("Using session ID:", sessionId);
    
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
    
    // Check if we have cached summary data in localStorage
    const cachedSummary = localStorage.getItem('medicai_summary');
    if (cachedSummary) {
        try {
            const summaryData = JSON.parse(cachedSummary);
            console.log("Using cached summary data:", summaryData);
            displaySummary(summaryData);
            if (soapSummary) soapSummary.style.display = 'grid';
            if (actionButtons) actionButtons.style.display = 'flex';
            return;
        } catch (e) {
            console.error("Error parsing cached summary:", e);
            // Continue to fetch from API if parsing fails
        }
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
    if (noSessionMessage) noSessionMessage.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    
    try {
        console.log("Fetching summary from API");
        // Call patient summary API
        const response = await fetch(`${API_BASE_URL}/patient-summary?session_id=${sessionId}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API response:", data);
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (data.status === 'success' && data.summary) {
            // Cache the summary data in localStorage
            localStorage.setItem('medicai_summary', JSON.stringify(data.summary));
            
            displaySummary(data.summary);
            if (soapSummary) soapSummary.style.display = 'grid';
            if (actionButtons) actionButtons.style.display = 'flex';
        } else {
            throw new Error(data.error || 'Failed to retrieve patient summary');
        }
    } catch (error) {
        console.error("Error fetching summary:", error);
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Show error notification
        showNotification(`Error: ${error.message}`, 'error');
        
        // Only now show the no data message
        if (noSessionMessage) noSessionMessage.style.display = 'block';
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
    
    console.log("Displaying summary:", summary);
    
    // Handle potential different response formats from GPT API
    // The summary might be directly in the object or inside a nested property
    let soapData = summary;
    if (summary.subjective === undefined && summary.soap) {
        soapData = summary.soap;
    } else if (summary.subjective === undefined && summary.summary) {
        soapData = summary.summary;
    }
    
    // Try to handle common variations in key names
    const getFieldContent = (obj, keys) => {
        for (const key of keys) {
            if (obj[key] !== undefined) {
                return obj[key];
            }
        }
        return null;
    };
    
    // Format and display subjective section
    if (subjectiveContent) {
        const subjective = getFieldContent(soapData, ['subjective', 'Subjective', 'S']) || 'No subjective information provided';
        subjectiveContent.innerHTML = formatSummaryContent(subjective);
    }
    
    // Format and display objective section
    if (objectiveContent) {
        const objective = getFieldContent(soapData, ['objective', 'Objective', 'O']) || 'No objective information provided';
        objectiveContent.innerHTML = formatSummaryContent(objective);
    }
    
    // Format and display assessment section
    if (assessmentContent) {
        const assessment = getFieldContent(soapData, ['assessment', 'Assessment', 'A']) || 'No assessment provided';
        assessmentContent.innerHTML = formatSummaryContent(assessment);
    }
    
    // Format and display plan section
    if (planContent) {
        const plan = getFieldContent(soapData, ['plan', 'Plan', 'P']) || 'No plan provided';
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
    
    // If content is an object, try to extract meaningful text
    if (typeof content === 'object' && content !== null && !Array.isArray(content)) {
        // Try to extract text from the object
        const textValues = Object.values(content)
            .filter(val => typeof val === 'string')
            .join('\n\n');
        
        return formatTextForDisplay(textValues || JSON.stringify(content));
    }
    
    // If content is a string, format it
    return formatTextForDisplay(content);
}