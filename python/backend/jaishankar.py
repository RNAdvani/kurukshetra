import os
import json
import requests
from langchain.chains import RetrievalQA
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Groq
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Load environment variables - you'll need to set your Groq API key
from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = "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"
if not GROQ_API_KEY:
    raise ValueError("Please set the GROQ_API_KEY environment variable")

# Load the Jaishankar profile from file
def load_jaishankar_profile():
    with open("jaishankar.json", "r") as file:
        return json.load(file)

# Create context documents from the profile
def create_context_documents(profile):
    # Format the profile into more readable text chunks
    contexts = []
    
    # Communication style
    comm_style = profile["communication_style"]
    comm_text = f"Communication Style: Tone is {comm_style['tone']}. Structure includes {comm_style['structure']}. "
    comm_text += f"Rhetorical devices include {', '.join(comm_style['rhetoric'])}."
    contexts.append(comm_text)
    
    # Themes
    themes_text = f"Key Themes: {', '.join(profile['themes'])}"
    contexts.append(themes_text)
    
    # Values
    values_text = f"Core Values: {', '.join(profile['values'])}"
    contexts.append(values_text)
    
    # Signature phrases
    phrases_text = f"Signature Phrases: {', '.join(profile['signature_phrases'])}"
    contexts.append(phrases_text)
    
    # Case studies
    cases_text = f"Key Case Studies: {', '.join(profile['case_studies'])}"
    contexts.append(cases_text)
    
    # Additional background on Dr. S. Jaishankar
    background = """
    Dr. S. Jaishankar is India's Minister of External Affairs. He is known for his diplomatic acumen and strategic vision.
    Prior to becoming minister, he served as Foreign Secretary and had a distinguished career as a diplomat.
    He is known for articulating India's foreign policy centered on strategic autonomy, multi-alignment,
    and advancing India's interests in a complex geopolitical landscape. He emphasizes pragmatic diplomacy and
    represents India's more assertive global posture.
    """
    contexts.append(background)
    
    return contexts

# Set up the RAG system
def setup_rag_system(contexts):
    # Split texts into smaller chunks for embedding
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    all_splits = text_splitter.create_documents(contexts)
    
    # Create embeddings and vector store
    print("Loading embeddings model...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    print("Creating vector store...")
    vector_store = FAISS.from_documents(documents=all_splits, embedding=embeddings)
    
    return vector_store

# Create the Jaishankar-style prompt
def create_jaishankar_prompt():
    template = """
    You are simulating responses as if you were Dr. S. Jaishankar, India's Minister of External Affairs.
    Use the following context to inform your response style and content:
    
    {context}
    
    When responding:
    1. Maintain a diplomatic but confident tone
    2. Use numbered lists when appropriate
    3. Reference historical precedents or bilateral relations
    4. Occasionally use Hindi phrases, especially "Vasudhaiva Kutumbakam" (World as Family)
    5. Use metaphors and cultural analogies
    6. Reference data-driven examples when possible
    7. Frame issues through themes like Strategic Autonomy, Maritime Security, Global South Leadership
    8. Use signature phrases like "Double engine growth", "Living bridge", "Viksit Bharat"
    9. Emphasize India's values: "India First", tradition balanced with technology, resilience
    10. Cite relevant case studies like India's financial assistance to neighbors or evacuation operations
    
    Question: {question}
    
    Dr. S. Jaishankar's response:
    """
    
    return PromptTemplate(template=template, input_variables=["context", "question"])

# Set up the QA system
def setup_qa_system(vector_store):
    # Initialize the Groq LLM
    llm = Groq(
        api_key=GROQ_API_KEY,
        model_name="llama3-70b-8192",  # Using Llama 3 70B model
        temperature=0.5,
        max_tokens=1000
    )
    
    # Create the prompt
    prompt = create_jaishankar_prompt()
    
    # Create the QA chain
    qa = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(search_kwargs={"k": 3}),
        chain_type_kwargs={"prompt": prompt}
    )
    
    return qa

# Main interaction function
def jaishankar_chat():
    print("Loading Jaishankar profile...")
    profile = load_jaishankar_profile()
    
    print("Creating context documents...")
    contexts = create_context_documents(profile)
    
    print("Setting up RAG system...")
    vector_store = setup_rag_system(contexts)
    
    print("Initializing QA system with Groq's Llama model...")
    qa = setup_qa_system(vector_store)
    
    print("\n===== Dr. S. Jaishankar AI Assistant Ready =====")
    print("Ask a question about India's foreign policy, international relations, or global issues")
    print("Type 'exit' to end the conversation")
    
    while True:
        user_input = input("\nYour question: ")
        if user_input.lower() in ["exit", "quit", "bye"]:
            print("Thank you for the discussion. Jai Hind!")
            break
        
        try:
            response = qa.run(user_input)
            print("\nDr. S. Jaishankar:")
            print(response)
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    jaishankar_chat()