import sys, json, os, re
from dotenv import load_dotenv
load_dotenv('backend/.env')
sys.path.append('backend/src')
from retrieval import VECTOR_STORE_PATH, embeddings_model, get_context_from_topics
from langchain_community.vectorstores import FAISS

vs = FAISS.load_local(VECTOR_STORE_PATH, embeddings_model, allow_dangerous_deserialization=True)

# Fetch what the retriever actually fetches for Physics/Forces
print("=== Fetching paper context ===")
ctx = get_context_from_topics("Physics Forces exam question", k_per_topic=20, max_total_chunks=30, doc_type="paper")

chunks = ctx.split("\n---\n")
print(f"Total chunks retrieved: {len(chunks)}")

qp_chunks = [c for c in chunks if 'QP' in c or 'Question_paper' in c or 'question_paper' in c.lower()]
print(f"Question paper chunks: {len(qp_chunks)}")
ms_chunks = [c for c in chunks if c not in qp_chunks]
print(f"Mark scheme chunks: {len(ms_chunks)}")

print("\n=== Question Paper Chunks ===")
for c in qp_chunks[:3]:
    print(c[:300])
    print("---")

# Also check what doc_types the QP files have
print("\n=== QP file metadata check ===")
docs = vs.similarity_search("Forces Physics question", k=50)
qp_seen = set()
for d in docs:
    src = os.path.basename(d.metadata.get('source', ''))
    if ('QP' in src or 'Question_paper' in src.replace(' ', '_')) and src not in qp_seen:
        qp_seen.add(src)
        dt = d.metadata.get('doc_type', 'N/A')
        print(f"  {src} -> doc_type={dt}")
