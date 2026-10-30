// import the dotenv module so that we can gain the access of the variables which is in the .env file
import dotenv from 'dotenv';

// we need to import path module becuase we have done this backend in the ES Module so that's why we need to manually import this and then we need to use it
import path from 'path';

// same reason as above
import { fileURLToPath } from 'url';

// it is responsible to change the URL from // this to this \\
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the src folder
dotenv.config({ path: path.join(__dirname, '..', '.env') });
