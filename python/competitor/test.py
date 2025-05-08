import torch
import jsonlines
import faiss
import numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
from langchain.docstore.document import Document
from langchain.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain.schema import HumanMessage, AIMessage
from langchain_groq import ChatGroq
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.utilities import SerpAPIWrapper
from langchain.schema import BaseRetriever
from typing import List

app = Flask(__name__)
CORS(app)

serpapi = SerpAPIWrapper(
    serpapi_api_key="cd8e47fd38c5a47b9716ebc60a7fc0677c69f86dfcca8f59f4041079c20dc70b",  # Replace with your key
    params={"engine": "google", "gl": "us", "hl": "en"}
)

class HybridRetriever(BaseRetriever):
    faiss_retriever: BaseRetriever
    serpapi: SerpAPIWrapper

    def get_relevant_documents(self, query: str) -> List[Document]:
        # Get local FAISS results
        faiss_docs = self.faiss_retriever.get_relevant_documents(query)
        
        # Get web results
        try:
            serpapi_results = self.serpapi.results(query)
        except Exception as e:
            print(f"SerpAPI error: {e}")
            serpapi_results = {}

        # Process web results
        web_docs = []
        if "organic_results" in serpapi_results:
            for result in serpapi_results["organic_results"]:
                content = f"{result.get('title', '')}\n{result.get('snippet', '')}"
                metadata = {
                    "source": result.get("link", "Unknown"),
                    "title": result.get("title", "Web Result")
                }
                web_docs.append(Document(
                    page_content=content,
                    metadata=metadata
                ))

        # Combine and deduplicate
        combined = faiss_docs + web_docs
        seen = set()
        unique_docs = []
        for doc in combined:
            if doc.page_content not in seen:
                seen.add(doc.page_content)
                unique_docs.append(doc)

        return unique_docs[:10]
# Initialize components
tokenizer = AutoTokenizer.from_pretrained("./fine_tuned_model")
base_model = AutoModelForCausalLM.from_pretrained("gpt2")
model = PeftModel.from_pretrained(base_model, "./fine_tuned_model", ignore_mismatched_sizes=True)
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Load vector store
with jsonlines.open("metadata.jsonl", "r") as f:
    metadata = list(f)
documents = [Document(page_content=f"{doc['instruction']} {doc['input']} {doc['output']}", metadata=doc) for doc in metadata]
vectorstore = FAISS.from_documents(documents, embedding_model)
db_retriever = vectorstore.as_retriever()


#load serpapi
# Add with other initializations

# Replace existing db_retriever setup with:
hybrid_retriever = HybridRetriever(
    faiss_retriever=db_retriever,
    serpapi=serpapi
)
# Initialize LLM
llm = ChatGroq(
    api_key="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",
    model_name="mixtral-8x7b-32768"
)



@app.route('/coach', methods=['POST'])
def debate_coach():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['debate_type', 'difficulty', 'statement', 'user_argument']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        messages = data.get('messages', [])
        
        # Handle empty message history (opening speech)
        if not messages and not data['user_argument']:
            return jsonify({
                "counterargument": generate_opening_speech(
                    data['statement'],
                    data['debate_type'],
                    data['difficulty']
                ),
                "flaws": [],
                "sources": [],
                "chat_history": []
            })
        
        # Validate messages structure
        for idx, msg in enumerate(messages):
            if not isinstance(msg, dict):
                return jsonify({"error": f"Message {idx+1} is not a dictionary"}), 400
            if 'role' not in msg:
                return jsonify({"error": f"Message {idx+1} missing 'role' key"}), 400
            if 'content' not in msg:
                return jsonify({"error": f"Message {idx+1} missing 'content' key"}), 400
            if msg['role'] not in ['user', 'assistant']:
                return jsonify({"error": f"Invalid role '{msg['role']}' in message {idx+1}"}), 400

        # Generate responses
        initial_response = generate_initial_counterargument(
            data['statement'],
            data['user_argument'],
            data['difficulty']
        )
        
        final_response = generate_final_response(
            statement=data['statement'],
            user_argument=data['user_argument'],
            debate_type=data['debate_type'],
            difficulty=data['difficulty'],
            chat_history=messages,
            initial_analysis=initial_response
        )
        
        # Parse response
        response_text = final_response.get("answer", "")
        flaws, counterargument = parse_response(response_text)
        
        return jsonify({
            "counterargument": counterargument,
            "flaws": flaws,
            "sources": [doc.metadata for doc in final_response.get("source_documents", [])],
            "chat_history": messages
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_opening_speech(statement, debate_type, difficulty):
    prompt = f"""Generate {difficulty}-level opening speech for {debate_type} debate:
    
    Resolution: {statement}
    
    Structure:
    1. Clear thesis statement
    2. 3 main arguments preview
    3. Supporting evidence framework
    4. {debate_type}-specific requirements
    
    Opening Speech:"""
    
    return llm.invoke(prompt).content

def generate_initial_counterargument(statement, user_argument, difficulty):
    prompt = f"""Generate {difficulty}-level initial counterargument:
    
    Original Claim: {statement}
    User Argument: {user_argument}
    
    Requirements:
    - Identify 2 key weaknesses
    - Provide evidence-based rebuttals
    - Formal academic tone
    
    Counterargument:"""
    
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(
        inputs.input_ids,
        max_length=1024,
        no_repeat_ngram_size=3,
        top_k=50,
        top_p=0.9,
        temperature=0.4,
        eos_token_id=tokenizer.eos_token_id
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)
def generate_final_response(statement, user_argument, debate_type, difficulty, chat_history, initial_analysis):
    try:
        # Convert chat history
        converted_history = []
        for msg in chat_history:
            if msg['role'] == 'user':
                converted_history.append(HumanMessage(content=msg['content']))
            else:
                converted_history.append(AIMessage(content=msg['content']))
        
        # Create prompt template (FIXED INPUT VARIABLES)
        prompt_template = PromptTemplate(
            input_variables=["context", "question", "chat_history", "debate_type", "difficulty", "statement"],
            template="""**Debate Analysis Task**
            Debate Type: {debate_type}
            Difficulty Level: {difficulty}
            Original Resolution: {statement}

            User's Current Argument: {question}

            Chat History:
            {chat_history}

            Required Response Format:
            [FLAWS]
            1. First argument weakness
            2. Second weakness
            3. Third weakness

            [COUNTERARGUMENT]
            Structured rebuttal using context...

            Context Documents (may include web sources):
            {context}

            Response:"""
        )
        
        # Create chain
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=hybrid_retriever,
            combine_docs_chain_kwargs={"prompt": prompt_template},
            return_source_documents=True
        )
        
        # Invoke chain with all required parameters (ADDED MISSING FIELDS)
        result = qa_chain.invoke({
            "question": user_argument,
            "chat_history": converted_history,
            "debate_type": debate_type,
            "difficulty": difficulty,
            "statement": statement
        })
        
        return result
    
    except Exception as e:
        raise RuntimeError(f"Response generation failed: {str(e)}")

def parse_response(response_text):
    try:
        flaws = []
        counterargument = ""
        
        # Split sections
        if "[FLAWS]" in response_text and "[COUNTERARGUMENT]" in response_text:
            flaws_section = response_text.split("[FLAWS]")[1].split("[COUNTERARGUMENT]")[0]
            counterargument = response_text.split("[COUNTERARGUMENT]")[1].strip()
            
            # Extract flaws
            for line in flaws_section.split("\n"):
                line = line.strip()
                if line and line[0].isdigit():
                    flaws.append(line.split(" ", 1)[1].strip())
        else:
            counterargument = response_text
        
        return flaws, counterargument
    
    except Exception as e:
        return [], response_text

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)