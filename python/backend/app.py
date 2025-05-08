from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer,set_seed
import torch
import re
import json
from json import JSONDecodeError
import os
import jsonlines
import faiss
import google.generativeai as genai
from collections import defaultdict
from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_core.documents import Document  

import os

# Configure environment for DeBERTa-v3 compatibility
os.environ["TOKENIZERS_PARALLELISM"] = "false"

app = Flask(__name__)
CORS(app)
groq_chat = ChatGroq(
    api_key="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",
    model_name="mixtral-8x7b-32768"
)
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
def load_faiss_with_metadata():
    # Load FAISS index
    index = faiss.read_index("faiss_index.bin")
    
    # Load metadata and create documents with ID validation
    with jsonlines.open("metadata.jsonl", "r") as f:
        metadata = list(f)
    
    documents = []
    valid_ids = set()
    for i, doc in enumerate(metadata):
        try:
            text = f"{doc['instruction']} {doc['input']} {doc['output']}"
            documents.append(Document(
                page_content=text,
                metadata={"id": i, **doc}  # Add numeric ID to metadata
            ))
            valid_ids.add(i)
        except KeyError:
            continue

    # Create docstore with ID validation
    docstore = InMemoryDocstore({
        i: doc for i, doc in enumerate(documents) if i in valid_ids
    })
    
    # Create safe index mapping
    index_to_id = {idx: str(idx) for idx in valid_ids}
    
    # Verify FAISS index dimensions
    if index.ntotal != len(documents):
        print(f"Rebuilding index: Index has {index.ntotal} entries but {len(documents)} documents")
        return FAISS.from_documents(
            documents=documents,
            embedding=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        )
    
    return FAISS(
        embedding_function=HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2").embed_query,
        index=index,
        docstore=docstore,
        index_to_docstore_id=index_to_id
    )

# Add error handling to retrieval
def safe_retrieval(topic: str, text: str) -> list:
    """Robust document retrieval with error handling"""
    try:
        # Clean input to prevent injection-like issues
        clean_input = re.sub(r"[^\w\s:.-]", "", f"{topic}: {text}")[:256]
        
        # Attempt retrieval with multiple safeguards
        docs = retriever.get_relevant_documents(clean_input)
        
        # Validate documents with multiple checks
        valid_docs = []
        for doc in docs:
            if (
                hasattr(doc, 'page_content') and 
                str(getattr(doc, 'metadata', {}).get('id', '')) in vectorstore.index_to_docstore_id
            ):
                valid_docs.append(doc)
        
        return valid_docs[:3]  # Return max 3 valid docs
    
    except Exception as e:
        print(f"Retrieval error: {str(e)}")
        return []

def repair_json(json_str: str) -> str:
    """Fix common JSON formatting issues"""
    # Remove unescaped quotes and control characters
    json_str = re.sub(r'(?<!\\)"', '\\"', json_str)
    json_str = re.sub(r'[\x00-\x1F\x7F]', '', json_str)
    
    # Add quotes around unquoted keys
    json_str = re.sub(
        r'([{,]\s*)(\w+)(\s*:)', 
        lambda m: f'{m.group(1)}"{m.group(2)}"{m.group(3)}', 
        json_str
    )
    
    # Handle trailing commas
    json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
    
    return json_str

vectorstore = load_faiss_with_metadata()
retriever = vectorstore.as_retriever(k=3)

# Configure Gemini
genai.configure(api_key='AIzaSyBHe6Qly4f8DEGvfyVf8ek_vhNMNhMPyJI')
gemini = genai.GenerativeModel('gemini-1.5-flash')

def get_ethos_model():
    model = AutoModelForSequenceClassification.from_pretrained(
        "microsoft/deberta-v3-small",
        low_cpu_mem_usage=True
    )
    tokenizer = AutoTokenizer.from_pretrained(
        "microsoft/deberta-v3-small",
        use_fast=True,
        legacy=False
    )
    return model, tokenizer
# Analysis weights
WEIGHTS = {
    "ethos": 0.20,
    "pathos": 0.15,
    "logos": 0.30,
    "stoic": 0.15,
    "facts": 0.10
}
# bnb_config = BitsAndBytesConfig(
#     load_in_4bit=True,
#     bnb_4bit_use_double_quant=True,
#     bnb_4bit_quant_type="nf4",
#     bnb_4bit_compute_dtype=torch.float16
# )
# Initialize models
MODELS = {
    "ethos": {
        "classifier": pipeline(
            "text-classification",
             model="microsoft/deberta-v3-small",
             tokenizer=AutoTokenizer.from_pretrained(
                "microsoft/deberta-v3-small",
                use_fast=True,
                legacy=False,
                from_slow=True  # Critical fix for latest versions
            ),
            device=-1,
            model_kwargs={"local_files_only": True}  
        ),
        "explainer": pipeline(
            "text-generation",
            model="google/flan-t5-base",
            device_map="auto",
        )
    },
    "pathos": {
        "classifier": pipeline(
            "text-classification",
            model="bhadresh-savani/distilbert-base-uncased-emotion",
            device=-1,
        ),
        "explainer": pipeline(
            "text-generation",
            model="google/flan-t5-base",  # alternative model for better explanation quality
            device_map="auto"
        )
    },
    "logos": {
        "classifier": pipeline(
            "zero-shot-classification",
            model="typeform/distilbert-base-uncased-mnli",
            device=-1,
        ),
        "explainer": pipeline(
            "text2text-generation",
            model="google/flan-t5-small",
            device_map="auto",
        )
    }
}
# Custom models for stoic and bias analysis
stoic_model = AutoModelForSequenceClassification.from_pretrained("roberta-base")
stoic_tokenizer = AutoTokenizer.from_pretrained("roberta-base")

bias_model = AutoModelForSequenceClassification.from_pretrained("roberta-base")
bias_tokenizer = AutoTokenizer.from_pretrained("roberta-base")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Move models to device
for name, model in MODELS.items():
    if hasattr(model, 'to'):
        model.to(DEVICE)

def analyze_aspect(text: str, aspect: str, topic: str) -> dict:
    """Fast working version using Groq for explanations"""
    try:
        # Classification remains the same
        model_set = MODELS[aspect]
        classifier = model_set["classifier"]
       
        max_length = min(512, len(text))
        inputs = f"{topic}: {text[:max_length]}"


        if aspect in ["ethos", "pathos"]:
            result = classifier(inputs, truncation=True, max_length=512)[0]
            score = round(result['score'] * 10, 1)
        elif aspect == "logos":
            result = classifier(inputs, candidate_labels=["logical", "illogical"], multi_label=False)
            score = round(result['scores'][0] * 10, 1)
        else:
            score = 5.0


        # GROQ-based explanation
        aspect_map = {
            'ethos': "credibility and trustworthiness of the speaker",
            'pathos': "emotional appeal and audience connection",
            'logos': "logical structure and evidence quality"
        }
       
        prompt = f"""Analyze this {aspect} aspect (score: {score}/10) for a debate about {topic}.
        Argument excerpt: "{text[:200]}..."
        Focus specifically on {aspect_map[aspect]}. Explain why this score was given in 2-3 concise sentences.
        Mention both strengths and weaknesses if applicable."""
       
        explanation = groq_chat.invoke(prompt).content
       
        # Clean up the response
        explanation = explanation.split("Explanation:")[-1].split("\n\n")[0].strip()
        explanation = re.sub(r"\*+", "", explanation)  # Remove markdown
       
        return {
            "aspect": aspect,
            "score": score,
            "explanation": explanation[:400]  # Limit length
        }
       
    except Exception as e:
        return {
            "aspect": aspect,
            "score": 5.0,
            "explanation": f"Analysis error: {str(e)[:50]}"
        }

def analyze_stoic_content(text: str, topic: str) -> dict:
    """Analyze argument with consolidated document retrieval and single LLM call"""
    DEFAULT_RESPONSE = {
        "score": 5.0,
        "weaknesses": ["Analysis unavailable"],
        "strengths": [],
        "historical": "",
        "suggestions": [],
        "explanation": "Could not generate analysis"
    }

    try:
        # Phase 1: Bulk Document Retrieval ------------------------------------------------
        context = []
        valid_docs = []
        
        try:
            # Single retrieval attempt with error suppression
            docs = retriever.get_relevant_documents(f"{topic}: {text}")
            print(f"Retrieved {len(docs)} initial documents")
            
            # Filter valid documents in one pass
            valid_docs = [
                d for d in docs
                if str(getattr(d, 'metadata', {}).get('id', '')) in vectorstore.index_to_docstore_id
            ]
            print(f"Found {len(valid_docs)} valid documents")
            
            # Build context once
            context = [d.page_content[:300] for d in valid_docs[:3]]
            
        except Exception as e:
            print(f"Retrieval error: {str(e)}")
            context = []

        # Phase 2: Single LLM Call --------------------------------------------------------
        prompt = f"""Analyze this argument about {topic}:
        
        Argument: {text[:500]}
        
        Context: {context if context else 'No relevant context available'}
        
        Return JSON with:
        {{
            "score": 0-10,
            "weaknesses": ["top 3 weaknesses"],
            "strengths": ["top 3 strengths"],
            "historical": "historical comparison",
            "suggestions": ["improvement suggestions"],
            "explanation": "detailed analysis"
        }}"""

        print("Making single LLM call with context")
        response = groq_chat.invoke(prompt)
        print("Received LLM response")
        
        # Phase 3: Response Processing ----------------------------------------------------
        try:
            json_str = re.search(r"\{.*\}", response.content, re.DOTALL)
            if not json_str:
                return DEFAULT_RESPONSE
                
            analysis = json.loads(json_str.group(0))
            
            return {
                "score": min(max(float(analysis.get("score", 5.0)), 0.0), 10.0),
                "weaknesses": analysis.get("weaknesses", [])[:3],
                "strengths": analysis.get("strengths", [])[:3],
                "historical": str(analysis.get("historical", ""))[:100],
                "suggestions": analysis.get("suggestions", [])[:2],
                "explanation": analysis.get("explanation", "No explanation provided")[:500]
            }

        except Exception as e:
            print(f"Response parsing failed: {str(e)}")
            return DEFAULT_RESPONSE

    except Exception as e:
        print(f"Critical analysis error: {str(e)}")
        return DEFAULT_RESPONSE


def analyze_bias_content(text: str, topic: str) -> float:
    """Analyze text for bias using custom logic"""
    # Simple heuristic analysis for bias
    bias_indicators = re.findall(r'\b(always|never|everyone|nobody|obviously|clearly|absolutely)\b', text.lower())
    opinion_words = re.findall(r'\b(think|believe|feel|assume|probably|maybe)\b', text.lower())
    
    bias_score = (len(bias_indicators) + len(opinion_words)) / (len(text.split()) + 1)
    return min(max(bias_score * 10, 0), 10)

def fact_check_with_gemini(text: str, topic: str) -> dict:
    try:
        claims = re.split(r"\.", text)
        n = len(claims)
        verified_claims = []
        contains_errors = False
        
        for claim in claims[:n]:  
            response = gemini.generate_content(
                f"Act as a professional fact-checker. Analyze this claim related to {topic}: '{claim}'\n"
                "Provide JSON response with:\n"
                "- verdict (supported/contradicted/unverified)\n"
                "- confidence (0-10)\n"
                "- 1-sentence summary\n"
                "- important context if available\n"
                "Be objective and cite general knowledge, not specific sources."
            )
            
            try:
                result = parse_gemini_response(response.text)
                claim_data = {
                    'claim': claim,
                    'verdict': result.get('verdict', 'unverified'),
                    'confidence': result.get('confidence', 0),
                    'summary': result.get('summary', ''),
                    'context': result.get('context', '')
                }
                verified_claims.append(claim_data)
                
                if claim_data['verdict'] == 'contradicted':
                    contains_errors = True
                    
            except:
                continue

        return {
            'contains_errors': contains_errors,
            'incorrect_claims': [c for c in verified_claims if c['verdict'] == 'contradicted'],
            'all_claims': verified_claims
        }
        
    except Exception as e:
        print(f"Gemini error: {str(e)}")
        return {'contains_errors': False, 'incorrect_claims': [], 'all_claims': []}


def parse_gemini_response(text: str) -> dict:
    """Extract structured data from Gemini response"""
    try:
        # Simple JSON extraction from markdown
        json_str = re.search(r'\{.*\}', text, re.DOTALL).group()
        return json.loads(json_str)
    except:
        return {
            'verdict': 'unverified',
            'confidence': 0,
            'summary': 'Could not parse response',
            'context': ''
        }

# (Keep the rest of the backend code similar to previous version, 
#  just replace the fact check call with fact_check_with_gemini)
def calculate_total_scores(analysis):
    total_scores = {'person1': 0, 'person2': 0}
    for aspect, scores in analysis.items():
        if aspect != 'facts' and aspect != 'total':
            total_scores['person1'] += scores['scores']['person1']
            total_scores['person2'] += scores['scores']['person2']
    return total_scores
@app.route('/analyze', methods=['POST'])
def analyze_debate():
    try:
        print("[1] Starting analysis request")
        data = request.json
        transcription = data['transcription']
        # Process transcripts
        print("[2] Processing speaker transcripts")
        person1 = "("+ " ".join([t['text'] for t in transcription if t['speaker'] == 'person1']) + ")"
        person2 = "("+" ".join([t['text'] for t in transcription if t['speaker'] == 'person2']) + ")"
        
        
        
        # Perform analysis
        analysis = {}
        for aspect in WEIGHTS.keys():
            if aspect == 'facts': continue

            if aspect in MODELS:
                model = MODELS[aspect]
            elif aspect == "stoic":
                model = stoic_model
            elif aspect == "biased":
                model = bias_model
            else:
                continue 
            

        print("[3] Starting stoic analysis")
        p1_stoic = analyze_stoic_content(person1, data['topic'])
        p2_stoic = analyze_stoic_content(person2, data['topic'])
        analysis['stoic'] = {
            'scores': {'person1': p1_stoic['score'], 'person2': p2_stoic['score']},
            'explanations': {
                'person1': p1_stoic['explanation'],
                'person2': p2_stoic['explanation']
            },
            'difference': abs(p1_stoic['score'] - p2_stoic['score']),
            'leading': 'person1' if p1_stoic['score'] > p2_stoic['score'] else 'person2'
        }
        print("Stoic analysis done")

        # 2. Then handle other aspects
        print("[4] Processing core aspects")
        for aspect in ['ethos', 'pathos', 'logos']:  # Explicit list
            if aspect not in WEIGHTS:
                continue
                
            print(f"Processing {aspect} analysis")
            p1 = analyze_aspect(person1, aspect, data['topic'])
            p2 = analyze_aspect(person2, aspect, data['topic'])
            
            analysis[aspect] = {
                'scores': {'person1': p1['score'], 'person2': p2['score']},
                'explanations': {'person1': p1['explanation'], 'person2': p2['explanation']},
                'difference': abs(p1['score'] - p2['score']),
                'leading': 'person1' if p1['score'] > p2['score'] else 'person2'
            }
            print(f"{aspect} analysis done")

        
        # Fact checking with Gemini
        facts = fact_check_with_gemini(f"{person1}.{person2}", data['topic'])
        analysis['facts'] = {
            'contains_errors': facts['contains_errors'],
            'incorrect_claims': facts['incorrect_claims'],
            'all_claims': facts['all_claims'],
            'difference': 0,
            'leading': 'none'
        }
        
        # Calculate totals
        totals = calculate_total_scores(analysis)
        analysis['total'] = {
            'person1': round(totals['person1'], 1),
            'person2': round(totals['person2'], 1),
            'winner': 'person1' if totals['person1'] > totals['person2'] else 'person2'
        }
        
        return jsonify(analysis)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/analyze-message', methods=['POST'])
def analyze_message():
    try:
        data = request.json
        message = data['message']
        context = data.get('context', '')
        topic = data['topic']
        user_id = data['userId']
        
        full_text = f"{context} {message}".strip()
        
        analysis = []
        total_score = 0.0
        
        # Analyze all aspects except 'facts'
        for aspect in WEIGHTS.keys():
            if aspect == 'facts':
                continue
            
            if aspect in ['ethos', 'pathos', 'logos']:
                result = analyze_aspect(full_text, aspect, topic)
            
            weighted_score = result['score'] * WEIGHTS[aspect]
            total_score += weighted_score
            analysis.append({
                'aspect': aspect,
                'raw_score': result['score'],
                'weighted_score': weighted_score,
                'explanation': result['explanation']
            })
        
        # Fact checking
        facts = fact_check_with_gemini(full_text, topic)
        
        return jsonify({
            'user_id': user_id,
            'analysis': analysis,
            'facts': {
                'contains_errors': facts['contains_errors'],
                'incorrect_claims': facts['incorrect_claims']
            },
            'total_score': total_score,
            'context': full_text[-2000:]  # Return updated context
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)