import cv2
import numpy as np
import torch
import time
from collections import deque
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Load model and processor
processor = AutoImageProcessor.from_pretrained("Hemg/sign-language-classification")
model = AutoModelForImageClassification.from_pretrained("Hemg/sign-language-classification")
class_labels = model.config.id2label

# Webcam setup
cap = cv2.VideoCapture(0)

# Transcription parameters
LETTER_BUFFER = deque(maxlen=15)          # Stores recent predictions
CONFIDENCE_THRESHOLD = 0.85               # Minimum confidence to consider
CONSECUTIVE_THRESHOLD = 8                 # Number of consecutive matches needed
COOLDOWN_TIME = 0.5                       # Seconds between letter acceptance

# State variables
last_letter_time = time.time()
current_word = []
full_sentence = []
last_prediction = None
consecutive_count = 0

# Special gestures
GESTURE_CLEAR = "C"
GESTURE_SPACE = "space"
GESTURE_BACKSPACE = "del"

def get_confidence(logits):
    probabilities = torch.nn.functional.softmax(logits, dim=-1)
    return torch.max(probabilities).item()

def process_prediction(prediction, confidence):
    """Process prediction with confidence check and gesture mapping"""
    if confidence < CONFIDENCE_THRESHOLD:
        return "uncertain"
    
    prediction = prediction.lower()
    if prediction == "space":
        return GESTURE_SPACE
    if prediction == "del":
        return GESTURE_BACKSPACE
    if prediction == "nothing":
        return "nothing"
    return prediction.upper()

def update_transcription(prediction):
    global last_letter_time, current_word, full_sentence, consecutive_count, last_prediction
    
    current_time = time.time()
    elapsed = current_time - last_letter_time
    
    # Handle special gestures immediately
    if prediction == GESTURE_CLEAR:
        full_sentence = []
        current_word = []
        consecutive_count = 0
        last_letter_time = current_time
        return
    
    if prediction == GESTURE_BACKSPACE:
        if current_word:
            current_word.pop()
        elif full_sentence:
            full_sentence.pop()
        consecutive_count = 0
        last_letter_time = current_time
        return
    
    # Handle normal letter prediction
    if prediction == last_prediction:
        consecutive_count += 1
    else:
        consecutive_count = 0
        last_prediction = prediction
    
    # Only accept prediction if we have enough consecutive matches
    if consecutive_count >= CONSECUTIVE_THRESHOLD and elapsed > COOLDOWN_TIME:
        if prediction == GESTURE_SPACE:
            if current_word:
                full_sentence.append(''.join(current_word))
                current_word = []
        elif prediction != "nothing" and prediction != "uncertain":
            current_word.append(prediction)
        
        # Reset counters
        consecutive_count = 0
        last_letter_time = current_time

def get_display_text():
    display_text = ' '.join(full_sentence)
    if current_word:
        display_text += ' ' + ''.join(current_word) if display_text else ''.join(current_word)
    return display_text

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    height, width = frame.shape[:2]
    
    # Region of Interest
    roi_size = 300
    roi_x = width//2 - roi_size//2
    roi_y = height//2 - roi_size//2
    roi = frame[roi_y:roi_y+roi_size, roi_x:roi_x+roi_size]

    try:
        # Process frame
        inputs = processor(images=cv2.cvtColor(roi, cv2.COLOR_BGR2RGB), return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)
        
        # Get prediction and confidence
        prediction_idx = outputs.logits.argmax(-1).item()
        prediction = class_labels[prediction_idx]
        confidence = get_confidence(outputs.logits)
        
        # Process prediction
        processed_pred = process_prediction(prediction, confidence)
        update_transcription(processed_pred)

        # Display
        cv2.rectangle(frame, (roi_x, roi_y), (roi_x+roi_size, roi_y+roi_size), 
                     (0, 165, 255) if processed_pred == "uncertain" else (0, 255, 0), 2)
        
        # Show transcription
        display_text = get_display_text()
        text_size = cv2.getTextSize(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
        text_x = (width - text_size[0]) // 2
        cv2.putText(frame, display_text, (text_x, 40), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        
        # Show confidence and status
        status_text = f"Confidence: {confidence:.2f} | Current: {processed_pred}"
        cv2.putText(frame, status_text, (10, height-20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    except Exception as e:
        print(f"Error: {str(e)}")

    cv2.imshow('Sign Language Transcription', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print(display_text)
        break

cap.release()
cv2.destroyAllWindows()