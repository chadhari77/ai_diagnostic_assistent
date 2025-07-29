from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
import numpy as np
from bayesian_network import BayesianDiagnosticNetwork
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize the Bayesian Network
bayesian_net = BayesianDiagnosticNetwork()

# Initialize LangChain with Groq
llm = ChatGroq(
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama3-70b-8192",
    temperature=0.3,
    max_tokens=1000
)

# Create diagnostic prompt template
diagnostic_prompt = PromptTemplate(
    input_variables=["symptoms", "bayesian_results", "patient_info"],
    template="""
    You are an AI diagnostic assistant. Based on the following information, provide a comprehensive medical analysis:

    Patient Information: {patient_info}
    Reported Symptoms: {symptoms}
    Bayesian Network Analysis: {bayesian_results}

    Please provide:
    1. A summary of the most likely conditions based on the symptoms
    2. Confidence levels for each potential diagnosis
    3. Recommended next steps or additional tests
    4. Important disclaimers about seeking professional medical advice

    Remember to be thorough but emphasize that this is for educational purposes only and not a replacement for professional medical consultation.
    """
)

# Create the diagnostic chain
diagnostic_chain = LLMChain(llm=llm, prompt=diagnostic_prompt)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/diagnose', methods=['POST'])
def diagnose():
    try:
        data = request.json
        symptoms = data.get('symptoms', [])
        patient_info = data.get('patient_info', {})
        
        # Convert symptoms to evidence for Bayesian network
        evidence = {}
        symptom_mapping = {
            'fever': 'fever',
            'cough': 'cough', 
            'headache': 'headache',
            'fatigue': 'fatigue',
            'sore_throat': 'sore_throat',
            'shortness_of_breath': 'shortness_of_breath',
            'chest_pain': 'chest_pain',
            'nausea': 'nausea'
        }
        
        for symptom in symptoms:
            if symptom in symptom_mapping:
                evidence[symptom_mapping[symptom]] = True
        
        # Get Bayesian network predictions
        bayesian_results = bayesian_net.predict_diseases(evidence)
        
        # Format results for LangChain
        formatted_results = {}
        for disease, probability in bayesian_results.items():
            formatted_results[disease] = f"{probability:.2%}"
        
        # Generate AI analysis using LangChain
        ai_analysis = diagnostic_chain.run(
            symptoms=", ".join(symptoms),
            bayesian_results=json.dumps(formatted_results, indent=2),
            patient_info=json.dumps(patient_info, indent=2)
        )
        
        return jsonify({
            'success': True,
            'bayesian_results': formatted_results,
            'ai_analysis': ai_analysis,
            'recommendations': extract_recommendations(ai_analysis)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def extract_recommendations(analysis):
    """Extract key recommendations from AI analysis"""
    lines = analysis.split('\n')
    recommendations = []
    
    in_recommendations = False
    for line in lines:
        line = line.strip()
        if 'recommended' in line.lower() or 'next steps' in line.lower():
            in_recommendations = True
            continue
        if in_recommendations and line:
            if line.startswith(('1.', '2.', '3.', '-', '•')):
                recommendations.append(line)
            elif not line[0].isdigit() and len(recommendations) > 0:
                break
    
    return recommendations[:3]  # Return top 3 recommendations

@app.route('/api/symptoms')
def get_symptoms():
    """Return available symptoms for the frontend"""
    symptoms = [
        {'id': 'fever', 'name': 'Fever', 'category': 'general'},
        {'id': 'cough', 'name': 'Cough', 'category': 'respiratory'},
        {'id': 'headache', 'name': 'Headache', 'category': 'neurological'},
        {'id': 'fatigue', 'name': 'Fatigue', 'category': 'general'},
        {'id': 'sore_throat', 'name': 'Sore Throat', 'category': 'respiratory'},
        {'id': 'shortness_of_breath', 'name': 'Shortness of Breath', 'category': 'respiratory'},
        {'id': 'chest_pain', 'name': 'Chest Pain', 'category': 'cardiovascular'},
        {'id': 'nausea', 'name': 'Nausea', 'category': 'gastrointestinal'}
    ]
    return jsonify(symptoms)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)