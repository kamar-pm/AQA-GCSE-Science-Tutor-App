# 🧬 AQA Triple Science Tutor AI

An advanced, agentic tutoring platform built specifically for **AQA Triple Science GCSE** students (Biology, Chemistry, Physics). This application goes beyond simple chat; it acts as a professional examiner, grounding its assessments in real textbook content and official AQA past papers through RAG (Retrieval-Augmented Generation).

---

## 🚀 One-Command Setup

The project is fully automated for a seamless developer experience:

*   **Mac/Linux**: Open terminal and run `./start.sh`
*   **Windows**: Double-click `start.bat`

*The scripts will automatically handle Python virtual environments, Node.js dependencies (pip/npm), and clear any existing processes.*

---

## ✨ Core Features

### 🕵️ Autonomous Paper Search Agent
*   **Automatic During Exam Generation**: `POST /api/generate_exam` now triggers paper syncing for the selected subject before question generation.
*   **On-Demand Syncing Still Available**: You can still use the explicit sync flow (`/api/sync_papers`) when needed.
*   **AQA-Focused Discovery**: The search flow targets AQA past paper/mark scheme pages and only downloads from trusted AQA domains (`aqa.org.uk`, `filestore.aqa.org.uk`).
*   **Auto-Download & Ingest**: New PDFs are downloaded and ingested into the vector store for RAG context.
*   **Cached Sync**: Subject-level sync is cached (default 24h TTL) to avoid repeated web lookups on every exam request.

### 📖 AI-Powered Textbook Ingestion (RAG)
*   **Automatic OCR**: Uses `rapidocr-onnxruntime` to process scanned and image-based PDFs, ensuring the AI can read real AQA textbooks.
*   **Vector Search & Metadata**: Tracks ingested files via a local metadata store, ensuring fast, relevant context retrieval without duplication.

### 📝 Dynamic & Accurate Exam Generation
*   **Context-Aware**: Uses both textbook and ingested past-paper/mark-scheme context.
*   **Two-Pass Agentic Flow**:
    1. Analysis pass extracts frequent patterns, must-cover subtopics, and common student errors from retrieved context.
    2. Generation pass creates exam questions guided by that analysis.
*   **Intelligent Scaling**: Automatically adjusts exam length (4, 7, 10, or 16 questions) based on retrieved context volume.
*   **Multi-Chapter Support**: Select multiple chapters simultaneously for comprehensive unit-wide mock exams.

### ⏱️ Strict Mode (Timed Exams)
*   **AQA Standard Timing**: Students can toggle "Strict Mode" to receive **1 minute per mark** (matching real GCSE conditions).
*   **Auto-Submit**: The exam automatically locks and submits the moment the countdown hits zero.

### 💡 Interactive Pedagogical Hints & References
*   **Tutor Support**: Toggle the **Get Hint** button for subtle guidance that steer you toward marks without giving away the answer.
*   **Paper Citations**: Every question identifies its source (e.g., *"Ref: AQA June 2022 Paper 1H"*), so you can cross-reference with official materials.

### 📊 Professional Examiner Feedback
*   **Detailed Results**: Every question is marked individually with a score, feedback, the actual **Mark Scheme**, and a **Model Answer**.

### 📖 Tutoring & Revision Mode
*   **Simple Explanations**: Converts complex textbook jargon into easy-to-understand language with relatable analogies.
*   **Real-World Application**: Provides daily-life examples for every scientific concept.
*   **Dynamic Cheat Sheets**: Generates structured revision summaries with key terms, formulas, and required practicals for the selected chapters.

---

## 🛠️ Architecture

*   **Frontend**: React + Vite + Vanilla CSS. Featuring a premium **Glassmorphism** dark mode UI. (Port `5173`)
*   **Backend**: Python + Flask + LangChain + OpenAI. (Port `8000`)
*   **Intelligence**: `gpt-4o-mini` for fast, cost-effective, and accurate GCSE examining.

---

## 📂 Configuration

### Environment Variables
Setup your `.env` in the `backend/` directory:
```bash
OPENAI_API_KEY=your_actual_key_here
PAPER_SYNC_CACHE_TTL_HOURS=24
```

### Using Your Own API Key
If you are deploying this for yourself or want to use your own billing:
1. Open the app in your browser.
2. Click the **⚙️ icon** in the top-right of the header.
3. Enter your **OpenAI API Key** (starts with `sk-...`).
4. The key is stored safely in your browser's `localStorage` and will be used for all AI generation and grading.
5. If no key is provided in the settings, the app will fall back to the `OPENAI_API_KEY` defined in the server's `.env` file.

### Adding Your Own Textbooks & Papers
1.  Navigate to `backend/data/textbooks/`.
2.  Drop any AQA GCSE Science PDF textbooks or **Past Papers** into this directory.
3.  **Pro Tip**: The system automatically avoids duplicate ingestion by tracking filenames in `ingested_metadata.json`.

### Paper Sync Cache
*   Cache file: `backend/paper_sync_cache.json`
*   Purpose: Stores last successful sync timestamp per subject to reduce repeated searches/download attempts.
*   Git: This file is ignored in `.gitignore`.

---

## 🔌 API Notes (Recent Updates)

### `POST /api/generate_exam`
Request body now supports:
```json
{
  "subject": "Physics",
  "topic": "Chapter P4 Electric circuits",
  "tier": "Higher",
  "force_paper_sync": false
}
```

*   `force_paper_sync` (optional): If `true`, bypasses cache and performs a fresh sync before generation.

Response includes `source_sync` metadata:
```json
{
  "source_sync": {
    "downloaded_count": 0,
    "downloaded_files": [],
    "used_cache": true,
    "last_synced_at": "2026-04-09T11:20:00Z",
    "ttl_hours": 24,
    "forced": false,
    "sync_warning": null
  }
}
```

---

## 📜 Educational Disclaimer
This tool is designed to be an educational aid. While the AI mimics the AQA marking style, it should be used alongside official AQA past papers and teacher-led study for the best results.
