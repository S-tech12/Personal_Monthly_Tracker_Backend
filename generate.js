import fs from 'fs';
import path from 'path';

const files = [
  'src/config/db.js', 'src/config/mailer.js', 'src/config/env.js',
  'src/models/User.model.js', 'src/models/Expense.model.js', 'src/models/Budget.model.js', 'src/models/Notification.model.js', 'src/models/Otp.model.js',
  'src/controllers/auth.controller.js', 'src/controllers/expense.controller.js', 'src/controllers/budget.controller.js', 'src/controllers/notification.controller.js', 'src/controllers/report.controller.js', 'src/controllers/settings.controller.js',
  'src/routes/auth.routes.js', 'src/routes/expense.routes.js', 'src/routes/budget.routes.js', 'src/routes/notification.routes.js', 'src/routes/report.routes.js', 'src/routes/settings.routes.js', 'src/routes/index.js',
  'src/services/auth.service.js', 'src/services/otp.service.js', 'src/services/expense.service.js', 'src/services/gemini.service.js', 'src/services/pdf.service.js', 'src/services/email.service.js',
  'src/middlewares/auth.middleware.js', 'src/middlewares/error.middleware.js', 'src/middlewares/validate.middleware.js', 'src/middlewares/rateLimiter.middleware.js',
  'src/utils/generateOtp.js', 'src/utils/formatDate.js', 'src/utils/apiResponse.js', 'src/utils/logger.js',
  'src/constants/httpStatusCodes.js', 'src/constants/otpConfig.js', 'src/constants/errorMessages.js',
  'src/validators/auth.validator.js', 'src/validators/expense.validator.js', 'src/validators/budget.validator.js', 'src/validators/notification.validator.js', 'src/validators/report.validator.js', 'src/validators/settings.validator.js',
  'src/app.js', 'src/server.js'
];

for (const file of files) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = `// TODO: Implement ${path.basename(file)}\n`;
  fs.writeFileSync(file, content);
}
