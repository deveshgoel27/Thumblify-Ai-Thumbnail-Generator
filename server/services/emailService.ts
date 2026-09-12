import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER as string,
        pass: process.env.EMAIL_PASS as string, // Gmail App Password
    },
});

export const sendPasswordResetEmail = async (toEmail: string, resetUrl: string) => {
    const mailOptions = {
        from: `"Thumblify" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Reset your Thumblify password',
        html: `
            <div style="font-family: Poppins, Arial, sans-serif; max-width: 480px; margin: auto; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 16px; padding: 40px; color: #fff;">
                <h2 style="color: #ec4899; margin-bottom: 8px;">Password Reset</h2>
                <p style="color: #aaa; font-size: 14px;">You requested a password reset for your Thumblify account.</p>
                <p style="color: #aaa; font-size: 14px;">Click the button below to set a new password. This link expires in <strong style="color:#fff">15 minutes</strong>.</p>
                <a href="${resetUrl}" style="display:inline-block; margin-top: 24px; padding: 12px 32px; background: #ec4899; color: #fff; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
                    Reset Password
                </a>
                <p style="color: #555; font-size: 12px; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};
