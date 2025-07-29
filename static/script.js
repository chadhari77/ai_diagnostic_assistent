// Global variables
let selectedSymptoms = new Set();
let availableSymptoms = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadSymptoms();
    initializeEventListeners();
});

// Load available symptoms from the API
async function loadSymptoms() {
    try {
        const response = await fetch('/api/symptoms');
        const symptoms = await response.json();
        availableSymptoms = symptoms;
        renderSymptoms(symptoms);
    } catch (error) {
        console.error('Error loading symptoms:', error);
        showError('Failed to load symptoms. Please refresh the page.');
    }
}

// Render symptoms in the grid
function renderSymptoms(symptoms) {
    const symptomsGrid = document.getElementById('symptomsGrid');
    symptomsGrid.innerHTML = '';
    
    const categories = {
        'general': { name: 'General', color: 'var(--primary-blue)' },
        'respiratory': { name: 'Respiratory', color: 'var(--primary-orange)' },
        'neurological': { name: 'Neurological', color: 'var(--primary-red)' },
        'cardiovascular': { name: 'Cardiovascular', color: 'var(--primary-green)' },
        'gastrointestinal': { name: 'Gastrointestinal', color: 'var(--primary-red)' }
    };
    
    symptoms.forEach((symptom, index) => {
        const symptomElement = document.createElement('div');
        symptomElement.className = 'symptom-item fade-in';
        symptomElement.style.animationDelay = `${index * 0.1}s`;
        symptomElement.dataset.symptomId = symptom.id;
        
        const category = categories[symptom.category];
        symptomElement.innerHTML = `
            <div class="symptom-name">${symptom.name}</div>
            <div class="symptom-category" style="color: ${category.color}; font-size: 0.8rem; margin-top: 5px;">
                ${category.name}
            </div>
        `;
        
        symptomElement.addEventListener('click', () => toggleSymptom(symptom.id, symptomElement));
        symptomsGrid.appendChild(symptomElement);
    });
}

// Toggle symptom selection
function toggleSymptom(symptomId, element) {
    if (selectedSymptoms.has(symptomId)) {
        selectedSymptoms.delete(symptomId);
        element.classList.remove('selected');
    } else {
        selectedSymptoms.add(symptomId);
        element.classList.add('selected');
    }
    
    updateAnalyzeButton();
    
    // Add selection animation
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
        element.style.transform = '';
    }, 150);
}

// Update analyze button state
function updateAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const hasSymptoms = selectedSymptoms.size > 0;
    
    analyzeBtn.disabled = !hasSymptoms;
    analyzeBtn.innerHTML = hasSymptoms 
        ? '<i class="fas fa-brain"></i> Analyze Symptoms' 
        : '<i class="fas fa-exclamation-circle"></i> Select at least one symptom';
}

// Initialize event listeners
function initializeEventListeners() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.addEventListener('click', performDiagnosis);
    
    // Add input validation for patient info
    const ageInput = document.getElementById('age');
    ageInput.addEventListener('input', validateAge);
}

// Validate age input
function validateAge(event) {
    const value = parseInt(event.target.value);
    if (value < 0) event.target.value = 0;
    if (value > 120) event.target.value = 120;
}

// Perform diagnosis
async function performDiagnosis() {
    if (selectedSymptoms.size === 0) {
        showError('Please select at least one symptom.');
        return;
    }
    
    // Show loading state
    const resultsSection = document.getElementById('resultsSection');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    resultsSection.style.display = 'block';
    loadingSpinner.style.display = 'flex';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Gather patient information
    const patientInfo = {
        age: document.getElementById('age').value || 'Not specified',
        gender: document.getElementById('gender').value || 'Not specified',
        duration: document.getElementById('duration').value || 'Not specified'
    };
    
    try {
        const response = await fetch('/api/diagnose', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                symptoms: Array.from(selectedSymptoms),
                patient_info: patientInfo
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayResults(result);
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error performing diagnosis:', error);
        showError('Failed to perform diagnosis. Please try again.');
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Display diagnosis results
function displayResults(result) {
    displayBayesianResults(result.bayesian_results);
    displayAIAnalysis(result.ai_analysis);
    displayRecommendations(result.recommendations);
    
    // Add animation to result cards
    const resultCards = document.querySelectorAll('.bayesian-results-card, .ai-analysis-card, .recommendations-card, .disclaimer-card');
    resultCards.forEach((card, index) => {
        card.classList.add('slide-in-left');
        card.style.animationDelay = `${index * 0.2}s`;
    });
}

// Display Bayesian network results
function displayBayesianResults(results) {
    const probabilityBars = document.getElementById('probabilityBars');
    probabilityBars.innerHTML = '';
    
    // Convert percentage strings to numbers for sorting
    const sortedResults = Object.entries(results).sort((a, b) => {
        const aPercent = parseFloat(a[1].replace('%', ''));
        const bPercent = parseFloat(b[1].replace('%', ''));
        return bPercent - aPercent;
    });
    
    sortedResults.forEach(([disease, probability], index) => {
        const probabilityValue = parseFloat(probability.replace('%', ''));
        const item = document.createElement('div');
        item.className = 'probability-item';
        
        // Determine fill class based on probability
        let fillClass = 'low';
        if (probabilityValue > 50) fillClass = 'high';
        else if (probabilityValue > 20) fillClass = 'medium';
        
        item.innerHTML = `
            <div class="disease-name">${formatDiseaseName(disease)}</div>
            <div class="probability-bar">
                <div class="probability-fill ${fillClass}" style="width: 0%;"></div>
            </div>
            <div class="probability-text">${probability}</div>
        `;
        
        probabilityBars.appendChild(item);
        
        // Animate the bar fill
        setTimeout(() => {
            const fill = item.querySelector('.probability-fill');
            fill.style.width = `${probabilityValue}%`;
        }, index * 200);
    });
}

// Display AI analysis
function displayAIAnalysis(analysis) {
    const analysisContent = document.getElementById('analysisContent');
    
    // Format the analysis text with proper HTML structure
    const formattedAnalysis = formatAnalysisText(analysis);
    analysisContent.innerHTML = formattedAnalysis;
}

// Display recommendations
function displayRecommendations(recommendations) {
    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';
    
    if (!recommendations || recommendations.length === 0) {
        recommendationsList.innerHTML = '<p>No specific recommendations available.</p>';
        return;
    }
    
    const icons = ['fas fa-stethoscope', 'fas fa-user-md', 'fas fa-pills', 'fas fa-heartbeat', 'fas fa-clipboard-check'];
    
    recommendations.forEach((recommendation, index) => {
        const item = document.createElement('div');
        item.className = 'recommendation-item fade-in';
        item.style.animationDelay = `${index * 0.1}s`;
        
        const iconClass = icons[index % icons.length];
        const cleanRecommendation = recommendation.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '');
        
        item.innerHTML = `
            <i class="${iconClass}"></i>
            <div class="recommendation-text">${cleanRecommendation}</div>
        `;
        
        recommendationsList.appendChild(item);
    });
}

// Format disease names for display
function formatDiseaseName(disease) {
    const diseaseNames = {
        'flu': 'Influenza',
        'cold': 'Common Cold',
        'covid19': 'COVID-19',
        'pneumonia': 'Pneumonia',
        'migraine': 'Migraine',
        'healthy': 'Healthy'
    };
    
    return diseaseNames[disease] || disease.charAt(0).toUpperCase() + disease.slice(1);
}

// Format AI analysis text
function formatAnalysisText(text) {
    if (!text) return '<p>No analysis available.</p>';
    
    // Split into paragraphs and format
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    let formattedText = '';
    
    paragraphs.forEach(paragraph => {
        const trimmed = paragraph.trim();
        if (trimmed) {
            // Check if it's a heading (contains numbers or keywords)
            if (trimmed.match(/^\d+\./) || trimmed.toLowerCase().includes('summary') || 
                trimmed.toLowerCase().includes('analysis') || trimmed.toLowerCase().includes('recommendation')) {
                formattedText += `<h4>${trimmed}</h4>`;
            } else if (trimmed.includes('•') || trimmed.includes('-')) {
                // Handle bullet points
                const items = trimmed.split(/[•-]/).filter(item => item.trim());
                formattedText += '<ul>';
                items.forEach(item => {
                    if (item.trim()) {
                        formattedText += `<li>${item.trim()}</li>`;
                    }
                });
                formattedText += '</ul>';
            } else {
                formattedText += `<p>${trimmed}</p>`;
            }
        }
    });
    
    return formattedText || '<p>Analysis completed successfully.</p>';
}

// Show error message
function showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-red);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: 500;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
        ${message}
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 300);
    }, 5000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);