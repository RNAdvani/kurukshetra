from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch

# Initialize Flask
app = Flask(__name__)
CORS(app, resources={r"/debate": {"origins": "*"}})

# Initialize models and vector DB once
def initialize_components():
    # Load Trump dataset
    with open('data/trump_dataset.txt', 'r') as f:
        trump_data = f.read()
    
    # Split text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    docs = text_splitter.split_text(trump_data)
    
    # Create vector store
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vector_store = FAISS.from_texts(docs, embeddings)
    
    # Load LLM with GPU support
    model_name = "microsoft/DialoGPT-medium"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        device_map="auto",
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    )
    
    # Create pipeline
    generation_pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=150,
        temperature=0.9,
        top_p=0.95,
        repetition_penalty=1.2,
        device=0 if torch.cuda.is_available() else -1
    )
    
    return vector_store.as_retriever(), generation_pipe

retriever, pipe = initialize_components()

# Trump-style prompt template
TRUMP_PROMPT = """You are Donald Trump in a debate. Respond using:
- Hyperbole and superlatives
- Repetition of key phrases
- Nationalistic language
- Confident tone

Topic: {topic}
Previous arguments: {history}

User: {argument}
Trump:"""

@app.route('/debate', methods=['POST'])
def debate():
    try:
        data = request.json
        topic = data.get('topic', 'general discussion')
        argument = data.get('argument', '')
        history = data.get('history', [])
        
        # Format history as string
        hist_str = "\n".join([f"User: {h['user']}\nTrump: {h['trump']}" for h in history[-3:]])
        
        # Create full prompt
        full_prompt = TRUMP_PROMPT.format(
            topic=topic,
            history=hist_str,
            argument=argument
        )
        
        # Get relevant context
        relevant_docs = retriever.get_relevant_documents(argument)
        context = "\n".join([d.page_content for d in relevant_docs[:2]])
        
        # Generate response
        response = pipe(
            f"Context: {context}\n{full_prompt}",
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )[0]['generated_text']
        
        # Extract just Trump's response
        trump_response = response.split("Trump:")[-1].strip()
        
        # Add Trump-isms
        trump_response = trump_response.replace(" very ", " TREMENDOUSLY ") \
                                    .replace(" great ", " THE BEST ") \
                                    .replace("I think", "EVERYONE KNOWS") + "!"
        
        return jsonify({
            'trump_response': trump_response,
            'status': 'success'
        })
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, threaded=True)