const SkillMatch = require('../models/SkillMatch');
const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const aiProxy = require('../services/aiProxy');
const { isConnected, memoryStore } = require('../config/db');

// Match Resume against Job Description
exports.matchSkills = async (req, res) => {
  try {
    const userId = req.user.id;
    let { resumeId, jdId } = req.body;

    let resume, jd;

    // If IDs not explicitly passed, find the selected ones
    if (isConnected()) {
      if (resumeId) resume = await Resume.findById(resumeId);
      else resume = await Resume.findOne({ userId, isSelected: true }) || await Resume.findOne({ userId });

      if (jdId) jd = await JobDescription.findById(jdId);
      else jd = await JobDescription.findOne({ userId, isSelected: true }) || await JobDescription.findOne({ userId });
    } else {
      if (resumeId) resume = memoryStore.resumes.find(r => r._id === resumeId || r.id === resumeId);
      else resume = memoryStore.resumes.find(r => r.userId === userId && r.isSelected) || memoryStore.resumes.find(r => r.userId === userId);

      if (jdId) jd = memoryStore.jds.find(j => j._id === jdId || j.id === jdId);
      else jd = memoryStore.jds.find(j => j.userId === userId && j.isSelected) || memoryStore.jds.find(j => j.userId === userId);
    }

    if (!resume) {
      return res.status(400).json({ message: 'No resume found. Please upload or select a resume first.' });
    }
    if (!jd) {
      return res.status(400).json({ message: 'No target job description found. Please enter a JD first.' });
    }

    const resumeSkills = resume.extractedSkills ? resume.extractedSkills.all : [];
    const jdSkills = jd.requiredSkills || [];

    // Call AI Matching
    const matchResult = await aiProxy.matchSkills(
      resume.extractedText,
      jd.rawText,
      resumeSkills,
      jdSkills
    );

    const matchDocData = {
      userId,
      resumeId: resume._id || resume.id,
      jdId: jd._id || jd.id,
      matchPercentage: matchResult.match_percentage,
      cosineSimilarityScore: matchResult.cosine_similarity_score,
      matchedSkills: matchResult.matched_skills,
      partiallyMatchedSkills: matchResult.partially_matched_skills,
      missingSkills: matchResult.missing_skills,
      topicsToPrepare: matchResult.topics_to_prepare,
      recommendedLearning: matchResult.recommended_learning
    };

    let savedMatch;
    if (isConnected()) {
      savedMatch = await SkillMatch.create(matchDocData);
    } else {
      savedMatch = {
        _id: 'match_' + Date.now(),
        ...matchDocData,
        createdAt: new Date()
      };
      memoryStore.matches.push(savedMatch);
    }

    res.json({
      message: 'Semantic skill match calculated successfully.',
      match: savedMatch,
      resumeMeta: { fileName: resume.fileName, candidateName: resume.analysis?.candidateName },
      jdMeta: { jobRole: jd.jobRole, companyName: jd.companyName }
    });
  } catch (err) {
    console.error('Skill match error:', err);
    res.status(500).json({ message: 'Error calculating semantic skill match.', error: err.message });
  }
};

// Get Latest Match
exports.getLatestMatch = async (req, res) => {
  try {
    const userId = req.user.id;
    let match;
    if (isConnected()) {
      match = await SkillMatch.findOne({ userId }).sort({ createdAt: -1 });
    } else {
      const userMatches = memoryStore.matches.filter(m => m.userId === userId);
      match = userMatches[userMatches.length - 1];
    }

    res.json(match || null);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving skill match.', error: err.message });
  }
};
