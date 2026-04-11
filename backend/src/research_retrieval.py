import sys
import os
import json
from dotenv import load_dotenv

# Setup paths
load_dotenv('backend/.env')
sys.path.append('backend/src')
from retrieval import VECTOR_STORE_PATH, embeddings_model
from langchain_community.vectorstores import FAISS

def run_research():
    if not os.path.exists(VECTOR_STORE_PATH):
        print("Vector store missing.")
        return

    vectorstore = FAISS.load_local(VECTOR_STORE_PATH, embeddings_model, allow_dangerous_deserialization=True)
    
    topics = ["Atomic structure", "Electrolysis", "Cell biology"]
    results = {}
    
    for topic in topics:
        topic_results = {}
        
        # Strategy 1: Current (Topic + AQA exam question)
        query1 = f"{topic} AQA exam question"
        docs1 = vectorstore.similarity_search(query1, k=10, filter={"doc_type": "paper"})
        topic_results["strategy_current"] = [os.path.basename(d.metadata.get("source", "")) for d in docs1]
        
        # Strategy 2: Topic Only (Filtered)
        query2 = topic
        docs2 = vectorstore.similarity_search(query2, k=10, filter={"doc_type": "paper"})
        topic_results["strategy_topic_only"] = [os.path.basename(d.metadata.get("source", "")) for d in docs2]
        
        # Strategy 3: Subject + Topic (Filtered)
        query3 = f"Chemistry {topic}"
        docs3 = vectorstore.similarity_search(query3, k=10, filter={"doc_type": "paper"})
        topic_results["strategy_subject_topic"] = [os.path.basename(d.metadata.get("source", "")) for d in docs3]
        
        results[topic] = topic_results

    with open('paper_retrieval_research.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("Research complete. results in paper_retrieval_research.json")

if __name__ == "__main__":
    run_research()
