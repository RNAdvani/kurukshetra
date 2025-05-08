import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

def collect_data(dataset_path):
    X = []
    y = []
    
    for gesture_name in os.listdir(dataset_path):
        gesture_path = os.path.join(dataset_path, gesture_name)
        for npz_file in os.listdir(gesture_path):
            data = np.load(os.path.join(gesture_path, npz_file))
            X.append(data['landmarks'])
            y.append(gesture_name)
    
    return np.array(X), np.array(y)

def train():
    # Path to your collected dataset
    dataset_path = "path/to/your/dataset"
    X, y = collect_data(dataset_path)
    
    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Save model
    joblib.dump(model, "sign_language_model.pkl")
    
    print(f"Training accuracy: {model.score(X_train, y_train)}")
    print(f"Test accuracy: {model.score(X_test, y_test)}")

if __name__ == "__main__":
    train()