/**
 * MedicAI Assistant - Diagnosis Page JavaScript
 * Handles fetching and displaying preliminary diagnoses
 */

document.addEventListener('DOMContentLoaded', function() {
    const noSessionMessage = document.getElementById('noSessionMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const diagnosisHeader = document.getElementById('diagnosisHeader');
    const diagnosisList = document.getElementById('diagnosisList');
    const actionButtons = document.getElementById('actionButtons');
    const printDiagnosisBtn = document.getElementById('printDiagnosis');
    
    // Get session ID from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id') || localStorage.getItem('medicai_session_id');
    
    if (!sessionId) {
        // No session ID, show message
        noSessionMessage.style.display = 'block';
        return;
    }
    
    // Add session ID to summary link
    const summaryLink = document.querySelector('a[href="summary.html"]');
    if (summaryLink) {
        const url = new URL(summaryLink.href, window.location.origin);
        url.searchParams.set('session_id', sessionId);
        summaryLink.href = url.toString();
    }
    
    // Set up print button
    if (printDiagnosisBtn) {
        printDiagnosisBtn.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Fetch diagnoses
    fetchDiagnoses(sessionId);
});

/**
 * Fetch diagnoses from API
 * @param {string} sessionId - Session ID for the patient
 */
async function fetchDiagnoses(sessionId) {
    const noSessionMessage = document.getElementById('noSessionMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const diagnosisHeader = document.getElementById('diagnosisHeader');
    const diagnosisList = document.getElementById('diagnosisList');
    const actionButtons = document.getElementById('actionButtons');
    
    // Show loading indicator
    noSessionMessage.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    
    try {
        // Call diagnosis API
        const response = await callApi(`diagnosis?session_id=${sessionId}`);
        
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
        
        if (response.status === 'success' && response.diagnosis) {
            displayDiagnoses(response.diagnosis);
            diagnosisHeader.style.display = 'block';
            diagnosisList.style.display = 'block';
            actionButtons.style.display = 'flex';
        } else {
            throw new Error(response.error || 'Failed to retrieve diagnoses');
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
 * Display diagnoses in the UI
 * @param {Object} diagnosisData - Diagnosis data from API
 */
function displayDiagnoses(diagnosisData) {
    const diagnosisList = document.getElementById('diagnosisList');
    if (!diagnosisList) return;
    
    // Clear previous content
    diagnosisList.innerHTML = '';
    
    // Extract diagnoses array
    const diagnoses = diagnosisData.diagnoses || [];
    
    if (diagnoses.length === 0) {
        diagnosisList.innerHTML = '<div class="no-data-message"><p>No diagnoses were found based on the provided documents.</p></div>';
        return;
    }
    
    // Get the template
    const template = document.getElementById('diagnosisTemplate');
    if (!template) {
        console.error('Diagnosis template not found');
        return;
    }
    
    // Create and append diagnosis cards
    diagnoses.forEach(diagnosis => {
        const diagnosisCard = createDiagnosisCard(diagnosis, template);
        diagnosisList.appendChild(diagnosisCard);
    });
}

/**
 * Create a diagnosis card element
 * @param {Object} diagnosis - Diagnosis data
 * @param {HTMLTemplateElement} template - Template element
 * @returns {HTMLElement} - Diagnosis card element
 */
function createDiagnosisCard(diagnosis, template) {
    // Clone the template
    const diagnosisCard = document.importNode(template.content, true).firstElementChild;
    
    // Set diagnosis name
    const nameElement = diagnosisCard.querySelector('.diagnosis-name');
    if (nameElement) {
        nameElement.textContent = diagnosis.name || 'Unknown Diagnosis';
    }
    
    // Set confidence badge
    const confidenceBadge = diagnosisCard.querySelector('.confidence-badge');
    if (confidenceBadge) {
        const confidence = diagnosis.confidence || 'Unknown';
        confidenceBadge.textContent = confidence;
        
        // Add appropriate class based on confidence level
        if (confidence.toLowerCase() === 'high') {
            confidenceBadge.classList.add('confidence-high');
        } else if (confidence.toLowerCase() === 'medium') {
            confidenceBadge.classList.add('confidence-medium');
        } else if (confidence.toLowerCase() === 'low') {
            confidenceBadge.classList.add('confidence-low');
        }
    }
    
    // Set explanation
    const explanationElement = diagnosisCard.querySelector('.diagnosis-explanation');
    if (explanationElement) {
        explanationElement.innerHTML = formatTextForDisplay(diagnosis.explanation || 'No explanation provided.');
    }
    
    // Set evidence list
    const evidenceList = diagnosisCard.querySelector('.evidence-list');
    if (evidenceList) {
        if (diagnosis.evidence && diagnosis.evidence.length > 0) {
            diagnosis.evidence.forEach(evidence => {
                const li = document.createElement('li');
                li.innerHTML = formatTextForDisplay(evidence);
                evidenceList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No specific evidence provided.';
            evidenceList.appendChild(li);
        }
    }
    
    // Set follow-up list
    const followupList = diagnosisCard.querySelector('.followup-list');
    if (followupList) {
        if (diagnosis.follow_up && diagnosis.follow_up.length > 0) {
            diagnosis.follow_up.forEach(followup => {
                const li = document.createElement('li');
                li.innerHTML = formatTextForDisplay(followup);
                followupList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'No follow-up recommendations provided.';
            followupList.appendChild(li);
        }
    }
    
    return diagnosisCard;
}