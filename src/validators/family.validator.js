import { body } from 'express-validator';

export const validateInvite = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
];

export const validateRespondToInvite = [
  body('inviteId')
    .notEmpty()
    .withMessage('Invite ID is required')
    .isMongoId()
    .withMessage('Invalid Invite ID format'),
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['accept', 'reject'])
    .withMessage('Action must be either accept or reject')
];
