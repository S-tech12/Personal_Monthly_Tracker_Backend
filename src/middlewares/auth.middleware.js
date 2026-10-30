import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { apiResponse } from '../utils/apiResponse.js';

export const protect = async (req, res, next) => {
  const token = req.cookies?.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.userId).select('-password');
      if (!req.user) {
        return apiResponse(res, 401, 'Unauthorized: User no longer exists');
      }
      return next();
    } catch (error) {
      return apiResponse(res, 401, 'Unauthorized: Invalid token');
    }
  }

  return apiResponse(res, 401, 'Unauthorized: No token provided');
};
