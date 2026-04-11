# 🧬 AQA Triple Science Tutor AI

An advanced, agentic tutoring platform built specifically for **AQA Triple Science GCSE** students (Biology, Chemistry, Physics). This application goes beyond simple chat; it acts as a professional examiner, grounding its assessments in real textbook content and official AQA past papers through RAG (Retrieval-Augmented Generation).

---

## 🚀 One-Command Setup

### Prerequisites
Before running the project, ensure you have the following installed on your system:
*   **Python** (3.10 or higher)
*   **Node.js** (includes `npm`)

### Running the App
The project is fully automated for a seamless developer experience:

*   **Mac/Linux**: Open terminal and run `./start.sh`
*   **Windows**: Double-click `start.bat`

*The scripts will automatically handle Python virtual environments, Node.js dependencies (pip/npm), and clear any existing processes.*

### Troubleshooting
- **Dependency Build Errors (e.g., numpy):** The `backend/requirements.txt` file has been updated to use unpinned dependencies. This allows pip to automatically install the newest compatible library versions (such as `numpy` >= 2.0.0 and modern `langchain` equivalents). This natively resolves `metadata-generation-failed` compilation errors on newer Python versions (3.12-3.14) without requiring Visual Studio C++ Compiler tools.
- **LangChain Imports:** Fixed `ModuleNotFoundError` by updating legacy LangChain text splitter imports to utilize the dedicated `langchain_text_splitters` package, ensuring full forward-compatibility with LangChain v1.x+.

---

## ✨ Core Features

### 🕵️ Autonomous Paper Search Agent
*   **Extreme 2024 Discovery**: Now includes support for the latest 2024 papers using AQA's official subject codes (**8461**, **8462**, **8463**) for discovery on mirror sites like PMT and Revision Science.
*   **Gold Seeded URLS**: Pre-seeded with direct CDN links for 2024 papers to ensure 100% reliable fetching of the most recent exams.
*   **Automated During Exams**: Triggered automatically when generating a mock exam to ensure you are practicing with the freshest materials.
*   **Trusted Source Filtering**: Strictly restricted to AQA mirrors and trusted educational CDNs (sanity.io, mmerevise, etc.).

### 📖 AI-Powered Textbook Ingestion (RAG)
*   **Automatic 30-Page Deep Scan**: On first run, an AI extraction agent scans the first 30 pages of any provided textbook to identify the target chapter structure.
*   **Count-Aware Discovery**: Specifically targets the exact AQA Triple Science chapter counts for 100% coverage (Biology: 18, Chemistry: 15, Physics: 16).
*   **Metadata Smart Tagging**: Automatically tags content as `textbook` or `paper` during ingestion, enabling precise search filters in Tutor Mode.
*   **Automatic OCR**: Uses `rapidocr-onnxruntime` to process scanned and image-based PDFs, ensuring the AI can read real AQA textbooks.

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
*   **Metadata-Isolated Retrieval**: Uses a strict database filter to ensure revision knowledge comes from textbooks while citations come exclusively from actual papers.
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
