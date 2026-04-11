import os # force reload 2
import json
import time
import uuid
import urllib.request
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Enable CORS for the Vite frontend
CORS(app)

# Vector store and RAG imports
from retrieval import VECTOR_STORE_PATH, embeddings_model, get_context_from_topics
from ingestion import ingest_directory, update_existing_metadata
from ddgs.exceptions import RatelimitException
from chapter_extractor import run_extraction_cycle
from tutor_graph import tutor_help_graph
from search_agent import PaperSearchAgent
from langchain_core.messages import HumanMessage


textbooks_dir = os.path.join(os.path.dirname(__file__), "..", "data", "textbooks")
SYNC_CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "paper_sync_cache.json")
SYNC_CACHE_TTL_HOURS = int(os.getenv("PAPER_SYNC_CACHE_TTL_HOURS", "24"))

# Initial startup ingestion
ingest_directory(textbooks_dir) 

# Ensure metadata is tagged on startup
update_existing_metadata(VECTOR_STORE_PATH, embeddings_model)

EXTRACTED_CHAPTERS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "extracted_chapters.json")

# Standard AQA GCSE Chapters (Fallback if dynamic extraction fails)
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

def load_dynamic_chapters():
    global CHAPTERS
    if os.path.exists(EXTRACTED_CHAPTERS_PATH):
        try:
            with open(EXTRACTED_CHAPTERS_PATH, "r") as f:
                new_chapters = json.load(f)
                if new_chapters:
                    CHAPTERS.update(new_chapters)
                    print(f"Loaded {sum(len(v) for v in new_chapters.values())} chapters from cache.")
        except Exception as e:
            print(f"Failed to load extracted chapters: {e}")
    else:
        # Try to extract if API key is in env
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key != "your-api-key-here":
            print("extracted_chapters.json missing. Running automatic extraction...")
            extracted = run_extraction_cycle(textbooks_dir, api_key, EXTRACTED_CHAPTERS_PATH)
            if extracted:
                CHAPTERS.update(extracted)

# Load chapters on startup
load_dynamic_chapters()

# In-memory database to store exams and their correct answers
EXAMS_DB = {}

def parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)

def _load_sync_cache():
    if not os.path.exists(SYNC_CACHE_PATH):
        return {}
    try:
        with open(SYNC_CACHE_PATH, "r") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, ValueError, OSError):
        return {}

def _save_sync_cache(cache):
    try:
        with open(SYNC_CACHE_PATH, "w") as f:
            json.dump(cache, f)
    except OSError as e:
        print(f"Failed to save sync cache: {e}")

def _is_cache_entry_fresh(entry, ttl_hours):
    last_synced_at = entry.get("last_synced_at")
    if not last_synced_at:
        return False
    try:
        last_dt = datetime.strptime(last_synced_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    age_seconds = (datetime.now(timezone.utc) - last_dt).total_seconds()
    return age_seconds < (ttl_hours * 3600)

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

def call_openai_text(system_prompt: str, user_prompt: str) -> str:
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
        "model": "gpt-4o-mini",
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
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"OpenAI API Error: {body}")
        raise ValueError(f"OpenAI API error: {e.code}")

@app.route("/", methods=["GET"])
def read_root():
    return jsonify({"status": "ok", "message": "AQA Triple Science Tutor API is running."})

# get_context_from_topics moved to retrieval.py

def sync_recent_aqa_papers_for_subject(subject: str, years_back: int = 5, force_refresh: bool = False, ttl_hours: int = SYNC_CACHE_TTL_HOURS):
    """
    Pull recent AQA papers for a subject, then ingest any new files.
    Uses a subject-level persistent cache to avoid syncing too frequently.
    """
    cache = _load_sync_cache()
    subject_key = subject.strip().lower()
    cache_entry = cache.get(subject_key, {})
    if not force_refresh and _is_cache_entry_fresh(cache_entry, ttl_hours):
        return {
            "downloaded_files": [],
            "used_cache": True,
            "last_synced_at": cache_entry.get("last_synced_at"),
            "ttl_hours": ttl_hours,
            "forced": False
        }

    agent = PaperSearchAgent(textbooks_dir)
    current_year = datetime.now().year
    target_years = [str(current_year - i) for i in range(years_back)]

    downloaded_files = []
    errors = []

    for year in target_years:
        try:
            new_files = agent.search_and_download(subject, year)
            downloaded_files.extend(new_files)
            if new_files:
                time.sleep(0.4)  # spread requests and avoid rapid-fire rate limits
        except RatelimitException as ratelimit_exc:
            errors.append(f"{year}: {ratelimit_exc}")
            print(f"Rate limit while syncing {subject} {year}: {ratelimit_exc}")
            time.sleep(3)
            continue
        except Exception as e:
            errors.append(f"{year}: {e}")

    if downloaded_files:
        ingest_directory(textbooks_dir)

    synced_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cache[subject_key] = {
        "last_synced_at": synced_at,
        "last_downloaded_count": len(downloaded_files),
        "last_downloaded_files": downloaded_files[-20:]
    }
    _save_sync_cache(cache)

    sync_error = "; ".join(errors) if errors else None

    return {
        "downloaded_files": downloaded_files,
        "used_cache": False,
        "last_synced_at": synced_at,
        "ttl_hours": ttl_hours,
        "forced": force_refresh,
        "sync_error": sync_error
    }

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
    force_paper_sync = parse_bool(data.get("force_paper_sync", False))

    # 1) Agent 1: fetch+ingest AQA past papers for this subject
    downloaded_files = []
    sync_error = None
    sync_info = {
        "downloaded_files": [],
        "used_cache": False,
        "last_synced_at": None,
        "ttl_hours": SYNC_CACHE_TTL_HOURS,
        "forced": force_paper_sync,
        "sync_error": None
    }
    try:
        sync_info = sync_recent_aqa_papers_for_subject(subject, force_refresh=force_paper_sync)
        downloaded_files = sync_info["downloaded_files"]
        sync_error = sync_info.get("sync_error")
    except Exception as e:
        # Keep generation resilient even if sync fails
        sync_error = str(e)
        print(f"Paper sync warning for {subject}: {sync_error}")

    # 2) Retrieve context from vector store - question papers FIRST, then mark schemes
    import re as _re
    def _annotate_year(raw_context):
        """Inject [Year: XXXX] into SOURCE lines so the LLM can cite accurately."""
        chunks = raw_context.split("\n---\n")
        annotated = []
        for c in chunks:
            year_match = _re.search(r'(?:June|Jun[e]?_?)(\d{4})', c, _re.IGNORECASE)
            if year_match and 'SOURCE:' in c:
                c = c.replace('SOURCE:', f'SOURCE [Year: {year_match.group(1)}]:', 1)
            annotated.append(c)
        return "\n---\n".join(annotated)

    # Fetch question papers and mark schemes separately for better control
    q_paper_context = get_context_from_topics(
        f"{subject} {topic} question paper exam",
        k_per_topic=10, max_total_chunks=20, doc_type="paper"
    )
    textbook_context = get_context_from_topics(topic, k_per_topic=5, max_total_chunks=14, doc_type="textbook")
    
    q_paper_context = _annotate_year(q_paper_context)
    
    context_sections = []
    if q_paper_context:
        context_sections.append(f"PAST PAPER / MARK SCHEME CONTEXT (prioritised by question paper):\n{q_paper_context}")
    if textbook_context:
        context_sections.append(f"TEXTBOOK CONTEXT:\n{textbook_context}")
    context = "\n\n".join(context_sections)
    
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

    # 3) Agent 2a: analysis pass (compare selected topic with retrieved paper patterns)
    analysis_json = {
        "high_frequency_patterns": [],
        "must_cover_subtopics": [],
        "common_student_errors": [],
        "reference_papers": []
    }
    if context:
        try:
            analysis_system_prompt = f"""
            You are an AQA GCSE examiner analyst for {subject}.
            Analyse the retrieved context for topic '{topic}' ({tier} tier) and return ONLY JSON.

            Required JSON structure:
            {{
              "high_frequency_patterns": ["..."],
              "must_cover_subtopics": ["..."],
              "common_student_errors": ["..."],
              "reference_papers": ["SOURCE filename values only"]
            }}

            Prioritise anything clearly grounded in AQA question papers/mark schemes.
            """
            analysis_json = call_openai_json(
                analysis_system_prompt,
                f"Analyse this context and extract exam-design signals:\n{context}"
            )
        except Exception as e:
            print(f"Analysis pass warning: {e}")

    # 4) Agent 2b: generation pass
    system_prompt = f"""
    You are an expert AQA Triple Science GCSE Examiner for {subject}.
    Your task is to generate a mock exam on the topic: '{topic}' for the {tier} tier.
    
    {"USE THE PROVIDED CONTEXT TO CREATE RELEVANT QUESTIONS:" if context else "Note: No specific context was found. Use your general AQA knowledge."}
    {context}

    Use these extracted exam-design signals from a prior analysis pass:
    {json.dumps(analysis_json)}
    
    You MUST output ONLY valid JSON.
    Generate EXACTLY {num_questions} questions in total.
    The distribution MUST be:
    - {mcq_count} Multiple Choice questions (1 mark each)
    - {short_count} Short Answer questions (2-4 marks each)
    - {extended_count} Extended Response questions (6 marks each)
    
    For every question, you MUST provide:
    1. A "hint" (subtle pedagogical guidance toward key marking points).
    2. A "reference" (Identify if the question is inspired by a specific AQA past paper in the context. If so, provide the FULL exact paper reference from the SOURCE metadata including the specific question reference if available. Do not abbreviate the paper name. If it's general textbook content, use "AQA Syllabus Standard").

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
          "reference": "FULL_EXACT_SOURCE_FILENAME_OR_REFERENCE_STRING",
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
            },
            "source_sync": {
                "downloaded_count": len(downloaded_files),
                "downloaded_files": downloaded_files,
                "used_cache": sync_info.get("used_cache", False),
                "last_synced_at": sync_info.get("last_synced_at"),
                "ttl_hours": sync_info.get("ttl_hours", SYNC_CACHE_TTL_HOURS),
                "forced": sync_info.get("forced", force_paper_sync),
                "sync_warning": sync_error
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/tutor_help", methods=["POST"])
def tutor_help():
    data = request.json
    subject = data.get("subject", "Science")
    topic = data.get("topic", "Topic")
    session_id = data.get("session_id", "default_session")
    user_api_key = request.headers.get("X-OpenAI-API-Key")
    user_message = data.get("message", f"Explain the topic: {topic}")
    
    if not user_api_key:
        api_key = os.getenv("OPENAI_API_KEY")
    else:
        api_key = user_api_key

    try:
        # Configuration for LangGraph (thread_id for memory)
        config = {
            "configurable": {
                "thread_id": session_id,
                "api_key": api_key
            }
        }
        
        # Invoke the Agent Graph
        initial_state = {
            "messages": [HumanMessage(content=user_message)],
            "subject": subject,
            "topic": topic
        }
        
        result = tutor_help_graph.invoke(initial_state, config=config)
        
        # Extract the final JSON from the graph state
        final_json = result.get("final_json", {})
        
        return jsonify({
            "status": "success",
            "content": final_json
        })
    except Exception as e:
        print(f"Graph execution error: {e}")
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
    
    Format your final reply with clear sections (Markdown is fine):
    1. **TL;DR** – single sentence summary.
    2. **Explain** – short paragraph covering the core concept(s).
    3. **Analogy / Example** – relatable comparison or real-world application.
    4. **What Next** – actionable advice, practice idea, or reference to a past paper if available.
    
    CONTEXT:
    {context if context else "No context found. Use standard AQA syllabus knowledge."}
    
    PREVIOUS CONVERSATION:
    {json.dumps(history[-6:]) if history else "No history yet."}
    """
    
    try:
        response_text = call_openai_text(system_prompt, f"User asked: {message}")
        return jsonify({
            "status": "success",
            "response": response_text
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/sync_papers", methods=["POST"])
def sync_papers():
    data = request.json
    subj = data.get("subject", "Physics")
    
    try:
        agent = PaperSearchAgent(textbooks_dir)
        # Search for recent years (dynamic last 5 years)
        current_year = datetime.now().year
        target_years = [str(current_year - i) for i in range(5)]
        
        all_new_files = []
        for year in target_years:
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
