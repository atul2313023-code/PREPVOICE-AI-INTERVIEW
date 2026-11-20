const fs = require('fs');
const pdfParse = require('pdf-parse');
const JobDescription = require('../models/JobDescription');
const aiProxy = require('../services/aiProxy');
const { isConnected, memoryStore } = require('../config/db');

// 1. Create & Analyze JD (from text or uploaded PDF)
exports.analyzeJD = async (req, res) => {
  try {
    const userId = req.user.id;
    let jdText = req.body.jdText || '';
    const jobRole = req.body.jobRole || 'Full Stack Developer';
    const companyName = req.body.companyName || 'Target Organization';

    if (req.file) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(fileBuffer);
        jdText = parsed.text || jdText;
      } catch (e) {
        console.warn('JD PDF parse error:', e.message);
      }
    }

    if (!jdText.trim()) {
      return res.status(400).json({ message: 'Job Description text or PDF file is required.' });
    }

    // Call AI JD extraction
    const analysis = await aiProxy.analyzeJD(jdText, jobRole);

    const jdData = {
      userId,
      jobRole: analysis.job_role || jobRole,
      companyName,
      rawText: jdText,
      requiredSkills: analysis.required_skills || [],
      preferredSkills: analysis.preferred_skills || [],
      qualifications: analysis.qualifications || [],
      responsibilities: analysis.responsibilities || [],
      experienceLevel: analysis.experience_level || 'Mid-Level',
      isSelected: true
    };

    if (isConnected()) {
      await JobDescription.updateMany({ userId }, { isSelected: false });
      const newJD = await JobDescription.create(jdData);
      return res.status(201).json({ message: 'Job description analyzed and saved.', jd: newJD });
    } else {
      memoryStore.jds.forEach(j => { if (j.userId === userId) j.isSelected = false; });
      const newJD = {
        _id: 'jd_' + Date.now(),
        ...jdData,
        createdAt: new Date()
      };
      memoryStore.jds.push(newJD);
      return res.status(201).json({ message: 'Job description analyzed and saved (Local Mode).', jd: newJD });
    }
  } catch (err) {
    console.error('JD analysis error:', err);
    res.status(500).json({ message: 'Error analyzing job description.', error: err.message });
  }
};

// 2. Get All JDs
exports.getJDs = async (req, res) => {
  try {
    const userId = req.user.id;
    if (isConnected()) {
      const jds = await JobDescription.find({ userId }).sort({ createdAt: -1 });
      return res.json(jds);
    } else {
      const jds = memoryStore.jds.filter(j => j.userId === userId);
      return res.json(jds);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving job descriptions.', error: err.message });
  }
};

// 3. Get JD by ID
exports.getJDById = async (req, res) => {
  try {
    const { id } = req.params;
    let jd;
    if (isConnected()) {
      jd = await JobDescription.findById(id);
    } else {
      jd = memoryStore.jds.find(j => j._id === id || j.id === id);
    }

    if (!jd) return res.status(404).json({ message: 'Job description not found.' });
    res.json(jd);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving JD.', error: err.message });
  }
};

// 4. Select Active JD
exports.selectActiveJD = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isConnected()) {
      await JobDescription.updateMany({ userId }, { isSelected: false });
      const jd = await JobDescription.findOneAndUpdate({ _id: id, userId }, { isSelected: true }, { new: true });
      return res.json({ message: 'Active JD set.', jd });
    } else {
      memoryStore.jds.forEach(j => {
        if (j.userId === userId) j.isSelected = (j._id === id || j.id === id);
      });
      const jd = memoryStore.jds.find(j => (j._id === id || j.id === id) && j.userId === userId);
      return res.json({ message: 'Active JD set (Local Mode).', jd });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error selecting JD.', error: err.message });
  }
};

// 5. Delete JD
exports.deleteJD = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (isConnected()) {
      await JobDescription.findOneAndDelete({ _id: id, userId });
      return res.json({ message: 'Job description removed.' });
    } else {
      memoryStore.jds = memoryStore.jds.filter(j => !(j.userId === userId && (j._id === id || j.id === id)));
      return res.json({ message: 'Job description removed.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting JD.', error: err.message });
  }
};
