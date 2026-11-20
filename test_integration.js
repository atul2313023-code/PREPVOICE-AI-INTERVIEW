const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('./src/server'); // Starts the server

const BASE_URL = 'http://localhost:5000/api';

async function waitForServer(retries = 15) {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.get(`${BASE_URL}/health`);
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 600));
    }
  }
  throw new Error('Server did not start in time');
}

async function runTests() {
  console.log('--- Starting PrepVoice AI End-to-End System Integration Test ---');
  console.log('Waiting for backend server to be ready on port 5000...');
  await waitForServer();

  // 1. Health check
  console.log('1. Testing /api/health...');
  const healthRes = await axios.get(`${BASE_URL}/health`);
  console.log('   Status:', healthRes.data.status);
  console.log('   Database Mode:', healthRes.data.database.mode);

  // 2. Authentication: Register a test user
  const testEmail = `candidate_${Date.now()}@prepvoice.ai`;
  console.log('2. Testing /api/auth/register with', testEmail);
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Alex Sharma',
    email: testEmail,
    password: 'Password123!',
    targetRole: 'Full Stack Developer'
  });
  console.log('   Register response:', regRes.data.message);
  const token = regRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. User profile
  console.log('3. Testing /api/auth/me...');
  const meRes = await axios.get(`${BASE_URL}/auth/me`, { headers: authHeaders });
  console.log('   Candidate profile:', meRes.data.name, '-', meRes.data.email);

  // 4. Resume upload & analysis
  console.log('4. Testing /api/resume/upload (PDF parsing & extraction)...');
  const samplePdfPath = path.join(__dirname, 'sample_resume.pdf');
  const resumeForm = new FormData();
  resumeForm.append('resume', fs.createReadStream(samplePdfPath));
  const resumeRes = await axios.post(`${BASE_URL}/resume/upload`, resumeForm, {
    headers: { ...authHeaders, ...resumeForm.getHeaders() }
  });
  console.log('   Resume analyzed. Languages detected:', resumeRes.data.resume.extractedSkills.languages.join(', '));
  console.log('   Frameworks detected:', resumeRes.data.resume.extractedSkills.frameworks.join(', '));
  const resumeId = resumeRes.data.resume._id;

  // 5. Job Description analysis
  console.log('5. Testing /api/jd/analyze...');
  const jdRes = await axios.post(`${BASE_URL}/jd/analyze`, {
    jobRole: 'Full Stack Developer',
    companyName: 'Cloud Innovations',
    jdText: 'Looking for a Full Stack Developer experienced with React, Node.js, TypeScript, MongoDB, Redis, Docker, and Microservices architecture.'
  }, { headers: authHeaders });
  console.log('   JD analyzed. Required skills:', jdRes.data.jd.requiredSkills.join(', '));
  const jdId = jdRes.data.jd._id;

  // 6. Semantic skill matching
  console.log('6. Testing /api/skills/match (Sentence embeddings & Cosine Similarity)...');
  const matchRes = await axios.post(`${BASE_URL}/skills/match`, { resumeId, jdId }, { headers: authHeaders });
  console.log('   Match Percentage:', matchRes.data.match.matchPercentage + '%');
  console.log('   Matched Skills:', matchRes.data.match.matchedSkills.join(', '));
  console.log('   Missing Skills:', matchRes.data.match.missingSkills.join(', '));

  // 7. Create Mock Interview
  console.log('7. Testing /api/interviews (Create session)...');
  const invRes = await axios.post(`${BASE_URL}/interviews`, {
    role: 'Full Stack Developer',
    interviewType: 'Technical Interview',
    difficulty: 'Adaptive',
    totalQuestions: 3,
    adaptiveEnabled: true,
    voiceEnabled: true,
    useResume: true,
    useJD: true
  }, { headers: authHeaders });
  console.log('   Interview created ID:', invRes.data.interview._id);
  const interviewId = invRes.data.interview._id;

  // 8. Start interview (generate question 1)
  console.log('8. Testing /api/interviews/:id/start...');
  const startRes = await axios.post(`${BASE_URL}/interviews/${interviewId}/start`, {}, { headers: authHeaders });
  console.log('   Question 1:', startRes.data.currentQuestion.questionText);
  console.log('   Category:', startRes.data.currentQuestion.category, '| Difficulty:', startRes.data.currentQuestion.difficulty);

  // 9. Submit Answer 1
  console.log('9. Testing /api/interviews/:id/answer (Submit candidate response)...');
  const answerRes = await axios.post(`${BASE_URL}/interviews/${interviewId}/answer`, {
    candidateAnswer: 'React uses a Virtual DOM which is an in-memory representation of real DOM. During state changes, it reconciles differences using an efficient heuristic O(n) diffing algorithm. Keys give elements a stable identity across renders to prevent unnecessary re-mounting.'
  }, { headers: authHeaders });
  console.log('   Overall Answer Score:', answerRes.data.evaluation.overallScore + '/10');
  console.log('   Technical Depth:', answerRes.data.evaluation.technicalCorrectness + '/10');
  console.log('   Adaptive Next Difficulty:', answerRes.data.nextDifficulty);

  // 10. Get Next Question (Adaptive Question 2)
  console.log('10. Testing /api/interviews/:id/next-question...');
  const nextQRes = await axios.post(`${BASE_URL}/interviews/${interviewId}/next-question`, {}, { headers: authHeaders });
  console.log('   Question 2:', nextQRes.data.currentQuestion.questionText);
  console.log('   Adaptive Follow-up?:', nextQRes.data.currentQuestion.isFollowUp);

  // 11. Conclude interview and generate final report
  console.log('11. Testing /api/interviews/:id/end...');
  const endRes = await axios.post(`${BASE_URL}/interviews/${interviewId}/end`, {
    durationSeconds: 320
  }, { headers: authHeaders });
  console.log('   Final Overall Rating:', endRes.data.report.overallScore + '/10');
  console.log('   Assessment Summary:', endRes.data.report.summary);

  // 12. Fetch official report endpoint
  console.log('12. Testing /api/reports/:id...');
  const reportRes = await axios.get(`${BASE_URL}/reports/${interviewId}`, { headers: authHeaders });
  console.log('   Report fetched successfully. Strengths identified:', reportRes.data.report.strengths.length);

  // 13. Dashboard analytics check
  console.log('13. Testing /api/analytics/dashboard...');
  const dashRes = await axios.get(`${BASE_URL}/analytics/dashboard`, { headers: authHeaders });
  console.log('   Total Interviews recorded in dashboard:', dashRes.data.totalInterviews);
  console.log('   Dashboard Average Score:', dashRes.data.avgScore + '/10');

  console.log('\n=============================================================');
  console.log(' >>> ALL 13 END-TO-END INTEGRATION TESTS PASSED 100%! <<<');
  console.log('=============================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err.response?.data || err.message);
  process.exit(1);
});
