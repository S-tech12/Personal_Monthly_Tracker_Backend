import { body } from 'express-validator';

export const validateUpdateSettings = [
  body('defaultCurrency')
    .exists().withMessage('defaultCurrency is required')
    .isString().withMessage('defaultCurrency must be a string')
    .isIn(['INR', 'USD', 'EUR', 'GBP']).withMessage('defaultCurrency must be a valid 3-letter currency code from the allowed list'),
  body('reportFrequency')
    .exists().withMessage('reportFrequency is required')
    .isIn(['weekly', 'monthly']).withMessage('reportFrequency must be either weekly or monthly'),
  body('notificationPreferences')
    .exists().withMessage('notificationPreferences is required')
    .isObject().withMessage('notificationPreferences must be an object'),
  body('notificationPreferences.budgetAlerts')
    .exists().withMessage('notificationPreferences.budgetAlerts is required')
    .isBoolean().withMessage('budgetAlerts must be a boolean'),
  body('notificationPreferences.reportEmails')
    .exists().withMessage('notificationPreferences.reportEmails is required')
    .isBoolean().withMessage('reportEmails must be a boolean'),
  body('notificationPreferences.unusualSpendingAlerts')
    .exists().withMessage('notificationPreferences.unusualSpendingAlerts is required')
    .isBoolean().withMessage('unusualSpendingAlerts must be a boolean')
];
