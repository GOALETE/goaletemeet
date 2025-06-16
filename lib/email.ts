/**
 * Email service utility for sending meeting invites
 * Using nodemailer with Gmail SMTP
 */
import nodemailer, { Transporter } from 'nodemailer';

/**
 * Creates and returns a configured nodemailer transport
 * @returns Nodemailer transporter or null if configuration is missing
 */
export const createTransporter = (): Transporter | null => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Email configuration missing. Check your .env file for EMAIL_USER and EMAIL_PASSWORD.');
      return null;
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Add connection timeout and pool settings for better reliability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      socketTimeout: 15000, // 15 seconds timeout for connections
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to create email transporter:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return null;
  }
};

interface EmailOptions {
  to: string | string[]; // Allow multiple recipients
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
    encoding?: string;
  }>;
}

/**
 * Determines if the current environment is a development or testing environment
 * @returns boolean indicating if current environment is non-production
 */
export function isNonProductionEnvironment(): boolean {
  // Check for common environment variables that indicate a non-production environment
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  const vercelEnv = process.env.VERCEL_ENV?.toLowerCase();
  
  // Consider it non-production if explicitly set to development/test or not production
  return nodeEnv === 'development' || 
         nodeEnv === 'test' || 
         vercelEnv === 'development' ||
         vercelEnv === 'preview' ||
         process.env.IS_DEVELOPMENT === 'true';
}

/**
 * Modifies email subject to indicate development/test environment
 * @param subject Original email subject
 * @returns Modified subject with environment indicator if not in production
 */
export function getEnvironmentAwareSubject(subject: string): string {
  if (isNonProductionEnvironment()) {
    return `[TEST] ${subject}`;
  }
  return subject;
}

/**
 * Adds a testing environment banner to HTML email content
 * @param htmlContent Original HTML content
 * @returns Modified HTML with environment banner if not in production
 */
export function addEnvironmentBannerToHtml(htmlContent: string): string {
  if (!isNonProductionEnvironment() || !htmlContent) {
    return htmlContent;
  }

  // Banner style with prominent warning colors
  const testBanner = `
    <div style="background-color: #ff9800; color: #000; padding: 10px; margin-bottom: 15px; text-align: center; font-weight: bold; border-radius: 5px;">
      ⚠️ TEST ENVIRONMENT - This email was sent from a non-production environment ⚠️
    </div>
  `;

  // Check if HTML has a body tag to insert after
  if (htmlContent.includes('<body')) {
    return htmlContent.replace(/<body[^>]*>/, match => `${match}${testBanner}`);
  } else {
    // If no body tag, add at the beginning
    return `${testBanner}${htmlContent}`;
  }
}

/**
 * Sends an email with the provided options using Gmail SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER) {
      console.error('EMAIL_USER environment variable is not set');
      return false;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: options.to,
      subject: getEnvironmentAwareSubject(options.subject),
      text: options.text,
      html: options.html ? addEnvironmentBannerToHtml(options.html) : options.html,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      attachments: options.attachments
    };

    const transporter = createTransporter();
    if (!transporter) {
      console.error('Could not create email transporter');
      return false;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    // Enhanced error logging with more details
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error sending email:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      recipient: options.to,
      subject: options.subject,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Sends an email with retry mechanism for improved reliability
 * @param options Email options including recipients, subject, and content
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param retryDelay Delay in ms between retries (default: 1000ms)
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendEmailWithRetry(
  options: EmailOptions, 
  maxRetries: number = 3, 
  retryDelay: number = 1000
): Promise<boolean> {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      const result = await sendEmail(options);
      if (result) return true;
    } catch (error) {
      console.error(`Email send attempt ${retries + 1} failed:`, error);
    }
    
    retries++;
    if (retries <= maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
}

/**
 * Sends a notification email to admin when a new subscription is created
 * @param params Parameters including user details, plan type, dates, and payment info
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendAdminNotificationEmail({
  user,
  planType,
  startDate,
  endDate,
  amount,
  paymentId
}: {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    source?: string;
    referenceName?: string;
  };
  planType: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentId: string;
}): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_EMAIL environment variable not set');
    return false;
  }
  
  // Format dates for display
  const formattedStartDate = startDate.toLocaleDateString('en-IN', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });
  const formattedEndDate = endDate.toLocaleDateString('en-IN', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });
  
  // Prepare readable plan type
  const planDisplay = planType === 'daily' 
    ? 'Daily Session' 
    : planType === 'monthly' 
      ? 'Monthly Plan' 
      : 'Monthly Family Plan';
  
  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>New Registration Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 2px solid #ddd; }
        h1 { color: #2c3e50; margin: 0; }
        .user-details, .subscription-details, .payment-details { 
          margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px; 
        }
        h2 { color: #3498db; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        td:first-child { font-weight: bold; width: 40%; }
        .amount { color: #27ae60; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔔 New Registration Alert</h1>
      </div>
      
      <p>A new registration and payment has been completed for a <b>${planDisplay}</b>.</p>
      
      <div class="user-details">
        <h2>User Details</h2>
        <table>
          <tr>
            <td>User ID:</td>
            <td>${user.id}</td>
          </tr>
          <tr>
            <td>Name:</td>
            <td>${user.firstName} ${user.lastName}</td>
          </tr>
          <tr>
            <td>Email:</td>
            <td>${user.email}</td>
          </tr>
          <tr>
            <td>Phone:</td>
            <td>${user.phone}</td>
          </tr>
          <tr>
            <td>Source:</td>
            <td>${user.source || 'Not specified'}</td>
          </tr>
          ${user.referenceName ? `
          <tr>
            <td>Reference:</td>
            <td>${user.referenceName}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <div class="subscription-details">
        <h2>Subscription Details</h2>
        <table>
          <tr>
            <td>Plan Type:</td>
            <td>${planDisplay}</td>
          </tr>
          <tr>
            <td>Start Date:</td>
            <td>${formattedStartDate}</td>
          </tr>
          <tr>
            <td>End Date:</td>
            <td>${formattedEndDate}</td>
          </tr>
        </table>
      </div>
      
      <div class="payment-details">
        <h2>Payment Details</h2>
        <table>
          <tr>
            <td>Amount:</td>
            <td class="amount">₹${amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Payment ID:</td>
            <td>${paymentId}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
  
  // Send email to admin
  return await sendEmail({
    to: adminEmail,
    subject: `New Registration: ${user.firstName} ${user.lastName} (${planDisplay})`,
    html: htmlContent
  });
}

/**
 * Sends a notification email to admin when a new family plan subscription is created
 * @param params Parameters including both users' details, plan info, and payment details
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendFamilyAdminNotificationEmail({
  users,
  planType,
  startDate,
  endDate,
  amount,
  paymentId
}: {
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    source?: string;
    subscriptionId: string;
  }>;
  planType: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentId: string;
}): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_EMAIL environment variable not set');
    return false;
  }
  
  // Format dates for display
  const formattedStartDate = startDate.toLocaleDateString('en-IN', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });
  const formattedEndDate = endDate.toLocaleDateString('en-IN', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });
  
  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>New Family Registration Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 2px solid #ddd; }
        h1 { color: #2c3e50; margin: 0; }
        .user-details, .subscription-details, .payment-details { 
          margin: 20px 0; padding: 15px; border: 1px solid #eee; border-radius: 5px; 
        }
        h2 { color: #3498db; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border-bottom: 1px solid #eee; text-align: left; }
        th { background-color: #f9f9f9; }
        .amount { color: #27ae60; font-weight: bold; }
        .member-label { background-color: #e8f4fd; padding: 5px 10px; border-radius: 3px; margin-right: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>👨‍👩‍👧‍👦 New Family Registration Alert</h1>
      </div>
      
      <p>A new <b>Monthly Family Plan</b> registration and payment has been completed.</p>
      
      <div class="user-details">
        <h2>Family Members</h2>
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Subscription ID</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((user, index) => `
            <tr>
              <td><span class="member-label">Person ${index + 1}</span></td>
              <td>${user.firstName} ${user.lastName}</td>
              <td>${user.email}</td>
              <td>${user.phone}</td>
              <td>${user.subscriptionId}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="subscription-details">
        <h2>Subscription Details</h2>
        <table>
          <tr>
            <td>Plan Type:</td>
            <td>Monthly Family Plan</td>
          </tr>
          <tr>
            <td>Start Date:</td>
            <td>${formattedStartDate}</td>
          </tr>
          <tr>
            <td>End Date:</td>
            <td>${formattedEndDate}</td>
          </tr>
        </table>
      </div>
      
      <div class="payment-details">
        <h2>Payment Details</h2>
        <table>
          <tr>
            <td>Amount:</td>
            <td class="amount">₹${amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Payment ID:</td>
            <td>${paymentId}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
  
  // Send email to admin
  return await sendEmail({
    to: adminEmail,
    subject: `New Family Registration: ${users.map(u => u.firstName).join(' & ')}`,
    html: htmlContent
  });
}

/**
 * Sends a welcome email to a new subscriber
 * @param params Parameters including recipient details, plan type, dates, and payment info
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendWelcomeEmail({
  recipient,
  planType,
  startDate,
  endDate,
  amount,
  paymentId
}: {
  recipient: {
    name: string;
    email: string;
  };
  planType: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentId?: string;
}): Promise<boolean> {
  try {
    // Format dates for display
    const formattedStartDate = startDate.toLocaleDateString('en-IN', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    });
    const formattedEndDate = endDate.toLocaleDateString('en-IN', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    });
    
    // Prepare readable plan type
    const planDisplay = planType === 'daily' 
      ? 'Daily Session' 
      : planType === 'monthly' 
        ? 'Monthly Plan' 
        : 'Monthly Family Plan';
    
    // Create HTML content with modern, elegant design
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to GOALETE CLUB!</title>
        <style>
          /* Base styles */
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background-color: #2c3e50;
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0;
            opacity: 0.9;
          }
          .content {
            padding: 30px 20px;
          }
          .welcome-message {
            margin-bottom: 25px;
            font-size: 16px;
          }
          .section {
            background-color: #f5f7fa;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .section h2 {
            color: #2c3e50;
            font-size: 18px;
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #e1e8ed;
            padding-bottom: 10px;
          }
          .details {
            display: table;
            width: 100%;
          }
          .details-row {
            display: table-row;
          }
          .details-label {
            display: table-cell;
            font-weight: 600;
            padding: 8px 0;
            width: 40%;
            color: #596880;
          }
          .details-value {
            display: table-cell;
            padding: 8px 0;
          }
          .amount {
            font-weight: 600;
            color: #27ae60;
          }
          .footer {
            background-color: #f5f7fa;
            padding: 20px;
            text-align: center;
            color: #596880;
            font-size: 14px;
            border-top: 1px solid #e1e8ed;
          }
          .contact-us {
            margin-top: 25px;
            text-align: center;
          }
          .social-links {
            margin: 15px 0;
            text-align: center;
          }
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #3498db;
            text-decoration: none;
          }
          .button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 4px;
            font-weight: 600;
            margin-top: 10px;
            text-align: center;
          }
          .note {
            font-size: 14px;
            color: #596880;
            font-style: italic;
            margin-top: 20px;
          }
          /* Responsive adjustments */
          @media only screen and (max-width: 480px) {
            .header {
              padding: 20px 15px;
            }
            .header h1 {
              font-size: 24px;
            }
            .content {
              padding: 20px 15px;
            }
            .details-label, .details-value {
              display: block;
              width: 100%;
            }
            .details-label {
              padding-bottom: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to GOALETE CLUB!</h1>
            <p>How to Achieve Any Goal in Life</p>
          </div>
          
          <div class="content">
            <div class="welcome-message">
              <p>Dear ${recipient.name},</p>
              <p>Thank you for joining GOALETE CLUB! We're thrilled to have you as a member and look forward to helping you achieve your goals.</p>
              <p>Your subscription has been successfully activated. Here are your subscription details:</p>
            </div>
            
            <div class="section">
              <h2>Subscription Details</h2>
              <div class="details">
                <div class="details-row">
                  <div class="details-label">Plan Type:</div>
                  <div class="details-value"><strong>${planDisplay}</strong></div>
                </div>
                <div class="details-row">
                  <div class="details-label">Start Date:</div>
                  <div class="details-value">${formattedStartDate}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">End Date:</div>
                  <div class="details-value">${formattedEndDate}</div>
                </div>
                <div class="details-row">
                  <div class="details-label">Amount Paid:</div>
                  <div class="details-value"><span class="amount">₹${amount.toFixed(2)}</span></div>
                </div>
                ${paymentId ? `
                <div class="details-row">
                  <div class="details-label">Payment Reference:</div>
                  <div class="details-value">${paymentId}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div class="section">
              <h2>What's Next?</h2>
              <p>Our team will be in touch with you shortly to schedule your ${planType === 'daily' ? 'session' : 'first session'}.</p>
              <p>You will receive a calendar invitation via email with the meeting details.</p>
              ${planType === 'daily' ? `
                <p>Your session will be conducted online via Google Meet on the selected date.</p>
              ` : `
                <p>Your sessions will be conducted online via Google Meet according to the schedule we will establish together.</p>
              `}
            </div>
            
            <div class="contact-us">
              <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
              <a href="mailto:${process.env.EMAIL_USER || 'info@goaleteclub.com'}" class="button">Contact Support</a>
            </div>
            
            <p class="note">Note: Please keep this email for your records. It serves as confirmation of your subscription.</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GOALETE CLUB. All rights reserved.</p>
            <div class="social-links">
              <a href="https://instagram.com/goaleteclub">Instagram</a> | 
              <a href="https://twitter.com/goaleteclub">Twitter</a> | 
              <a href="https://facebook.com/goaleteclub">Facebook</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email
    return await sendEmail({
      to: recipient.email,
      subject: `Welcome to GOALETE CLUB - Your ${planDisplay} Subscription`,
      html: htmlContent
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}
