import { transporter } from '../config/mailer.js';

export const sendOtpEmail = async (toEmail, otp) => {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || '10';
  const mailOptions = {
    from: `"Spendly" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Spendly Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00236f;">Verify Your Email</h2>
        <p>Your Spendly verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in ${expiryMinutes} minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

export const sendNewPasswordEmail = async (toEmail, newPassword) => {
  const mailOptions = {
    from: `"Spendly" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your New Spendly Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00236f;">Password Reset Successful</h2>
        <p>Your new Spendly password has been generated:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
          ${newPassword}
        </div>
        <p>Please log in with this new password. You can change it in your Settings later.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};
