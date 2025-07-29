import numpy as np
from itertools import product

class BayesianDiagnosticNetwork:
    def __init__(self):
        # Define diseases
        self.diseases = ['flu', 'cold', 'covid19', 'pneumonia', 'migraine', 'healthy']
        
        # Define symptoms
        self.symptoms = ['fever', 'cough', 'headache', 'fatigue', 'sore_throat', 
                        'shortness_of_breath', 'chest_pain', 'nausea']
        
        # Prior probabilities for diseases (base rates in population)
        self.disease_priors = {
            'flu': 0.05,
            'cold': 0.15,
            'covid19': 0.03,
            'pneumonia': 0.01,
            'migraine': 0.08,
            'healthy': 0.68
        }
        
        # Conditional probabilities P(symptom | disease)
        self.symptom_given_disease = {
            'flu': {
                'fever': 0.9, 'cough': 0.7, 'headache': 0.6, 'fatigue': 0.8,
                'sore_throat': 0.5, 'shortness_of_breath': 0.2, 'chest_pain': 0.1, 'nausea': 0.3
            },
            'cold': {
                'fever': 0.3, 'cough': 0.8, 'headache': 0.4, 'fatigue': 0.5,
                'sore_throat': 0.7, 'shortness_of_breath': 0.1, 'chest_pain': 0.05, 'nausea': 0.1
            },
            'covid19': {
                'fever': 0.85, 'cough': 0.75, 'headache': 0.65, 'fatigue': 0.8,
                'sore_throat': 0.4, 'shortness_of_breath': 0.6, 'chest_pain': 0.3, 'nausea': 0.2
            },
            'pneumonia': {
                'fever': 0.85, 'cough': 0.9, 'headache': 0.3, 'fatigue': 0.7,
                'sore_throat': 0.2, 'shortness_of_breath': 0.8, 'chest_pain': 0.6, 'nausea': 0.2
            },
            'migraine': {
                'fever': 0.1, 'cough': 0.05, 'headache': 0.95, 'fatigue': 0.6,
                'sore_throat': 0.05, 'shortness_of_breath': 0.1, 'chest_pain': 0.1, 'nausea': 0.7
            },
            'healthy': {
                'fever': 0.02, 'cough': 0.05, 'headache': 0.1, 'fatigue': 0.15,
                'sore_throat': 0.03, 'shortness_of_breath': 0.02, 'chest_pain': 0.01, 'nausea': 0.05
            }
        }
    
    def calculate_likelihood(self, disease, evidence):
        """Calculate P(evidence | disease)"""
        likelihood = 1.0
        
        for symptom in self.symptoms:
            if symptom in evidence:
                # Symptom is present
                prob = self.symptom_given_disease[disease][symptom]
            else:
                # Symptom is absent
                prob = 1 - self.symptom_given_disease[disease][symptom]
            
            likelihood *= prob
        
        return likelihood
    
    def predict_diseases(self, evidence):
        """
        Predict disease probabilities given observed symptoms using Bayes' theorem
        evidence: dict of symptoms that are present (e.g., {'fever': True, 'cough': True})
        """
        posteriors = {}
        
        # Calculate posterior for each disease
        for disease in self.diseases:
            # P(disease | evidence) ∝ P(evidence | disease) * P(disease)
            likelihood = self.calculate_likelihood(disease, evidence)
            prior = self.disease_priors[disease]
            posteriors[disease] = likelihood * prior
        
        # Normalize to get probabilities
        total = sum(posteriors.values())
        if total > 0:
            for disease in posteriors:
                posteriors[disease] /= total
        
        # Sort by probability (highest first)
        sorted_diseases = dict(sorted(posteriors.items(), key=lambda x: x[1], reverse=True))
        
        return sorted_diseases
    
    def get_disease_info(self, disease):
        """Get detailed information about a specific disease"""
        disease_info = {
            'flu': {
                'name': 'Influenza',
                'description': 'A viral respiratory illness that can cause mild to severe illness.',
                'typical_symptoms': ['fever', 'cough', 'headache', 'fatigue', 'sore_throat'],
                'severity': 'Moderate',
                'contagious': True
            },
            'cold': {
                'name': 'Common Cold',
                'description': 'A mild viral infection of the upper respiratory tract.',
                'typical_symptoms': ['cough', 'sore_throat', 'fatigue'],
                'severity': 'Mild',
                'contagious': True
            },
            'covid19': {
                'name': 'COVID-19',
                'description': 'A respiratory illness caused by the SARS-CoV-2 virus.',
                'typical_symptoms': ['fever', 'cough', 'shortness_of_breath', 'fatigue'],
                'severity': 'Mild to Severe',
                'contagious': True
            },
            'pneumonia': {
                'name': 'Pneumonia',
                'description': 'An infection that inflames air sacs in one or both lungs.',
                'typical_symptoms': ['fever', 'cough', 'shortness_of_breath', 'chest_pain'],
                'severity': 'Moderate to Severe',
                'contagious': False
            },
            'migraine': {
                'name': 'Migraine',
                'description': 'A type of headache disorder characterized by recurring headaches.',
                'typical_symptoms': ['headache', 'nausea', 'fatigue'],
                'severity': 'Moderate',
                'contagious': False
            },
            'healthy': {
                'name': 'Healthy',
                'description': 'No significant illness detected based on symptoms.',
                'typical_symptoms': [],
                'severity': 'None',
                'contagious': False
            }
        }
        
        return disease_info.get(disease, {})
    
    def explain_reasoning(self, evidence, top_disease):
        """Provide explanation for the diagnosis"""
        disease_info = self.get_disease_info(top_disease)
        
        explanation = {
            'disease': disease_info['name'],
            'probability': self.predict_diseases(evidence)[top_disease],
            'reasoning': f"Based on the symptoms provided, {disease_info['name']} has the highest probability.",
            'matching_symptoms': [],
            'severity': disease_info['severity'],
            'contagious': disease_info['contagious']
        }
        
        # Find matching symptoms
        for symptom in evidence:
            if symptom in disease_info['typical_symptoms']:
                explanation['matching_symptoms'].append(symptom)
        
        return explanation