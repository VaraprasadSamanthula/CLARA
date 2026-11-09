"""Test chatbot endpoint with various natural language questions."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_chatbot():
    """Test the AI chatbot endpoint with different types of questions."""
    
    print("\n" + "="*80)
    print("CLARA CHATBOT FEATURE TEST")
    print("="*80)
    
    # Test different question types
    test_questions = [
        "What medications is Alice Smith currently on?",
        "Tell me about the patient's medical history.",
        "What are the recent lab results?",
        "What encounters has the patient had?",
        "Summarize this patient's condition.",
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n--- Question {i} ---")
        print(f"Doctor asks: {question}")
        
        response = client.post(
            '/api/patients/PAT001/chat',
            json={'message': question}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"\nAI Response (mode: {data['mode']}):")
        print(f"{data['response']}")
        
        # Verify response is not empty
        assert len(data['response']) > 0, "Response is empty"
        assert 'mode' in data, "Mode missing from response"
        assert data['mode'] in ['local_llm', 'template'], f"Unknown mode: {data['mode']}"
    
    print("\n" + "="*80)
    print("✅ All chatbot tests passed!")
    print("="*80)
    
    # Test with different patient
    print("\nTesting with different patient (PAT002)...")
    response = client.post(
        '/api/patients/PAT002/chat',
        json={'message': 'What is this patient\'s current status?'}
    )
    assert response.status_code == 200
    print(f"✅ PAT002 chat works: {response.json()['response'][:50]}...")
    
    # Test error handling
    print("\nTesting error handling...")
    response = client.post(
        '/api/patients/PAT999/chat',
        json={'message': 'Who is this patient?'}
    )
    assert response.status_code == 404, "Should return 404 for non-existent patient"
    print("✅ Error handling works (404 for non-existent patient)")
    
    response = client.post(
        '/api/patients/PAT001/chat',
        json={'message': ''}
    )
    assert response.status_code == 400, "Should return 400 for empty message"
    print("✅ Error handling works (400 for empty message)")
    
    print("\n" + "="*80)
    print("🎉 CHATBOT FEATURE READY FOR DEMO")
    print("="*80)
    print("\nFeatures demonstrated:")
    print("  • Natural language questions about patient medications")
    print("  • Medical history queries")
    print("  • Lab results queries")
    print("  • Encounter history queries")
    print("  • Condition summaries")
    print("  • Multiple patient support")
    print("  • Error handling for invalid inputs")
    print("\nLLM Mode: Template-based (Ollama falls back to template when not available)")
    print("="*80 + "\n")

if __name__ == '__main__':
    test_chatbot()
