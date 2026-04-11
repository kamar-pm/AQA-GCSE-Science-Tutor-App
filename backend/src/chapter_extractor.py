import os
import fitz
import json
import urllib.request
from rapidocr_onnxruntime import RapidOCR
import numpy as np

def extract_chapters_from_pdf(pdf_path, api_key, subject, expected_count):
    """
    Renders TOC pages, runs OCR, and uses AI to extract a clean list of chapters.
    """
    if not api_key or api_key == "your-api-key-here":
        print(f"Skipping chapter extraction for {pdf_path}: No valid API key provided.")
        return []

    prefix = subject[0].upper() # B, C, or P

    print(f"Extracting Table of Contents from {os.path.basename(pdf_path)}...")
    doc = fitz.open(pdf_path)
    engine = RapidOCR()
    full_text = ""
    
    # High-accuracy scan: Try first 30 pages
    for i in range(min(30, len(doc))):
        page = doc.load_page(i)
        # Higher DPI (2.0) for better OCR accuracy on small TOC text
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        result, _ = engine(img)
        if result:
            page_text = " ".join([line[1] for line in result])
            # Only include pages that look like Table of Contents or Chapters to reduce noise
            if i < 5 or any(keyword in page_text for keyword in ["Contents", "Chapter", "Unit", "Section", f"{prefix}1", f"{prefix}2"]):
                full_text += f"\n[PAGE {i+1}]\n" + page_text

    if not full_text.strip():
        return []

    system_prompt = f"""
    You are a curriculum expert. I will provide segments of an AQA {subject} textbook's Table of Contents (TOC).
    Your task is to extract a clean, sequential list of the MAIN CHAPTERS.
    
    Target:
    - There are exactly {expected_count} chapters in this {subject} textbook.
    - They are prefixed with '{prefix}' (e.g. {prefix}1, {prefix}2 ... {prefix}{expected_count}).
    
    Rules:
    - Format: "Chapter {prefix}[Number] [Title]" (e.g., "Chapter {prefix}1 Energy stores and systems")
    - Only include top-level chapters, not sub-sections.
    - The OCR text might be fragmented. Match the chapter numbers ({prefix}1 to {prefix}{expected_count}) precisely.
    - Return exactly this JSON structure:
    {{ "chapters": ["Chapter {prefix}1...", "Chapter {prefix}2...", "..."] }}
    """
    
    # Send a reasonable amount of text to avoid context limits or noise dilution
    user_prompt = f"Extract exactly {expected_count} chapters from this OCR text:\n\n{full_text[:12000]}"
    
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    data = {
        "model": "gpt-4o-mini",
        "response_format": { "type": "json_object" },
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode())
            content = json.loads(res["choices"][0]["message"]["content"])
            return content.get("chapters", [])
    except Exception as e:
        print(f"AI Chapter extraction failed for {pdf_path}: {e}")
        return []

def run_extraction_cycle(textbooks_dir, api_key, output_path):
    """
    Goes through Biology, Chemistry, and Physics textbooks to build the master chapter list.
    """
    results = {}
    targets = {
        "Biology": 18,
        "Chemistry": 15,
        "Physics": 16
    }
    
    for subject, count in targets.items():
        # Find the correct PDF
        pdf_file = None
        for f in os.listdir(textbooks_dir):
            if subject in f and f.endswith(".pdf") and "Student Book" in f:
                pdf_file = os.path.join(textbooks_dir, f)
                break
        
        if pdf_file:
            chapters = extract_chapters_from_pdf(pdf_file, api_key, subject, count)
            if chapters:
                results[subject] = chapters
                print(f"Successfully extracted {len(chapters)}/{count} chapters for {subject}.")
            else:
                print(f"Could not extract chapters for {subject}.")
        else:
            print(f"No textbook found for {subject}.")

    if results:
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Saved extracted chapters to {output_path}")
        return results
    return None
