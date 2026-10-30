import * as settingsService from '../services/settings.service.js';
import User from '../models/User.model.js';

export const updateSettings = async (req, res, next) => {
  try {

    // first we will fetch the data from the request body..
    const { defaultCurrency, reportFrequency, notificationPreferences } = req.body;
    const errors = {};


    // defaultCurrency validation
    if (defaultCurrency === undefined || defaultCurrency === null) {
      errors.defaultCurrency = 'defaultCurrency is required';
    } else if (typeof defaultCurrency !== 'string') {
      errors.defaultCurrency = 'defaultCurrency must be a string';
    } else if (!['INR', 'USD', 'EUR', 'GBP'].includes(defaultCurrency)) {
      errors.defaultCurrency = 'defaultCurrency must be a valid 3-letter currency code from the allowed list';
    }

    // reportFrequency validation
    if (reportFrequency === undefined || reportFrequency === null) {
      errors.reportFrequency = 'reportFrequency is required';
    } else if (!['weekly', 'monthly'].includes(reportFrequency)) {
      errors.reportFrequency = 'reportFrequency must be either weekly or monthly';
    }

    // notificationPreferences validation
    if (notificationPreferences === undefined || notificationPreferences === null) {
      errors.notificationPreferences = 'notificationPreferences is required';
    } else if (typeof notificationPreferences !== 'object' || Array.isArray(notificationPreferences)) {
      errors.notificationPreferences = 'notificationPreferences must be an object';
    } else {
      // notificationPreferences.budgetAlerts validation
      const budgetAlerts = notificationPreferences.budgetAlerts;
      if (budgetAlerts === undefined || budgetAlerts === null) {
        errors['notificationPreferences.budgetAlerts'] = 'notificationPreferences.budgetAlerts is required';
      } else if (typeof budgetAlerts !== 'boolean') {
        errors['notificationPreferences.budgetAlerts'] = 'budgetAlerts must be a boolean';
      }

      // notificationPreferences.reportEmails validation
      const reportEmails = notificationPreferences.reportEmails;
      if (reportEmails === undefined || reportEmails === null) {
        errors['notificationPreferences.reportEmails'] = 'notificationPreferences.reportEmails is required';
      } else if (typeof reportEmails !== 'boolean') {
        errors['notificationPreferences.reportEmails'] = 'reportEmails must be a boolean';
      }

      // notificationPreferences.unusualSpendingAlerts validation
      const unusualSpendingAlerts = notificationPreferences.unusualSpendingAlerts;
      if (unusualSpendingAlerts === undefined || unusualSpendingAlerts === null) {
        errors['notificationPreferences.unusualSpendingAlerts'] = 'notificationPreferences.unusualSpendingAlerts is required';
      } else if (typeof unusualSpendingAlerts !== 'boolean') {
        errors['notificationPreferences.unusualSpendingAlerts'] = 'unusualSpendingAlerts must be a boolean';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: errors
      });
    }

    // this is the main function which update the settings...
    const user = await settingsService.updateSettings(req.user._id, req.body);
    
    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req, res, next) => {
  try {

    // now first it will fetch the user from the database and select only 3 properties.
    const user = await User.findById(req.user._id).select('defaultCurrency reportFrequency notificationPreferences');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // it will return it.
    return res.status(200).json({
      success: true,
      data: {
        settings: {
          defaultCurrency: user.defaultCurrency,
          reportFrequency: user.reportFrequency,
          notificationPreferences: user.notificationPreferences
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
