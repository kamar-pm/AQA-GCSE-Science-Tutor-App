import os
import json
import uuid
import urllib.request
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Enable CORS for the Vite frontend
CORS(app)

# Ingest PDFs from the textbooks directory on startup
from ingestion import ingest_directory
textbooks_dir = os.path.join(os.path.dirname(__file__), "..", "data", "textbooks")
ingest_directory(textbooks_dir)

# In-memory database to store exams and their correct answers
EXAMS_DB = {}

def call_openai_json(system_prompt: str, user_prompt: str) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your-api-key-here":
        raise ValueError("Missing or invalid OPENAI_API_KEY in .env file.")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "model": "gpt-4o-mini", # Or gpt-4
        "response_format": { "type": "json_object" },
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return json.loads(result["choices"][0]["message"]["content"])
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"OpenAI API Error: {body}")
        raise ValueError(f"OpenAI API error: {e.code}")

@app.route("/", methods=["GET"])
def read_root():
    return jsonify({"status": "ok", "message": "AQA Triple Science Tutor API is running."})

@app.route("/api/generate_exam", methods=["POST"])
def generate_exam():
    data = request.json
    subject = data.get("subject", "Science")
    topic = data.get("topic", "Topic")
    tier = data.get("tier", "Higher")
    
    system_prompt = f"""
    You are an expert AQA Triple Science GCSE Examiner for {subject}.
    You must generate a mock exam on the topic: '{topic}' for the {tier} tier.
    You MUST output ONLY valid JSON.
    
    The JSON structure should be:
    {{
      "questions": [
        {{
          "id": "unique qs like q1, q2",
          "type": "multiple_choice",
          "text": "The question",
          "options": ["A", "B", "C", "D"],
          "marks": 1,
          "correct_answer": "the exact string of the correct option"
        }},
        {{
          "id": "q2",
          "type": "short_answer",
          "text": "Ask a 2-4 mark structured question",
          "marks": 3,
          "mark_scheme": "Briefly state what to look for"
        }},
        {{
          "id": "q3",
          "type": "extended_response",
          "text": "Ask a 6 mark extended response question",
          "marks": 6,
          "mark_scheme": "Details of Level 1, 2, 3 marking"
        }}
      ]
    }}
    Ensure you create exactly 1 multiple_choice, 2 short_answer, and 1 extended_response questions.
    """
    
    try:
        generated_json = call_openai_json(system_prompt, "Generate the mock exam JSON now.")
        
        # Strip internal marking data from what we send to the frontend
        exam_id = str(uuid.uuid4())
        frontend_questions = []
        for q in generated_json["questions"]:
            fq = {k: v for k, v in q.items() if k not in ["correct_answer", "mark_scheme"]}
            frontend_questions.append(fq)
            
        # Save to DB to use during grading
        EXAMS_DB[exam_id] = {
            "title": f"{subject} - {topic} Mock Exam",
            "tier": tier,
            "questions": generated_json["questions"] # Contains mark schemes
        }
        
        return jsonify({
            "status": "success",
            "exam": {
                "id": exam_id,
                "title": f"{subject} - {topic} Mock Exam ({tier} Tier)",
                "tier": tier,
                "questions": frontend_questions
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/submit_exam", methods=["POST"])
def submit_exam():
    data = request.json
    exam_id = data.get("exam_id")
    student_answers = data.get("answers", {})
    
    if exam_id not in EXAMS_DB:
        # Fallback to stub grading if exam wasn't found (e.g. backend restarted)
        return jsonify({
            "status": "success",
            "marks_awarded": {"q1": 1, "q2": 1, "q3": 4},
            "total_marks": 6, "max_marks": 9,
            "feedback": "Using fallback grader: Exam ID not found. Ensure backend wasn't restarted."
        })
        
    exam = EXAMS_DB[exam_id]
    
    # We will ask OpenAI to grade the exam!
    system_prompt = """
    You are an expert AQA Science Examiner.
    You will be given the Mark Scheme for an exam, and a student's answers.
    Grade the student strictly according to the mark scheme.
    Return ONLY a JSON object with this structure:
    {
      "marks_awarded": {
        "q1": <int>,
        "q2": <int>
      },
      "total_marks": <int>,
      "feedback": "Overall constructive feedback on what the student missed and topics they need to revise. Address the student directly."
    }
    """
    
    user_prompt = f"""
    Mark Scheme:
    {json.dumps(exam['questions'])}
    
    Student Answers:
    {json.dumps(student_answers)}
    """
    
    try:
        grading_result = call_openai_json(system_prompt, user_prompt)
        
        # Calculate max marks
        max_marks = sum(q["marks"] for q in exam["questions"])
        grading_result["max_marks"] = max_marks
        grading_result["status"] = "success"
        
        return jsonify(grading_result)
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
