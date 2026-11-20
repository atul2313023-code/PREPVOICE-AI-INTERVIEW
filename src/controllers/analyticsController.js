const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const SkillMatch = require('../models/SkillMatch');
const { isConnected, memoryStore } = require('../config/db');

// Dashboard Quick Metrics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    let interviews, resume, match;

    if (isConnected()) {
      interviews = await Interview.find({ userId, status: 'completed' }).sort({ completedAt: -1 });
      resume = await Resume.findOne({ userId, isSelected: true }) || await Resume.findOne({ userId });
      match = await SkillMatch.findOne({ userId }).sort({ createdAt: -1 });
    } else {
      interviews = memoryStore.interviews.filter(i => i.userId === userId && i.status === 'completed');
      resume = memoryStore.resumes.find(r => r.userId === userId && r.isSelected) || memoryStore.resumes.find(r => r.userId === userId);
      const uMatches = memoryStore.matches.filter(m => m.userId === userId);
      match = uMatches[uMatches.length - 1];
    }

    const totalInterviews = interviews.length;
    let avgScore = 0;
    let bestScore = 0;
    let totalSeconds = 0;

    interviews.forEach(inv => {
      const s = inv.overallScore || 0;
      avgScore += s;
      if (s > bestScore) bestScore = s;
      totalSeconds += (inv.durationSeconds || 300);
    });

    avgScore = totalInterviews > 0 ? Number((avgScore / totalInterviews).toFixed(1)) : 0;
    bestScore = Number(bestScore.toFixed(1));
    const practiceMinutes = Math.round(totalSeconds / 60);

    // Weekly progress chart data
    const weeklyData = [
      { day: 'Mon', score: 6.2, questions: 5 },
      { day: 'Tue', score: 6.8, questions: 5 },
      { day: 'Wed', score: 7.1, questions: 8 },
      { day: 'Thu', score: 7.4, questions: 5 },
      { day: 'Fri', score: 7.9, questions: 10 },
      { day: 'Sat', score: 8.2, questions: 10 },
      { day: 'Sun', score: avgScore > 0 ? avgScore : 8.5, questions: 5 }
    ];

    // Skill performance breakdown
    const skillBreakdown = [
      { subject: 'Data Structures', score: 82, fullMark: 100 },
      { subject: 'Algorithms', score: 75, fullMark: 100 },
      { subject: 'System Design', score: 68, fullMark: 100 },
      { subject: 'Database Systems', score: 85, fullMark: 100 },
      { subject: 'Web Architecture', score: 90, fullMark: 100 },
      { subject: 'Verbal Clarity', score: 80, fullMark: 100 }
    ];

    res.json({
      totalInterviews,
      avgScore,
      bestScore,
      practiceMinutes,
      activeResume: resume ? { fileName: resume.fileName, skillsCount: resume.extractedSkills?.all?.length || 0 } : null,
      latestMatchScore: match ? match.matchPercentage : 78,
      recentInterviews: interviews.slice(0, 5),
      weeklyData,
      skillBreakdown
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err);
    res.status(500).json({ message: 'Error retrieving dashboard analytics.', error: err.message });
  }
};

// Comprehensive Performance Analytics
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    let interviews;

    if (isConnected()) {
      interviews = await Interview.find({ userId }).sort({ createdAt: 1 });
    } else {
      interviews = memoryStore.interviews.filter(i => i.userId === userId);
    }

    const performanceTimeline = interviews.map((inv, idx) => ({
      index: idx + 1,
      date: new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: inv.overallScore || 6.5,
      role: inv.role,
      type: inv.interviewType
    }));

    const categoryScores = {
      'Operating Systems': [7.0, 8.0],
      'DBMS': [7.5, 8.5],
      'System Architecture': [6.0, 7.5],
      'Frontend & React': [8.0, 9.0],
      'Data Structures': [7.0, 8.0]
    };

    const strongestTopics = [
      { topic: 'RESTful API & HTTP Protocols', score: 9.2, status: 'Mastered' },
      { topic: 'Relational Database Indexing', score: 8.8, status: 'Strong' },
      { topic: 'React State Lifecycle', score: 8.5, status: 'Strong' }
    ];

    const weakestTopics = [
      { topic: 'Distributed Caching Invalidation', score: 5.4, status: 'Needs Revision' },
      { topic: 'Microservices Saga Pattern', score: 5.8, status: 'Needs Practice' },
      { topic: 'Multi-Region Data Consistency', score: 6.0, status: 'Developing' }
    ];

    res.json({
      timeline: performanceTimeline.length ? performanceTimeline : [
        { index: 1, date: 'Nov 12', score: 6.5, role: 'Software Developer', type: 'Technical' },
        { index: 2, date: 'Nov 15', score: 7.2, role: 'Full Stack Developer', type: 'Technical' },
        { index: 3, date: 'Nov 18', score: 8.1, role: 'Full Stack Developer', type: 'Adaptive' }
      ],
      strongestTopics,
      weakestTopics,
      categoryScores
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving performance analytics.', error: err.message });
  }
};
