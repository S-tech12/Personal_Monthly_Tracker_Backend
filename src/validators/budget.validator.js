import { body } from 'express-validator';

export const validateOverallLimit = [
  body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('limit').isFloat({ min: 0 }).withMessage('Limit must be a positive number')
];

export const validateBudgetCategory = [
  body('category').isString().notEmpty().withMessage('Category is required'),
  body('monthlyLimit').isFloat({ min: 0 }).withMessage('Monthly limit must be a positive number'),
  body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code')
];
