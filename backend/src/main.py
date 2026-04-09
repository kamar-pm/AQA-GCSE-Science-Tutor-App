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

# Vector store imports
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from ingestion import ingest_directory, VECTOR_STORE_PATH
from search_agent import PaperSearchAgent

textbooks_dir = os.path.join(os.path.dirname(__file__), "..", "data", "textbooks")
ingest_directory(textbooks_dir) # Initial startup ingestion

# Initialize embeddings (cache for re-use)
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Standard AQA GCSE Chapters (Refined from Textbooks)
CHAPTERS = {
    "Biology": [
        "Chapter B1 Cell biology", "Chapter B2 Organisation", "Chapter B3 Infection and response", 
        "Chapter B4 Bioenergetics", "Chapter B5 Homeostasis and response", 
        "Chapter B6 Inheritance, variation and evolution", "Chapter B7 Ecology"
    ],
    "Chemistry": [
        "Chapter C1 Atomic structure and the periodic table", "Chapter C2 Bonding, structure, and the properties of matter",
        "Chapter C3 Quantitative chemistry", "Chapter C4 Chemical changes", "Chapter C5 Energy changes", 
        "Chapter C6 The rate and extent of chemical change", "Chapter C7 Organic chemistry", "Chapter C8 Chemical analysis",
        "Chapter C9 Chemistry of the atmosphere", "Chapter C10 Using resources"
    ],
    "Physics": [
        "Chapter P1 Energy stores and systems", "Chapter P2 Energy transfers and heating", "Chapter P3 Energy resources", 
        "Chapter P4 Electric circuits", "Chapter P5 Electricity in the home", "Chapter P6 Molecules and matter",
        "Chapter P7 Radioactivity", "Chapter P8 Forces in balance", "Chapter P9 Motion", "Chapter P10 Force and motion",
        "Chapter P11 Force and pressure", "Chapter P12 Wave properties", "Chapter P13 Electromagnetic waves",
        "Chapter P14 Light", "Chapter P15 Electromagnetism", "Chapter P16 Space"
    ]
}

# In-memory database to store exams and their correct answers
EXAMS_DB = {}

def call_openai_json(system_prompt: str, user_prompt: str) -> dict:
    # Prioritize key from header (if user provided it in frontend)
    api_key = request.headers.get("X-OpenAI-API-Key")
    
    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY")
        
    if not api_key or api_key == "your-api-key-here":
        raise ValueError("Missing OpenAI API Key. Please provide one in the Settings or ensure the server .env is configured.")

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

# Helper for RAG retrieval
def get_context_from_topics(topics_string: str, k_per_topic: int = 5, max_total_chunks: int = 18):
    if not os.path.exists(VECTOR_STORE_PATH):
        return ""
    
    try:
        vectorstore = FAISS.load_local(VECTOR_STORE_PATH, embeddings_model, allow_dangerous_deserialization=True)
        topic_items = [t.strip() for t in topics_string.split(",") if t.strip()]
        all_docs = []
        seen_content = set()
        
        for t in topic_items:
            # Search for relevant chunks per topic
            docs = vectorstore.similarity_search(t, k=k_per_topic)
            for d in docs:
                if d.page_content not in seen_content:
                    all_docs.append(d)
                    seen_content.add(d.page_content)
        
        # Limit total chunks
        all_docs = all_docs[:max_total_chunks]
        context = "\n---\n".join([f"SOURCE: {os.path.basename(d.metadata.get('source', 'Unknown Paper'))}\n{d.page_content}" for d in all_docs])
        return context
    except Exception as e:
        print(f"Retrieval error: {e}")
        return ""

@app.route("/api/chapters", methods=["GET"])
def get_chapters():
    subject = request.args.get("subject")
    if not subject:
        return jsonify({"status": "error", "message": "Missing subject parameter"}), 400
    
    # Matching the exact keys in CHAPTERS dict
    subject_key = subject.capitalize()
    chapters = CHAPTERS.get(subject_key, [])
    
    return jsonify({"status": "success", "chapters": chapters})

@app.route("/api/generate_exam", methods=["POST"])
def generate_exam():
    data = request.json
    subject = data.get("subject", "Science")
    topic = data.get("topic", "Topic")
    tier = data.get("tier", "Higher")
    
    # 1. Retrieve context from vector store using helper
    context = get_context_from_topics(topic)
    
    # 2. Dynamic scaling logic based on context size
    num_questions = 4
    mcq_count = 1
    short_count = 2
    extended_count = 1
    
    try:
        context_len = len(context)
        if context_len > 12000: # Very Large (Multiple chapters)
            num_questions = 16
            mcq_count = 4
            short_count = 9
            extended_count = 3
        elif context_len > 6000:
            num_questions = 10
            mcq_count = 3
            short_count = 5
            extended_count = 2
        elif context_len > 2000:
            num_questions = 7
            mcq_count = 2
            short_count = 4
            extended_count = 1
    except Exception as e:
        print(f"Scaling error: {e}")
        # Handled by defaults

    system_prompt = f"""
    You are an expert AQA Triple Science GCSE Examiner for {subject}.
    Your task is to generate a mock exam on the topic: '{topic}' for the {tier} tier.
    
    {"USE THE PROVIDED TEXTBOOK CONTEXT TO CREATE RELEVANT QUESTIONS:" if context else "Note: No specific textbook context was found. Use your general AQA knowledge."}
    {context}
    
    You MUST output ONLY valid JSON.
    Generate EXACTLY {num_questions} questions in total.
    The distribution MUST be:
    - {mcq_count} Multiple Choice questions (1 mark each)
    - {short_count} Short Answer questions (2-4 marks each)
    - {extended_count} Extended Response questions (6 marks each)
    
    For every question, you MUST provide:
    1. A "hint" (subtle pedagogical guidance toward key marking points).
    2. A "reference" (Identify if the question is inspired by a specific AQA past paper in the context. If so, cite the paper name from the SOURCE metadata. If it's general textbook content, use "AQA Syllabus Standard").

    The JSON structure should be:
    {{
      "questions": [
        {{
          "id": "unique id",
          "type": "multiple_choice",
          "text": "The question",
          "options": ["A", "B", "C", "D"],
          "marks": 1,
          "hint": "Subtle hint here",
          "reference": "AQA June 2022 Paper 1H / Standard",
          "correct_answer": "the exact string of the correct option"
        }},
        {{
          "id": "unique id",
          "type": "short_answer",
          "text": "The question",
          "marks": 3,
          "hint": "Guidance on what concept to include",
          "reference": "AQA June 2022 Paper 2F / Standard",
          "mark_scheme": "Marking points"
        }},
        {{
          "id": "unique id",
          "type": "extended_response",
          "text": "The question",
          "marks": 6,
          "hint": "Guidance on structuring the 6-mark answer",
          "reference": "AQA 2023 Sample Paper / Standard",
          "mark_scheme": "Level description"
        }}
      ]
    }}
    """
    
    try:
        generated_json = call_openai_json(system_prompt, f"Generate the {num_questions} questions based on the topic '{topic}' now.")

        
        # Strip internal marking data from what we send to the frontend
        exam_id = str(uuid.uuid4())
        frontend_questions = []
        for q in generated_json["questions"]:
            fq = {k: v for k, v in q.items() if k not in ["correct_answer", "mark_scheme"]}
            frontend_questions.append(fq)
            
        # Calculate total marks to determine time limit (1 min per mark)
        total_marks = sum(q.get("marks", 0) for q in generated_json["questions"])
        time_limit_seconds = total_marks * 60

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
                "title": f"AQA {subject} Mock Exam: {topic}",
                "tier": tier,
                "time_limit_seconds": time_limit_seconds,
                "questions": frontend_questions
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/tutor_help", methods=["POST"])
def tutor_help():
    data = request.json
    subject = data.get("subject", "Science")
    topic = data.get("topic", "Topic")
    user_api_key = request.headers.get("X-OpenAI-API-Key")
    
    # 1. Retrieve context using helper (use more chunks for better explanation)
    context = get_context_from_topics(topic, k_per_topic=8, max_total_chunks=25)
    
    system_prompt = f"""
    You are an expert AQA GCSE Triple Science Tutor for {subject}.
    Your goal is to help a student understand the topic: '{topic}'.
    
    Using the provided textbook/paper context:
    1. EXPLAIN the core concepts in SIMPLE, pedagogical language (suitable for a 14-16 year old).
    2. Use relatable ANALOGIES, REAL-WORLD EXAMPLES and INFOGRAPHICS.
    3. Generate a structured REVISION CHEAT SHEET including:
       - Key Terms & Definitions
       - Essential Formulas (if applicable)
       - Required Practicals (if applicable)
       - Common Exam Mistakes to avoid

    Format your response as a JSON object with:
    {{
       "explanation": "Markdown formatted explanation",
       "examples": "Markdown formatted real-world examples",
       "cheat_sheet": "Markdown formatted revision summary"
    }}
    
    CONTEXT:
    {context if context else "No context found. Use standard AQA syllabus knowledge."}
    """
    
    try:
        # Note: call_openai_json now handles the header internally if we passed the request context, 
        # but here we just rely on its current implementation which uses request.headers.
        result = call_openai_json(system_prompt, f"Provide tutoring support for {topic} now.")
        return jsonify({
            "status": "success",
            "content": result
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/generate_flashcards", methods=["POST"])
def generate_flashcards():
    data = request.json
    subject = data.get("subject", "Science")
    topic = data.get("topic", "Topic")

    context = get_context_from_topics(topic, k_per_topic=6, max_total_chunks=18)

    system_prompt = f"""
    You are an expert AQA GCSE Triple Science Tutor for {subject}.
    Your task is to generate concise, effective FLASHCARDS for the topic: '{topic}'.

    Rules:
    - Each flashcard must have a QUESTION (front) and ANSWER (back).
    - Questions should test key definitions, facts, formulas, or processes.
    - Answers must be short (1-3 sentences max) — optimised for active recall.
    - Include a mix of: key term definitions, "what/why/how" questions, formula recalls, and common exam points.
    - Generate exactly 10 flashcards.

    {'Use this textbook context to create relevant, accurate cards:' if context else 'Use general AQA knowledge.'}
    {context}

    Return ONLY valid JSON:
    {{
      "flashcards": [
        {{ "id": "fc1", "question": "What is...", "answer": "..." }},
        ...
      ]
    }}
    """

    try:
        result = call_openai_json(system_prompt, f"Generate 10 flashcards for {topic} now.")
        return jsonify({
            "status": "success",
            "flashcards": result.get("flashcards", [])
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/tutor_chat", methods=["POST"])
def tutor_chat():
    data = request.json
    message = data.get("message")
    history = data.get("history", []) # List of {"role": "user/assistant", "content": "..."}
    subject = data.get("subject", "Science")
    topic = data.get("topic", "Topic")
    
    # 1. Retrieve context (re-use same topics helper to feed context to chat)
    context = get_context_from_topics(topic, k_per_topic=5, max_total_chunks=15)
    
    system_prompt = f"""
    You are an expert AQA GCSE Triple Science Tutor for {subject}.
    The student is asking about: '{topic}'.
    
    Use the provided textbook/paper context to answer their questions accurately.
    Maintain a supportive, encouraging tone. 
    Explain complex terms simply and use analogies where helpful.
    
    CONTEXT:
    {context if context else "No context found. Use standard AQA syllabus knowledge."}
    
    PREVIOUS CONVERSATION:
    {json.dumps(history[-6:]) if history else "No history yet."}
    """
    
    try:
        # We use call_openai_json but we want text response. 
        # Actually, let's just use call_openai_json with a prompt to return {"response": "..."} 
        # to stay consistent with our current architecture.
        result = call_openai_json(system_prompt, f"User asked: {message}")
        return jsonify({
            "status": "success",
            "response": result.get("response", "I'm sorry, I couldn't process that.")
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/sync_papers", methods=["POST"])
def sync_papers():
    data = request.json
    subj = data.get("subject", "Physics")
    
    try:
        agent = PaperSearchAgent(textbooks_dir)
        # Search for recent years
        all_new_files = []
        for year in ["2022", "2023", "2024", "2025"]:
            new_files = agent.search_and_download(subj, year)
            all_new_files.extend(new_files)
        
        if all_new_files:
            # Trigger ingestion for the new files
            ingest_directory(textbooks_dir)
            
        return jsonify({
            "status": "success",
            "message": f"Synced {len(all_new_files)} new papers for {subj}.",
            "new_files": all_new_files
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
    
    You must provide a detailed breakdown for EVERY question.
    Return ONLY a JSON object with this structure:
    {
      "question_results": [
        {
          "id": "q1",
          "marks_awarded": <int>,
          "max_marks": <int>,
          "feedback": "Detailed explanation of why marks were awarded or deducted. Be specific about what was missing.",
          "mark_scheme": "The relevant part of the mark scheme for this question.",
          "correct_answer": "Provide a high-quality model answer based on the mark scheme."
        }
      ],
      "total_marks": <int>,
      "overall_feedback": "Constructive summary addressing the student directly."
    }
    """
    
    user_prompt = f"""
    Mark Scheme and Questions:
    {json.dumps(exam['questions'])}
    
    Student Answers:
    {json.dumps(student_answers)}
    """
    
    try:
        grading_result = call_openai_json(system_prompt, user_prompt)
        
        # Map original references to the results
        q_refs = {q["id"]: q.get("reference", "AQA Standard") for q in exam["questions"]}
        for qr in grading_result.get("question_results", []):
            qr["reference"] = q_refs.get(qr["id"], "AQA Standard")
            
        # Calculate max marks
        max_marks = sum(q["marks"] for q in exam["questions"])
        grading_result["max_marks"] = max_marks
        grading_result["status"] = "success"
        
        return jsonify(grading_result)

        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
