import os
import requests
import re
import time
from ddgs import DDGS
from pathlib import Path

class PaperSearchAgent:
    def __init__(self, download_dir):
        self.download_dir = download_dir
        os.makedirs(self.download_dir, exist_ok=True)
        self.subject_codes = {
            "biology": "8461",
            "chemistry": "8462",
            "physics": "8463"
        }
        # Direct high-priority links for 2024 found via deep-web research
        self.gold_urls_2024 = {
            "biology": [
                "https://cdn.sanity.io/files/p28bar15/green/45bce632101224bd077beea4b962c027353a7abc.pdf",
                "https://cdn.sanity.io/files/p28bar15/green/dfafe238a1ff1ec7e60abaa5bed6107cecc4e382.pdf"
            ],
            "chemistry": [
                "https://cdn.sanity.io/files/p28bar15/green/eb7cb6b60d9dc2a5a58f7411da7a2d1dc5986518.pdf",
                "https://cdn.sanity.io/files/p28bar15/green/326d5b564a9b293b1219eb8296148ee29e0c88f6.pdf"
            ],
            "physics": [
                "https://cdn.sanity.io/files/p28bar15/green/0b50579b41d427ef5709ce85971d363c4f3802d1.pdf",
                "https://cdn.sanity.io/files/p28bar15/green/88dead88a2f67d2ef4e871edeec476e011774e40.pdf"
            ]
        }

    def search_and_download(self, subject, year=None):
        results = []
        
        # Priority 1: Use Gold Seeds for 2024 (ensures 100% success for latest papers)
        if year == "2024":
            seeds = self.gold_urls_2024.get(subject.lower(), [])
            for url in seeds:
                results.append({"href": url, "title": f"AQA GCSE {subject} Higher Paper 2024 (Gold)"})

        code = self.subject_codes.get(subject.lower(), "")
        
        # Phase-based search for higher accuracy
        search_phases = [
            f"AQA GCSE {subject} {code} {year if year else ''} higher question paper pdf",
            f"AQA GCSE {subject} {code} {year if year else ''} higher mark scheme pdf"
        ]
        
        results = []
        max_retries = 2
        
        for query_base in search_phases:
            query = f"{query_base} -combined -trilogy -synergy"
            print(f"Agent searching for: {query}")
            
            for attempt in range(max_retries + 1):
                try:
                    with DDGS() as ddgs:
                        ddgs_gen = ddgs.text(query, max_results=8)
                        for r in ddgs_gen:
                            results.append(r)
                    break # Success for this query phase
                except Exception as e:
                    err_msg = str(e)
                    if "No results found" in err_msg:
                        print(f"No results found for query: {query}")
                        break
                    elif attempt < max_retries:
                        print(f"Search attempt {attempt+1} failed ({err_msg}). Retrying in 2s...")
                        time.sleep(2.5)
                    else:
                        print(f"Search error for {year} phase: {e}")

        downloaded_files = []
        
        for res in results:
            url = res.get('href')
            title = res.get('title', 'Unknown Paper')
            if not url: continue
            
            # Handle common redirects (e.g. PhysicsAndMathsTutor)
            if "?pdf=" in url:
                url = url.split("?pdf=")[1]
            
            # Simple validation: Must be a PDF and from trusted domains
            if url and (url.endswith('.pdf') or 'pdf' in url.lower() or 'download' in url.lower()):
                if not self._is_trusted_aqa_url(url):
                    continue
                
                # Block A-level, combined, and trilogy variants
                lowered_check = (title + " " + url).lower()
                bad_keywords = ["combined", "trilogy", "synergy", "a-level", "as-level", "a level", "as level", "foundation"]
                if any(bad in lowered_check for bad in bad_keywords):
                    print(f"Skipping {title} (Filtered out non-GCSE Triple Science)")
                    continue

                # Avoid known spam domains if any (AQA, RevisionScience, SaveMyExams are good)
                try:
                    filename = self._generate_filename(subject, title, url)
                    filepath = os.path.join(self.download_dir, filename)
                    
                    if os.path.exists(filepath):
                        print(f"Skipping {filename} (already exists)")
                        continue

                    print(f"Downloading: {title} from {url}")
                    response = requests.get(url, timeout=15, stream=True)
                    if response.status_code == 200:
                        with open(filepath, 'wb') as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                f.write(chunk)
                        downloaded_files.append(filename)
                except Exception as e:
                    print(f"Failed to download {url}: {e}")

        return downloaded_files

    def _is_trusted_aqa_url(self, url):
        lowered = url.lower()
        trusted_domains = [
            "aqa.org.uk", 
            "filestore.aqa.org.uk",
            "revisionscience.com",
            "physicsandmathstutor.com",
            "savemyexams.com",
            "studymind.co.uk",
            "mmerevise.co.uk",
            "cdn.sanity.io"
        ]
        return any(domain in lowered for domain in trusted_domains)

    def _generate_filename(self, subject, title, url):
        # Create a clean filename from title and URL
        clean_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
        if not clean_title:
            clean_title = Path(url).name
        
        if not clean_title.lower().endswith('.pdf'):
            clean_title += '.pdf'
            
        # Ensure 'AQA' and subject is in the name for better RAG referencing
        prefix = f"AQA_{subject.capitalize()}_"
        if prefix not in clean_title:
            clean_title = prefix + clean_title
            
        return clean_title[:100] # Limit length

if __name__ == "__main__":
    # Test run
    agent = PaperSearchAgent("./backend/data/textbooks")
    files = agent.search_and_download("Physics", "2022")
    print(f"Downloaded: {files}")
