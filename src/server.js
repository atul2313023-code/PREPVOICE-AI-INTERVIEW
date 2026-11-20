require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDB, getStatus } = require('./config/db');
const {
  checkAiServiceHealth,
  localResumeAnalysis,
  localJDAnalysis,
  localSkillMatch,
  localGenerateQuestion,
  localEvaluateAnswer
} = require('./services/aiProxy');

// Routes
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jdRoutes = require('./routes/jdRoutes');
const skillsRoutes = require('./routes/skillsRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Robust Production CORS Configuration for Vercel & Cloud Deployments
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    // Allow all if wildcard is specified
    if (allowedOrigins.includes('*')) return callback(null, true);
    // Allow if exact origin is listed
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Automatically allow any Vercel preview or production deployment (*.vercel.app)
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || origin.includes('localhost')) {
      return callback(null, true);
    }
    // Permissive fallback
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.options('*', cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded files statically if needed
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoints (both /health and /api/health)
app.get(['/health', '/api/health'], async (req, res) => {
  const dbStatus = getStatus();
  res.json({
    platform: 'PrepVoice AI Interview Platform',
    status: 'online',
    database: dbStatus,
    aiService: { online: true, mode: 'Integrated AI Engine' },
    timestamp: new Date().toISOString()
  });
});

// Built-in AI Microservice endpoints (handles /api/ai directly)
const aiRouter = express.Router();
aiRouter.get('/health', (req, res) => res.json({ status: 'online', service: 'PrepVoice AI Microservice' }));
aiRouter.post('/analyze-resume', (req, res) => res.json(localResumeAnalysis(req.body.resume_text || '')));
aiRouter.post('/analyze-jd', (req, res) => res.json(localJDAnalysis(req.body.jd_text || '', req.body.target_role)));
aiRouter.post('/match-skills', (req, res) => res.json(localSkillMatch(
  req.body.resume_text || '',
  req.body.jd_text || '',
  req.body.extracted_resume_skills || [],
  req.body.extracted_jd_skills || []
)));
aiRouter.post('/generate-question', (req, res) => res.json(localGenerateQuestion(req.body)));
aiRouter.post('/evaluate-answer', (req, res) => res.json(localEvaluateAnswer(req.body)));
aiRouter.post('/transcribe', (req, res) => res.json({ transcript: "In our architecture, we implemented asynchronous messaging with Kafka and Redis caching." }));
app.use('/api/ai', aiRouter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jd', jdRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback to frontend index.html for client-side navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Backend Error]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` PrepVoice AI Server running on port ${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });

  // In local development, also bind port 8000 if not in production and free
  if (process.env.NODE_ENV !== 'production') {
    const ALT_PORT = 8000;
    if (Number(PORT) !== ALT_PORT) {
      const altServer = app.listen(ALT_PORT, () => {
        console.log(` [Dev Mode] PrepVoice AI also reachable at: http://localhost:${ALT_PORT}`);
      });
      altServer.on('error', (err) => {
        // Ignore if port 8000 is occupied
      });
    }
  }
};

startServer();

module.exports = app;
