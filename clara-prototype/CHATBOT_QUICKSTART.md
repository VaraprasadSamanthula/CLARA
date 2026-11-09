# Doctor Chatbot Feature - Quick Start

## What's New

The doctor dashboard now has a **"💬 Ask AI" tab** where doctors can ask natural language questions about patients. The AI responds based on the patient's complete medical history (encounters, medications, labs).

## How to Use (Quick Test)

### 1. Start Backend
```bash
cd clara-prototype/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend (Python HTTP Server)
```bash
cd clara-prototype
python -m http.server 8080
```

### 3. Access Dashboard
- Open browser: `http://localhost:8080`
- Login as Doctor (demo credentials)
  - Username: `doctor`
  - Password: `demo`

### 4. Try the Chatbot
1. Click the **"💬 Ask AI"** tab
2. Select a patient from the cards (Alice Smith, Bob Johnson, or Carol Davis)
3. Type a question in the input field:
   - "What medications is the patient on?"
   - "Tell me about their medical history"
   - "What are the recent lab results?"
   - "Summarize this patient's condition"
4. Press **Enter** or click **Send**
5. AI responds with conversational answer based on patient's complete record

## Example Responses

**Question**: "What medications is the patient on?"  
**Response**: "Alice Smith is currently on: Aspirin (81 mg once daily); Metformin (500 mg twice daily); Lisinopril (10 mg once daily)."

**Question**: "What's their medical history?"  
**Response**: "Alice Smith has had 5 encounters dating from 2025-10-15 to 2026-11-09. Recent encounters include clinic visits and follow-ups."

## How It Works

1. **Doctor asks a question** in the chat input
2. **Frontend sends question** to backend API
3. **Backend fetches** complete patient context:
   - Demographics (age, sex, ID)
   - All encounters with clinical summaries
   - All medications with doses and status
   - All lab results with values and reference ranges
4. **Backend calls LLM** (or uses template fallback):
   - If Ollama running: Uses Mistral LLM for sophisticated response
   - If Ollama not running: Uses template-based keyword matching
5. **AI responds** with conversational natural language answer
6. **Response displays** in chat bubble, scrolls automatically

## Features

✅ Natural language questions (not structured forms)  
✅ Complete patient context (all history, not just recent)  
✅ Conversational responses (readable summaries, not data dumps)  
✅ Works without LLM setup (template fallback)  
✅ Multiple patient support (switch between patients instantly)  
✅ Session chat history (cleared when switching patients)  
✅ Error handling (invalid patients, empty questions)  

## Enable Better LLM Responses (Optional)

For more sophisticated responses, run Ollama locally:

### Mac/Linux
```bash
# Install Ollama from ollama.com
ollama pull mistral
ollama serve
```

### Windows
1. Download Ollama from ollama.com
2. Install and run Ollama
3. In terminal:
```bash
ollama pull mistral
```

Once Ollama is running on `localhost:11434`, the chatbot automatically uses it for more sophisticated responses (mode will show "local_llm" instead of "template").

## Test Endpoint Directly

```bash
# Test with curl
curl -X POST http://localhost:8000/api/patients/PAT001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What medications is the patient on?"}'

# Run full test suite
cd backend
python test_chatbot.py
```

## Architecture

```
Doctor Dashboard
    ↓
[💬 Ask AI Tab]
    ↓
Doctor types question
    ↓
Frontend sends to API
    ↓
Backend /api/patients/{id}/chat
    ├── Fetch patient context (demographics, encounters, meds, labs)
    ├── Build comprehensive prompt
    ├── Try Ollama LLM (if available)
    └── Fallback to template matching
    ↓
Response sent to frontend
    ↓
AI message appears in chat
```

## Data Flow

1. **Doctor enters question**: "What medications is the patient on?"
2. **Frontend POST**: `/api/patients/PAT001/chat` with message
3. **Backend**:
   ```python
   # Fetch all patient data
   encounters = db.query(Encounter).filter(Encounter.patient_id == patient_id).all()
   medications = db.query(Medication).filter(Medication.patient_id == patient_id).all()
   labs = db.query(LabResult).filter(LabResult.patient_id == patient_id).all()
   
   # Build context dict with all data
   context = {
       "patient_name": "Alice Smith",
       "encounters": [...],
       "medications": [...],
       "labs": [...]
   }
   
   # Call LLM or template
   response = call_ollama_api(prompt)  # or generate_template_response()
   ```
4. **Response returned**: `{"response": "...", "mode": "template"}`
5. **Frontend displays** in chat bubble

## Common Questions

**Q: Does the AI have access to ALL patient data?**  
A: Yes! It retrieves complete history (all encounters, all medications, all labs), not just recent.

**Q: What if Ollama isn't running?**  
A: The system automatically falls back to template-based responses using keyword matching. Still conversational and useful.

**Q: Can a new doctor understand a patient instantly?**  
A: Yes! A new doctor can type "Who is this patient?" and get instant summary with all key information.

**Q: Is patient data secure?**  
A: This is demo/prototype with synthetic data. For production, implement proper auth, encryption, HIPAA compliance (see Phase 7).

**Q: Can doctors export conversations?**  
A: Not yet, but this is planned for Phase 6+. Currently chat history is session-based.

## Troubleshooting

**"Error: Failed to get response"**
- Check backend is running on port 8000
- Check CORS is enabled (it is by default)
- Check browser console for error details

**"Chat says 'Error: Patient not found'"**
- Make sure you selected a patient before sending message
- Verify patient exists in database (should be PAT001, PAT002, PAT003)

**"Response is slow (2-5 sec)"**
- If Ollama is running: It's processing with LLM (normal, faster with GPU)
- If Ollama not running: It's using template matching (should be instant)
- To check: Look at `mode` field in response

**"Can't connect to backend"**
- Ensure backend running: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Check port 8000 is not in use
- Check firewall allows localhost:8000

## Next Steps

1. **Test the chatbot** using steps above
2. **Collect doctor feedback** on usability
3. **Add Ollama** if you want LLM responses
4. **Phase 6**: Add real authentication and multi-user support
5. **Phase 7**: Security hardening and HIPAA compliance

## Implementation Details

**Backend Chat Endpoint**:
- File: `backend/app/routers/patients.py`
- Function: `chat_with_patient(patient_id, chat_request, db)`
- Endpoint: `POST /api/patients/{patient_id}/chat`

**Frontend Chat UI**:
- File: `doctor-dashboard.html`
- Tab: `💬 Ask AI`
- Functions: `handleChatSubmit()`, `displayChatMessages()`, `switchChatPatient()`

**LLM Integration**:
- File: `backend/app/services/summary.py`
- Function: `call_ollama_api(prompt, model)`
- Fallback: `generate_template_chat_response(question, context)`

---

**Status**: ✅ Ready for testing and demo  
**Tested**: All question types, multiple patients, error handling  
**Performance**: <100ms template mode, 2-5s LLM mode  
**Next Phase**: Authentication, audit logging, multi-turn conversations
