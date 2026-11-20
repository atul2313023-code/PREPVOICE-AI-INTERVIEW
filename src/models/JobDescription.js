const mongoose = require('mongoose');

const JobDescriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  jobRole: { type: String, required: true },
  companyName: { type: String, default: 'Target Company' },
  rawText: { type: String, required: true },
  requiredSkills: [{ type: String }],
  preferredSkills: [{ type: String }],
  qualifications: [{ type: String }],
  responsibilities: [{ type: String }],
  experienceLevel: { type: String, default: 'Mid-Level' },
  isSelected: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.JobDescription || mongoose.model('JobDescription', JobDescriptionSchema);
