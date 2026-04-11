import os
import shutil
import sys
from pathlib import Path
from ingestion import ingest_directory, METADATA_PATH
from retrieval import VECTOR_STORE_PATH

textbooks_dir = os.path.join(os.path.dirname(__file__), "..", "data", "textbooks")

def rebuild():
    print("--- AQA SCIENCE TUTOR: DATABASE REBUILD TOOL ---")
    print(f"Vector Store: {VECTOR_STORE_PATH}")
    print(f"Metadata: {METADATA_PATH}")
    
    # 1. Clear existing data
    if os.path.exists(VECTOR_STORE_PATH):
        print(f"Removing old vector store at {VECTOR_STORE_PATH}...")
        shutil.rmtree(VECTOR_STORE_PATH)
    
    if os.path.exists(METADATA_PATH):
        print(f"Removing ingestion metadata at {METADATA_PATH}...")
        os.remove(METADATA_PATH)
        
    # 2. Re-ingest with new settings
    print(f"Starting re-ingestion from {textbooks_dir} (This may take a few minutes)...")
    ingest_directory(textbooks_dir, force_reingest=True)
    
    print("\n--- REBUILD COMPLETE ---")
    print("You can now restart the backend server normally.")

if __name__ == "__main__":
    rebuild()
