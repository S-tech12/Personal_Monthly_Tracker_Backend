// we just import the module which is used to create the cron job
import cron from 'node-cron';


// this is the function which handles to create the pdf file and shared with the user
import { runWeeklyReports, runMonthlyReports } from '../services/scheduledReports.service.js';


// this is the main function which handles the cron job and it is just exported and run in the server.js file
export const initScheduledJobs = () => {
  // Weekly reports: Every Sunday at 8:00 AM
  cron.schedule('0 8 * * 0', () => {
    console.log('[Cron] Running weekly reports job...');
    runWeeklyReports();
  });

  // Monthly rollover/report: run shortly after midnight on the 1st.
  // Budget usage is calculated from current-month transactions, so it is
  // automatically zero for the new month while the configured limit remains.
  cron.schedule('5 0 1 * *', () => {
    console.log('[Cron] Running monthly rollover and reports job...');
    runMonthlyReports();
  }, { timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata' });
  
  console.log('[Cron] Scheduled jobs initialized.');
};
