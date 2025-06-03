/**
 * Email service utility for sending meeting invites
 * Using nodemailer with Gmail SMTP
 */
import nodemailer from 'nodemailer';
const dotenv = require('dotenv');
dotenv.config();

// Configure nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
    // Note: For Gmail, you need to use an "App Password" not your regular password
    // Generate one at: https://myaccount.google.com/apppasswords
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
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
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Creates an iCalendar event for meeting invites
 */
export function createCalendarEvent(options: {
  summary: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  organizer: {
    name: string;
    email: string;
  };
  attendee: {
    name: string;
    email: string;
  };
}): string {
  const formatDate = (date: Date) => {
    // Create date string in UTC format for iCalendar
    return date
      .toISOString()
      .replace(/-/g, '')
      .replace(/:/g, '')
      .split('.')[0] + 'Z';
  };

  // Add IST timezone information
  const icsEvent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GOALETE//Meeting//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(options.startTime)}`,
    `DTEND:${formatDate(options.endTime)}`,
    `DTSTAMP:${formatDate(new Date())}`,
    'X-MICROSOFT-CDO-TZID:India Standard Time', // Add explicit timezone identifier for Outlook
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'BEGIN:STANDARD',
    'DTSTART:20230101T000000',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'END:STANDARD',
    'END:VTIMEZONE',
    `ORGANIZER;CN=${options.organizer.name}:mailto:${options.organizer.email}`,    `UID:${Math.random().toString(36).substring(2)}@goalete.com`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${options.attendee.name}:mailto:${options.attendee.email}`,
    `SUMMARY:${options.summary} (IST)`,
    `DESCRIPTION:${options.description}\\n\\nNote: All times are in Indian Standard Time (IST).`,
    `LOCATION:${options.location}`,
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsEvent;
}

/**
 * Sends a meeting invite email with calendar attachment
 */
export async function sendMeetingInvite({
  recipient,
  meetingTitle,
  meetingDescription,
  meetingLink,
  startTime,
  endTime,
  platform = 'Google Meet',
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
  platform?: string;
  hostLink?: string;
}): Promise<boolean> {
  // Create calendar event
  const calendarEvent = createCalendarEvent({
    summary: meetingTitle,
    description: `${meetingDescription}\n\nJoin using this link: ${meetingLink}`,
    location: meetingLink,
    startTime,
    endTime,    organizer: {
      name: 'GOALETE Club',
      email: process.env.EMAIL_USER || 'noreply@goalete.com'
    },
    attendee: recipient
  });
  // Format date and time for display
  const dateOptions: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata' // Set timezone to IST
  };
  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true,
    timeZone: 'Asia/Kolkata' // Set timezone to IST
  };
  
  const formattedDate = startTime.toLocaleDateString('en-IN', dateOptions);
  const formattedStartTime = startTime.toLocaleTimeString('en-IN', timeOptions);
  const formattedEndTime = endTime.toLocaleTimeString('en-IN', timeOptions);

  // Prepare email content with responsive design
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${meetingTitle}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; }
        h1 { color: #2c3e50; margin-bottom: 5px; }
        .meeting-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #3498db; }
        .meeting-time { font-weight: bold; color: #2c3e50; }
        .meeting-link { display: inline-block; background-color: #3498db; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin: 20px 0; }
        .meeting-link:hover { background-color: #2980b9; }
        .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }
        .host-link { margin-top: 10px; font-size: 15px; color: #e67e22; }
      </style>
    </head>    <body>
      <div class="header">
        <img src="https://goaletemeet.vercel.app/goalete_logo.jpeg" alt="GOALETE Club" class="logo">
        <h1>${meetingTitle}</h1>
        <p>How to Achieve Any Goal in Life</p>
      </div>
      
      <p>Hello ${recipient.name},</p>
      
      <p>${meetingDescription}</p>
        <div class="meeting-details">
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p class="meeting-time"><strong>Time (IST):</strong> ${formattedStartTime} - ${formattedEndTime}</p>
        <p><strong>Platform:</strong> ${platform}</p>
      </div>
      
      <center>
        <a href="${meetingLink}" class="meeting-link">Join Meeting</a>
      </center>
      ${hostLink ? `<div class="host-link"><strong>Host Link (for admins):</strong> <a href="${hostLink}">${hostLink}</a></div>` : ''}
      <p>Please make sure to join the session on time. The calendar invitation is attached to this email for your convenience.</p>
      
      <p>If you have any questions or need assistance, please reply to this email.</p>
      
      <p>Looking forward to seeing you!</p>
      
      <p>Best regards,<br>GOALETE Club Team</p>
      
      <div class="footer">
        <p>Â© 2025 GOALETE Club. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  // Send the email with calendar attachment
  return await sendEmail({
    to: recipient.email,
    subject: meetingTitle,
    html: htmlContent,
    attachments: [
      {
        filename: 'meeting.ics',
        content: calendarEvent,
        contentType: 'text/calendar'
      }
    ]
  });
}

/**
 * Sends a welcome email after successful payment
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
  amount: number; // This should now be the price in rupees, not paise
  paymentId?: string; // Payment reference ID, optional
}): Promise<boolean> {// Format dates for display
  const dateOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata' // Set timezone to IST
  };
  
  const formattedStartDate = startDate.toLocaleDateString('en-IN', dateOptions);
  const formattedEndDate = endDate.toLocaleDateString('en-IN', dateOptions);
  
  // Display amount in INR
  const formattedAmount = `â‚¹${amount.toFixed(2)}`;
  
  // Plan type display name
  const planDisplay = planType === 'single' ? 'Single Session' : 'Monthly Plan';

  // HTML content for welcome email
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to GOALETE Club!</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; }
        h1 { color: #2c3e50; margin-bottom: 5px; }
        .plan-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #27ae60; }
        .highlight { font-weight: bold; color: #27ae60; }
        .instructions { background-color: #eafaf1; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }
      </style>
    </head>
    <body>      <div class="header">
        <img src="https://goaletemeet.vercel.app/goalete_logo.jpeg" alt="GOALETE Club" class="logo">
        <h1>Welcome to GOALETE Club!</h1>
        <p>Your journey to achieving your goals starts now</p>
      </div>
      
      <p>Hello ${recipient.name},</p>
      
      <p>Thank you for joining GOALETE Club! Your payment has been successfully processed, and your subscription is now active.</p>      <div class="plan-details">
        <p><strong>Plan:</strong> ${planDisplay}</p>
        <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
        ${paymentId ? `<p><strong>Payment ID:</strong> ${paymentId}</p>` : ''}
        <p><strong>Start Date:</strong> ${formattedStartDate}</p>
        <p><strong>End Date:</strong> ${formattedEndDate}</p>
      </div>
        <div class="instructions">
        <p><strong>Important Instructions:</strong></p>
        <p>1. You will receive a meeting invitation email <span class="highlight">every day at 8:00 AM (IST)</span> during your subscription period.</p>
        <p>2. The invitation will contain the meeting link and details for that day's session.</p>
        <p>3. Sessions are held daily at <span class="highlight">9:00 PM (IST)</span>.</p>
        <p>4. Please ensure you join the session on time for the best experience.</p>
      </div>
        <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
      
      <p>We're excited to have you with us and look forward to helping you achieve your goals!</p>
      
      <p>Best regards,<br>GOALETE Club Team</p>
      
      <div class="footer">
        <p>Â© 2025 GOALETE Club. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  // Send the welcome email
  return await sendEmail({
    to: recipient.email,
    subject: 'Welcome to GOALETE Club - Your Subscription is Active!',
    html: htmlContent  });
}

/**
 * Sends a notification email to admin when a new user registers
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
    source: string;
    referenceName?: string;
  };
  planType: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentId?: string;
}): Promise<boolean> {
  try {
    // Get admin email from environment variable
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error('ADMIN_EMAIL environment variable is not set');
      return false;
    }

    // Format dates for display
    const dateOptions: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Kolkata' // Set timezone to IST
    };
    
    const formattedStartDate = startDate.toLocaleDateString('en-IN', dateOptions);
    const formattedEndDate = endDate.toLocaleDateString('en-IN', dateOptions);
    
    // Display amount in INR
    const formattedAmount = `â‚¹${amount.toFixed(2)}`;
    
    // Plan type display name
    const planDisplay = planType === 'single' ? 'Single Session' : 'Monthly Plan';
    
    // Current date and time in IST
    const currentDateTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // HTML content for admin notification email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Registration Notification</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; }
          h1 { margin-bottom: 5px; font-size: 24px; }
          .user-details, .subscription-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #3498db; }
          .payment-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #27ae60; }
          table { width: 100%; border-collapse: collapse; }
          table td { padding: 8px; border-bottom: 1px solid #eee; }
          table td:first-child { font-weight: bold; width: 35%; }
          .footer { margin-top: 30px; font-size: 14px; color: #7f8c8d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ðŸ”” New Registration Alert</h1>
        </div>
        
        <p>A new user has successfully registered and completed payment on GOALETE Club.</p>
        
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
              <td>${user.source}</td>
            </tr>
            ${user.referenceName ? `
            <tr>
              <td>Reference:</td>
              <td>${user.referenceName}</td>
            </tr>` : ''}
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
              <td>${formattedAmount}</td>
            </tr>
            ${paymentId ? `
            <tr>
              <td>Payment ID:</td>
              <td>${paymentId}</td>
            </tr>` : ''}
            <tr>
              <td>Timestamp:</td>
              <td>${currentDateTime}</td>
            </tr>
          </table>
        </div>
        
        <p>You can view and manage this user in the <a href="https://goaletemeet.vercel.app/admin">admin dashboard</a>.</p>
        
        <div class="footer">
          <p>Â© 2025 GOALETE Club. This is an automated notification from the system.</p>
        </div>
      </body>
      </html>
    `;

    // Send the notification email to admin
    return await sendEmail({
      to: adminEmail,
      subject: `New Registration: ${user.firstName} ${user.lastName} (${planDisplay})`,
      html: htmlContent
    });
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return false;
  }
}
