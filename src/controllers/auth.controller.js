import * as authService from '../services/auth.service.js';
import { apiResponse } from '../utils/apiResponse.js';

export const signup = async (req, res, next) => {
  try {
    let { name, email, password } = req.body;
    const errors = {};

    // Name validation
    if (name === undefined || name === null || (typeof name === 'string' && name.trim() === '')) {
      errors.name = 'Name is required';
    } else if (typeof name !== 'string' || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else {
      name = name.trim();
      req.body.name = name;
    }

    // Email validation
    if (email === undefined || email === null || (typeof email === 'string' && email.trim() === '')) {
      errors.email = 'Email is required';
    } else if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    } else {
      email = email.trim().toLowerCase();
      req.body.email = email;
    }

    // Password validation
    if (password === undefined || password === null || password === '') {
      errors.password = 'Password is required';
    } else if (typeof password !== 'string' || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/\d/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }

    if (Object.keys(errors).length > 0) {
      return apiResponse(res, 400, 'Validation failed', errors);
    }

    const user = await authService.registerUser(req.body);
    return apiResponse(res, 201, 'OTP sent to your email', { email: user.email });
  } catch (error) {
    next(error);
  }
};

export const verifySignupOtp = async (req, res, next) => {
  try {
    let { email, otp } = req.body;
    const errors = {};

    // Email validation
    if (email === undefined || email === null || (typeof email === 'string' && email.trim() === '')) {
      errors.email = 'Email is required';
    } else if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    } else {
      email = email.trim().toLowerCase();
      req.body.email = email;
    }

    // OTP validation
    if (otp === undefined || otp === null || (typeof otp === 'string' && otp.trim() === '')) {
      errors.otp = 'OTP is required';
    } else if (typeof otp !== 'string' || otp.trim().length !== 6) {
      errors.otp = 'OTP must be exactly 6 digits';
    } else if (!/^\d+$/.test(otp.trim())) {
      errors.otp = 'OTP must contain only numbers';
    } else {
      otp = otp.trim();
      req.body.otp = otp;
    }

    if (Object.keys(errors).length > 0) {
      return apiResponse(res, 400, 'Validation failed', errors);
    }

    await authService.verifySignupOtp(email, otp);
    return apiResponse(res, 200, 'Account verified successfully');
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    // first fetch the credentials which comes from the frontend 
    let { email, password } = req.body;

    // this is the object which hold the errors if there is any while validate the data
    const errors = {};

    // Email validation
    if (email === undefined || email === null || (typeof email === 'string' && email.trim() === '')) {
      errors.email = 'Email is required';
    } else if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    } else {
      email = email.trim().toLowerCase();
      req.body.email = email;
    }

    // Password validation
    if (password === undefined || password === null || password === '') {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      return apiResponse(res, 400, 'Validation failed', errors);
    }

    // now it call the loginUser service function adn it returns the token and user and then it will be used further..
    const { token, user } = await authService.loginUser(req.body);
    
    // JWT_EXPIRES_IN is usually '1d', converting to 24h in ms for maxAge
    const maxAge = 24 * 60 * 60 * 1000;
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge
    });

    return apiResponse(res, 200, 'Login successful', { user });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return apiResponse(res, 200, 'Logged out successfully');
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const hasFamily = req.user.familyId !== null;
    let isHeadOfFamily = true;
    if (hasFamily) {
      const familyService = await import('../services/family.service.js');
      isHeadOfFamily = await familyService.familyService.isHeadUser(req.user._id);
    }
    
    const userResponse = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      profilePictureUrl: req.user.profilePictureUrl,
      defaultCurrency: req.user.defaultCurrency,
      memberSince: req.user.createdAt,
      hasFamily,
      isHeadOfFamily
    };
    return apiResponse(res, 200, 'User fetched successfully', { user: userResponse });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    // first fetch the email from the req.body 
    let { email } = req.body;

    // this is the object where all the errors which are generated during the validation will be stored here.
    const errors = {};

    // Email validation
    if (email === undefined || email === null || (typeof email === 'string' && email.trim() === '')) {
      errors.email = 'Email is required';
    } else if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    } else {
      email = email.trim().toLowerCase();
      req.body.email = email;
    }

    if (Object.keys(errors).length > 0) {
      return apiResponse(res, 400, 'Validation failed', errors);
    }

    // now forgotpassword service function executed from here..
    await authService.forgotPassword(email);
    return apiResponse(res, 200, 'OTP sent to your email');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    let { email, otp } = req.body;
    const errors = {};

    // Email validation
    if (email === undefined || email === null || (typeof email === 'string' && email.trim() === '')) {
      errors.email = 'Email is required';
    } else if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    } else {
      email = email.trim().toLowerCase();
      req.body.email = email;
    }

    // OTP validation
    if (otp === undefined || otp === null || (typeof otp === 'string' && otp.trim() === '')) {
      errors.otp = 'OTP is required';
    } else if (typeof otp !== 'string' || otp.trim().length !== 6) {
      errors.otp = 'OTP must be exactly 6 digits';
    } else if (!/^\d+$/.test(otp.trim())) {
      errors.otp = 'OTP must contain only numbers';
    } else {
      otp = otp.trim();
      req.body.otp = otp;
    }

    if (Object.keys(errors).length > 0) {
      return apiResponse(res, 400, 'Validation failed', errors);
    }

    await authService.resetPasswordWithEmail(email, otp);
    return apiResponse(res, 200, 'New password sent to your email');
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const errors = {};

    // New Password validation
    if (newPassword === undefined || newPassword === null || newPassword === '') {
      errors.newPassword = 'New password is required';
    } else if (typeof newPassword !== 'string' || newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters';
    } else if (!/\d/.test(newPassword)) {
      errors.newPassword = 'New password must contain at least one number';
    }

    // Confirm Password validation
    if (confirmPassword === undefined || confirmPassword === null || confirmPassword === '') {
      errors.confirmPassword = 'Confirm password is required';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return apiResponse(res, 400, 'Validation failed', errors);
    }

    await authService.updatePassword(req.user._id, newPassword);
    
    return apiResponse(res, 200, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await authService.deleteAccount(req.user._id);
    
    // Clear cookie similar to logout
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    return apiResponse(res, 200, 'Account deleted successfully');
  } catch (error) {
    next(error);
  }
};
