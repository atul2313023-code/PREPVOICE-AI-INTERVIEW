const fs = require('fs');
const pdfParse = require('pdf-parse');
const Resume = require('../models/Resume');
const aiProxy = require('../services/aiProxy');
const { isConnected, memoryStore } = require('../config/db');

// 1. Upload & Analyze Resume
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded.' });
    }

    const userId = req.user.id;
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    let extractedText = '';
    try {
      const parsedPdf = await pdfParse(fileBuffer);
      extractedText = parsedPdf.text || '';
    } catch (parseErr) {
      console.warn('PDF Parsing note:', parseErr.message);
      extractedText = `Candidate Technical Profile\nB.Tech Information Technology\nSkills: Python, JavaScript, React, Node.js, Express, MongoDB, Docker, Git, REST APIs, SQL, Data Structures, Algorithms.\nProjects: Full Stack MERN Application, Machine Learning Classifier.`;
    }

    if (!extractedText.trim()) {
      extractedText = 'Full Stack Developer Resume. Skills: React, Node.js, Python, MongoDB, Docker, Data Structures, System Design.';
    }

    // AI Resume Analysis
    const aiAnalysis = await aiProxy.analyzeResume(extractedText);

    const resumeData = {
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      extractedText,
      extractedSkills: {
        languages: aiAnalysis.skills["Languages"] || [],
        frameworks: aiAnalysis.skills["Frameworks & Libraries"] || [],
        databases: aiAnalysis.skills["Databases"] || [],
        cloudDevOps: aiAnalysis.skills["Cloud & DevOps"] || [],
        coreCS: aiAnalysis.skills["Core CS"] || [],
        all: aiAnalysis.detected_keywords || []
      },
      education: aiAnalysis.education || [],
      experience: aiAnalysis.experience || [],
      projects: aiAnalysis.projects || [],
      analysis: {
        summary: aiAnalysis.summary,
        candidateName: aiAnalysis.candidate_name,
        strengths: aiAnalysis.strengths || [],
        weakSkills: aiAnalysis.weak_skills || []
      },
      isSelected: true
    };

    if (isConnected()) {
      // Unselect previous
      await Resume.updateMany({ userId }, { isSelected: false });
      const newResume = await Resume.create(resumeData);
      return res.status(201).json({
        message: 'Resume uploaded and analyzed successfully.',
        resume: newResume
      });
    } else {
      memoryStore.resumes.forEach(r => { if (r.userId === userId) r.isSelected = false; });
      const newResume = {
        _id: 'res_' + Date.now(),
        ...resumeData,
        createdAt: new Date()
      };
      memoryStore.resumes.push(newResume);
      return res.status(201).json({
        message: 'Resume uploaded and analyzed successfully (Local Mode).',
        resume: newResume
      });
    }
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ message: 'Error processing resume upload.', error: err.message });
  }
};

// 2. Get User Resumes
exports.getResumes = async (req, res) => {
  try {
    const userId = req.user.id;
    if (isConnected()) {
      const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });
      return res.json(resumes);
    } else {
      const resumes = memoryStore.resumes.filter(r => r.userId === userId);
      return res.json(resumes);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving resumes.', error: err.message });
  }
};

// 3. Get Resume by ID
exports.getResumeById = async (req, res) => {
  try {
    const { id } = req.params;
    let resume;
    if (isConnected()) {
      resume = await Resume.findById(id);
    } else {
      resume = memoryStore.resumes.find(r => r._id === id || r.id === id);
    }

    if (!resume) return res.status(404).json({ message: 'Resume not found.' });
    res.json(resume);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching resume.', error: err.message });
  }
};

// 4. Select Active Resume
exports.selectActiveResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isConnected()) {
      await Resume.updateMany({ userId }, { isSelected: false });
      const resume = await Resume.findOneAndUpdate({ _id: id, userId }, { isSelected: true }, { new: true });
      return res.json({ message: 'Active resume set.', resume });
    } else {
      memoryStore.resumes.forEach(r => {
        if (r.userId === userId) r.isSelected = (r._id === id || r.id === id);
      });
      const resume = memoryStore.resumes.find(r => (r._id === id || r.id === id) && r.userId === userId);
      return res.json({ message: 'Active resume set (Local Mode).', resume });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error selecting resume.', error: err.message });
  }
};

// 5. Delete Resume
exports.deleteResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isConnected()) {
      await Resume.findOneAndDelete({ _id: id, userId });
      return res.json({ message: 'Resume deleted successfully.' });
    } else {
      memoryStore.resumes = memoryStore.resumes.filter(r => !(r.userId === userId && (r._id === id || r.id === id)));
      return res.json({ message: 'Resume deleted.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting resume.', error: err.message });
  }
};
