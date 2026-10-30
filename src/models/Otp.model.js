import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required']
  },
  otp: {
    type: String,
    required: [true, 'OTP is required']
  },
  purpose: {
    type: String,
    enum: {
      values: ['signup', 'login', 'password-reset'],
      message: 'Invalid OTP purpose'
    },
    required: [true, 'Purpose is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry time is required']
  }
}, { timestamps: true });

// TTL index to automatically delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
export default Otp;
