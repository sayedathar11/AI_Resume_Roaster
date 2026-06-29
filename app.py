import io
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from flask import Flask, flash, redirect, render_template, request, url_for
from PyPDF2 import PdfReader
import requests

load_dotenv('.env.local')
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'roast-my-resume-secret')
app.config['MAX_CONTENT_LENGTH'] = 6 * 1024 * 1024

GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

SEVERITY_OPTIONS = ['Mild', 'Spicy', 'Nuclear']


def get_groq_api_key() -> str:
    return os.getenv('GROQ_API_KEY', '').strip().strip('"').strip("'")


def get_temperature(severity: str) -> float:
    return {
        'Mild': 0.4,
        'Spicy': 0.65,
        'Nuclear': 0.8,
    }.get(severity, 0.65)


def build_prompt(resume_text: str, severity: str) -> str:
    return (
        f"You are an expert resume reviewer. Respond with a concise, professional roast "
        f"that matches the following severity level: {severity}. Keep the tone savage but useful. "
        "Do not fabricate skills or experience beyond what is in the resume.\n\n"
        "Resume Text:\n"
        f"{resume_text}\n\n"
        "Return:\n"
        "1) A short roast paragraph.\n"
        "2) A list of 4-6 bullet-point fixes for formatting, clarity, impact, ATS, and phrasing.\n\n"
        "Use a shareable format and keep the roast direct."
    )


def extract_text_from_pdf(file_stream: io.BytesIO) -> str:
    reader = PdfReader(file_stream)
    text = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text.append(page_text)
    return '\n'.join(text).strip()


def parse_groq_response(response_json: Dict[str, Any]) -> str:
    choices = response_json.get('choices', [])
    if choices:
        message = choices[0].get('message', {})
        if isinstance(message, dict):
            content = message.get('content', '')
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(content, list):
                parts = [item.get('text', '') for item in content if isinstance(item, dict) and 'text' in item]
                if parts:
                    return ''.join(parts)

    return response_json.get('completion', '') or ''


@app.route('/', methods=['GET', 'POST'])
def index():
    roast_text = ''
    selected_severity = 'Spicy'
    error = None

    if request.method == 'POST':
        selected_severity = request.form.get('severity', 'Spicy')
        resume_file = request.files.get('resume')

        if not resume_file or resume_file.filename == '':
            error = 'Please upload a PDF resume file.'
        elif not resume_file.filename.lower().endswith('.pdf'):
            error = 'Only PDF resumes are supported.'
        else:
            groq_api_key = get_groq_api_key()
            if not groq_api_key:
                error = 'Missing GROQ_API_KEY. Set it in .env.local or the environment.'

        if not error:
            try:
                file_bytes = io.BytesIO(resume_file.read())
                resume_text = extract_text_from_pdf(file_bytes)
                if not resume_text:
                    raise ValueError('Unable to extract text from the PDF.')

                prompt = build_prompt(resume_text[:3000], selected_severity)
                groq_api_key = get_groq_api_key()
                response = requests.post(
                    GROQ_API_URL,
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {groq_api_key}',
                    },
                    json={
                        'model': 'llama-3.3-70b-versatile',
                        'messages': [
                            {
                                'role': 'system',
                                'content': 'You are a resume reviewer that writes concise, helpful roasts.',
                            },
                            {
                                'role': 'user',
                                'content': prompt,
                            },
                        ],
                        'max_tokens': 700,
                        'temperature': get_temperature(selected_severity),
                    },
                    timeout=30,
                )
                response.raise_for_status()

                result_json = response.json()
                roast_text = parse_groq_response(result_json)
                if not roast_text:
                    error = 'Received an unexpected response from Groq.'
            except ValueError as exc:
                error = str(exc)
            except requests.RequestException as exc:
                error = f'Groq API request failed: {exc}'
            except Exception:
                error = 'Unable to parse the resume PDF. Please upload a valid PDF file.'

    return render_template(
        'index.html',
        roast=roast_text,
        error=error,
        severity=selected_severity,
        severities=SEVERITY_OPTIONS,
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 3000)), debug=True)
