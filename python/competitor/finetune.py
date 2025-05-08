# Install required libraries

# Import libraries
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from peft import get_peft_model, LoraConfig, TaskType
from datasets import Dataset
import json
import os
# Set the environment variable to help with CUDA memory fragmentation
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
# Step 1: Load your custom .jsonl file
def load_jsonl(file_path):
    data = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            data.append(json.loads(line))
    return data

# Replace this with the path to your .jsonl file
file_path = "./cmv_train.jsonl"
data = load_jsonl(file_path)

# Use only the first 100 examples for testing
data = data[:1000]

# Convert to Hugging Face Dataset format
dataset = Dataset.from_list(data)

# Step 2: Load a pre-trained model and tokenizer
model_name = "gpt2-xl"  # You can use "gpt2-medium" or other smaller models
model = AutoModelForCausalLM.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Step 3: Add a padding token if the tokenizer doesn't have one
if tokenizer.pad_token is None:
    tokenizer.add_special_tokens({'pad_token': '[PAD]'})
    model.resize_token_embeddings(len(tokenizer))  # Resize the model's token embeddings

# Step 4: Apply LoRA (Low-Rank Adaptation)
peft_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,  # Task type for causal language modeling
    inference_mode=False,          # Set to False for training
    r=8,                          # Rank of the low-rank matrices
    lora_alpha=32,                # Scaling factor for LoRA
    lora_dropout=0.1,             # Dropout for LoRA layers
)
model = get_peft_model(model, peft_config)

# Step 5: Tokenize the dataset
# Combine "instruction" and "input" into a single prompt, and use "output" as the target
def tokenize_function(examples):
    prompts = [f"{inst} {inp}" for inst, inp in zip(examples["instruction"], examples["input"])]
    labels = tokenizer(examples["output"], truncation=True, padding="max_length", max_length=256, return_tensors="pt").input_ids
    tokenized_inputs = tokenizer(prompts, truncation=True, padding="max_length", max_length=256, return_tensors="pt")
    tokenized_inputs["labels"] = labels  # Add labels for training
    return tokenized_inputs

# Tokenize only the first 100 examples
tokenized_dataset = dataset.map(tokenize_function, batched=True, remove_columns=["instruction", "input", "output"])

# Step 6: Define training arguments
training_args = TrainingArguments(
    output_dir="./fine_tuned_model",  # Directory to save the fine-tuned model
    per_device_train_batch_size=2,    # Batch size (reduce if you run out of memory)
    gradient_accumulation_steps=4,    # Accumulate gradients to simulate larger batch size
    num_train_epochs=3,               # Number of training epochs
    save_steps=500,                   # Save model checkpoints every 500 steps
    save_total_limit=2,               # Keep only the last 2 checkpoints
    logging_dir="./logs",             # Directory for logs
    logging_steps=100,                # Log every 100 steps
    evaluation_strategy="no",         # No evaluation during training
    learning_rate=5e-5,               # Learning rate
    fp16=False,  
    report_to=[],                      # Use mixed precision (if supported)
)

# Step 7: Define the Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
)

# Step 8: Train the model
trainer.train()

# Step 9: Save the fine-tuned model and tokenizer
print("Saving model...")
model.save_pretrained("./fine_tuned_model")
print("Model saved.")

print("Saving tokenizer...")
tokenizer.save_pretrained("./fine_tuned_model")
print("Tokenizer saved.")

print("Fine-tuned model saved to './fine_tuned_model'")