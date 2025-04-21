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
    
    // Check if we have cached diagnosis data in localStorage
    const cachedDiagnosis = localStorage.getItem('medicai_diagnosis');
    if (cachedDiagnosis) {
        try {
            const diagnosisData = JSON.parse(cachedDiagnosis);
            console.log("Using cached diagnosis data");
            displayDiagnoses(diagnosisData);
            if (diagnosisHeader) diagnosisHeader.style.display = 'block';
            if (diagnosisList) diagnosisList.style.display = 'block';
            if (actionButtons) actionButtons.style.display = 'flex';
            return;
        } catch (e) {
            console.error("Error parsing cached diagnosis:", e);
            // Continue to fetch from API if parsing fails
        }
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
    if (noSessionMessage) noSessionMessage.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    
    try {
        console.log("Fetching diagnosis from API");
        // Call diagnosis API using fetch directly
        const response = await fetch(`${API_BASE_URL}/diagnosis?session_id=${sessionId}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API response:", data);
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (data.status === 'success' && data.diagnosis) {
            // Cache the diagnosis data in localStorage
            localStorage.setItem('medicai_diagnosis', JSON.stringify(data.diagnosis));
            
            displayDiagnoses(data.diagnosis);
            if (diagnosisHeader) diagnosisHeader.style.display = 'block';
            if (diagnosisList) diagnosisList.style.display = 'block';
            if (actionButtons) actionButtons.style.display = 'flex';
        } else {
            throw new Error(data.error || 'Failed to retrieve diagnoses');
        }
    } catch (error) {
        console.error("Error fetching diagnosis:", error);
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Show error notification
        showNotification(`Error: ${error.message}`, 'error');
        
        // Only now show the no data message
        if (noSessionMessage) noSessionMessage.style.display = 'block';
    }
}

/**
 * Display diagnoses in the UI
 * @param {Object} diagnosisData - Diagnosis data from API
 */
function displayDiagnoses(diagnosisData) {
    const diagnosisList = document.getElementById('diagnosisList');
    if (!diagnosisList) return;
    
    // Make sure the "No Patient Data" message is hidden
    const noSessionMessage = document.getElementById('noSessionMessage');
    if (noSessionMessage) {
        noSessionMessage.style.display = 'none';
    }
    
    // Clear previous content
    diagnosisList.innerHTML = '';
    
    console.log("Displaying diagnosis data:", diagnosisData);
    
    // Extract diagnoses array - handle different possible data structures
    let diagnoses = [];
    
    if (Array.isArray(diagnosisData)) {
        // If it's already an array
        diagnoses = diagnosisData;
    } else if (diagnosisData.diagnoses && Array.isArray(diagnosisData.diagnoses)) {
        // If diagnoses are in a property called 'diagnoses'
        diagnoses = diagnosisData.diagnoses;
    } else {
        // Try to find an array property
        for (const key in diagnosisData) {
            if (Array.isArray(diagnosisData[key])) {
                diagnoses = diagnosisData[key];
                break;
            }
        }
    }
    
    // If still no diagnoses found, log an error and exit
    if (diagnoses.length === 0) {
        console.error("No diagnoses array found in data:", diagnosisData);
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
    
    // Map different possible field names to standard names
    const diagnosisName = diagnosis.name || diagnosis.diagnosis || diagnosis.title || "Unknown Diagnosis";
    const confidence = diagnosis.confidence || diagnosis.confidence_level || diagnosis.probability || "Unknown";
    const explanation = diagnosis.explanation || diagnosis.rationale || diagnosis.description || "No explanation provided.";
    const evidence = diagnosis.evidence || diagnosis.supporting_evidence || diagnosis.supporting_evidence_list || [];
    const followUp = diagnosis.follow_up || diagnosis.follow_up_tests_or_questions || diagnosis.follow_up_tests || diagnosis.suggested_tests || [];
    
    // Set diagnosis name
    const nameElement = diagnosisCard.querySelector('.diagnosis-name');
    if (nameElement) {
        nameElement.textContent = diagnosisName;
    }
    
    // Set confidence badge
    const confidenceBadge = diagnosisCard.querySelector('.confidence-badge');
    if (confidenceBadge) {
        confidenceBadge.textContent = confidence;
        
        // Add appropriate class based on confidence level
        const confidenceLower = confidence.toLowerCase();
        if (confidenceLower.includes('high')) {
            confidenceBadge.classList.add('confidence-high');
        } else if (confidenceLower.includes('medium') || confidenceLower.includes('moderate')) {
            confidenceBadge.classList.add('confidence-medium');
        } else if (confidenceLower.includes('low')) {
            confidenceBadge.classList.add('confidence-low');
        }
    }
    
    // Set explanation
    const explanationElement = diagnosisCard.querySelector('.diagnosis-explanation');
    if (explanationElement) {
        explanationElement.innerHTML = formatTextForDisplay(explanation);
    }
    
    // Set evidence list
    const evidenceList = diagnosisCard.querySelector('.evidence-list');
    if (evidenceList) {
        if (Array.isArray(evidence) && evidence.length > 0) {
            evidence.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = formatTextForDisplay(item);
                evidenceList.appendChild(li);
            });
        } else if (typeof evidence === 'string' && evidence.trim() !== '') {
            const li = document.createElement('li');
            li.innerHTML = formatTextForDisplay(evidence);
            evidenceList.appendChild(li);
        } else {
            const li = document.createElement('li');
            li.textContent = 'No specific evidence provided.';
            evidenceList.appendChild(li);
        }
    }
    
    // Set follow-up list
    const followupList = diagnosisCard.querySelector('.followup-list');
    if (followupList) {
        if (Array.isArray(followUp) && followUp.length > 0) {
            followUp.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = formatTextForDisplay(item);
                followupList.appendChild(li);
            });
        } else if (typeof followUp === 'string' && followUp.trim() !== '') {
            const li = document.createElement('li');
            li.innerHTML = formatTextForDisplay(followUp);
            followupList.appendChild(li);
        } else {
            const li = document.createElement('li');
            li.textContent = 'No follow-up recommendations provided.';
            followupList.appendChild(li);
        }
    }
    
    return diagnosisCard;
}