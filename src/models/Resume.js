const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  extractedText: { type: String, default: '' },
  extractedSkills: {
    languages: [{ type: String }],
    frameworks: [{ type: String }],
    databases: [{ type: String }],
    cloudDevOps: [{ type: String }],
    coreCS: [{ type: String }],
    all: [{ type: String }]
  },
  education: [{
    degree: String,
    institution: String,
    year: String
  }],
  experience: [{
    role: String,
    company: String,
    duration: String,
    description: String
  }],
  projects: [{
    title: String,
    description: String,
    tech: String
  }],
  analysis: {
    summary: String,
    candidateName: String,
    strengths: [String],
    weakSkills: [String]
  },
  isSelected: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);
