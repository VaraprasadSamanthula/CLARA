# CLARA Frontend — React + Vite + TypeScript

## Overview

React + Vite frontend for CLARA Prototype 1. Provides patient list, detail view, timeline visualization, lab trend charts, and clinical summaries with evidence references.

## Features

- ✅ Patient list with search/discovery
- ✅ Patient detail view (demographics, encounters, medications, labs)
- ✅ Full timeline with nested encounters, medications, and labs
- ✅ HbA1c trend chart using Recharts
- ✅ Summary generation with evidence references
- ✅ Synthetic data banner and non-diagnostic disclaimer
- ✅ Loading, error, and empty state handling
- ✅ Responsive CSS (mobile-friendly)

## Tech Stack

- **React** 18.2
- **Vite** 5.0 (dev server, build tool)
- **TypeScript** 5.2
- **Recharts** 2.10 (charts)
- **CSS** (no CSS-in-JS, just plain CSS)

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Dev Server

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

(Make sure backend is running on `http://localhost:8000`)

### 3. Build for Production

```bash
npm run build
```

Output in `dist/`

### 4. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.tsx               # Header with title
│   │   ├── SyntheticDataBanner.tsx   # Warning banner
│   │   ├── PatientList.tsx           # Patient list view
│   │   ├── PatientDetail.tsx         # Patient demographics, encounters, meds, labs
│   │   ├── Timeline.tsx              # Full timeline with nested data
│   │   ├── LabChart.tsx              # Recharts HbA1c trend
│   │   ├── SummaryBox.tsx            # Summary generation UI
│   │   ├── LoadingSpinner.tsx        # Loading state
│   │   ├── ErrorBox.tsx              # Error display
│   │   └── Disclaimer.tsx            # Clinical disclaimer
│   ├── hooks/
│   │   └── useLabTrend.ts            # Custom hook for lab data
│   ├── services/
│   │   └── api.ts                    # API client (typed)
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   ├── App.tsx                       # Main app component
│   ├── main.tsx                      # React entry point
│   └── index.css                     # Global styles
├── index.html                        # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env                              # API URL config
```

## API Integration

All API calls go through `src/services/api.ts`:

```typescript
// Examples
apiClient.listPatients()
apiClient.getPatientDetail(patientId)
apiClient.getTimeline(patientId)
apiClient.getLabTrend(patientId, 'HbA1c')
apiClient.generateSummary(patientId)
```

All responses are **fully typed** (TypeScript interfaces).

## CSS Styling

All styles in `src/index.css`:
- Responsive grid layout
- Card-based design
- Tables with hover effects
- Loading spinners
- Error & empty states
- Synthetic data banner
- Disclaimer boxes

No CSS framework (no Tailwind, no Bootstrap). Plain CSS for simplicity.

## Components

### PatientList
Loads and displays all patients. Click to select.

### PatientDetail
Shows patient demographics, recent encounters, active medications, recent labs (tabular).

### Timeline
Full patient history with nested encounters → medications + labs.

### LabChart
Recharts line chart for HbA1c trend. Shows reference range bands, date axis, values.

### SummaryBox
Summary generation with evidence references (encounter, lab, medication IDs).
Shows mode (template or local_llm) and safety disclaimer.

## Environment Variables

`.env`:
```
VITE_API_URL=http://localhost:8000
```

If running backend on different host, update here.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Known Limitations (Phase 3 MVP)

- No authentication/authorization
- No pagination controls (fixed limit)
- No search/filter in patient list
- No caching of API responses
- No offline support
- Chart not interactive (read-only)

## Troubleshooting

### "Cannot find module 'react'"
```bash
npm install
```

### "Failed to fetch from API"
1. Verify backend is running: `http://localhost:8000/health`
2. Check VITE_API_URL in `.env`
3. Check browser console for CORS errors

### Port 5173 already in use
```bash
npm run dev -- --port 5174
```

## Next Steps (Phase 4)

- Add Recharts chart interactivity
- Improve UI design/colors
- Add Ollama status indicator
- Add download summary as PDF
