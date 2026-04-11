import os
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "vector_store")
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_context_from_topics(topics_string: str, k_per_topic: int = 5, max_total_chunks: int = 18, doc_type: str = None):
    if not os.path.exists(VECTOR_STORE_PATH):
        return ""
    
    try:
        vectorstore = FAISS.load_local(VECTOR_STORE_PATH, embeddings_model, allow_dangerous_deserialization=True)
        topic_items = [t.strip() for t in topics_string.split(",") if t.strip()]
        all_docs = []
        seen_content = set()
        
        # Build filter if provided
        search_filter = {"doc_type": doc_type} if doc_type else None
        
        for t in topic_items:
            # Search for relevant chunks per topic with metadata filter
            docs = vectorstore.similarity_search(t, k=k_per_topic, filter=search_filter)
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
