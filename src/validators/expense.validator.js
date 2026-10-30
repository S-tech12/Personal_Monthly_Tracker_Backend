import { body } from 'express-validator';

export const validateVoiceExpense = [
  body('transcript')
    .exists().withMessage('Transcript is required')
    .isString().withMessage('Transcript must be a string')
    .trim()
    .notEmpty().withMessage('Transcript cannot be empty')
    .isLength({ max: 500 }).withMessage('Transcript exceeds maximum allowed length of 500 characters')
];

import { query } from 'express-validator';

export const validateDateQuery = [
  query('date')
    .optional()
    .isString().withMessage('Date must be a string')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
];
