import { body } from 'express-validator';

export const validateVoiceCommand = [
  body('transcript')
    .notEmpty()
    .withMessage('Transcript is required')
    .isString()
    .withMessage('Transcript must be a string')
    .isLength({ max: 500 })
    .withMessage('Transcript cannot exceed 500 characters')
];
