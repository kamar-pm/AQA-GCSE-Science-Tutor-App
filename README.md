# AQA Triple Science Tutor AI

An advanced, agentic tutoring platform built for AQA Triple Science GCSE students (Biology, Chemistry, Physics). The application uses OpenAI to dynamically generate mock exams tailored to a student's chosen topic, assess their performance according to standard AQA grading rubrics, and provide pedagogical feedback.

## Features

- **Beautiful UI:** A modern, dark-mode glassmorphism interface built cleanly with React and Vite.
- **Dynamic Content Generation:** Requests mock exams mimicking AQA structure (Multiple Choice, Short Answers, Extended Response) based on topics entered.
- **AI Examiner Agents:** Employs LLMs to mark student responses strictly according to the generated mark schemes and feedback loops.
- **Vector DB Ready Platform:** Backend prepared for PDF RAG ingestion using FAISS to inject syllabus text directly.

## Architecture

* **Frontend:** React + Vite + Vanilla CSS (Port `5173`)
* **Backend:** Python + Flask + OpenAI SDK (Port `8000`)

---

## Prerequisites

- Node.js (v18+)
- Python 3.10+
- A valid OpenAI API Key (`gpt-4o-mini` access)

## How to Run Locally

You will need to open two terminal instances: one for the backend, and one for the frontend.

### 1. Backend Setup

Open a terminal and navigate to the backend directory:
```bash
cd backend
```

Create and activate a Python virtual environment:
```bash
# On Mac/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
pip install python-dotenv Flask flask-cors
```

Setup Environment keys:
```bash
cp .env.example .env
```
Open the `.env` file and replace `"your-api-key-here"` with your actual API key from OpenAI.

Start the Flask Backend Server:
```bash
python src/main.py
```
> The server will start and listen on `http://localhost:8000/`.

---

### 2. Frontend Setup

Open a second terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install Javascript dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```
> The frontend UI will be accessible at `http://localhost:5173/`. 

## How To Use

1. Go to `http://localhost:5173` in your browser.
2. Select a target subject (e.g., Biology).
3. Type a topic (e.g., "Cell Division").
4. Click **Generate Mock Assessment**. The Python backend will invoke OpenAI to craft an exam payload.
5. Answer the questions and click **Submit Exam for Grading**. 
6. Review your marked score and AI feedback!
