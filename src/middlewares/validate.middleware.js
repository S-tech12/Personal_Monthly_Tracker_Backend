import { validationResult } from 'express-validator';
import { apiResponse } from '../utils/apiResponse.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().reduce((acc, err) => {
      acc[err.path] = err.msg;
      return acc;
    }, {});
    
    return apiResponse(res, 400, 'Validation failed', formattedErrors);
  }
  next();
};
