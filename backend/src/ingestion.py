import os
import json
import argparse
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
# We will use HuggingFace embeddings for local free usage in this implementation.
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
import numpy as np
import fitz
from rapidocr_onnxruntime import RapidOCR

VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "vector_store")

def manual_ocr_load(pdf_path: str):
    """
    Perform manual OCR on a PDF by rendering pages as images and using RapidOCR.
    """
    print(f"Starting heavy OCR process for {pdf_path}...")
    doc = fitz.open(pdf_path)
    engine = RapidOCR()
    documents = []
    
    total_pages = len(doc)
    for i in range(total_pages):
        page = doc.load_page(i)
        # Higher DPI for better OCR accuracy
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        
        # Run OCR
        result, _ = engine(img)
        page_text = ""
        if result:
            page_text = "\n".join([line[1] for line in result])
        
            # Tag document type based on filename
            doc_type = "textbook" if "Student Book" in pdf_path else "paper"
            documents.append(Document(
                page_content=page_text,
                metadata={"source": pdf_path, "page": i + 1, "doc_type": doc_type}
            ))
            
        if (i + 1) % 5 == 0 or i == total_pages - 1:
            print(f"OCRing {os.path.basename(pdf_path)}: Page {i + 1}/{total_pages} processed...")
            
    return documents

def ingest_pdf(pdf_path: str):
    """
    Load a PDF, split it into chunks, and store in a local FAISS vector database.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: PDF not found at {pdf_path}")
        return

    print(f"Loading PDF from {pdf_path} (Using PyPDFLoader parser with OCR enabled)...")
    loader = PyPDFLoader(pdf_path, extract_images=True)
    documents = loader.load()

    # Use standard chunking parameters
    chunks = text_splitter.split_documents(documents)
    
    # Ensure chunks inherit the correct doc_type
    doc_type = "textbook" if "Student Book" in pdf_path else "paper"
    for chunk in chunks:
        chunk.metadata["doc_type"] = doc_type
    
    # Fallback to PyMuPDFLoader if PyPDFLoader yields nothing
    if not chunks:
        print(f"PyPDFLoader yielded 0 chunks for {pdf_path}. Falling back to PyMuPDFLoader...")
        from langchain_community.document_loaders import PyMuPDFLoader
        loader = PyMuPDFLoader(pdf_path)
        documents = loader.load()
        chunks = text_splitter.split_documents(documents)

    # FINAL FALLBACK: Manual OCR (Heavy Duty)
    if not chunks:
        print(f"Standard extraction failed (0 chunks) for {pdf_path}. Triggering manual fallback OCR...")
        documents = manual_ocr_load(pdf_path)
        chunks = text_splitter.split_documents(documents)

    if not chunks:
        raise ValueError(f"CRITICAL FAILURE: No text chunks could be extracted from {pdf_path} using ANY loader (including manual OCR). The file may be corrupt or encrypted.")

    print(f"Loaded and split into {len(chunks)} chunks.")

    print("Initializing embedding model...")
    # Using a robust and small sentence-transformers model
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    print("Generating embeddings and building vector store...")
    if os.path.exists(VECTOR_STORE_PATH):
        print("Vector store already exists. Adding new chunks.")
        vectorstore = FAISS.load_local(VECTOR_STORE_PATH, embeddings, allow_dangerous_deserialization=True)
        vectorstore.add_documents(chunks)
    else:
        print("Creating new vector store.")
        vectorstore = FAISS.from_documents(chunks, embeddings)

    # Save to disk
    vectorstore.save_local(VECTOR_STORE_PATH)
    print(f"Successfully ingested {pdf_path} (Type: {doc_type}) into vector store at {VECTOR_STORE_PATH}")

def update_existing_metadata(vector_store_path, embeddings):
    """
    Utility to update doc_type metadata for existing chunks in FAISS index.
    """
    if not os.path.exists(vector_store_path):
        return
    
    print("Updating metadata for existing vector store chunks...")
    vectorstore = FAISS.load_local(vector_store_path, embeddings, allow_dangerous_deserialization=True)
    updated = False
    
    # Access the underlying docstore
    for doc_id, doc in vectorstore.docstore._dict.items():
        if "doc_type" not in doc.metadata:
            source = doc.metadata.get("source", "")
            doc.metadata["doc_type"] = "textbook" if "Student Book" in source else "paper"
            updated = True
            
    if updated:
        vectorstore.save_local(vector_store_path)
        print("Successfully updated metadata for all existing chunks.")
    else:
        print("Metadata already up to date.")

METADATA_PATH = os.path.join(os.path.dirname(__file__), "..", "ingested_metadata.json")

def _load_metadata():
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, ValueError):
            # In case file is empty or has invalid JSON
            return {"ingested_files": []}
    return {"ingested_files": []}

def _save_metadata(metadata):
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f)

def ingest_directory(dir_path: str, force_reingest: bool = False):
    """
    Ingests all PDFs in a given directory that haven't been ingested yet.
    """
    import glob
    metadata = _load_metadata()
    
    if os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
    
    pdf_files = glob.glob(os.path.join(dir_path, "*.pdf"))
    
    files_to_ingest = []
    for pdf in pdf_files:
        filename = os.path.basename(pdf)
        if force_reingest or filename not in metadata["ingested_files"]:
            files_to_ingest.append(pdf)
    
    if not files_to_ingest:
        print(f"Skipping ingestion: All {len(pdf_files)} PDFs in {dir_path} are already up to date in the vector store.")
        return
        
    print(f"Ingesting {len(files_to_ingest)} new files...")
    for pdf in files_to_ingest:
        filename = os.path.basename(pdf)
        try:
            ingest_pdf(pdf)
            if filename not in metadata["ingested_files"]:
                metadata["ingested_files"].append(filename)
            # Save progress after each successful file
            _save_metadata(metadata)
        except Exception as e:
            print(f"Error during ingestion of {filename}: {str(e)}")
            print("Aborting the rest of the ingestion queue immediately as requested.")
            break
    
    print("Ingestion cycle complete.")

if __name__ == "__main__":
    import json # ensure json is imported for metadata
    import argparse
    parser = argparse.ArgumentParser(description="Ingest a given PDF textbook into the vector store.")
    parser.add_argument("pdf_path", type=str, help="Absolute or relative path to the PDF.")
    args = parser.parse_args()

    ingest_pdf(args.pdf_path)
