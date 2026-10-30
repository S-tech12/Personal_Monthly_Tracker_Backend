import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    default: null
  },
  defaultCurrency: {
    type: String,
    default: 'INR' 
  },
  profilePictureUrl: {
    type: String,
    default: ''
  },
  notificationPreferences: {
    budgetAlerts: { type: Boolean, default: true },
    reportEmails: { type: Boolean, default: true },
    unusualSpendingAlerts: { type: Boolean, default: true }
  },
  reportFrequency: {
    type: String,
    enum: {
      values: ['weekly', 'monthly'],
      message: 'Invalid report frequency'
    },
    default: 'monthly'
  },
  overallMonthlyLimits: {
    type: [{
      currency: { type: String, required: true },
      limit: { type: Number, required: true }
    }],
    default: []
  }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
