import faiss
import numpy as np
import jsonlines
from sentence_transformers import SentenceTransformer

# Load Hugging Face embedding model
embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
embedding_dim = embedding_model.get_sentence_embedding_dimension()

# Initialize FAISS index
index = faiss.IndexFlatL2(embedding_dim)  # L2 distance index
metadata = []  # Store metadata separately

# Read JSONL and process embeddings
with jsonlines.open("cmv_train.jsonl", "r") as file:
    for i, record in enumerate(file):
        text = f"Instruction: {record['instruction']} Input: {record['input']} Output: {record['output']}"
        embedding = embedding_model.encode(text, convert_to_numpy=True).astype(np.float32)
        index.add(np.expand_dims(embedding, axis=0))  # Add to FAISS index
        metadata.append(record)  # Store metadata

# Save FAISS index
faiss.write_index(index, "faiss_index.bin")

# Save metadata separately
with jsonlines.open("metadata.jsonl", "w") as f:
    f.write_all(metadata)

print("FAISS index and metadata saved successfully!")
