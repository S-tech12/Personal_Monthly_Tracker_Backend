import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.model.js';
import { generateOtp } from '../utils/generateOtp.js';

export const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

export const compareOtp = async (candidateOtp, hashedOtp) => {
  return bcrypt.compare(candidateOtp, hashedOtp);
};

export const createOtpRecord = async (email, purpose) => {
  // Delete any previous unexpired OTP for the same email + purpose
  await Otp.deleteMany({ email, purpose });

  // first it will generate the plainOtp
  const plainOtp = generateOtp();

  // then it will hashOtp which is generated and we are storing it in the database
  const hashedOtp = await hashOtp(plainOtp);
  
  // first calculate the expiryMinutes 
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
  
  // then calculate the expireTime fot OTP
  const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

  // create the OTP instance and store all the data..
  await Otp.create({
    email,
    otp: hashedOtp,
    purpose,
    expiresAt
  });

  return plainOtp;
};

export const verifyOtpRecord = async (email, otp, purpose) => {
  // first we find the instance fron the database that is there any matching found or not ??
  const otpRecord = await Otp.findOne({ email, purpose }).sort({ createdAt: -1 });
  
  // if not found then we return false
  if (!otpRecord) return false;
  
  // if yes then check that is expiresAt > current ?? then return false
  if (new Date() > otpRecord.expiresAt) {
    return false;
  }
  
  // first check the enteredOTP converting hash and stored OTP hash
  const isValid = await compareOtp(otp, otpRecord.otp);

  // if yes then we need to delete first and then we need to return true.
  if (isValid) {
    await Otp.deleteOne({ _id: otpRecord._id });
    return true;
  }
  
  return false;
};
