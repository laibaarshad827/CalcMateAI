# CalcMate AI

CalcMate AI is a full-stack scientific calculator and AI math assistant combining an existing **Next.js / React / TypeScript** frontend with a **Python / Flask** backend powered by the official **Google Gen AI SDK (`google-genai`)**.

## Architecture

- **Frontend (`app/`, `components/`, `hooks/`, `lib/`)**:
  - `components/app-provider.tsx`: Central React Context managing views (`dashboard`, `standard`, `scientific`, `ai`, `history`, `settings`), calculator state, `localStorage`-persisted history/settings, and AI exchanges.
  - `lib/calculator-engine.ts`: In-browser recursive-descent evaluator for instant client-side calculations (`engine: "local"`) and expression display/normalization (`toDisplay`, `toBackendExpression`).
  - `lib/api.ts` & `hooks/use-backend-health.ts`: Centralized HTTP client (`GET /api/health`, `POST /api/calculate`, `POST /api/ai/solve`) and 30-second SWR health polling.
  - `components/calculator/*`, `components/ai/*`, `components/history/*`, `components/settings-panel.tsx`: UI components for Standard/Scientific calculator modes, AI step-by-step responses, calculation history, and backend connection settings.

- **Backend (`backend/`)**:
  - `backend/app.py`: Flask application factory with CORS restricted to configured frontend origins, 16 KB request size limit, JSON error handlers, and routes (`/api/health`, `/api/calculate`, `/api/ai/solve`).
  - `backend/config.py`: Loads `.env` configuration via `python-dotenv` (`GEMINI_API_KEY`, `GEMINI_MODEL`, `FLASK_HOST`, `FLASK_PORT`, `CORS_ORIGINS`).
  - `backend/utils/validators.py`: Input validation for JSON payloads, expressions, angle modes (`deg`/`rad`), and natural-language questions.
  - `backend/services/calculator_service.py`: Safe custom tokenizer and recursive-descent parser (no `eval()` or `exec()`) supporting arithmetic, parentheses, decimals, percentages, powers (`^` and `**`), `sqrt`/`√`, factorials (`!`), `log` (base 10), `ln`, trigonometric/inverse trigonometric functions (`deg`/`rad`), and constants (`pi`/`π`, `e`).
  - `backend/services/gemini_service.py`: Calls `google.genai.Client` with structured JSON output (`response_schema`), handles missing/invalid keys, rate limits, timeouts, and malformed output, and independently verifies calculable expressions via `calculator_service`.

## Running Locally (Windows PowerShell)

You need two PowerShell terminals: one for the **Flask backend** (`http://127.0.0.1:5000`) and one for the **Next.js frontend** (`http://localhost:3000`).

### 1. Start the Flask Backend (Terminal 1)

```powershell
cd backend

# Create and activate a Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt

# Create your local .env file from the template
Copy-Item .env.example .env
```

Open `backend\.env` and replace `YOUR_API_KEY_HERE` with your Google AI Studio API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-4-hydrogen
```

Then start Flask:

```powershell
python app.py
```

Flask will start on `http://127.0.0.1:5000`.

### 2. Start the Frontend (Terminal 2)

From the project root:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### How Both Servers Communicate

- The frontend defaults to `NEXT_PUBLIC_API_BASE_URL` or `http://localhost:5000` (editable anytime under **Settings → Backend connection**).
- `BackendStatus` polls `GET /api/health` to show whether Flask is online and whether `GEMINI_API_KEY` is configured.
- In **Settings → Calculation engine**, choose **In browser** for instant local evaluation or **Flask API** to route expressions through `POST /api/calculate`.
- The **AI Math Assistant** always sends natural-language questions to `POST /api/ai/solve`, where Flask calls Gemini server-side and keeps your API key completely private.

## Running Backend Tests

```powershell
cd backend
pytest tests/test_api.py -v
```
