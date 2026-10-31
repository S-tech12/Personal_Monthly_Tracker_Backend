# Spendly Backend

This is the backend API for Spendly, built with Node.js, Express, and MongoDB.

## Architecture

This project strictly follows a scalable layered architecture to separate concerns:

1. **Routes (`src/routes`)**: Defines the API endpoints (e.g., `/api/auth/login`) and maps them to the appropriate controller methods. No business logic belongs here.
2. **Controllers (`src/controllers`)**: Handles incoming HTTP requests, extracts parameters/body, calls the appropriate Service function, and sends the HTTP response. Should remain thin and not contain core business logic.
3. **Services (`src/services`)**: Contains the core business logic of the application. Controllers call services to perform actions. This makes logic highly reusable and testable.
4. **Models (`src/models`)**: Defines the Mongoose database schemas. This is the only layer that directly interacts with the database structure.

### Request Flow
\`Client Request -> Route -> Middleware (Auth/Validate) -> Controller -> Service -> Model -> Database\`

## Development Setup

1. Copy `.env.example` to `.env` and fill in your variables.
2. Run \`npm install\`
3. Run \`npm run dev\` (starts the server with nodemon)
