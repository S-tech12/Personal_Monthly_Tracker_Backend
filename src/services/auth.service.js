import User from '../models/User.model.js';
import { createOtpRecord, verifyOtpRecord } from './otp.service.js';
import { sendOtpEmail, sendNewPasswordEmail } from './email.service.js';
import jwt from 'jsonwebtoken';

export const registerUser = async ({ name, email, password }) => {
  // it finds that entered email id is in the database or not?
  const existingUser = await User.findOne({ email });

  // if yes and it is verified then we generate one new error and throw it and not verified then we need to update the value and save in the databass by .save() method
  if (existingUser) {
    if (existingUser.isVerified) {
      const error = new Error('Email already registered');
      error.statusCode = 400;
      throw error;
    } else {
      // Allow re-signup if unverified
      existingUser.name = name;
      existingUser.password = password; // Pre-save hook will hash it if modified
      await existingUser.save();
    }
  } else {
    // Create new unverified user
    await User.create({
      name,
      email,
      password,
      isVerified: false
    });
  }

  // then we need to create the OTP instance in the model and call the sendOtpEmail funtion second parameter is the purpose of OTP here it is signup .
  const otp = await createOtpRecord(email, 'signup');
  await sendOtpEmail(email, otp);

  // Return safe user data
  const safeUser = await User.findOne({ email }).select('-password');
  return safeUser;
};

export const verifySignupOtp = async (email, otp) => {
  const isValid = await verifyOtpRecord(email, otp, 'signup');
  
  if (!isValid) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.isVerified = true;
  await user.save();
  
  return true;
};

export const loginUser = async ({ email, password }) => {
  // first find the user instance in the database based on email id
  const user = await User.findOne({ email });

  // if not then we need to throw new error
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // if not verified then we need to generate error
  if (!user.isVerified) {
    const error = new Error('Please verify your email before logging in');
    error.statusCode = 403;
    throw error;
  }

  // we need to check the password by comparing hash and this is new that this method is attached with the model so comparePassword is that method.
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // we need to generate the token and return it 
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
      defaultCurrency: user.defaultCurrency,
      memberSince: user.createdAt
    }
  };
};

export const forgotPassword = async (email) => {

  // first fetch the object from the database
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // now new otp record created and this time otp is for password-reset
  const otp = await createOtpRecord(email, 'password-reset');

  // it will send the mail to the registered email id with OTP from here
  await sendOtpEmail(email, otp);
  return true;
};

export const resetPasswordWithEmail = async (email, otp) => {
  const isValid = await verifyOtpRecord(email, otp, 'password-reset');
  if (!isValid) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  // Generate random 8-character password
  const newPassword = Math.random().toString(36).slice(-8);
  
  user.password = newPassword;
  await user.save(); // pre-save hook will hash it
  
  await sendNewPasswordEmail(email, newPassword);
  return true;
};

export const updatePassword = async (userId, newPassword) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.password = newPassword;
  await user.save(); // pre-save hook will hash it
  
  return true;
};

export const deleteAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  await user.deleteOne();
  return true;
};
