# VanguardIQ – Personal Finance Advisor

Demo Link : https://aistudio.google.com/u/0/apps/767db499-f3ea-4abb-9559-04676e5a5530?showAssistant=true&project=gen-lang-client-0048910358&showPreview=true

Full Document : https://1drv.ms/w/c/A4AA4BCFAE29EAB4/IQB9P91fhMLITKvXWmxNzJLNAV5vKA9NRCpy5x3KOnmB6EI?e=P9JPac

VanguardIQ is an AI-powered personal finance assistant that analyzes your income, expenses, financial goals, and savings capacity to generate:
1. **Personalized 50/30/20 & Custom Budget Plans**
2. **AI Saving Suggestions** (with projected monthly impact and priority levels)
3. **Monthly Financial Summary & Health Score**
4. **Interactive "What-If" Scenario Simulator**
5. **"Ask VanguardIQ" Conversational Financial Coach**

---

## Architecture Overview

```
Frontend (React 19 + TypeScript + Tailwind CSS + Lucide Icons + Recharts)
   │
   ├── REST API Calls (/api/financial-advice, /api/chat-advice)
   │
Backend Options:
   ├── 1. Node.js / Express Server (server.ts) with @google/genai SDK (Default in AI Studio)
   └── 2. Python Flask Server (backend/app.py) with google-genai
         │
         └── Google Gemini API (gemini-3.8-flash)
```

> **Security Note:** The `GEMINI_API_KEY` is exclusively managed in the backend server environment. It is never exposed in client-side code or browser bundles.

---

## Quick Start (Demo Mode)

VanguardIQ comes with an instant **"Try Demo"** feature on the landing page and navigation bar. Clicking it populates a realistic, pre-configured financial situation:
- Monthly Income: ₹50,000 + Other: ₹5,000 (Total ₹55,000)
- Housing: ₹15,000, Food: ₹7,000, Transportation: ₹4,000, Utilities: ₹3,000, Entertainment: ₹3,000, Shopping: ₹4,000, Healthcare: ₹2,000, Other: ₹2,000 (Total ₹40,000)
- Current Savings: ₹40,000
- Goal: "Build an emergency fund" (Target: ₹1,50,000)

If `GEMINI_API_KEY` is not yet configured, the system seamlessly uses intelligent, deterministic financial analysis models so you can demonstrate all features immediately!

---

## 1. Node / Express Full-Stack Setup (AI Studio Standard)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `GEMINI_API_KEY` is set:
```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

### Step 3: Run Full-Stack Dev Server
```bash
npm run dev
```
The application will be live at `http://localhost:3000`.

---

## 2. Python Flask Backend Setup (Optional Alternate)

If you prefer running the Python Flask API:

### Step 1: Navigate to backend & create virtual environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables
```bash
cp .env.example .env
```
Set your `GEMINI_API_KEY` in `backend/.env`.

### Step 3: Start Flask Server
```bash
python app.py
```
Flask runs on `http://localhost:5000`.

---

## Features Guide

- **Light & Dark Mode (Day & Night View)**: Seamless toggle between sleek Day view and high-contrast Night view with Tailwind CSS v4 custom variant.
- **Dynamic Currency Switcher**: Switch between INR (₹), USD ($), EUR (€), GBP (£), and more.
- **Custom Expense Tracker**: Add bespoke expense lines (e.g. Pet Care, Gadgets, Hobbies).
- **What-If Simulator**: Experiment with sliders to see how adjusting income, trimming discretionary expenses, or raising monthly savings accelerates goal completion.
- **Ask VanguardIQ**: Chat with conversational context of your real numbers to ask about spending leaks, emergency buffer math, and savings tactics.

---

## Disclaimer

VanguardIQ provides estimates and educational financial insights. It does not provide professional financial, investment, tax, or legal advice, and its recommendations do not guarantee financial outcomes.
