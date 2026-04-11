import os
import json
from typing import Annotated, List, TypedDict, Dict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import MessagesState
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.runnables import RunnableConfig

from retrieval import get_context_from_topics

class TutorState(MessagesState):
    subject: str
    topic: str
    context: str
    final_json: Dict

def planner_node(state: TutorState):
    """
    Analyzes the user request and determines the best search queries.
    """
    # For now, we use a simple planning logic
    # In a more advanced version, this would be an LLM call to expand the topic
    return {"topic": state.get("topic", "Science Topic")}

def retriever_node(state: TutorState):
    """
    Fetches textbook and paper context with high depth, prioritizing actual question papers.
    """
    import re as _re
    import os as _os
    
    topic = state.get("topic")
    subject = state.get("subject", "Science")
    
    # 1. Get knowledge (textbooks)
    explanation_context = get_context_from_topics(topic, k_per_topic=12, max_total_chunks=25, doc_type="textbook")
    
    # 2. Get paper samples - FETCH LARGER SET FOR FILTERING
    paper_query = f"{subject} {topic} exam question"
    paper_context_raw = get_context_from_topics(paper_query, k_per_topic=30, max_total_chunks=40, doc_type="paper")
    
    # 3. Post-process: prioritize Question Papers, extract year from filename for context
    chunks = paper_context_raw.split("\n---\n")
    q_papers = []
    mark_schemes = []
    
    for c in chunks:
        # Extract year from SOURCE line
        year_match = _re.search(r'(?:June|Jun[e]?_?)(\d{4})', c, _re.IGNORECASE)
        if year_match and 'SOURCE:' in c:
            year = year_match.group(1)
            # Inject year at the top of the chunk for LLM context
            c = c.replace('SOURCE:', f'SOURCE [Year: {year}]:', 1)
        
        fname_lower = c.lower()
        is_question_paper = (
            "question_paper" in fname_lower or 
            "questionpaper" in fname_lower or
            "question paper" in fname_lower
        )
        if is_question_paper:
            q_papers.append(c)
        else:
            mark_schemes.append(c)
            
    # Combine: question papers first, then mark schemes for context
    prioritized = q_papers[:15] + mark_schemes[:5]
    prioritized_paper_context = "\n---\n".join(prioritized)
    
    combined_context = (
        f"TEXTBOOK KNOWLEDGE:\n{explanation_context}\n\n"
        f"ACTUAL PAST PAPER EXCERPTS (Question papers prioritized, then mark schemes):\n"
        f"{prioritized_paper_context}"
    )
    return {"context": combined_context}

def responder_node(state: TutorState, config: RunnableConfig):
    """
    Generates an EXHAUSTIVE, descriptive, and HUMAN-LIKE JSON response using the 'Alex' persona.
    """
    subject = state.get("subject", "Science")
    topic = state.get("topic", "Topic")
    context = state.get("context", "")
    
    # Extract API key from config (passed from main.py)
    api_key = config.get("configurable", {}).get("api_key")
    llm = ChatOpenAI(model="gpt-4o", api_key=api_key, temperature=0.7)
    
    system_prompt = f"""
    You are Alex, a warm, enthusiastic private tutor for AQA GCSE Triple Science ({subject}).
    Topic: '{topic}'.
    
    YOUR PERSONA:
    - Tone: Friendly, clear, and CONCISE. Don't write an essay; keep explanations punchy and easy to digest.
    - Greeting: Start the "explanation" with a warm one-sentence greeting.
    
    YOUR GOALS:
    1. STRUCTURED EXPLANATION: Provide a clear, formatted lesson on '{topic}'.
       - CRITICAL: Use Markdown formatting: '###' for headers, '**' for key terms, and bullet points. 
       - IMPORTANT: Every Markdown element (headers, lists) MUST start on a completely new line with NO leading spaces inside the JSON.
       - Do NOT output a wall of text. Use spacing and structure.
    2. SVG INFOGRAPHIC: Generate a professional SVG diagram at the START of your "explanation".
       - Use ONLY single quotes (') for ALL SVG attributes (e.g., <rect x='10' fill='blue' />).
    3. VERBATIM QUESTION RECONSTRUCTION: Reconstruct the COMPLETE question stem and prompt verbatim from the context. Fix OCR but maintain accuracy.
    
    CRITICAL PAST PAPER RULES:
    - ONLY include past_papers entries for papers that appear in the context below.
    - Extract the year ONLY from the '[Year: XXXX]' annotation in the SOURCE line.
    - DO NOT fabricate or guess years. If you cannot find a year in the annotation, use "Unknown".
    - If no 2024 paper is present in the context, do NOT claim 2024 — use whatever years are available.
    - Reconstruct the VERBATIM question text (fixing OCR artifacts only, not altering content).
    - Prefer chunks from files containing 'Question_paper' in the name over mark schemes.

    Format response as JSON. Return ONLY the JSON object.
    {{
       "explanation": "<svg>...</svg> \n\nHey there! [Warm intro] \n\n### {topic} Overview\n\n[Explanation...]\n\n### Key Concepts\n\n- **Term**: Definition",
       "examples": "...",
       "cheat_sheet": "...",
       "past_papers": [
         {{
            "title": "AQA GCSE {subject} [Paper name] [Year]",
            "year": "YYYY",
            "tier": "Higher/Foundation",
            "summary": "Brief description of what this question tests",
            "question_text": "THE VERBATIM QUESTION TEXT FROM THE PAPER"
         }}
       ]
    }}

    CONTEXT (use ONLY what is provided below — do not invent papers):
    {context[:6000]}
    """
    
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = llm.invoke(messages)
    
    import re as _re

    try:
        content = response.content
        
        # 1. Strip markdown code fences
        if "```json" in content:
            content = content.split("```json")[-1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[-1].split("```")[0].strip()

        # 2. Temporarily remove SVG blocks (they contain unescaped quotes that break JSON)
        svg_blocks = []
        def _stash_svg(m):
            svg_blocks.append(m.group(0))
            return f"__SVG_{len(svg_blocks)-1}__"
        
        content_no_svg = _re.sub(r"<svg[\s\S]*?</svg>", _stash_svg, content)

        # 3. Extract the JSON object
        start = content_no_svg.find('{')
        end = content_no_svg.rfind('}') + 1
        if start != -1 and end > start:
            content_no_svg = content_no_svg[start:end]

        # 4. Parse JSON (non-strict to handle literal newlines)
        parsed = json.loads(content_no_svg, strict=False)

        # 5. Re-inject SVG blocks into explanation
        if "explanation" in parsed:
            for idx, svg in enumerate(svg_blocks):
                parsed["explanation"] = parsed["explanation"].replace(f"__SVG_{idx}__", svg)

        return {"messages": [response], "final_json": parsed}

    except Exception as e:
        print(f"JSON Parse Error: {e}")
        raw = response.content

        # Fallback — extract each field individually via regex
        def _extract_str(key, text):
            m = _re.search(rf'"{key}":\s*"((?:\\.|[^"\\])*)"', text, _re.DOTALL)
            if not m:
                return None
            val = m.group(1).replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
            return val

        def _extract_array(key, text):
            """Attempt to pull a JSON array value by key from a malformed JSON string."""
            m = _re.search(rf'"{key}":\s*(\[[\s\S]*?\])', text, _re.DOTALL)
            if not m:
                return []
            try:
                return json.loads(m.group(1), strict=False)
            except Exception:
                return []

        explanation = _extract_str("explanation", raw) or raw
        examples = _extract_str("examples", raw) or "Please ask me specifically for examples if you need more!"
        cheat_sheet = _extract_str("cheat_sheet", raw) or "Revision summary is currently being refreshed."
        past_papers = _extract_array("past_papers", raw)

        return {
            "messages": [response],
            "final_json": {
                "explanation": explanation,
                "examples": examples,
                "cheat_sheet": cheat_sheet,
                "past_papers": past_papers
            }
        }

# Build Graph
builder = StateGraph(TutorState)
builder.add_node("planner", planner_node)
builder.add_node("retriever", retriever_node)
builder.add_node("responder", responder_node)

builder.add_edge(START, "planner")
builder.add_edge("planner", "retriever")
builder.add_edge("retriever", "responder")
builder.add_edge("responder", END)

# Memory Checkpointer
memory = MemorySaver()
tutor_help_graph = builder.compile(checkpointer=memory)
