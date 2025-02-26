
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-connection-string';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: String,
  isVerified: { type: Boolean, default: false },
  verificationCode: String,
  verificationExpiry: Date
});

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  response: { type: String, required: true },
  suggestedTopics: [String],
  timestamp: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model('User', UserSchema);
export const ChatModel = mongoose.model('Chat', ChatSchema);
