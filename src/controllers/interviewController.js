const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const aiProxy = require('../services/aiProxy');
const { isConnected, memoryStore } = require('../config/db');

// 1. Create New Interview Session
exports.createInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      role,
      interviewType,
      difficulty,
      totalQuestions,
      useResume,
      useJD,
      voiceEnabled,
      adaptiveEnabled
    } = req.body;

    let resumeDoc = null;
    let jdDoc = null;

    if (isConnected()) {
      if (useResume) {
        resumeDoc = await Resume.findOne({ userId, isSelected: true }) || await Resume.findOne({ userId });
      }
      if (useJD) {
        jdDoc = await JobDescription.findOne({ userId, isSelected: true }) || await JobDescription.findOne({ userId });
      }
    } else {
      if (useResume) {
        resumeDoc = memoryStore.resumes.find(r => r.userId === userId && r.isSelected) || memoryStore.resumes.find(r => r.userId === userId);
      }
      if (useJD) {
        jdDoc = memoryStore.jds.find(j => j.userId === userId && j.isSelected) || memoryStore.jds.find(j => j.userId === userId);
      }
    }

    const interviewData = {
      userId,
      role: role || (jdDoc ? jdDoc.jobRole : 'Full Stack Developer'),
      interviewType: interviewType || 'Technical Interview',
      difficulty: difficulty || 'Adaptive',
      currentDifficulty: difficulty === 'Adaptive' ? 'Intermediate' : difficulty,
      status: 'created',
      totalQuestions: totalQuestions || 5,
      currentQuestionIndex: 0,
      questions: [],
      resumeId: resumeDoc ? (resumeDoc._id || resumeDoc.id) : null,
      jdId: jdDoc ? (jdDoc._id || jdDoc.id) : null,
      voiceEnabled: voiceEnabled !== undefined ? voiceEnabled : true,
      adaptiveEnabled: adaptiveEnabled !== undefined ? adaptiveEnabled : true
    };

    let interview;
    if (isConnected()) {
      interview = await Interview.create(interviewData);
    } else {
      interview = {
        _id: 'int_' + Date.now(),
        ...interviewData,
        createdAt: new Date()
      };
      memoryStore.interviews.push(interview);
    }

    res.status(201).json({
      message: 'Interview session created.',
      interview
    });
  } catch (err) {
    console.error('Create interview error:', err);
    res.status(500).json({ message: 'Error creating interview.', error: err.message });
  }
};

// 2. Start Interview & Generate First Question
exports.startInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let interview;
    if (isConnected()) {
      interview = await Interview.findOne({ _id: id, userId });
    } else {
      interview = memoryStore.interviews.find(i => (i._id === id || i.id === id) && i.userId === userId);
    }

    if (!interview) return res.status(404).json({ message: 'Interview session not found.' });

    // Fetch resume/JD text context if configured
    let resumeContext = '';
    let jdContext = '';
    if (interview.resumeId) {
      const r = isConnected() ? await Resume.findById(interview.resumeId) : memoryStore.resumes.find(x => x._id === interview.resumeId);
      if (r) resumeContext = r.extractedText;
    }
    if (interview.jdId) {
      const j = isConnected() ? await JobDescription.findById(interview.jdId) : memoryStore.jds.find(x => x._id === interview.jdId);
      if (j) jdContext = j.rawText;
    }

    // Generate Question #1
    const generated = await aiProxy.generateQuestion({
      role: interview.role,
      interview_type: interview.interviewType,
      difficulty: interview.currentDifficulty,
      resume_context: resumeContext,
      jd_context: jdContext,
      question_number: 1,
      total_questions: interview.totalQuestions,
      previous_history: [],
      adaptive_mode: interview.adaptiveEnabled
    });

    const firstQuestion = {
      id: generated.question_id || ('q_' + Date.now()),
      questionText: generated.question_text,
      category: generated.category,
      difficulty: generated.difficulty,
      expectedKeyPoints: generated.expected_key_points,
      isFollowUp: generated.is_follow_up,
      followUpReason: generated.follow_up_reason,
      candidateAnswer: '',
      evaluation: null
    };

    interview.questions = [firstQuestion];
    interview.status = 'in_progress';
    interview.currentQuestionIndex = 0;

    if (isConnected()) {
      await interview.save();
    }

    res.json({
      message: 'Interview started.',
      interview,
      currentQuestion: firstQuestion
    });
  } catch (err) {
    console.error('Start interview error:', err);
    res.status(500).json({ message: 'Error starting interview.', error: err.message });
  }
};

// 3. Submit Answer & Evaluate
exports.submitAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let candidateAnswer = req.body.candidateAnswer || '';

    // If audio file was uploaded, transcribe it
    if (req.file) {
      const transcript = await aiProxy.transcribeAudio(req.file.path);
      candidateAnswer = transcript || candidateAnswer;
    }

    if (!candidateAnswer.trim()) {
      return res.status(400).json({ message: 'No answer provided. Please record audio or input text.' });
    }

    let interview;
    if (isConnected()) {
      interview = await Interview.findOne({ _id: id, userId });
    } else {
      interview = memoryStore.interviews.find(i => (i._id === id || i.id === id) && i.userId === userId);
    }

    if (!interview) return res.status(404).json({ message: 'Interview session not found.' });

    const currentQIndex = interview.currentQuestionIndex;
    const currentQuestion = interview.questions[currentQIndex];

    if (!currentQuestion) {
      return res.status(400).json({ message: 'No active question found to evaluate.' });
    }

    // Call AI Evaluation
    const evaluation = await aiProxy.evaluateAnswer({
      question: currentQuestion.questionText,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      candidate_answer: candidateAnswer,
      expected_key_points: currentQuestion.expectedKeyPoints,
      role: interview.role
    });

    // Save answer and evaluation into current question
    currentQuestion.candidateAnswer = candidateAnswer;
    currentQuestion.transcribedText = candidateAnswer;
    currentQuestion.evaluation = {
      technicalCorrectness: evaluation.technical_correctness,
      relevance: evaluation.relevance,
      completeness: evaluation.completeness,
      clarity: evaluation.clarity,
      conceptualUnderstanding: evaluation.conceptual_understanding,
      overallScore: evaluation.overall_score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      missingConcepts: evaluation.missing_concepts,
      suggestedImprovements: evaluation.suggested_improvements,
      recommendedFollowUp: evaluation.recommended_follow_up,
      suggestedNextDifficulty: evaluation.suggested_next_difficulty,
      evaluationSource: evaluation.evaluation_source
    };
    currentQuestion.answeredAt = new Date();

    // Adapt interview difficulty for next question
    if (interview.adaptiveEnabled) {
      interview.currentDifficulty = evaluation.suggested_next_difficulty;
    }

    if (isConnected()) {
      await interview.save();
    }

    const isLastQuestion = currentQIndex + 1 >= interview.totalQuestions;

    res.json({
      message: 'Answer evaluated successfully.',
      evaluation: currentQuestion.evaluation,
      transcribedText: candidateAnswer,
      isLastQuestion,
      currentQuestionIndex: currentQIndex,
      nextDifficulty: interview.currentDifficulty
    });
  } catch (err) {
    console.error('Submit answer error:', err);
    res.status(500).json({ message: 'Error evaluating candidate answer.', error: err.message });
  }
};

// 4. Get Next Question
exports.getNextQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let interview;
    if (isConnected()) {
      interview = await Interview.findOne({ _id: id, userId });
    } else {
      interview = memoryStore.interviews.find(i => (i._id === id || i.id === id) && i.userId === userId);
    }

    if (!interview) return res.status(404).json({ message: 'Interview session not found.' });

    const nextIndex = interview.currentQuestionIndex + 1;
    if (nextIndex >= interview.totalQuestions) {
      return res.status(400).json({ message: 'Interview has reached the maximum number of questions.' });
    }

    // Build history context from previous Q&As
    const history = interview.questions.map(q => ({
      question: q.questionText,
      answer: q.candidateAnswer,
      score: q.evaluation ? q.evaluation.overallScore : 5.0,
      difficulty: q.difficulty
    }));

    // Generate Question #nextIndex + 1
    const generated = await aiProxy.generateQuestion({
      role: interview.role,
      interview_type: interview.interviewType,
      difficulty: interview.currentDifficulty,
      question_number: nextIndex + 1,
      total_questions: interview.totalQuestions,
      previous_history: history,
      adaptive_mode: interview.adaptiveEnabled
    });

    const nextQ = {
      id: generated.question_id || ('q_' + Date.now()),
      questionText: generated.question_text,
      category: generated.category,
      difficulty: generated.difficulty,
      expectedKeyPoints: generated.expected_key_points,
      isFollowUp: generated.is_follow_up,
      followUpReason: generated.follow_up_reason,
      candidateAnswer: '',
      evaluation: null
    };

    interview.questions.push(nextQ);
    interview.currentQuestionIndex = nextIndex;

    if (isConnected()) {
      await interview.save();
    }

    res.json({
      message: 'Next question generated.',
      currentQuestion: nextQ,
      currentQuestionIndex: nextIndex,
      totalQuestions: interview.totalQuestions
    });
  } catch (err) {
    console.error('Next question error:', err);
    res.status(500).json({ message: 'Error generating next question.', error: err.message });
  }
};

// 5. End Interview & Generate Comprehensive Report
exports.endInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { durationSeconds } = req.body;

    let interview;
    if (isConnected()) {
      interview = await Interview.findOne({ _id: id, userId });
    } else {
      interview = memoryStore.interviews.find(i => (i._id === id || i.id === id) && i.userId === userId);
    }

    if (!interview) return res.status(404).json({ message: 'Interview session not found.' });

    // Aggregate question scores
    const evaluatedQuestions = interview.questions.filter(q => q.evaluation);
    const count = evaluatedQuestions.length || 1;

    let sumTech = 0, sumRel = 0, sumComp = 0, sumClar = 0, sumConcept = 0, sumOverall = 0;
    const allStrengths = new Set();
    const allWeaknesses = new Set();
    const allMissing = new Set();

    evaluatedQuestions.forEach(q => {
      const ev = q.evaluation;
      sumTech += ev.technicalCorrectness || 6.0;
      sumRel += ev.relevance || 6.0;
      sumComp += ev.completeness || 6.0;
      sumClar += ev.clarity || 6.0;
      sumConcept += ev.conceptualUnderstanding || 6.0;
      sumOverall += ev.overallScore || 6.0;

      if (ev.strengths) ev.strengths.forEach(s => allStrengths.add(s));
      if (ev.weaknesses) ev.weaknesses.forEach(w => allWeaknesses.add(w));
      if (ev.missingConcepts) ev.missingConcepts.forEach(m => allMissing.add(m));
    });

    const avgTech = Number((sumTech / count).toFixed(1));
    const avgRel = Number((sumRel / count).toFixed(1));
    const avgComp = Number((sumComp / count).toFixed(1));
    const avgClar = Number((sumClar / count).toFixed(1));
    const avgConcept = Number((sumConcept / count).toFixed(1));
    const avgOverall = Number((sumOverall / count).toFixed(1));

    const finalReport = {
      overallScore: avgOverall,
      technicalKnowledgeScore: avgTech,
      communicationScore: avgClar,
      relevanceScore: avgRel,
      completenessScore: avgComp,
      conceptualUnderstandingScore: avgConcept,
      strengths: Array.from(allStrengths).slice(0, 5),
      weaknesses: Array.from(allWeaknesses).slice(0, 5),
      missingConcepts: Array.from(allMissing).slice(0, 6),
      areasForImprovement: [
        "Include quantitative system metrics (e.g. latency, throughput, scale bounds).",
        "Structure multi-part answers using STAR or Component-Operation-Tradeoff frameworks.",
        "Deepen familiarity with edge cases, failure recovery, and caching invalidations."
      ],
      recommendations: [
        `Dedicate 1 hour daily to practice deep-dive technical questions for ${interview.role}.`,
        "Rehearse verbal answers aloud to reduce filler words and sharpen crisp architectural summaries.",
        "Review missing concepts identified in your question breakdown before upcoming live rounds."
      ],
      summary: `Completed ${count} question(s) for ${interview.role} (${interview.interviewType}). Achieved an overall performance rating of ${avgOverall}/10 with strong verbal clarity (${avgClar}/10) and technical grounding (${avgTech}/10).`,
      aiAssessment: avgOverall >= 7.5
        ? "Excellent technical interview readiness. The candidate exhibits strong conceptual mastery, sound logical articulation, and responds adaptively to advanced architectural escalations."
        : avgOverall >= 5.5
        ? "Good foundational competency with solid potential. Recommended to focus on concrete production implementation examples and deeper edge-case analysis."
        : "Foundational stage. Recommend reviewing core data structures, system design principles, and rehearsing common viva questions."
    };

    interview.status = 'completed';
    interview.overallScore = avgOverall;
    interview.durationSeconds = durationSeconds || interview.durationSeconds || (count * 90);
    interview.finalReport = finalReport;
    interview.completedAt = new Date();

    if (isConnected()) {
      await interview.save();
    }

    res.json({
      message: 'Interview concluded successfully. Final report ready.',
      interview,
      report: finalReport
    });
  } catch (err) {
    console.error('End interview error:', err);
    res.status(500).json({ message: 'Error ending interview.', error: err.message });
  }
};

// 6. Get Single Interview
exports.getInterviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let interview;
    if (isConnected()) {
      interview = await Interview.findOne({ _id: id, userId });
    } else {
      interview = memoryStore.interviews.find(i => (i._id === id || i.id === id) && i.userId === userId);
    }

    if (!interview) return res.status(404).json({ message: 'Interview session not found.' });
    res.json(interview);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching interview.', error: err.message });
  }
};

// 7. Get All User Interviews (History)
exports.getInterviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const { role, interviewType } = req.query;

    let interviews;
    if (isConnected()) {
      const filter = { userId };
      if (role) filter.role = role;
      if (interviewType) filter.interviewType = interviewType;
      interviews = await Interview.find(filter).sort({ createdAt: -1 });
    } else {
      interviews = memoryStore.interviews.filter(i => {
        let match = i.userId === userId;
        if (role && i.role !== role) match = false;
        if (interviewType && i.interviewType !== interviewType) match = false;
        return match;
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json(interviews);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving interview history.', error: err.message });
  }
};
