/**
 * MedicAI Assistant - Upload Page JavaScript
 * Handles file upload functionality
 */

let selectedFiles = [];

document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseFilesBtn = document.getElementById('browseFiles');
    const filePreview = document.getElementById('filePreview');
    const uploadButton = document.getElementById('uploadButton');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = uploadProgress.querySelector('.progress-bar');
    const progressPercent = document.getElementById('progressPercent');
    const uploadSuccess = document.getElementById('uploadSuccess');
    
    // Set up drag and drop events
    if (uploadArea) {
        setupDragAndDrop(uploadArea, fileInput);
    }
    
    // Browse files button
    if (browseFilesBtn && fileInput) {
        browseFilesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fileInput.click();
        });
    }
    
    // File input change event
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            handleFileSelection(this.files);
        });
    }
    
    // Upload button click event
    if (uploadButton) {
        uploadButton.addEventListener('click', function() {
            if (selectedFiles.length === 0) {
                showNotification('Please select at least one file to upload', 'warning');
                return;
            }
            
            uploadFiles();
        });
    }
});

/**
 * Set up drag and drop functionality
 * @param {HTMLElement} dropArea - The element that accepts file drops
 * @param {HTMLInputElement} fileInput - The file input element
 */
function setupDragAndDrop(dropArea, fileInput) {
    // Prevent default behaviors for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('drag-active');
    }
    
    // Remove highlight when item is dragged away or dropped
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function unhighlight() {
        dropArea.classList.remove('drag-active');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        handleFileSelection(files);
    }
}

/**
 * Handle selected files from input or drop
 * @param {FileList} files - The selected files
 */
function handleFileSelection(files) {
    if (!files || files.length === 0) return;
    
    // Store selected files
    selectedFiles = Array.from(files);
    
    // Update file preview
    updateFilePreview();
    
    // Enable upload button
    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
        uploadButton.disabled = false;
    }
}

/**
 * Update the file preview area with selected files
 */
function updateFilePreview() {
    const filePreview = document.getElementById('filePreview');
    if (!filePreview) return;
    
    // Clear previous preview
    filePreview.innerHTML = '';
    
    if (selectedFiles.length === 0) return;
    
    // Add each file to the preview
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        // Get file icon based on type
        let iconClass = 'fa-file';
        if (file.type.includes('pdf')) iconClass = 'fa-file-pdf';
        else if (file.type.includes('image')) iconClass = 'fa-file-image';
        else if (file.type.includes('word')) iconClass = 'fa-file-word';
        else if (file.type.includes('text')) iconClass = 'fa-file-alt';
        
        fileItem.innerHTML = `
            <i class="fas ${iconClass} file-item-icon"></i>
            <div class="file-item-details">
                <div class="file-item-name">${file.name}</div>
                <div class="file-item-size">${formatFileSize(file.size)}</div>
            </div>
            <button type="button" class="file-item-remove" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        filePreview.appendChild(fileItem);
    });
    
    // Add remove button functionality
    const removeButtons = filePreview.querySelectorAll('.file-item-remove');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removeFile(index);
        });
    });
}

/**
 * Remove a file from the selected files list
 * @param {number} index - Index of the file to remove
 */
function removeFile(index) {
    if (index >= 0 && index < selectedFiles.length) {
        selectedFiles.splice(index, 1);
        updateFilePreview();
        
        // Disable upload button if no files selected
        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton && selectedFiles.length === 0) {
            uploadButton.disabled = true;
        }
    }
}

/**
 * Format file size in a human-readable way
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Upload selected files to the server
 */
function uploadFiles() {
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = uploadProgress.querySelector('.progress-bar');
    const progressPercent = document.getElementById('progressPercent');
    const uploadSuccess = document.getElementById('uploadSuccess');
    const uploadButton = document.getElementById('uploadButton');
    
    // Show progress bar and disable upload button
    uploadProgress.style.display = 'block';
    uploadButton.disabled = true;
    
    // Create FormData object
    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files[]', file);
    });
    
    // Create and configure XMLHttpRequest
    const xhr = new XMLHttpRequest();
    
    // Update progress bar during upload
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressPercent.textContent = percentComplete + '%';
        }
    });
    
    // Handle successful upload
    xhr.addEventListener('load', function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const response = JSON.parse(xhr.responseText);
                
                // Store session ID for other pages
                localStorage.setItem('medicai_session_id', response.session_id);
                
                // Hide file upload and progress elements
                document.querySelector('.card').style.display = 'none';
                
                // Show success message
                uploadSuccess.style.display = 'block';
                
                // Add session ID to links
                const links = uploadSuccess.querySelectorAll('a');
                links.forEach(link => {
                    // Add session ID as query parameter
                    const url = new URL(link.href, window.location.origin);
                    url.searchParams.set('session_id', response.session_id);
                    link.href = url.toString();
                });
                
                showNotification(`${selectedFiles.length} files uploaded successfully!`, 'success');
            } catch (e) {
                console.error('Error parsing response:', e);
                showNotification('Error processing server response', 'error');
                resetUploadUI();
            }
        } else {
            try {
                const errorData = JSON.parse(xhr.responseText);
                showNotification(errorData.error || 'Upload failed', 'error');
            } catch (e) {
                showNotification(`Upload failed with status ${xhr.status}`, 'error');
            }
            resetUploadUI();
        }
    });
    
    // Handle upload errors
    xhr.addEventListener('error', function() {
        showNotification('Network error during file upload', 'error');
        resetUploadUI();
    });
    
    // Handle upload abort
    xhr.addEventListener('abort', function() {
        showNotification('File upload was aborted', 'warning');
        resetUploadUI();
    });
    
    // Send the request
    xhr.open('POST', `${API_BASE_URL}/upload`, true);
    xhr.send(formData);
}

/**
 * Reset the upload UI after failure
 */
function resetUploadUI() {
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadButton = document.getElementById('uploadButton');
    
    // Hide progress bar and enable upload button
    uploadProgress.style.display = 'none';
    uploadButton.disabled = false;
}