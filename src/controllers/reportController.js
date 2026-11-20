const Interview = require('../models/Interview');
const { isConnected, memoryStore } = require('../config/db');

// Get report data by interviewId
exports.getReport = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    let interview;
    if (isConnected()) {
      interview = await Interview.findOne({ _id: interviewId, userId });
    } else {
      interview = memoryStore.interviews.find(i => (i._id === interviewId || i.id === interviewId) && i.userId === userId);
    }

    if (!interview) {
      return res.status(404).json({ message: 'Interview report not found.' });
    }

    if (interview.status !== 'completed' && !interview.finalReport) {
      return res.status(400).json({ message: 'This interview has not been completed yet.' });
    }

    res.json({
      interviewId: interview._id || interview.id,
      role: interview.role,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      completedAt: interview.completedAt || interview.createdAt,
      durationSeconds: interview.durationSeconds,
      overallScore: interview.overallScore,
      report: interview.finalReport,
      questions: interview.questions
    });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ message: 'Error retrieving report.', error: err.message });
  }
};

// Printable Report HTML View
exports.getPdfReport = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    let interview;
    if (isConnected()) {
      interview = await Interview.findOne({ _id: interviewId, userId });
    } else {
      interview = memoryStore.interviews.find(i => (i._id === interviewId || i.id === interviewId) && i.userId === userId);
    }

    if (!interview || !interview.finalReport) {
      return res.status(404).send('<h2>Interview report not found or incomplete.</h2>');
    }

    const r = interview.finalReport;
    const dateStr = new Date(interview.completedAt || interview.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>PrepVoice AI — Interview Performance Report</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; background: #fff; line-height: 1.6; }
        .header { border-bottom: 3px solid #8b5cf6; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .title { color: #4c1d95; font-size: 26px; font-weight: bold; margin: 0; }
        .meta { color: #64748b; font-size: 14px; margin-top: 6px; }
        .score-box { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
        .big-score { font-size: 48px; font-weight: bold; color: #7c3aed; margin: 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
        .card-num { font-size: 24px; font-weight: bold; color: #0f172a; margin-top: 4px; }
        .section-title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 28px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        ul { margin: 8px 0; padding-left: 20px; }
        li { margin-bottom: 6px; }
        .question-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .q-header { display: flex; justify-content: space-between; font-weight: bold; color: #334155; margin-bottom: 8px; }
        .q-ans { font-style: italic; color: #475569; background: #fff; padding: 10px; border-left: 3px solid #8b5cf6; margin: 8px 0; }
        .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">PrepVoice AI — Performance Evaluation Report</div>
          <div class="meta">Role: <b>${interview.role}</b> | Type: ${interview.interviewType} | Date: ${dateStr}</div>
        </div>
        <div style="text-align: right;">
          <span style="background: #ede9fe; color: #6d28d9; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px;">Official Assessment</span>
        </div>
      </div>

      <div class="score-box">
        <div style="font-size: 15px; color: #6b21a8; font-weight: 600;">Overall Interview Performance Rating</div>
        <div class="big-score">${r.overallScore} / 10</div>
        <div style="color: #4b5563; max-width: 650px; margin: 10px auto 0;">${r.summary}</div>
      </div>

      <div class="grid">
        <div class="card">
          <div style="font-size: 13px; color: #64748b;">Technical Grounding</div>
          <div class="card-num">${r.technicalKnowledgeScore} / 10</div>
        </div>
        <div class="card">
          <div style="font-size: 13px; color: #64748b;">Communication & Clarity</div>
          <div class="card-num">${r.communicationScore} / 10</div>
        </div>
        <div class="card">
          <div style="font-size: 13px; color: #64748b;">Conceptual Depth</div>
          <div class="card-num">${r.conceptualUnderstandingScore} / 10</div>
        </div>
      </div>

      <div class="section-title">Key Demonstrated Strengths</div>
      <ul>
        ${r.strengths.map(s => `<li>${s}</li>`).join('')}
      </ul>

      <div class="section-title">Identified Knowledge Gaps & Areas for Improvement</div>
      <ul>
        ${r.weaknesses.map(w => `<li>${w}</li>`).join('')}
      </ul>

      <div class="section-title">Recommended Preparation Roadmap</div>
      <ul>
        ${r.recommendations.map(rc => `<li>${rc}</li>`).join('')}
      </ul>

      <div class="section-title">Question-by-Question Breakdown</div>
      ${interview.questions.map((q, idx) => `
        <div class="question-card">
          <div class="q-header">
            <span>Q${idx + 1}: ${q.category} (${q.difficulty})</span>
            <span style="color: #7c3aed;">Score: ${q.evaluation ? q.evaluation.overallScore : '-'}/10</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 6px;">${q.questionText}</div>
          <div class="q-ans">"${q.candidateAnswer || 'No response recorded'}"</div>
          ${q.evaluation ? `
            <div style="font-size: 13px; color: #166534; margin-top: 6px;"><b>Feedback:</b> ${q.evaluation.strengths?.[0] || 'Good effort.'}</div>
            <div style="font-size: 13px; color: #991b1b; margin-top: 2px;"><b>Gap:</b> ${q.evaluation.missingConcepts?.join(', ') || 'None noted'}</div>
          ` : ''}
        </div>
      `).join('')}

      <div class="footer">
        Generated automatically by PrepVoice AI Interview Platform (B.Tech Major Project). Verified by AI Evaluation Core.
      </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send('Error generating PDF report view: ' + err.message);
  }
};
