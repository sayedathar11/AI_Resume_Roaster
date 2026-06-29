# Roast My Resume

A Python Flask app that lets users upload a resume PDF and receive a savage-but-helpful AI roast using Groq.

## Setup

1. Install Python 3.11+ if needed.

   - macOS with Homebrew:

     ```bash
     brew install python
     ```

2. Create and activate a virtual environment:

```bash
cd /Users/atharsayed/Desktop/one_hour_ai_project
python3 -m venv .venv
source .venv/bin/activate
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Copy the example environment file:

```bash
cp .env.example .env.local
```

5. Add your Groq API key to `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key_here
FLASK_SECRET_KEY=replace-with-a-random-secret
```

6. Run the app locally:

```bash
python app.py
```

Open `http://localhost:3000`

## Deploy

This app can be deployed on any Python-friendly host, such as Render, Fly.io, or Railway.

Example using Gunicorn:

```bash
gunicorn app:app --bind 0.0.0.0:3000
```

Then add `GROQ_API_KEY` and `FLASK_SECRET_KEY` as environment variables.

## Notes

- Upload a PDF resume
- Choose Mild / Spicy / Nuclear
- The API parses the PDF and sends the text to Groq
- The result is a shareable roast plus actionable fixes
