# CLARA Deployment Guide

This guide covers deploying CLARA to Render.com (free tier) with PostgreSQL.

## Prerequisites

- GitHub account with repository containing CLARA code
- Render.com account (free)
- PostgreSQL client (for testing migrations)

## Deployment Steps

### Phase 1: Prepare Local Environment

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
cd ../frontend
npm install
```

2. Test PostgreSQL migration locally (optional):
```bash
# If you have PostgreSQL running locally:
python backend/scripts/migrate_to_postgres.py \
  --source sqlite:///./clara.db \
  --target postgresql://user:password@localhost:5432/clara_test
```

### Phase 2: Push to GitHub

1. Initialize git repository (if not already done):
```bash
git init
git add .
git commit -m "CLARA production ready - Phase 6-8 complete"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/clara.git
git push -u origin main
```

2. Verify all files are committed:
```bash
git status
```

### Phase 3: Create Render Services

1. **Create PostgreSQL database:**
   - Go to https://dashboard.render.com/
   - Click "New +"
   - Select "PostgreSQL"
   - Database name: `clara-prod`
   - Region: Choose your region
   - Plan: Free
   - Click "Create Database"
   - Copy the **Internal Database URL** (you'll need this)

2. **Create Backend Service:**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Name: `clara-backend`
   - Runtime: `Python 3`
   - Root Directory: `clara-prototype/backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Plan: Free
   - Environment Variables:
     - `ENVIRONMENT`: `production`
     - `DEBUG`: `false`
     - `DATABASE_URL`: Paste the PostgreSQL Internal URL from step 1
     - `SECRET_KEY`: Generate a strong key (or let Render auto-generate)
     - `LLM_PROVIDER`: `mock` (or `gemini`/`openai` if you have API keys)
     - `CORS_ORIGINS`: `["https://clara-frontend.onrender.com"]` (update after frontend deployed)
   - Click "Create Web Service"

3. **Run Database Migration:**
   - Once backend service is created, open terminal/SSH:
   ```bash
   # Connect to backend service and run migration
   python scripts/migrate_to_postgres.py \
     --source sqlite:///./clara.db \
     --target $DATABASE_URL
   ```
   - Or manually seed data by running the seed script

4. **Create Frontend Service:**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository
   - Name: `clara-frontend`
   - Runtime: `Node`
   - Root Directory: `clara-prototype/frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview`
   - Plan: Free
   - Environment Variables:
     - `VITE_API_URL`: Get the URL from your Backend service (e.g., `https://clara-backend.onrender.com`)
   - Click "Create Web Service"

5. **Update Backend CORS:**
   - Go back to Backend service settings
   - Update `CORS_ORIGINS` to include the frontend URL: `["https://clara-frontend.onrender.com"]`

### Phase 4: Verify Deployment

1. **Test Backend Health:**
   - Visit: `https://clara-backend.onrender.com/health`
   - Should return `{"status": "ok", ...}`

2. **Test Frontend:**
   - Visit: `https://clara-frontend.onrender.com`
   - Should load the CLARA login page

3. **Test Login:**
   - Email: `doctor@clara.local`
   - Password: `demo123`

4. **Test Patient Data:**
   - After login, should see 3 patients: Alice, Bob, Carol

5. **Test LLM Streaming:**
   - Click on a patient
   - Click "Regenerate Summary"
   - Should see streaming text response

## Troubleshooting

### Backend not starting
- Check Build Logs in Render dashboard
- Ensure `requirements.txt` is in the root backend directory
- Check that `DATABASE_URL` environment variable is set correctly

### Database connection error
- Verify PostgreSQL service is running in Render
- Check that `DATABASE_URL` is correct (use Internal Database URL from PostgreSQL service)
- Ensure backend service can reach the database (same Render environment)

### Frontend not connecting to backend
- Check `VITE_API_URL` is set correctly in frontend environment
- Verify backend is accessible from frontend URL (check CORS)
- Open browser console for CORS errors

### Data not showing after migration
- Check migration logs: `python scripts/migrate_to_postgres.py --source sqlite:///./clara.db --target $DATABASE_URL`
- Verify row counts match (should show [OK] for all tables)
- If needed, run seed script: `python app/seed.py` (after connecting to PostgreSQL)

## Post-Deployment Configuration

### Enable LLM Provider (Optional)

To use a real LLM provider instead of Mock:

1. **For Google Gemini:**
   - Get API key from https://aistudio.google.com/
   - In Render Backend settings, set:
     - `LLM_PROVIDER`: `gemini`
     - `GEMINI_API_KEY`: Your API key

2. **For OpenAI:**
   - Get API key from https://platform.openai.com/
   - In Render Backend settings, set:
     - `LLM_PROVIDER`: `openai`
     - `OPENAI_API_KEY`: Your API key

### Enable Custom Domain

1. In Render dashboard for frontend service:
   - Settings → Custom Domains
   - Add your domain (e.g., `clara.example.com`)
   - Follow DNS setup instructions

2. Update backend CORS:
   - `CORS_ORIGINS`: `["https://clara.example.com"]`

## Monitoring

- **Render Dashboard:** https://dashboard.render.com/
- **Backend Logs:** Click service → Logs tab
- **Database Connection:** PostgreSQL service → Settings

## Backup and Recovery

### Backup PostgreSQL Data

From Render dashboard:
1. PostgreSQL service → Settings
2. Automated backups are enabled by default
3. Manual backups available in the Backups tab

### Restore from Backup

1. PostgreSQL service → Backups
2. Click restore for desired backup
3. Wait for restore to complete
4. Update `DATABASE_URL` if connection details changed

## Costs

**Free Tier (as configured):**
- Backend service: $0 (free tier, sleeps after 15 min inactivity)
- Frontend service: $0 (free tier, sleeps after 15 min inactivity)
- PostgreSQL: $0 (free tier, 0.5 GB storage)

**Important:** Free tier services will spin down after 15 minutes of inactivity. The first request after spin-down takes 30+ seconds.

## Next Steps

1. Monitor the deployed application for issues
2. Configure custom domain if needed
3. Set up monitoring/alerting
4. Plan for scaling (upgrade from free tier if needed)

## Support

For issues with Render deployment, see: https://docs.render.com/
For CLARA-specific issues, refer to `backend/SETUP.md` and `frontend/README.md`
