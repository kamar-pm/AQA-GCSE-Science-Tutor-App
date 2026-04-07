import os
import argparse
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
# Note: Since the prompt context doesn't have an api key initially, we'll setup dummy embeddings for now or GoogleGenerativeAIEmbeddings.
# We will use HuggingFace embeddings for local free usage in this implementation.
from langchain_community.embeddings import HuggingFaceEmbeddings

VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "vector_store")

def ingest_pdf(pdf_path: str):
    """
    Load a PDF, split it into chunks, and store in a local FAISS vector database.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: PDF not found at {pdf_path}")
        return

    print(f"Loading PDF from {pdf_path} (Running OCR with rapidocr - this may take several minutes per book)...")
    loader = PyPDFLoader(pdf_path, extract_images=True)
    documents = loader.load()

    print(f"Loaded {len(documents)} pages. Splitting into chunks...")
    # Use standard chunking parameters
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks.")
    
    if not chunks:
        print(f"Warning: No text chunks could be extracted from {pdf_path}. This usually happens if the PDF is image-based (scanned) or contains no selectable text.")
        return

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
    print(f"Successfully ingested {pdf_path} into vector store at {VECTOR_STORE_PATH}")

def ingest_directory(dir_path: str):
    """
    Ingests all PDFs in a given directory.
    To avoid duplicating chunks on every server restart, it skips if the vector store already exists.
    """
    import glob
    
    if os.path.exists(VECTOR_STORE_PATH):
        print("Vector store already exists. Skipping startup ingestion to avoid duplicates.")
        return
        
    if not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
        print(f"Created directory {dir_path}. Add PDFs here to ingest them on next startup.")
        return
        
    pdf_files = glob.glob(os.path.join(dir_path, "*.pdf"))
    if not pdf_files:
        print(f"No PDFs found in {dir_path} to ingest.")
        return
        
    for pdf in pdf_files:
        ingest_pdf(pdf)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest a given PDF textbook into the vector store.")
    parser.add_argument("pdf_path", type=str, help="Absolute or relative path to the PDF.")
    args = parser.parse_args()

    ingest_pdf(args.pdf_path)
