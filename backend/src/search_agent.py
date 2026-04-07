import os
import requests
import re
from duckduckgo_search import DDGS
from pathlib import Path

class PaperSearchAgent:
    def __init__(self, download_dir):
        self.download_dir = download_dir
        os.makedirs(self.download_dir, exist_ok=True)

    def search_and_download(self, subject, year=None):
        """
        Search for AQA past papers and download found PDFs.
        """
        query = f"AQA GCSE {subject} past papers {year if year else ''} question paper mark scheme pdf"
        print(f"Agent searching for: {query}")
        
        results = []
        with DDGS() as ddgs:
            # Search for PDF files specifically
            ddgs_gen = ddgs.text(f"{query} filetype:pdf", max_results=10)
            for r in ddgs_gen:
                results.append(r)

        downloaded_files = []
        
        for res in results:
            url = res.get('href')
            title = res.get('title', 'Unknown Paper')
            
            # Simple validation: Must be a PDF and from a trusted-looking domain
            if url and (url.endswith('.pdf') or 'pdf' in url.lower()):
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
