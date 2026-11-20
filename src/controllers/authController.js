const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');
const { isConnected, memoryStore } = require('../config/db');

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 1. Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, targetRole } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (isConnected()) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        profile: { targetRole: targetRole || 'Full Stack Developer' }
      });

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Account registered successfully.',
        token,
        user: { id: user._id, name: user.name, email: user.email, profile: user.profile }
      });
    } else {
      // Memory store fallback
      const existing = memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: 'usr_' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        profile: { targetRole: targetRole || 'Full Stack Developer' },
        createdAt: new Date()
      };
      memoryStore.users.push(user);

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Account registered successfully (Local Mode).',
        token,
        user: { id: user.id, name: user.name, email: user.email, profile: user.profile }
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration.', error: err.message });
  }
};

// 2. Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Quick demo login bypass
    if (email === 'demo@prepvoice.ai' && password === 'demo123') {
      const demoUser = {
        id: 'demo-user-id',
        name: 'Demo Candidate',
        email: 'demo@prepvoice.ai',
        profile: {
          targetRole: 'Full Stack Developer',
          experienceLevel: 'Entry-Level / Fresher',
          preferredDifficulty: 'Adaptive',
          bio: 'Major Project Candidate preparing for technical rounds.'
        }
      };
      const token = generateToken(demoUser);
      return res.json({
        message: 'Logged in successfully as Demo Candidate.',
        token,
        user: demoUser
      });
    }

    let user;
    if (isConnected()) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      user = memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    const token = generateToken(user);
    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        profile: user.profile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
};

// 3. Get Current User Profile
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    if (userId === 'demo-user-id') {
      return res.json({
        id: 'demo-user-id',
        name: 'Demo Candidate',
        email: 'demo@prepvoice.ai',
        profile: {
          targetRole: 'Full Stack Developer',
          experienceLevel: 'Entry-Level / Fresher',
          preferredDifficulty: 'Adaptive',
          bio: 'Major Project Candidate preparing for technical rounds.'
        }
      });
    }

    let user;
    if (isConnected()) {
      user = await User.findById(userId).select('-password');
    } else {
      user = memoryStore.users.find(u => u.id === userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    res.json({
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      profile: user.profile
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Error fetching profile.', error: err.message });
  }
};

// 4. Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, targetRole, experienceLevel, preferredDifficulty, bio } = req.body;

    if (isConnected()) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found.' });

      if (name) user.name = name;
      if (targetRole) user.profile.targetRole = targetRole;
      if (experienceLevel) user.profile.experienceLevel = experienceLevel;
      if (preferredDifficulty) user.profile.preferredDifficulty = preferredDifficulty;
      if (bio) user.profile.bio = bio;

      await user.save();
      return res.json({ message: 'Profile updated successfully.', user });
    } else {
      const user = memoryStore.users.find(u => u.id === userId);
      if (user) {
        if (name) user.name = name;
        if (targetRole) user.profile.targetRole = targetRole;
        if (experienceLevel) user.profile.experienceLevel = experienceLevel;
        if (preferredDifficulty) user.profile.preferredDifficulty = preferredDifficulty;
        if (bio) user.profile.bio = bio;
      }
      return res.json({ message: 'Profile updated (Local Mode).', user });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile.', error: err.message });
  }
};
