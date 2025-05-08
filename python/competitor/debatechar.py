# debate_agent_enhanced.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain.llms import LlamaCpp
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from bs4 import BeautifulSoup
import re
import time
import numpy as np

class PersonalityDebater:
    def __init__(self):
        self.personas = {
            "donald_trump": {
                "urls": [
                    'https://www.rev.com/blog/transcript-category/donald-trump',
                    'https://www.whitehouse.gov/trump-archives/'
                ],
                "profile": {
                    "rhetorical_style": [
                        "Frequent superlatives (best, greatest, tremendous)",
                        "Third-person self-reference",
                        "Hyperbolic assertions",
                        "Repetitive phrasing for emphasis"
                    ],
                    "argument_patterns": [
                        "America First policy focus",
                        "Criticism of opponents as 'weak' or 'foolish'",
                        "Comparisons using 'we used to... now we...' structure"
                    ],
                    "signature_phrases": [
                        "Make America Great Again",
                        "Fake news",
                        "Tremendous success"
                    ]
                },
                "style_transform": {
                    "replacements": {
                        "very": "tremendously",
                        "big": "YUGE",
                        "win": "win bigly",
                        "success": "success like never before"
                    },
                    "sentence_enders": ["Believe me!", "We're gonna win big!", "USA! USA!"],
                    "openers": ["Let me tell you,", "People are saying,", "Nobody knows this better than me:"]
                }
            },
            "jaishankar": {
                "urls": [
                    'https://www.mea.gov.in/Speeches-Interviews.htm',
                    'https://indianexpress.com/tag/s-jaishankar/'
                ],
                "profile": {
                    "rhetorical_style": [
                        "Diplomatic but assertive tone",
                        "Historical references",
                        "Structural arguments (First... Second... Finally)",
                        "Civilizational perspective"
                    ],
                    "argument_patterns": [
                        "Strategic autonomy emphasis",
                        "Multipolar world order advocacy",
                        "Cultural confidence in policy"
                    ],
                    "signature_phrases": [
                        "Bharat's civilizational ethos",
                        "Strategic calculus",
                        "Contemporary global scenario"
                    ]
                },
                "style_transform": {
                    "replacements": {
                        "india": "Bharat",
                        "should": "must reflect our civilizational wisdom",
                        "global": "multipolar world",
                        "policy": "strategic roadmap"
                    },
                    "sentence_enders": ["That's our civilizational responsibility!", "This is the reality of geopolitics."],
                    "openers": ["In international relations,", "From our historical perspective,", "As a civilization-state,"]
                }
            },
            "narendra_modi": {
                "urls": [
                    'https://www.narendramodi.in/speeches',
                    'https://www.pmindia.gov.in/en/news-updates/'
                ],
                "profile": {
                    "rhetorical_style": [
                        "Aspirational narrative",
                        "Alliterative phrases",
                        "Cultural metaphors",
                        "Mass connect emphasis"
                    ],
                    "argument_patterns": [
                        "Development-focused arguments",
                        "Collective national effort emphasis",
                        "Digital India references"
                    ],
                    "signature_phrases": [
                        "Sabka Saath, Sabka Vikas",
                        "New India",
                        "Modi ki Guarantee"
                    ]
                },
                "style_transform": {
                    "replacements": {
                        "development": "Sabka Vikas",
                        "progress": "Digital India revolution",
                        "work": "Modi ki Guarantee",
                        "people": "140 crore Indians"
                    },
                    "sentence_enders": ["Jai Hind!", "This is New India's resolve!", "Bharat Mata Ki Jai!"],
                    "openers": ["With 140 crore countrymen,", "In this Amrit Kaal,", "As your Pradhan Sevak,"]
                }
            }
        }
        
        self.driver = webdriver.Chrome()
        self.vector_dbs = {}
        self.qa_chains = {}
        self.current_persona = None
        self.debate_history = {}

    def _scrape_data(self, persona):
        all_text = []
        for url in self.personas[persona]["urls"]:
            try:
                self.driver.get(url)
                time.sleep(1.5)  # Reduced wait time with better loading detection
                
                # Wait for main content to load
                self.driver.execute_script("return document.readyState") == "complete"
                
                # Use BeautifulSoup with Selenium's page source
                soup = BeautifulSoup(self.driver.page_source, 'html.parser')
                
                # Domain-specific content extraction
                if 'rev.com' in url:
                    content = soup.find('div', class_='transcript-content')
                elif 'narendramodi.in' in url:
                    content = soup.find('div', class_='speeches-detail-content')
                elif 'mea.gov.in' in url:
                    content = soup.find('div', id='ctl00_ContentPlaceHolder1_Content')
                else:
                    content = soup.body
                
                # Clean unnecessary elements
                for tag in content(['script', 'style', 'header', 'footer', 'nav', 'aside']):
                    tag.decompose()
                
                # Extract and clean text
                text = content.get_text(separator='\n', strip=True)
                text = re.sub(r'\n{3,}', '\n\n', text)
                all_text.append(text)
                
            except Exception as e:
                print(f"Error scraping {url}: {str(e)}")
        return '\n\n'.join(all_text)

    def _create_vector_db(self, text):
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        documents = text_splitter.split_text(text)
        embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/all-mpnet-base-v2')
        return FAISS.from_texts(documents, embeddings)

    def _create_qa_chain(self, persona):
        persona_data = self.personas[persona]
        
        template = """Act as {name} in a formal debate. Follow these guidelines:
1. Rhetorical Style: {rhetorical_style}
2. Argument Patterns: {argument_patterns}
3. Signature Phrases: {signature_phrases}

Debate Context: {context}

Opponent's Argument: "{question}"

Respond AS {name} using:
- Sentence starters: {openers}
- Sentence endings: {enders}
- Keyword replacements: {replacements}

{name}:"""

        prompt = PromptTemplate(
            template=template,
            input_variables=["context", "question"],
            partial_variables={
                "name": persona.replace('_', ' ').title(),
                "rhetorical_style": "\n- ".join(persona_data["profile"]["rhetorical_style"]),
                "argument_patterns": "\n- ".join(persona_data["profile"]["argument_patterns"]),
                "signature_phrases": ", ".join(persona_data["profile"]["signature_phrases"]),
                "openers": ", ".join(persona_data["style_transform"]["openers"]),
                "enders": ", ".join(persona_data["style_transform"]["sentence_enders"]),
                "replacements": str(persona_data["style_transform"]["replacements"])
            }
        )

        llm = LlamaCpp(
            model_path="llama-2-13b-chat.Q5_K_M.gguf",
            temperature=0.85,
            max_tokens=2000,
            repeat_penalty=1.2,
            top_k=50,
            top_p=0.95,
            n_ctx=4096,
            verbose=False
        )

        return RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=self.vector_dbs[persona].as_retriever(search_kwargs={"k": 3}),
            chain_type_kwargs={"prompt": prompt},
            return_source_documents=False
        )

    def initialize_persona(self, persona):
        if persona not in self.personas:
            raise ValueError(f"Unknown persona: {persona}")
        
        if persona not in self.vector_dbs:
            print(f"Building knowledge base for {persona.replace('_', ' ').title()}...")
            text_data = self._scrape_data(persona)
            self.vector_dbs[persona] = self._create_vector_db(text_data)
            self.qa_chains[persona] = self._create_qa_chain(persona)
        
        self.current_persona = persona
        print(f"{persona.replace('_', ' ').title()} debate engine ready!\n")

    def _apply_style_transformations(self, text):
        persona_data = self.personas[self.current_persona]
        transformed = []
        
        # Split into sentences while preserving punctuation
        sentences = re.split(r'(?<=[.!?]) +', text)
        
        for i, sent in enumerate(sentences):
            # Apply sentence opener for first sentence
            if i == 0 and persona_data["style_transform"]["openers"]:
                opener = np.random.choice(persona_data["style_transform"]["openers"])
                sent = f"{opener} {sent[0].lower()}{sent[1:]}"
            
            # Apply keyword replacements
            for word, replacement in persona_data["style_transform"]["replacements"].items():
                sent = re.sub(rf'\b{word}\b', replacement, sent, flags=re.IGNORECASE)
            
            # Add sentence ender for last sentence
            if i == len(sentences)-1 and persona_data["style_transform"]["sentence_enders"]:
                sent += " " + np.random.choice(persona_data["style_transform"]["sentence_enders"])
            
            transformed.append(sent)
        
        return ' '.join(transformed)

    def debate(self, argument):
        if not self.current_persona:
            raise RuntimeError("No persona selected!")
        
        # Maintain debate history context
        history = self.debate_history.get(self.current_persona, [])
        context = "\nPrevious exchanges:\n" + "\n".join(history[-3:]) if history else ""
        
        response = self.qa_chains[self.current_persona]({
            "query": argument,
            "context": context
        })
        
        styled_response = self._apply_style_transformations(response['result'])
        history.append(f"Opponent: {argument}\nResponse: {styled_response}")
        self.debate_history[self.current_persona] = history[-5:]  # Keep last 5 exchanges
        
        return styled_response

    def close(self):
        self.driver.quit()
        print("Debate session closed.")

# Interactive CLI
if __name__ == "__main__":
    debater = PersonalityDebater()
    
    print("Political Debater 2024")
    print("Available personas:")
    print("1. Donald Trump (trump)")
    print("2. S. Jaishankar (jaishankar)")
    print("3. Narendra Modi (modi)")
    
    try:
        while True:
            choice = input("\nSelect persona (name/exit): ").lower()
            if choice == 'exit':
                break
            
            if choice not in ['trump', 'jaishankar', 'modi']:
                print("Invalid choice! Try again.")
                continue
            
            debater.initialize_persona(choice)
            print(f"\nEntering debate with {choice.title()}... (Type 'back' to change persona)")
            
            while True:
                user_input = input("\nYour argument: ")
                if user_input.lower() == 'back':
                    break
                if user_input.lower() == 'exit':
                    debater.close()
                    exit()
                
                response = debater.debate(user_input)
                print(f"\n{choice.title()}: {response}")
    
    finally:
        debater.close()