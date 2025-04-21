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
    print("Upload endpoint called")
    
    # Check if any file part exists
    if 'files[]' not in request.files and len(request.files) == 0:
        print("No files part in request")
        # Try to get any file from the request
        for key in request.files:
            if len(request.files.getlist(key)) > 0:
                files = request.files.getlist(key)
                break
        else:
            return jsonify({"error": "No files found in request"}), 400
    else:
        files = request.files.getlist('files[]')
    
    if not files or files[0].filename == '':
        print("No selected files or empty filename")
        return jsonify({"error": "No selected files"}), 400
    
    print(f"Processing {len(files)} files")
    file_paths = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            file_paths.append(filepath)
            print(f"Saved file: {filepath}")
        else:
            print(f"File type not allowed: {file.filename}")
            return jsonify({"error": f"File type not allowed: {file.filename}"}), 400
    
    # Generate session ID
    session_id = os.urandom(16).hex()
    
    # Save session data to a temporary file
    session_data = {
        "file_paths": file_paths,
        "timestamp": os.path.getmtime(file_paths[0]) if file_paths else None
    }
    
    session_file = os.path.join(app.config['UPLOAD_FOLDER'], f"{session_id}.json")
    with open(session_file, 'w') as f:
        json.dump(session_data, f)
    print(f"Created session file: {session_file}")
    
    # Process files immediately to get summary and diagnosis
    try:
        summary = get_patient_summary(file_paths)
        diagnosis = get_preliminary_diagnosis(file_paths)
        
        # Store results in session data
        session_data["summary"] = summary
        session_data["diagnosis"] = diagnosis
        
        # Update session file with results
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
        print("Updated session with summary and diagnosis")
        
        return jsonify({
            "status": "success",
            "message": f"{len(file_paths)} files processed successfully",
            "session_id": session_id,
            "summary": summary,
            "diagnosis": diagnosis
        })
    except Exception as e:
        print(f"Error processing files: {str(e)}")
        return jsonify({
            "status": "success",
            "message": f"{len(file_paths)} files uploaded successfully, but processing failed. You can still try to get the summary and diagnosis.",
            "session_id": session_id,
            "error": str(e)
        })

@app.route('/api/patient-summary', methods=['GET'])
def get_soap_summary():
    """Get SOAP-formatted patient summary from GPT based on uploaded files"""
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "No session ID provided"}), 400
    
    print(f"Getting summary for session: {session_id}")
    
    # Retrieve session data
    try:
        session_file = os.path.join(app.config['UPLOAD_FOLDER'], f"{session_id}.json")
        with open(session_file, 'r') as f:
            session_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading session file: {str(e)}")
        return jsonify({"error": "Invalid session ID or session expired"}), 400
    
    # Check if summary is already in session data
    if "summary" in session_data and session_data["summary"]:
        print("Returning cached summary")
        return jsonify({
            "status": "success",
            "summary": session_data["summary"]
        })
    
    file_paths = session_data.get("file_paths", [])
    if not file_paths:
        return jsonify({"error": "No files found for this session"}), 400
    
    # Get patient summary from GPT
    try:
        summary = get_patient_summary(file_paths)
        
        # Update session data with summary
        session_data["summary"] = summary
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
        
        return jsonify({
            "status": "success",
            "summary": summary
        })
    except Exception as e:
        print(f"Error getting summary: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/diagnosis', methods=['GET'])
def get_diagnosis():
    """Get preliminary diagnosis from GPT based on uploaded files"""
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "No session ID provided"}), 400
    
    print(f"Getting diagnosis for session: {session_id}")
    
    # Retrieve session data
    try:
        session_file = os.path.join(app.config['UPLOAD_FOLDER'], f"{session_id}.json")
        with open(session_file, 'r') as f:
            session_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading session file: {str(e)}")
        return jsonify({"error": "Invalid session ID or session expired"}), 400
    
    # Check if diagnosis is already in session data
    if "diagnosis" in session_data and session_data["diagnosis"]:
        print("Returning cached diagnosis")
        return jsonify({
            "status": "success",
            "diagnosis": session_data["diagnosis"]
        })
    
    file_paths = session_data.get("file_paths", [])
    if not file_paths:
        return jsonify({"error": "No files found for this session"}), 400
    
    # Get preliminary diagnosis from GPT
    try:
        diagnosis = get_preliminary_diagnosis(file_paths)
        
        # Update session data with diagnosis
        session_data["diagnosis"] = diagnosis
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
        
        return jsonify({
            "status": "success",
            "diagnosis": diagnosis
        })
    except Exception as e:
        print(f"Error getting diagnosis: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)