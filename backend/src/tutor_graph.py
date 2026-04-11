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
    topic = state.get("topic")
    
    # 1. Get knowledge (textbooks)
    explanation_context = get_context_from_topics(topic, k_per_topic=12, max_total_chunks=25, doc_type="textbook")
    
    # 2. Get paper samples - FETCH LARGER SET FOR FILTERING
    paper_query = f"{topic} exam paper"
    # We fetch 30 chunks to ensure we find actual paper questions (vs mark schemes)
    paper_context_raw = get_context_from_topics(paper_query, k_per_topic=30, max_total_chunks=40, doc_type="paper")
    
    # 3. Post-process the paper context to prioritize "Question_paper" sources
    # We'll split the chunks and re-order them so Question Papers come first
    chunks = paper_context_raw.split("\n---\n")
    q_papers = []
    mark_schemes = []
    
    for c in chunks:
        if "Question_paper" in c or "Question_Mark" in c or "Question_paper" in c.lower():
            q_papers.append(c)
        else:
            mark_schemes.append(c)
            
    # Combine prioritized: Clearer labeling for the LLM
    prioritized_paper_context = "\n---\n".join(q_papers[:15] + mark_schemes[:5])
    
    combined_context = f"TEXTBOOK KNOWLEDGE:\n{explanation_context}\n\nACTUAL PAST PAPER EXCERPTS (PRIORITIZING QUESTION PAPERS):\n{prioritized_paper_context}"
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
    
    Format response as JSON. Return ONLY the JSON object.
    {{
       "explanation": "<svg>...</svg> \n\n Hey there! [Warm intro] \n\n ### {topic} Overview \n ... \n ### Key Concepts \n - **Term**: Definition ...",
       "examples": "...",
       "cheat_sheet": "...",
       "past_papers": [
         {{
            "title": "AQA GCSE [Subject] [Paper] [Year]",
            "year": "YYYY",
            "tier": "Higher/Foundation",
            "summary": "...",
            "question_text": "THE RECONSTRUCTED VERBATIM QUESTION"
         }}
       ]
    }}
    """
    
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = llm.invoke(messages)
    
    try:
        content = response.content
        
        # 1. Strip Markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[-1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[-1].split("```")[0].strip()

        # 2. Extract JSON strictly if possible
        start = content.find('{')
        end = content.rfind('}') + 1
        if start != -1 and end != 0:
            content = content[start:end]
        
        # Non-strict parsing to handle literal newlines etc.
        parsed_json = json.loads(content, strict=False)
        return {
            "messages": [response],
            "final_json": parsed_json
        }
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        raw_msg = response.content
        
        # Robust Regex Fallback: Matches "explanation": "..." while respecting escaped quotes
        # Pattern: "explanation":\s*"( (\\.|[^"\\])* )"
        import re
        explanation_match = re.search(r'"explanation":\s*"((\\.|[^"\\])*)"', raw_msg, re.DOTALL)
        
        if explanation_match:
            extracted_explanation = explanation_match.group(1)
            # Unescape: Convert \" to " and \\n to \n
            extracted_explanation = extracted_explanation.replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
        else:
            extracted_explanation = raw_msg # Worst case fallback

        return {
            "messages": [response],
            "final_json": {
                "explanation": extracted_explanation,
                "examples": "Please ask me specifically for examples if you need more!",
                "cheat_sheet": "Revision summary is currently being refreshed.",
                "past_papers": []
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
