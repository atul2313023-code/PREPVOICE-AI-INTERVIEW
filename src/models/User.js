const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  profile: {
    targetRole: { type: String, default: 'Full Stack Developer' },
    experienceLevel: { type: String, default: 'Entry-Level / Fresher' },
    preferredDifficulty: { type: String, default: 'Adaptive' },
    bio: { type: String, default: 'Passionate software engineer preparing for technical and HR interviews.' }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
