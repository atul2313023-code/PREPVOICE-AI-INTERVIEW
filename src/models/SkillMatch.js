const mongoose = require('mongoose');

const SkillMatchSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  resumeId: { type: String, required: true },
  jdId: { type: String, required: true },
  matchPercentage: { type: Number, required: true },
  cosineSimilarityScore: { type: Number, default: 0 },
  matchedSkills: [{ type: String }],
  partiallyMatchedSkills: [{ type: String }],
  missingSkills: [{ type: String }],
  topicsToPrepare: [{ type: String }],
  recommendedLearning: [{
    skill: String,
    priority: String,
    action: String
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SkillMatch || mongoose.model('SkillMatch', SkillMatchSchema);
