const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  questionText: { type: String, required: true },
  category: { type: String, default: 'Technical' },
  difficulty: { type: String, default: 'Intermediate' },
  expectedKeyPoints: [{ type: String }],
  isFollowUp: { type: Boolean, default: false },
  followUpReason: { type: String },
  candidateAnswer: { type: String, default: '' },
  transcribedText: { type: String, default: '' },
  audioUrl: { type: String },
  evaluation: {
    technicalCorrectness: { type: Number, min: 0, max: 10 },
    relevance: { type: Number, min: 0, max: 10 },
    completeness: { type: Number, min: 0, max: 10 },
    clarity: { type: Number, min: 0, max: 10 },
    conceptualUnderstanding: { type: Number, min: 0, max: 10 },
    overallScore: { type: Number, min: 0, max: 10 },
    strengths: [String],
    weaknesses: [String],
    missingConcepts: [String],
    suggestedImprovements: [String],
    recommendedFollowUp: String,
    suggestedNextDifficulty: String,
    evaluationSource: String
  },
  answeredAt: { type: Date }
});

const InterviewSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  role: { type: String, required: true },
  interviewType: { type: String, default: 'Technical Interview' },
  difficulty: { type: String, default: 'Adaptive' },
  currentDifficulty: { type: String, default: 'Intermediate' },
  status: { 
    type: String, 
    enum: ['created', 'in_progress', 'completed', 'abandoned'],
    default: 'created' 
  },
  totalQuestions: { type: Number, default: 5 },
  currentQuestionIndex: { type: Number, default: 0 },
  questions: [QuestionSchema],
  resumeId: { type: String },
  jdId: { type: String },
  voiceEnabled: { type: Boolean, default: true },
  adaptiveEnabled: { type: Boolean, default: true },
  overallScore: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  finalReport: {
    overallScore: Number,
    technicalKnowledgeScore: Number,
    communicationScore: Number,
    relevanceScore: Number,
    completenessScore: Number,
    conceptualUnderstandingScore: Number,
    strengths: [String],
    weaknesses: [String],
    missingConcepts: [String],
    areasForImprovement: [String],
    recommendations: [String],
    summary: String,
    aiAssessment: String
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.models.Interview || mongoose.model('Interview', InterviewSchema);
