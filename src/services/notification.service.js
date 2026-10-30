import Notification from '../models/Notification.model.js';

export const createNotification = async (userId, type, message) => {
  const notification = new Notification({
    userId,
    type,
    message,
    isRead: false
  });
  await notification.save();
  return notification;
};
