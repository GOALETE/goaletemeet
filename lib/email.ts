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
         vercelEnv === 'preview';
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
  paymentId?: string;
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
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Registration Notification</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; background-color: #f5f5f5; padding: 20px; border-radius: 8px; }
        h1 { color: #2c3e50; margin-bottom: 5px; }
        h2 { color: #3498db; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .section { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #3498db; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        td:first-child { font-weight: bold; width: 40%; }
        .amount { color: #27ae60; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔔 New Registration Alert</h1>
      </div>
      
      <p>A new registration and payment has been completed for a <b>${planDisplay}</b>.</p>
      
      <div class="section">
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
      
      <div class="section">
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
      
      <div class="section">
        <h2>Payment Details</h2>
        <table>
          <tr>
            <td>Amount:</td>
            <td class="amount">₹${amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Payment ID:</td>
            <td>${paymentId || 'Not available'}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} GOALETE CLUB. All rights reserved.</p>
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
  paymentId?: string;
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
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Family Registration Notification</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; background-color: #f5f5f5; padding: 20px; border-radius: 8px; }
        h1 { color: #2c3e50; margin-bottom: 5px; }
        h2 { color: #3498db; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .section { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #3498db; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border-bottom: 1px solid #eee; text-align: left; }
        th { background-color: #f9f9f9; }
        .amount { color: #27ae60; font-weight: bold; }
        .member-label { background-color: #e8f4fd; padding: 5px 10px; border-radius: 3px; margin-right: 10px; }
        .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>👨‍👩‍👧‍👦 New Family Registration Alert</h1>
      </div>
      
      <p>A new <b>Monthly Family Plan</b> registration and payment has been completed.</p>
      
      <div class="section">
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
      
      <div class="section">
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
      
      <div class="section">
        <h2>Payment Details</h2>
        <table>
          <tr>
            <td>Amount:</td>
            <td class="amount">₹${amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Payment ID:</td>
            <td>${paymentId || 'Not available'}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} GOALETE CLUB. All rights reserved.</p>
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
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to GOALETE Club!</title>        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #27ae60; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          h1 { color: #2c3e50; margin-bottom: 5px; }
          .plan-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #27ae60; }
          .highlight { font-weight: bold; color: #27ae60; }
          .instructions { background-color: #eafaf1; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .contact-us { margin-top: 20px; background-color: #f0f7fd; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
          .button { display: inline-block; background-color: #3498db; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: 600; }
          .social-links { margin: 15px 0; }
          .social-links a { color: #3498db; text-decoration: none; margin: 0 10px; }
          .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }
          .note { font-size: 14px; color: #596880; font-style: italic; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://goaletemeet.vercel.app/goalete_logo.jpeg" alt="GOALETE Club" class="logo">
          <h1>Welcome to GOALETE Club!</h1>
          <p>Your journey to achieving your goals starts now</p>
        </div>
        
        <p>Dear ${recipient.name},</p>
        
        <p>Thank you for joining GOALETE Club! Your payment has been successfully processed, and your subscription is now active.</p>
        
        <div class="plan-details">
          <p><strong>Plan:</strong> ${planDisplay}</p>
          <p><strong>Amount Paid:</strong> ₹${amount.toFixed(2)}</p>
          ${paymentId ? `<p><strong>Payment ID:</strong> ${paymentId}</p>` : ''}
          <p><strong>Start Date:</strong> ${formattedStartDate}</p>
          <p><strong>End Date:</strong> ${formattedEndDate}</p>
        </div>
        
        <div class="instructions">
          <p><strong>What's Next?</strong></p>
          <p>Our team will be in touch with you shortly to schedule your ${planType === 'daily' ? 'session' : 'first session'}.</p>
          <p>You will receive a calendar invitation via email with the meeting details.</p>
          ${planType === 'daily' ? `
            <p>Your session will be conducted online via Google Meet on the selected date.</p>
          ` : `
            <p>Your sessions will be conducted online via Google Meet according to the schedule we will establish together.</p>
          `}
          <p>Sessions are typically held at <span class="highlight">9:00 PM (IST)</span>.</p>
          <p>Please ensure you join the session on time for the best experience.</p>
        </div>
          <div class="contact-us">
          <p><strong>Questions or Need Help?</strong></p>
          <p>Our support team is ready to assist you with any questions you might have about your subscription or upcoming sessions.</p>
          <a href="mailto:${process.env.EMAIL_USER || 'info@goaleteclub.com'}" class="button">Contact Support</a>
        </div>
        
        <p class="note">Note: Please keep this email for your records. It serves as confirmation of your subscription.</p>
        
        <p>We're excited to have you with us and look forward to helping you achieve your goals!</p>
        
        <p>Best regards,<br>GOALETE Club Team</p>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} GOALETE CLUB. All rights reserved.</p>
          <div class="social-links">
            <a href="https://instagram.com/goaleteclub">Instagram</a> | 
            <a href="https://twitter.com/goaleteclub">Twitter</a> | 
            <a href="https://facebook.com/goaleteclub">Facebook</a>
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

/**
 * Sends a meeting invite email with calendar attachment
 * @param params Parameters including recipient details, meeting info, and platform
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendMeetingInvite({
  recipient,
  meetingTitle,
  meetingDescription,
  meetingLink,
  startTime,
  endTime,
  platform,
  hostLink
}: {
  recipient: {
    name: string;
    email: string;
  };
  meetingTitle: string;
  meetingDescription: string;
  meetingLink: string;
  startTime: Date;
  endTime: Date;
  platform: string;
  hostLink?: string;
}): Promise<boolean> {
  try {
    // Format dates for calendar and display
    const startDateISO = startTime.toISOString();
    const endDateISO = endTime.toISOString();
    
    // Format times for display in email body
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Asia/Kolkata' 
    };
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    };
    
    const formattedDate = startTime.toLocaleDateString('en-IN', dateOptions);
    const formattedStartTime = startTime.toLocaleTimeString('en-IN', timeOptions);
    const formattedEndTime = endTime.toLocaleTimeString('en-IN', timeOptions);
    
    // Platform-specific content
    const platformName = platform === 'Zoom' ? 'Zoom' : 'Google Meet';
    const platformIcon = platform === 'Zoom' ? '🔵' : '👥';
    const platformInstructions = platform === 'Zoom' 
      ? 'You can join using the Zoom app or directly from your web browser.'
      : 'You can join directly from your web browser, no installation required.';
    
    // Create iCalendar content for the meeting
    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GOALETE CLUB//Meeting Invite//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${startDateISO.replace(/[-:]/g, '').replace(/\.\d+/g, '')}
DTEND:${endDateISO.replace(/[-:]/g, '').replace(/\.\d+/g, '')}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/g, '')}
ORGANIZER;CN=GOALETE CLUB:mailto:${process.env.EMAIL_USER}
UID:${Date.now()}@goaleteclub.com
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${recipient.name}:mailto:${recipient.email}
SUMMARY:${meetingTitle}
DESCRIPTION:${meetingDescription}\\n\\nJoin ${platformName}: ${meetingLink}
LOCATION:${meetingLink}
SEQUENCE:0
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
      // Create HTML content with modern, elegant design
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${meetingTitle}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; background-color: ${platform === 'Zoom' ? '#2D8CFF' : '#1a73e8'}; padding: 20px; border-radius: 8px; color: white; }
          h1 { margin-bottom: 5px; }
          .meeting-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${platform === 'Zoom' ? '#2D8CFF' : '#1a73e8'}; }
          .details-row { margin-bottom: 10px; }
          .details-label { font-weight: 600; color: #596880; }
          .meeting-link { background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .meeting-link a { display: inline-block; background-color: ${platform === 'Zoom' ? '#2D8CFF' : '#1a73e8'}; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: 600; margin-top: 10px; }
          .host-link { margin-top: 15px; font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
          .host-link a { color: #1a73e8; text-decoration: underline; }
          .calendar-info { font-style: italic; margin-top: 20px; color: #666; }
          .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${platformIcon} ${meetingTitle}</h1>
        </div>
        
        <p>Dear ${recipient.name},</p>
        <p>You're invited to a GOALETE CLUB session on ${platformName}.</p>
        
        <div class="meeting-details">
          <div class="details-row">
            <div class="details-label">Date:</div>
            <div>${formattedDate}</div>
          </div>
          <div class="details-row">
            <div class="details-label">Time:</div>
            <div>${formattedStartTime} - ${formattedEndTime} (IST)</div>
          </div>
          <div class="details-row">
            <div class="details-label">Platform:</div>
            <div>${platformName}</div>
          </div>
        </div>
        
        <p>${meetingDescription}</p>
        <p>${platformInstructions}</p>
        
        <div class="meeting-link">
          <p>Click the button below to join the meeting:</p>
          <a href="${meetingLink}" target="_blank">Join ${platformName} Meeting</a>
        </div>
        
        ${hostLink ? `
        <div class="host-link">
          <p><strong>For hosts only:</strong> If you are the host, use <a href="${hostLink}">this link</a> to start the meeting.</p>
        </div>
        ` : ''}
        
        <p class="calendar-info">This invitation includes a calendar attachment. Add it to your calendar to receive a reminder.</p>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} GOALETE CLUB. All rights reserved.</p>
          <p>If you have any questions, please contact us at ${process.env.EMAIL_USER || 'info@goaleteclub.com'}</p>
        </div>
      </body>
      </html>
    `;
    
    // Send email with calendar attachment
    return await sendEmail({
      to: recipient.email,
      subject: `${meetingTitle} - GOALETE CLUB`,
      html: htmlContent,
      attachments: [
        {
          filename: 'meeting-invite.ics',
          content: icalContent,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST'
        }
      ]
    });
  } catch (error) {
    console.error('Error sending meeting invite:', error);
    return false;
  }
}
