const { Resend } = require('resend');
const { RESEND_API_KEY, APP_URL, EMAIL_FROM } = require('../config');
const logger = require('../utils/logger');
const AppConfig = require('../models/AppConfig');

let resend;
function getResend() {
    if (!resend) {
        resend = new Resend(RESEND_API_KEY);
    }
    return resend;
}

/**
 * Get brand name dynamically from AppConfig.
 */
async function getBrandName() {
    try {
        const config = await AppConfig.getInstance();
        return config.instanceName || 'Alyxnet Frame';
    } catch (error) {
        logger.error({ err: error }, 'Failed to get AppConfig for brand name');
        return 'Alyxnet Frame';
    }
}

/**
 * Base email sender with logging.
 */
async function sendEmail(to, subject, html) {
    try {
        const result = await getResend().emails.send({
            from: EMAIL_FROM,
            to,
            subject,
            html,
        });
        logger.info({ to, subject, id: result.data?.id }, 'Email sent');
        return result;
    } catch (error) {
        logger.error({ err: error, to, subject }, 'Failed to send email');
        throw error;
    }
}

/**
 * Send invite email with link to accept-invite page.
 */
async function sendInviteEmail(to, firstName, inviterName, token) {
    const brandName = await getBrandName();
    const link = `${APP_URL}/accept-invite?token=${token}`;
    const subject = `You've been invited to ${brandName}`;
    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #111;">Welcome to ${brandName}</h2>
            <p>Hi ${firstName},</p>
            <p>${inviterName} has invited you to join ${brandName}. Click the button below to set your password and activate your account.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${link}" style="background-color: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                    Accept Invitation
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 48 hours. If you didn't expect this invitation, you can ignore this email.</p>
        </div>
    `;
    return sendEmail(to, subject, html);
}

/**
 * Send email verification link.
 */
async function sendVerificationEmail(to, firstName, token) {
    const brandName = await getBrandName();
    const link = `${APP_URL}/verify-email?token=${token}`;
    const subject = `Verify your email - ${brandName}`;
    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #111;">Verify Your Email</h2>
            <p>Hi ${firstName || 'there'},</p>
            <p>Please verify your email address by clicking the button below.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${link}" style="background-color: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                    Verify Email
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
        </div>
    `;
    return sendEmail(to, subject, html);
}

/**
 * Send password reset email.
 */
async function sendPasswordResetEmail(to, firstName, token) {
    const brandName = await getBrandName();
    const link = `${APP_URL}/reset-password?token=${token}`;
    const subject = `Reset your password - ${brandName}`;
    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #111;">Reset Your Password</h2>
            <p>Hi ${firstName || 'there'},</p>
            <p>We received a request to reset your password. Click the button below to choose a new one.</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${link}" style="background-color: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                    Reset Password
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
        </div>
    `;
    return sendEmail(to, subject, html);
}

module.exports = {
    sendEmail,
    sendInviteEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
};
