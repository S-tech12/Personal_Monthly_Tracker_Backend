// this is library to perform the operation on the dates substract a week start of month like operation
import dayjs from 'dayjs';

// it is just plugin so it will give it to the dayjs library and it will get the start date and end date of week
import isoWeek from 'dayjs/plugin/isoWeek.js';

// so this is just user model import in it so fetch the data from database
import User  from '../models/User.model.js';

// this is the actual logic to group the data and fetch the data from the expens collections and it is in the separate file
import { getExpensesGroupedByDay, sendScheduledReport } from './report.service.js';


// that's how we add the plugin in the dayjs library so it can use it..
dayjs.extend(isoWeek);


// this function is used to send the weekly expenses report to the user's email id .. who saved their prefrenses to the weekly in the system.
export const runWeeklyReports = async () => {
  try {

    // First it will find the users whose report frequency is set to weekly, and notification preferences currently per emails is true because in the project, we have configured that, uh, they can change their preferences.
    const users = await User.find({
      reportFrequency: 'weekly',
      'notificationPreferences.reportEmails': true
    });


    // it will run through entire array and send the mail to their weekly report and if for any user the email sending functionality fails then it will not be stop for other users..
    for (const user of users) {
      try {
        const lastMonday = dayjs().subtract(1, 'week').startOf('isoWeek');
        const lastSunday = dayjs().subtract(1, 'week').endOf('isoWeek');

        const startDate = lastMonday.toDate();
        const endDate = lastSunday.toDate();

        // this is the label which we show in the mail navbar so here it is
        const periodLabel = `Weekly Report: ${lastMonday.format('D MMM')} - ${lastSunday.format('D MMM YYYY')}`;

        // Calls into report.service.js to fetch and group that user's expenses for the calculated week.
        const groupedExpenses = await getExpensesGroupedByDay(user._id, startDate, endDate);

        // it will skip if the expensed for that user in that week is 0 because we are not sending empty report we just skip it..
        if (groupedExpenses.length === 0) {
          console.log(`[Weekly Report] Skipping ${user.email} - no expenses in range`);
          continue;
        }

        // it will take the responsibility to send the mail to the user's email id
        await sendScheduledReport(user, groupedExpenses, periodLabel);
        console.log(`[Weekly Report] Sent to ${user.email}`);
      } catch (err) {
        console.error(`[Weekly Report] Failed for ${user.email}:`, err);
      }
    }
  } catch (err) {
    console.error('[Weekly Report] Global error:', err);
  }
};

// this function is used to send the monthly expenses report to the user's email id .. who saved their prefrenses to the monthly in the system and it is same as it above just change to the month
export const runMonthlyReports = async () => {
  try {
    const users = await User.find({
      reportFrequency: 'monthly',
      'notificationPreferences.reportEmails': true
    });

    for (const user of users) {
      try {
        const lastMonthStart = dayjs().subtract(1, 'month').startOf('month');
        const lastMonthEnd = dayjs().subtract(1, 'month').endOf('month');

        const startDate = lastMonthStart.toDate();
        const endDate = lastMonthEnd.toDate();
        const periodLabel = `Monthly Report: ${lastMonthStart.format('MMMM YYYY')}`;

        const groupedExpenses = await getExpensesGroupedByDay(user._id, startDate, endDate);

        if (groupedExpenses.length === 0) {
          console.log(`[Monthly Report] Skipping ${user.email} - no expenses in range`);
          continue;
        }

        await sendScheduledReport(user, groupedExpenses, periodLabel);
        console.log(`[Monthly Report] Sent to ${user.email}`);
      } catch (err) {
        console.error(`[Monthly Report] Failed for ${user.email}:`, err);
      }
    }
  } catch (err) {
    console.error('[Monthly Report] Global error:', err);
  }
};
