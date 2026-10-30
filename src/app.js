// just import the express module to handle the req - res cycle
import express from 'express';

// this is important for the security purpose
import cors from 'cors';

// import morgan from 'morgan';

// this is important so that the token which comes from the request in the cookies can be read
import cookieParser from 'cookie-parser';

// this is all the routes which is stored in index.js file
import routes from './routes/index.js';

// this is the global error middleware which is created and used at the end of this file
import { errorHandler } from './middlewares/error.middleware.js';


// it is the instace of the express module ...
const app = express();

// all the Middleware are executed here when the server started
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' || 'http://localhost:5174', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// all the Routes applied here and when the request comes then it comes here and matched route will be executed
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
