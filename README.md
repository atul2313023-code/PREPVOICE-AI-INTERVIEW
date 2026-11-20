# 🎙️ PrepVoice AI — Voice AI Mock Interview Platform

An AI-powered voice mock interview platform that simulates realistic technical and HR interviews, evaluates verbal answers in real time, and dynamically adapts questions to candidate performance.

---

## 🌟 Key Features

1. **🎙️ Voice AI Interview Room**:
   - **Text-to-Speech (TTS)**: AI Interviewer speaks interview questions aloud with realistic pacing.
   - **Speech-to-Text (STT)**: Candidate answers directly through microphone with real-time audio visualizer & transcription.
   - **Multi-Track Modes**: Technical Rounds, System Design, HR & Behavioral.
   - **Adaptive Difficulty Engine**: Dynamically increases or decreases question difficulty (Beginner ➔ Intermediate ➔ Advanced) and generates intelligent follow-up questions based on answer depth.

2. **📄 Resume & Job Description (JD) Intelligence**:
   - Automatic PDF resume parsing (`pdf-parse`) and skill extraction across 5 key technical disciplines (Languages, Frameworks, Databases, Cloud & DevOps, Core Computer Science).
   - Target Job Description analysis and keyword extraction.
   - **Semantic Skill Alignment**: Calculates Cosine Similarity match percentage, identifies missing skills/knowledge gaps, and generates a personalized preparation roadmap.

3. **📊 Real-Time Multi-Dimensional Evaluation**:
   - Scores every answer across:
     - **Technical Correctness** (0-10)
     - **Relevance & Directness** (0-10)
     - **Completeness** (0-10)
     - **Verbal Clarity & Fluency** (0-10)
     - **Conceptual Depth** (0-10)
   - Real-time feedback commentary highlighting strengths, missing concepts, and suggested follow-ups.

4. **📈 Comprehensive Candidate Analytics & Reports**:
   - **Candidate Dashboard**: Tracks total sessions, practice time, average score, weekly performance trajectory, and competency radar.
   - **Official Assessment Report**: Printable evaluation summary with question-by-question breakdown, rubrics, and action items.

5. **🛡️ Resilient Dual-Mode Architecture**:
   - **Database**: Connects to MongoDB when available; seamlessly falls back to an in-memory store so the app runs out-of-the-box without requiring a local database setup.
   - **AI Engine**: Proxies to external Python microservices when connected, with local NLP and adaptive question/answer evaluation fallback engines.

---

## 🚀 Quick Start Guide

### 1. Start the Server

In your terminal, navigate to the project directory and run:

```bash
npm start
```

Or for automatic live reload during development:

```bash
npm run dev
```

The server will launch:
```
=======================================================
 PrepVoice AI Backend Server running on port 5000
 API Base: http://localhost:5000/api
 Health Check: http://localhost:5000/api/health
=======================================================
```

### 2. Open the Web Application

Open your browser and navigate to:

👉 **[http://localhost:5000](http://localhost:5000)**

*(The web interface includes automatic demo login, PDF resume upload, live voice recording, AI voice speech, and interactive evaluation).*

### 3. Run Automated End-to-End Tests

To verify all 13 core modules (Auth, Resume Parsing, JD Analysis, Semantic Matching, Mock Interview Session, Adaptive Questions, Answer Evaluation, and Dashboard Analytics):

```bash
npm test
```

---

## 📁 Project Structure

```
ai interview/
├── public/
│   └── index.html               # Modern Single-Page Application (SPA) with Voice & Charts
├── src/
│   ├── config/
│   │   └── db.js                # Dual-mode database layer (MongoDB + Mock Store)
│   ├── controllers/
│   │   ├── analyticsController.js # Dashboard metrics, weekly trend, radar metrics
│   │   ├── authController.js     # User registration, login, JWT issuance
│   │   ├── interviewController.js# Adaptive interview session lifecycle & evaluations
│   │   ├── jdController.js       # Job description analysis
│   │   ├── reportController.js   # Printable report generation & summaries
│   │   ├── resumeController.js   # PDF resume upload & parsing
│   │   └── skillsController.js   # Cosine similarity skill matching
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication middleware
│   │   └── upload.js            # Multer file upload (PDF resumes & Audio)
│   ├── models/
│   │   ├── Interview.js         # Interview session Mongoose schema
│   │   ├── JobDescription.js    # Job description Mongoose schema
│   │   ├── Resume.js            # Candidate resume Mongoose schema
│   │   ├── SkillMatch.js        # Skill match Mongoose schema
│   │   └── User.js              # Candidate user profile schema
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   ├── authRoutes.js
│   │   ├── interviewRoutes.js
│   │   ├── jdRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── resumeRoutes.js
│   │   └── skillsRoutes.js
│   ├── services/
│   │   └── aiProxy.js           # AI proxy with built-in adaptive evaluation fallbacks
│   └── server.js                # Express app entrypoint & static assets host
├── uploads/                     # Upload directory for resumes and audio files
├── .env                         # Environment configuration
├── package.json                 # Node.js project manifest & scripts
├── sample_resume.pdf            # Sample technical resume for immediate testing
└── test_integration.js          # 13-stage end-to-end integration test suite
```

---

## 🔑 Default Demo Credentials

For quick testing without creating a new user account:
- **Email**: `demo@prepvoice.ai`
- **Password**: `demo123`
*(The web interface automatically initializes with these credentials if no prior session exists).*

---

## ☁️ Live Cloud Deployment Guide

### A. Push Code to GitHub

```bash
git init
git add .
git commit -m "feat: production ready PrepVoice AI"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### B. Deploy Backend to Render (https://render.com)

1. Sign in to Render and click **New + ➔ Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `prepvoice-backend`
   - **Region**: Any (e.g. Oregon, Singapore, Frankfurt)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `prepvoice_ai_jwt_super_secret_key_production_2026`
   - `AI_SERVICE_URL`: `internal`
   - `ALLOWED_ORIGINS`: `*` (or your Vercel URL: `https://your-app.vercel.app`)
   - `MONGODB_URI`: (Optional) Your MongoDB Atlas connection string. If omitted, it will use the embedded resilient memory store.
5. Click **Deploy Web Service**. Render will assign you a live URL, e.g. `https://prepvoice-backend.onrender.com`.

### C. Deploy Frontend to Vercel (https://vercel.com)

1. Sign in to Vercel and click **Add New ➔ Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (or `public`)
   - **Output Directory**: `public` (if deploying from root)
4. Set the live Backend API URL:
   - Option 1: In `public/config.js`, set `API_URL: 'https://prepvoice-backend.onrender.com/api'` before pushing to Git.
   - Option 2: In the live deployed Vercel site, click the **"☁️ Cloud API"** pill in the top header and paste your Render URL.
5. Click **Deploy**. Vercel will give you a live frontend URL (e.g. `https://prepvoice-ai.vercel.app`).

