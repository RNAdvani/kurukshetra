import numpy as np
import faiss
import json
from sentence_transformers import SentenceTransformer
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq

app = Flask(__name__)
CORS(app)

# Initialize Groq client
client = Groq(api_key="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")  # Replace with your Groq API key

# --- Trump Knowledge Base Setup ---
trump_knowledge = [
    "Trump's speeches often feature short, punchy sentences that are easy for his audience to understand and remember.",
    "He frequently uses superlatives, such as 'great,' 'tremendous,' 'best,' and 'the most successful,' to emphasize his points.",
    "Repetition is a key part of his speech style; he repeats key phrases like 'Make America Great Again,' 'Believe me,' and 'We're going to win so much you'll be tired of winning.'",
    "Trump often emphasizes his personal achievements and presents himself as an outsider, even as a billionaire businessman, positioning himself as someone who 'gets things done.'",
    "He frequently uses phrases like 'fake news' to attack media outlets and journalists he perceives as hostile, portraying himself as a victim of biased coverage.",
    "Trump uses exaggeration to underscore his points, claiming that certain events, deals, or accomplishments were the 'biggest' or 'most amazing' in history.",
    "He often directs his rhetoric against specific groups or individuals, using nicknames like 'Crooked Hillary,' 'Sleepy Joe,' or 'Little Rocket Man' to insult his opponents.",
    "His speeches are often filled with populist rhetoric, focusing on issues important to his base, such as immigration, trade, and American jobs.",
    "Trump has a confrontational style, often criticizing opponents, the political establishment, and even his own party if they don't align with his views.",
    "He frequently frames issues in binary terms, presenting problems as 'us versus them' or 'good versus bad,' simplifying complex situations into easily digestible narratives.",
    "In speeches, Trump regularly praises his supporters and promises that his policies will directly benefit them, often referring to his followers as 'the forgotten men and women' of America.",
    "Trump's speeches are filled with self-promotion, often touting his successful business background and positioning himself as a deal-maker who can fix problems others can't.",
    "He uses humor and sarcasm to attack his adversaries, often turning moments of tension into opportunities for crowd applause or laughter.",
    "Trump's rhetoric emphasizes nationalism, frequently referring to America as a 'great country' and stressing that American interests must come first in international deals.",
    "He uses emotional appeals to resonate with his audience, often discussing topics like the American dream, patriotism, and the importance of protecting traditional values.",
    "Trump tends to speak in broad strokes and focuses on vision rather than detailed policy proposals, giving his speeches a tone of optimism and confidence.",
    "He frequently points to 'fake news' and 'deep state' conspiracy theories, reinforcing the idea that he's fighting against a corrupt political system.",
    "Trump's speeches often invoke a sense of urgency, with language that suggests immediate action is needed to preserve America's greatness and prevent its decline.",
    "He uses simple, relatable analogies and metaphors that resonate with ordinary Americans, often speaking as if he is directly addressing their concerns and frustrations.",
    "Trump's speeches often include calls to action, asking his audience to 'stand up' and 'fight for America,' positioning his political movement as a grassroots effort against the establishment.",
    "Trump speaks with an almost constant sense of confidence and self-assuredness, rarely backing down from a bold statement or controversial position."
]

# --- Load Jaishankar Knowledge Base ---
try:
    with open("jaishankar.json", "r") as file:
        jaishankar_profile = json.load(file)

    # Create knowledge base from the profile
    jaishankar_knowledge = []

    # Communication style
    comm_style = jaishankar_profile["communication_style"]
    jaishankar_knowledge.append(f"Jaishankar's communication tone is {comm_style['tone']}.")
    jaishankar_knowledge.append(f"Jaishankar structures his speeches using {comm_style['structure']}.")
    for rhetoric in comm_style["rhetoric"]:
        jaishankar_knowledge.append(f"Jaishankar frequently uses {rhetoric} in his speeches.")

    # Themes
    for theme in jaishankar_profile["themes"]:
        jaishankar_knowledge.append(f"A key theme in Jaishankar's discourse is {theme}.")

    # Values
    for value in jaishankar_profile["values"]:
        jaishankar_knowledge.append(f"Jaishankar strongly emphasizes the value of {value}.")

    # Signature phrases
    for phrase in jaishankar_profile["signature_phrases"]:
        jaishankar_knowledge.append(f"Jaishankar frequently uses the phrase '{phrase}' in his speeches.")

    # Case studies
    for case in jaishankar_profile["case_studies"]:
        jaishankar_knowledge.append(f"Jaishankar often cites the case of {case} as an example of India's foreign policy success.")

    # Additional background knowledge
    jaishankar_knowledge.extend([
        "Dr. S. Jaishankar is India's Minister of External Affairs and a distinguished diplomat.",
        "He articulates India's foreign policy centered on strategic autonomy and multi-alignment.",
        "Jaishankar emphasizes pragmatic diplomacy and represents India's assertive global posture.",
        "He frequently uses historical references to contextualize India's current foreign policy positions.",
        "Jaishankar often code-switches between English and Hindi, especially when emphasizing cultural values.",
        "He presents India as a responsible power and voice of the Global South in international forums.",
        "Jaishankar articulates India's position on issues like climate change through the lens of 'common but differentiated responsibilities'.",
        "He focuses on strengthening neighborhood relations under India's 'Neighborhood First' policy.",
        "Jaishankar emphasizes maritime security in the Indo-Pacific region as essential for global prosperity.",
        "He positions India as a net security provider in the Indian Ocean Region.",
        "Jaishankar frequently cites ancient Indian philosophical concepts like 'Vasudhaiva Kutumbakam' (World as Family).",
        "He advocates for reformed multilateralism, including expansion of the UN Security Council.",
        "Jaishankar emphasizes economic diplomacy as a key pillar of India's foreign policy approach.",
        "He articulates the vision of Atmanirbhar Bharat (Self-Reliant India) in the context of global supply chains.",
        "Jaishankar presents the case for India's technological advancement while respecting traditional values.",
        "He emphasizes India's role in providing humanitarian assistance and disaster relief to neighboring countries.",
        "Jaishankar speaks about diaspora engagement as a key component of India's soft power projection.",
        "He articulates India's balanced position on major global conflicts, emphasizing dialogue and diplomacy.",
        "Jaishankar presents data-driven arguments to support India's positions on trade, climate, and development.",
        "He frequently contrasts Western perspectives with the lived experiences of the Global South."
    ])
except FileNotFoundError:
    # If JSON file is not found, provide default knowledge
    jaishankar_knowledge = [
        "Dr. S. Jaishankar is India's Minister of External Affairs with a diplomatic but confident tone.",
        "He uses numbered lists, historical references, and occasionally code-switches between English and Hindi.",
        "Jaishankar employs metaphors, cultural analogies, and data-driven examples in his speeches.",
        "Key themes in his discourse include Maritime Security, Diaspora Engagement, and Strategic Autonomy.",
        "He emphasizes values like 'India First' and 'Vasudhaiva Kutumbakam' (World as Family).",
        "Jaishankar frequently uses phrases like 'Viksit Bharat', 'Act East Policy', and 'Double engine growth'.",
        "He often cites examples like India's financial package to Sri Lanka and Operation Ganga evacuation.",
        "Jaishankar represents India's more assertive global posture with pragmatic diplomacy.",
        "He presents India as a responsible power and voice of the Global South.",
        "Jaishankar emphasizes reformed multilateralism, including expansion of the UN Security Council."
    ]

# --- Setup Embedding Models and Indexes ---
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Trump embeddings
trump_embeddings = embedding_model.encode(trump_knowledge, convert_to_numpy=True)
trump_embedding_dim = trump_embeddings.shape[1]
trump_index = faiss.IndexFlatL2(trump_embedding_dim)
trump_index.add(np.array(trump_embeddings, dtype='float32'))

# Jaishankar embeddings
jaishankar_embeddings = embedding_model.encode(jaishankar_knowledge, convert_to_numpy=True)
jaishankar_embedding_dim = jaishankar_embeddings.shape[1]
jaishankar_index = faiss.IndexFlatL2(jaishankar_embedding_dim)
jaishankar_index.add(np.array(jaishankar_embeddings, dtype='float32'))

# --- Helper Functions ---
def get_trump_knowledge(query, k=3):
    query_embedding = embedding_model.encode([query], convert_to_numpy=True)
    distances, indices = trump_index.search(np.array(query_embedding, dtype='float32'), k)
    return "\n".join([trump_knowledge[i] for i in indices[0]])

def get_jaishankar_knowledge(query, k=5):
    query_embedding = embedding_model.encode([query], convert_to_numpy=True)
    distances, indices = jaishankar_index.search(np.array(query_embedding, dtype='float32'), k)
    return "\n".join([jaishankar_knowledge[i] for i in indices[0]])

# --- API Endpoints ---
@app.route('/debate', methods=['POST'])
def debate():
    data = request.json
    topic = data.get('topic', 'general')
    argument = data.get('argument', '')
    history = data.get('history', [])

    knowledge_context = get_trump_knowledge(argument, k=3)

    prompt = (
        f"Context: {knowledge_context}\n\n"
        "You are Donald Trump participating in a debate. Stay completely in character throughout your response.\n\n"
        f"Topic: {topic}\n"
        f"Opponent's argument: {argument}\n\n"
        "Your response should channel Trump's signature speaking style:\n"
        "• Use short, declarative sentences with simple words\n"
        "• Frequently repeat key points and phrases\n"
        "• Start with phrases like 'Look, folks' or 'Let me tell you'\n"
        "• Reference your own success and experience often\n"
        "• Attack your opponent's record, competence, or character\n"
        "• Make bold, superlative claims ('nobody knows more about X than me')\n"
        "• End statements with emphatic phrases ('that I can tell you', 'believe me')\n"
        "• Use nicknames or labels for opponents\n"
        "• Interrupt formal speech patterns with asides and tangents\n"
        "• Express confidence about winning and 'making America great'\n\n"
        "Respond as Trump, incorporating details from the provided context:"
        "Dont talk in third person talk directly to the user"
    )

    try:
        # Generate response using Groq API
        chat_completion = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": prompt
            }],
            model="llama3-70b-8192",
            temperature=0.95,  # Increased for creativity
            max_tokens=400,    # Increased token limit
            top_p=0.85,
            frequency_penalty=0.4,
            presence_penalty=0.4,
            stop=["\n\n", "END RESPONSE"]  # Clear stopping point
        )

        trump_response = chat_completion.choices[0].message.content
        return jsonify({'response': trump_response, 'status': 'success'})
    
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/jaishankar', methods=['POST'])
def jaishankar_response():
    data = request.json
    topic = data.get('topic', 'foreign policy')
    argument = data.get('argument', '')
    history = data.get('history', [])
    
    knowledge_context = get_jaishankar_knowledge(argument, k=5)
    
    prompt = (
        f"Context about Dr. S. Jaishankar's communication style and knowledge:\n{knowledge_context}\n\n"
        "You are Dr. S. Jaishankar, India's Minister of External Affairs, responding to an argument in a debate. "
        "Stay completely in character throughout your response.\n\n"
        f"Topic: {topic}\n"
        f"Opponent's argument: {argument}\n\n"
        "Generate a diplomatic but firm counter-argument that refutes the opponent's points while channeling Jaishankar's signature debating style:\n"
        "• Begin with a respectful acknowledgment, then present your counter-position\n"
        "• Strategically dismantle the opponent's argument with historical context and precedents\n"
        "• Use numbered points for a structured rebuttal\n"
        "• Cite specific data, treaties, or diplomatic achievements that contradict their claims\n"
        "• Frame your counter-argument through India's key policy perspectives: Strategic Autonomy, Neighborhood First, etc.\n"
        "• Reference relevant case studies that demonstrate India's successful approach\n"
        "• Occasionally use Hindi phrases or cultural references to emphasize key points\n"
        "• Maintain diplomatic language while firmly asserting India's position\n"
        "• End with a forward-looking statement that reinforces India's principled stance\n\n"
        "Respond directly as Dr. Jaishankar, addressing each of the opponent's main arguments with substantive counter-points."
    )
    
    try:
        # Generate response using Groq API
        chat_completion = client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": prompt
            }],
            model="llama3-70b-8192",
            temperature=0.7,
            max_tokens=400,
            top_p=0.9,
            frequency_penalty=0.3,
            presence_penalty=0.3,
            stop=["\n\n\n", "END RESPONSE"]
        )
        
        jaishankar_response = chat_completion.choices[0].message.content
        return jsonify({'response': jaishankar_response, 'status': 'success'})
    
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, threaded=False)