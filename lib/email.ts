// Zepto Mail Email Service
const ZEPTO_API_URL = 'https://api.zeptomail.in/v1.1/email'

interface EmailOptions {
  to: string
  toName?: string
  subject: string
  htmlBody: string
  textBody?: string
}

interface ZeptoMailResponse {
  data: any
  message: string
  request_id: string
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.ZEPTO_MAIL_API_KEY
  const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@sniperthink.com'
  const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'SniperThinkAI'

  if (!apiKey) {
    console.error('ZEPTO_MAIL_API_KEY is not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch(ZEPTO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          address: fromEmail,
          name: fromName,
        },
        to: [
          {
            email_address: {
              address: options.to,
              name: options.toName || options.to,
            },
          },
        ],
        subject: options.subject,
        htmlbody: options.htmlBody,
        textbody: options.textBody || stripHtml(options.htmlBody),
      }),
    })

    const data = await response.json() as ZeptoMailResponse

    if (!response.ok) {
      console.error('Zepto Mail error:', data)
      return { success: false, error: data.message || 'Failed to send email' }
    }

    console.log('Email sent successfully:', data.request_id)
    return { success: true }
  } catch (error: any) {
    console.error('Email send error:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP Email
export async function sendOTPEmail(
  email: string,
  otp: string,
  purpose: 'login' | 'signup' | 'reset'
): Promise<{ success: boolean; error?: string }> {
  const purposeText = {
    login: 'log in to your account',
    signup: 'verify your email address',
    reset: 'reset your password',
  }

  const subject = purpose === 'reset' 
    ? 'Reset Your Password - SniperThinkAI' 
    : 'Your Verification Code - SniperThinkAI'

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #3b82f6; font-size: 28px; margin: 0;">
        ✨ SniperThinkAI
      </h1>
    </div>

    <!-- Main Content -->
    <div style="background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
        Your Verification Code
      </h2>
      
      <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
        Use this code to ${purposeText[purpose]}:
      </p>

      <!-- OTP Code -->
      <div style="background: #0f0f1a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px;">
        <span style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #3b82f6; font-family: 'Courier New', monospace;">
          ${otp}
        </span>
      </div>

      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
        This code will expire in <strong style="color: #ffffff;">10 minutes</strong>.
      </p>
      
      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0; text-align: center;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #666666; font-size: 12px; margin: 0;">
        © 2026 SniperThinkAI. All rights reserved.
      </p>
      <p style="color: #666666; font-size: 12px; margin: 8px 0 0 0;">
        This is an automated message, please do not reply.
      </p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: email,
    subject,
    htmlBody,
  })
}

// Send Password Reset Link Email
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #3b82f6; font-size: 28px; margin: 0;">
        ✨ SniperThinkAI
      </h1>
    </div>

    <!-- Main Content -->
    <div style="background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
        Reset Your Password
      </h2>
      
      <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
        Hi${userName ? ` ${userName}` : ''},<br><br>
        We received a request to reset your password. Click the button below to create a new password:
      </p>

      <!-- Reset Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600;">
          Reset Password
        </a>
      </div>

      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
        This link will expire in <strong style="color: #ffffff;">1 hour</strong>.
      </p>
      
      <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
        If you can't click the button, copy and paste this link:<br>
        <span style="color: #3b82f6; word-break: break-all;">${resetLink}</span>
      </p>

      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #666666; font-size: 12px; margin: 0;">
        © 2026 SniperThinkAI. All rights reserved.
      </p>
      <p style="color: #666666; font-size: 12px; margin: 8px 0 0 0;">
        This is an automated message, please do not reply.
      </p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - SniperThinkAI',
    htmlBody,
  })
}

// Send Welcome Email
export async function sendWelcomeEmail(
  email: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #3b82f6; font-size: 28px; margin: 0;">
        ✨ SniperThinkAI
      </h1>
    </div>

    <!-- Main Content -->
    <div style="background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
        🎉 Welcome to SniperThinkAI!
      </h2>
      
      <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
        Hi${firstName ? ` ${firstName}` : ''},<br><br>
        Your account has been created successfully! You're all set to start creating amazing AI-powered content.
      </p>

      <div style="background: #0f0f1a; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #ffffff; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">🎁 Your Welcome Bonus:</p>
        <p style="color: #3b82f6; font-size: 24px; font-weight: bold; margin: 0;">1,000 Free Credits</p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>

      <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
        Start creating AI photos, videos, music, and more!
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #666666; font-size: 12px; margin: 0;">
        © 2026 SniperThinkAI. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: email,
    subject: 'Welcome to SniperThinkAI! 🎉',
    htmlBody,
  })
}

// Helper to strip HTML tags for plain text version
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
