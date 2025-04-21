"""
MedicAI Assistant - Flask Backend
Simple backend that serves as a proxy to the GPT API for medical analysis.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from werkzeug.utils import secure_filename
from services.gpt_service import get_patient_summary, get_preliminary_diagnosis

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'png', 'jpg', 'jpeg', 'txt', 'docx'}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return jsonify({"status": "ok", "message": "MedicAI Assistant API is running"})

@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Handle document uploads and store them for future processing"""
    if 'files[]' not in request.files:
        return jsonify({"error": "No files part"}), 400
    
    files = request.files.getlist('files[]')
    if not files or files[0].filename == '':
        return jsonify({"error": "No selected files"}), 400
    
    file_paths = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            file_paths.append(filepath)
        else:
            return jsonify({"error": f"File type not allowed: {file.filename}"}), 400
    
    # Store the file paths in a session or temporary storage
    # For simplicity, we'll just return the paths, but in a real app you might store in a database
    session_id = os.urandom(16).hex()
    
    # Save session data to a temporary file
    session_data = {
        "file_paths": file_paths,
        "timestamp": os.path.getmtime(file_paths[0]) if file_paths else None
    }
    
    with open(os.path.join(app.config['UPLOAD_FOLDER'], f"{session_id}.json"), 'w') as f:
        json.dump(session_data, f)
    
    return jsonify({
        "status": "success",
        "message": f"{len(file_paths)} files uploaded successfully",
        "session_id": session_id
    })

@app.route('/api/patient-summary', methods=['GET'])
def get_soap_summary():
    """Get SOAP-formatted patient summary from GPT based on uploaded files"""
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "No session ID provided"}), 400
    
    # Retrieve session data
    try:
        with open(os.path.join(app.config['UPLOAD_FOLDER'], f"{session_id}.json"), 'r') as f:
            session_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"error": "Invalid session ID or session expired"}), 400
    
    file_paths = session_data.get("file_paths", [])
    if not file_paths:
        return jsonify({"error": "No files found for this session"}), 400
    
    # Get patient summary from GPT
    try:
        summary = get_patient_summary(file_paths)
        return jsonify({
            "status": "success",
            "summary": summary
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/diagnosis', methods=['GET'])
def get_diagnosis():
    """Get preliminary diagnosis from GPT based on uploaded files"""
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "No session ID provided"}), 400
    
    # Retrieve session data
    try:
        with open(os.path.join(app.config['UPLOAD_FOLDER'], f"{session_id}.json"), 'r') as f:
            session_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"error": "Invalid session ID or session expired"}), 400
    
    file_paths = session_data.get("file_paths", [])
    if not file_paths:
        return jsonify({"error": "No files found for this session"}), 400
    
    # Get preliminary diagnosis from GPT
    try:
        diagnosis = get_preliminary_diagnosis(file_paths)
        return jsonify({
            "status": "success",
            "diagnosis": diagnosis
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)