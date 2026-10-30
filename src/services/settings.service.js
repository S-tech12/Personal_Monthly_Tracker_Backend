import User from '../models/User.model.js';
import { createNotification } from './notification.service.js';

export const updateSettings = async (userId, settingsData) => {

  // first it will extract the data from the settingsData
  const { defaultCurrency, reportFrequency, notificationPreferences } = settingsData;


  // first it will fetch the data from the User model
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currencyChanged = user.defaultCurrency !== defaultCurrency;

  user.defaultCurrency = defaultCurrency;
  user.reportFrequency = reportFrequency;
  user.notificationPreferences = notificationPreferences;

  await user.save();

  if (currencyChanged) {
    await createNotification(
      userId,
      'currency-changed',
      `Default currency updated to ${defaultCurrency}. From now on, expenses will be recorded in ${defaultCurrency} unless you mention a different currency explicitly.`
    );
  }

  // Convert to object and delete password
  const userObj = user.toObject();
  delete userObj.password;

  return userObj;
};
