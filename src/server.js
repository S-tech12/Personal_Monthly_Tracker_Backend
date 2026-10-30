import './config/dotenv.js';

// we just created the instance of the express module and assign all the middlewares and routes and export it..
import app from './app.js';

// this is the module which connect our server with the database
import { connectDB } from './config/db.js';

// this is our cron job and it is mainly used to send the monthly or weekly expense report
import { initScheduledJobs } from './config/cron.js';


// this is the function which first connect the database and then run the cron job function and then start the server..
const startServer = async () => {
  await connectDB();
  initScheduledJobs();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
