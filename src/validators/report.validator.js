import { body } from 'express-validator';

export const validateVoiceReportRequest = [
  body('transcript')
    .trim()
    .notEmpty().withMessage('Transcript is required')
    .isString().withMessage('Transcript must be a string')
    .isLength({ max: 500 }).withMessage('Transcript is too long')
];
