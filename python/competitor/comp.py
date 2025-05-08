import pandas as pd
import re

# Custom text cleaner
def clean_text(text):
    """Clean text by removing markdown, URLs, emails, and special characters."""
    if not isinstance(text, str):
        return ""
    
    # Remove markdown quotes and special characters
    text = re.sub(r'&gt;|\[.*?\]\(.*?\)|[*~]', '', text)
    
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    
    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Remove phone numbers
    text = re.sub(r'\b(?:\d{3}[-.]?){2}\d{4}\b', '', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text.strip()

# Parse conversation structure
def parse_conversation(text):
    """Parse conversation into structured Human/Assistant turns."""
    # Split into message turns
    turns = re.split(r'### (Human|Assistant):', text)[1:]
    structured = []
    
    for i in range(0, len(turns)-1, 2):
        role = turns[i].strip()
        content = turns[i+1].strip()
        if role and content:
            structured.append({'role': role, 'content': content})
    
    return structured

# Load dataset
df = pd.read_csv("conversations_joined.csv")

# Process conversations into claim-counter pairs
training_pairs = []

for index, row in df.iterrows():
    try:
        # Parse conversation
        conv = parse_conversation(row['train'])
        
        # Skip if conversation is too short
        if len(conv) < 2:
            continue
            
        # Extract original claim (first human message)
        claim = conv[0]['content']
        
        # Create pairs for each counterargument
        for i in range(1, len(conv)):
            if conv[i]['role'] == 'Assistant':
                # Clean text
                cleaned_claim = clean_text(claim)
                cleaned_counter = clean_text(conv[i]['content'])
                
                # Remove quote references
                cleaned_counter = re.sub(r'&gt;.*', '', cleaned_counter)
                
                # Filter quality: minimum length requirements
                if len(cleaned_claim) > 20 and len(cleaned_counter) > 30:
                    training_pairs.append({
                        "instruction": "Generate a counterargument to:",
                        "input": cleaned_claim.strip(),
                        "output": cleaned_counter.strip()
                    })
                    
                # Update claim with human's rebuttal
                if i+1 < len(conv) and conv[i+1]['role'] == 'Human':
                    claim = conv[i+1]['content']
                    
    except Exception as e:
        print(f"Error processing row {index}: {str(e)}")
        continue

# Create DataFrame and remove duplicates
final_df = pd.DataFrame(training_pairs).drop_duplicates()

# Split into train/validation sets
train_df = final_df.sample(frac=0.9, random_state=42)
val_df = final_df.drop(train_df.index)

# Save to JSONL files
train_df.to_json("cmv_train.jsonl", orient='records', lines=True)
val_df.to_json("cmv_val.jsonl", orient='records', lines=True)

# Save to CSV files
train_df.to_csv("cmv_train.csv", index=False)
val_df.to_csv("cmv_val.csv", index=False)

print(f"Processed {len(final_df)} claim-counter pairs.")
print(f"Training set: {len(train_df)} pairs")
print(f"Validation set: {len(val_df)} pairs")