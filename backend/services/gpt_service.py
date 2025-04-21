"""
GPT Service
Handles interaction with OpenAI's GPT API for medical analysis.
"""

import os
import requests
import json
import base64
from dotenv import load_dotenv
import PyPDF2
from PIL import Image
import pytesseract
import docx

# Load environment variables
load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
API_URL = "https://api.openai.com/v1/chat/completions"
GPT_MODEL = os.getenv("GPT_MODEL", "gpt-4-vision-preview")

def extract_text_from_files(file_paths):
    """
    Extract text content from various file types
    
    Args:
        file_paths: List of paths to the uploaded files
        
    Returns:
        str: Combined text content from all files
    """
    all_text = []
    
    for file_path in file_paths:
        file_extension = file_path.split('.')[-1].lower()
        
        try:
            if file_extension in ['pdf']:
                text = extract_text_from_pdf(file_path)
            elif file_extension in ['png', 'jpg', 'jpeg']:
                text = extract_text_from_image(file_path)
            elif file_extension in ['txt']:
                text = extract_text_from_txt(file_path)
            elif file_extension in ['docx']:
                text = extract_text_from_docx(file_path)
            else:
                text = f"Unsupported file type: {file_extension}"
                
            all_text.append(f"--- Content from {os.path.basename(file_path)} ---\n{text}")
        
        except Exception as e:
            all_text.append(f"Error extracting text from {os.path.basename(file_path)}: {str(e)}")
    
    return "\n\n".join(all_text)

def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    text = ""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error extracting text from PDF: {str(e)}"

def extract_text_from_image(file_path):
    """Extract text from image using OCR"""
    try:
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        return f"Error extracting text from image: {str(e)}"

def extract_text_from_txt(file_path):
    """Extract text from plain text file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        # Try with a different encoding if utf-8 fails
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read()
        except Exception as e:
            return f"Error extracting text with latin-1 encoding: {str(e)}"
    except Exception as e:
        return f"Error extracting text from text file: {str(e)}"

def extract_text_from_docx(file_path):
    """Extract text from docx file"""
    try:
        doc = docx.Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        return f"Error extracting text from DOCX: {str(e)}"

def get_image_base64(file_path):
    """Convert image to base64 for API calls"""
    with open(file_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def call_gpt_api(prompt, file_paths=None, is_vision=False):
    """
    Call the GPT API with the given prompt and optional files
    
    Args:
        prompt: Text prompt for GPT
        file_paths: List of file paths to process (optional)
        is_vision: Whether to use vision capabilities for images
        
    Returns:
        dict: GPT API response
    """
    if not API_KEY:
        raise ValueError("OpenAI API key not found. Please set OPENAI_API_KEY in your environment variables.")
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Prepare messages array
    messages = [
        {"role": "system", "content": "You are a medical AI assistant helping doctors analyze patient documents and provide clinical insights."}
    ]
    
    if is_vision and file_paths:
        # For vision model with images
        content = [{"type": "text", "text": prompt}]
        
        # Add images to content array
        for file_path in file_paths:
            if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
                base64_image = get_image_base64(file_path)
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                })
        
        messages.append({"role": "user", "content": content})
    else:
        # For regular text input
        # Extract text from files if provided
        if file_paths:
            extracted_text = extract_text_from_files(file_paths)
            full_prompt = f"{prompt}\n\nDocument Content:\n{extracted_text}"
        else:
            full_prompt = prompt
        
        messages.append({"role": "user", "content": full_prompt})
    
    data = {
        "model": GPT_MODEL,
        "messages": messages,
        "temperature": 0.3,  # Lower temperature for more deterministic results
        "max_tokens": 4000
    }
    
    response = requests.post(API_URL, headers=headers, json=data)
    response.raise_for_status()  # Raise an exception for HTTP errors
    
    return response.json()

def get_patient_summary(file_paths):
    """
    Get SOAP-formatted patient summary from GPT
    
    Args:
        file_paths: List of paths to patient documents
        
    Returns:
        dict: Structured SOAP summary
    """
    prompt = """
    Please analyze these patient documents and provide a comprehensive patient summary in SOAP format:
    
    1. Subjective: Patient's reported symptoms, complaints, and history
    2. Objective: Clinical findings, vital signs, examination results, and test results
    3. Assessment: Clinical impression, diagnosis or differential diagnoses
    4. Plan: Treatment plan, medications, follow-up
    
    Format your response as a JSON object with keys for each SOAP component.
    If any component is unclear from the documents, note this in your response.
    """
    
    # Determine if we need to use vision capabilities
    has_images = any(file_path.lower().endswith(('.png', '.jpg', '.jpeg')) for file_path in file_paths)
    
    try:
        response = call_gpt_api(prompt, file_paths, is_vision=has_images)
        content = response['choices'][0]['message']['content']
        
        # Try to parse as JSON
        try:
            # Extract JSON if it's embedded in text
            if not content.strip().startswith('{'):
                # Try to find JSON in the content
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    content = content[json_start:json_end]
            
            return json.loads(content)
        except json.JSONDecodeError:
            # If it's not valid JSON, return as structured text
            return {
                "subjective": "Error parsing GPT response as JSON",
                "objective": "Original response included below",
                "assessment": "",
                "plan": "",
                "raw_response": content
            }
    
    except Exception as e:
        return {
            "subjective": "Error calling GPT API",
            "objective": f"Error: {str(e)}",
            "assessment": "",
            "plan": ""
        }

def get_preliminary_diagnosis(file_paths):
    """
    Get preliminary diagnoses from GPT
    
    Args:
        file_paths: List of paths to patient documents
        
    Returns:
        dict: Diagnoses with explanations and confidence levels
    """
    prompt = """
    Based on these patient documents, provide 3-5 preliminary diagnoses that a doctor should consider.
    
    For each potential diagnosis:
    1. Provide a brief explanation of why this diagnosis should be considered
    2. List supporting evidence from the documents
    3. Assign a confidence level (High, Medium, Low)
    4. Suggest follow-up tests or questions that would help confirm or rule out this diagnosis
    
    Format your response as a JSON object with an array of diagnoses containing the information above.
    """
    
    # Determine if we need to use vision capabilities
    has_images = any(file_path.lower().endswith(('.png', '.jpg', '.jpeg')) for file_path in file_paths)
    
    try:
        response = call_gpt_api(prompt, file_paths, is_vision=has_images)
        content = response['choices'][0]['message']['content']
        
        # Try to parse as JSON
        try:
            # Extract JSON if it's embedded in text
            if not content.strip().startswith('{'):
                # Try to find JSON in the content
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    content = content[json_start:json_end]
            
            return json.loads(content)
        except json.JSONDecodeError:
            # If it's not valid JSON, return structured fallback
            return {
                "diagnoses": [
                    {
                        "name": "Response Parsing Error",
                        "explanation": "Could not parse GPT response as JSON",
                        "evidence": [],
                        "confidence": "NA",
                        "follow_up": ["Please review the raw response"]
                    }
                ],
                "raw_response": content
            }
    
    except Exception as e:
        return {
            "diagnoses": [
                {
                    "name": "API Error",
                    "explanation": f"Error calling GPT API: {str(e)}",
                    "evidence": [],
                    "confidence": "NA",
                    "follow_up": ["Check API configuration and try again"]
                }
            ]
        }