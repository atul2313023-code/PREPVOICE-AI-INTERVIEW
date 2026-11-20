const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'prepvoice_ai_jwt_super_secret_key_2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  // Support demo / guest quick login
  if (token === 'demo-token-12345') {
    req.user = {
      id: 'demo-user-id',
      email: 'demo@prepvoice.ai',
      name: 'Demo Candidate'
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired authentication token.' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = { authenticateToken, JWT_SECRET };
