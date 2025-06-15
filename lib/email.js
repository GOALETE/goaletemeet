"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.createCalendarEvent = createCalendarEvent;
exports.sendMeetingInvite = sendMeetingInvite;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendAdminNotificationEmail = sendAdminNotificationEmail;
exports.sendFamilyAdminNotificationEmail = sendFamilyAdminNotificationEmail;
/**
 * Email service utility for sending meeting invites
 * Using nodemailer with Gmail SMTP
 */
var nodemailer_1 = require("nodemailer");
var dotenv = require('dotenv');
dotenv.config();
// Configure nodemailer with Gmail SMTP
var transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
        // Note: For Gmail, you need to use an "App Password" not your regular password
        // Generate one at: https://myaccount.google.com/apppasswords
    }
});
/**
 * Sends an email with the provided options using Gmail SMTP
 */
function sendEmail(options) {
    return __awaiter(this, void 0, void 0, function () {
        var mailOptions, info, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (!process.env.EMAIL_USER) {
                        console.error('EMAIL_USER environment variable is not set');
                        return [2 /*return*/, false];
                    }
                    mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: options.to,
                        subject: options.subject,
                        text: options.text,
                        html: options.html,
                        attachments: options.attachments
                    };
                    return [4 /*yield*/, transporter.sendMail(mailOptions)];
                case 1:
                    info = _a.sent();
                    console.log('Email sent:', info.messageId);
                    return [2 /*return*/, true];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error sending email:', error_1);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Creates an iCalendar event for meeting invites
 */
function createCalendarEvent(options) {
    var formatDate = function (date) {
        // Create date string in UTC format for iCalendar
        return date
            .toISOString()
            .replace(/-/g, '')
            .replace(/:/g, '')
            .split('.')[0] + 'Z';
    };
    // Add IST timezone information
    var icsEvent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GOALETE//Meeting//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        "DTSTART:".concat(formatDate(options.startTime)),
        "DTEND:".concat(formatDate(options.endTime)),
        "DTSTAMP:".concat(formatDate(new Date())),
        'X-MICROSOFT-CDO-TZID:India Standard Time', // Add explicit timezone identifier for Outlook
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Kolkata',
        'BEGIN:STANDARD',
        'DTSTART:20230101T000000',
        'TZOFFSETFROM:+0530',
        'TZOFFSETTO:+0530',
        'END:STANDARD',
        'END:VTIMEZONE',
        "ORGANIZER;CN=".concat(options.organizer.name, ":mailto:").concat(options.organizer.email),
        "UID:".concat(Math.random().toString(36).substring(2), "@goalete.com"),
        "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=".concat(options.attendee.name, ":mailto:").concat(options.attendee.email),
        "SUMMARY:".concat(options.summary, " (IST)"),
        "DESCRIPTION:".concat(options.description, "\\n\\nNote: All times are in Indian Standard Time (IST)."),
        "LOCATION:".concat(options.location),
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
function sendMeetingInvite(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var calendarEvent, dateOptions, timeOptions, formattedDate, formattedStartTime, formattedEndTime, htmlContent;
        var recipient = _b.recipient, meetingTitle = _b.meetingTitle, meetingDescription = _b.meetingDescription, meetingLink = _b.meetingLink, startTime = _b.startTime, endTime = _b.endTime, _c = _b.platform, platform = _c === void 0 ? 'Google Meet' : _c, hostLink = _b.hostLink;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    calendarEvent = createCalendarEvent({
                        summary: meetingTitle,
                        description: "".concat(meetingDescription, "\n\nJoin using this link: ").concat(meetingLink),
                        location: meetingLink,
                        startTime: startTime,
                        endTime: endTime,
                        organizer: {
                            name: 'GOALETE Club',
                            email: process.env.EMAIL_USER || 'noreply@goalete.com'
                        },
                        attendee: recipient
                    });
                    dateOptions = {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'Asia/Kolkata' // Set timezone to IST
                    };
                    timeOptions = {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata' // Set timezone to IST
                    };
                    formattedDate = startTime.toLocaleDateString('en-IN', dateOptions);
                    formattedStartTime = startTime.toLocaleTimeString('en-IN', timeOptions);
                    formattedEndTime = endTime.toLocaleTimeString('en-IN', timeOptions);
                    htmlContent = "\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <meta charset=\"utf-8\">\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      <title>".concat(meetingTitle, "</title>\n      <style>\n        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }\n        .header { text-align: center; margin-bottom: 30px; }\n        .logo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; }\n        h1 { color: #2c3e50; margin-bottom: 5px; }\n        .meeting-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #3498db; }\n        .meeting-time { font-weight: bold; color: #2c3e50; }\n        .meeting-link { display: inline-block; background-color: #3498db; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin: 20px 0; }\n        .meeting-link:hover { background-color: #2980b9; }\n        .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }\n        .host-link { margin-top: 10px; font-size: 15px; color: #e67e22; }\n      </style>\n    </head>    <body>\n      <div class=\"header\">\n        <img src=\"https://goaletemeet.vercel.app/goalete_logo.jpeg\" alt=\"GOALETE Club\" class=\"logo\">\n        <h1>").concat(meetingTitle, "</h1>\n        <p>How to Achieve Any Goal in Life</p>\n      </div>\n      \n      <p>Hello ").concat(recipient.name, ",</p>\n      \n      <p>").concat(meetingDescription, "</p>\n        <div class=\"meeting-details\">\n        <p><strong>Date:</strong> ").concat(formattedDate, "</p>\n        <p class=\"meeting-time\"><strong>Time (IST):</strong> ").concat(formattedStartTime, " - ").concat(formattedEndTime, "</p>\n        <p><strong>Platform:</strong> ").concat(platform, "</p>\n      </div>\n      \n      <center>\n        <a href=\"").concat(meetingLink, "\" class=\"meeting-link\">Join Meeting</a>\n      </center>\n      ").concat(hostLink ? "<div class=\"host-link\"><strong>Host Link (for admins):</strong> <a href=\"".concat(hostLink, "\">").concat(hostLink, "</a></div>") : '', "\n      <p>Please make sure to join the session on time. The calendar invitation is attached to this email for your convenience.</p>\n      \n      <p>If you have any questions or need assistance, please reply to this email.</p>\n      \n      <p>Looking forward to seeing you!</p>\n      \n      <p>Best regards,<br>GOALETE Club Team</p>\n      \n      <div class=\"footer\">\n        <p>\u00A9 2025 GOALETE Club. All rights reserved.</p>\n      </div>\n    </body>\n    </html>\n  ");
                    return [4 /*yield*/, sendEmail({
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
                        })];
                case 1: 
                // Send the email with calendar attachment
                return [2 /*return*/, _d.sent()];
            }
        });
    });
}
/**
 * Sends a welcome email after successful payment
 */
function sendWelcomeEmail(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var dateOptions, formattedStartDate, formattedEndDate, formattedAmount, planDisplay, htmlContent;
        var recipient = _b.recipient, planType = _b.planType, startDate = _b.startDate, endDate = _b.endDate, amount = _b.amount, paymentId = _b.paymentId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    dateOptions = {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'Asia/Kolkata' // Set timezone to IST
                    };
                    formattedStartDate = startDate.toLocaleDateString('en-IN', dateOptions);
                    formattedEndDate = endDate.toLocaleDateString('en-IN', dateOptions);
                    formattedAmount = "\u20B9".concat(amount.toFixed(2));
                    switch (planType.toLowerCase()) {
                        case 'daily':
                            planDisplay = 'Daily Session';
                            break;
                        case 'monthly':
                            planDisplay = 'Monthly Plan';
                            break;
                        case 'unlimited':
                            planDisplay = 'Unlimited Plan';
                            break;
                        default:
                            planDisplay = planType; // Use the original value if no mapping exists
                    }
                    htmlContent = "\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <meta charset=\"utf-8\">\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      <title>Welcome to GOALETE Club!</title>\n      <style>\n        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }\n        .header { text-align: center; margin-bottom: 30px; }\n        .logo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; }\n        h1 { color: #2c3e50; margin-bottom: 5px; }\n        .plan-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #27ae60; }\n        .highlight { font-weight: bold; color: #27ae60; }\n        .instructions { background-color: #eafaf1; padding: 15px; border-radius: 8px; margin: 20px 0; }\n        .footer { margin-top: 40px; font-size: 14px; color: #7f8c8d; text-align: center; }\n      </style>\n    </head>\n    <body>      <div class=\"header\">\n        <img src=\"https://goaletemeet.vercel.app/goalete_logo.jpeg\" alt=\"GOALETE Club\" class=\"logo\">\n        <h1>Welcome to GOALETE Club!</h1>\n        <p>Your journey to achieving your goals starts now</p>\n      </div>\n      \n      <p>Hello ".concat(recipient.name, ",</p>\n      \n      <p>Thank you for joining GOALETE Club! Your payment has been successfully processed, and your subscription is now active.</p>      <div class=\"plan-details\">\n        <p><strong>Plan:</strong> ").concat(planDisplay, "</p>\n        <p><strong>Amount Paid:</strong> ").concat(formattedAmount, "</p>\n        ").concat(paymentId ? "<p><strong>Payment ID:</strong> ".concat(paymentId, "</p>") : '', "\n        <p><strong>Start Date:</strong> ").concat(formattedStartDate, "</p>\n        <p><strong>End Date:</strong> ").concat(formattedEndDate, "</p>\n      </div>\n        <div class=\"instructions\">\n        <p><strong>Important Instructions:</strong></p>\n        <p>1. You will receive a meeting invitation email <span class=\"highlight\">every day at 8:00 AM (IST)</span> during your subscription period.</p>\n        <p>2. The invitation will contain the meeting link and details for that day's session.</p>\n        <p>3. Sessions are held daily at <span class=\"highlight\">9:00 PM (IST)</span>.</p>\n        <p>4. Please ensure you join the session on time for the best experience.</p>\n      </div>\n        <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>\n      \n      <p>We're excited to have you with us and look forward to helping you achieve your goals!</p>\n      \n      <p>Best regards,<br>GOALETE Club Team</p>\n      \n      <div class=\"footer\">\n        <p>\u00A9 2025 GOALETE Club. All rights reserved.</p>\n      </div>\n    </body>\n    </html>\n  ");
                    return [4 /*yield*/, sendEmail({
                            to: recipient.email,
                            subject: 'Welcome to GOALETE Club - Your Subscription is Active!',
                            html: htmlContent
                        })];
                case 1: 
                // Send the welcome email
                return [2 /*return*/, _c.sent()];
            }
        });
    });
}
/**
 * Sends a notification email to admin when a new user registers
 */
function sendAdminNotificationEmail(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var adminEmail, dateOptions, formattedStartDate, formattedEndDate, formattedAmount, planDisplay, currentDateTime, htmlContent, error_2;
        var user = _b.user, planType = _b.planType, startDate = _b.startDate, endDate = _b.endDate, amount = _b.amount, paymentId = _b.paymentId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    adminEmail = process.env.ADMIN_EMAIL;
                    if (!adminEmail) {
                        console.error('ADMIN_EMAIL environment variable is not set');
                        return [2 /*return*/, false];
                    }
                    dateOptions = {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'Asia/Kolkata' // Set timezone to IST
                    };
                    formattedStartDate = startDate.toLocaleDateString('en-IN', dateOptions);
                    formattedEndDate = endDate.toLocaleDateString('en-IN', dateOptions);
                    formattedAmount = "\u20B9".concat(amount.toFixed(2));
                    planDisplay = void 0;
                    switch (planType.toLowerCase()) {
                        case 'daily':
                            planDisplay = 'Daily Session';
                            break;
                        case 'monthly':
                            planDisplay = 'Monthly Plan';
                            break;
                        case 'unlimited':
                            planDisplay = 'Unlimited Plan';
                            break;
                        default:
                            planDisplay = planType; // Use the original value if no mapping exists
                    }
                    currentDateTime = new Date().toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    htmlContent = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n        <title>New Registration Notification</title>\n        <style>\n          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }\n          .header { text-align: center; margin-bottom: 20px; background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; }\n          h1 { margin-bottom: 5px; font-size: 24px; }\n          .user-details, .subscription-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #3498db; }\n          .payment-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #27ae60; }\n          table { width: 100%; border-collapse: collapse; }\n          table td { padding: 8px; border-bottom: 1px solid #eee; }\n          table td:first-child { font-weight: bold; width: 35%; }\n          .footer { margin-top: 30px; font-size: 14px; color: #7f8c8d; text-align: center; }\n        </style>\n      </head>\n      <body>\n        <div class=\"header\">\n          <h1>\uD83D\uDCD4 New Registration Alert</h1>\n        </div>\n        \n        <p>A new user has successfully registered and completed payment on GOALETE Club.</p>\n        \n        <div class=\"user-details\">\n          <h2>User Details</h2>\n          <table>\n            <tr>\n              <td>User ID:</td>\n              <td>".concat(user.id, "</td>\n            </tr>\n            <tr>\n              <td>Name:</td>\n              <td>").concat(user.firstName, " ").concat(user.lastName, "</td>\n            </tr>\n            <tr>\n              <td>Email:</td>\n              <td>").concat(user.email, "</td>\n            </tr>\n            <tr>\n              <td>Phone:</td>\n              <td>").concat(user.phone, "</td>\n            </tr>\n            <tr>\n              <td>Source:</td>\n              <td>").concat(user.source, "</td>\n            </tr>\n            ").concat(user.referenceName ? "\n            <tr>\n              <td>Reference:</td>\n              <td>".concat(user.referenceName, "</td>\n            </tr>") : '', "\n          </table>\n        </div>\n        \n        <div class=\"subscription-details\">\n          <h2>Subscription Details</h2>\n          <table>\n            <tr>\n              <td>Plan Type:</td>\n              <td>").concat(planDisplay, "</td>\n            </tr>\n            <tr>\n              <td>Start Date:</td>\n              <td>").concat(formattedStartDate, "</td>\n            </tr>\n            <tr>\n              <td>End Date:</td>\n              <td>").concat(formattedEndDate, "</td>\n            </tr>\n          </table>\n        </div>\n        \n        <div class=\"payment-details\">\n          <h2>Payment Details</h2>\n          <table>\n            <tr>\n              <td>Amount:</td>\n              <td>").concat(formattedAmount, "</td>\n            </tr>\n            ").concat(paymentId ? "\n            <tr>\n              <td>Payment ID:</td>\n              <td>".concat(paymentId, "</td>\n            </tr>") : '', "\n            <tr>\n              <td>Timestamp:</td>\n              <td>").concat(currentDateTime, "</td>\n            </tr>\n          </table>\n        </div>\n        \n        <p>You can view and manage this user in the <a href=\"https://goaletemeet.vercel.app/admin\">admin dashboard</a>.</p>\n        \n        <div class=\"footer\">\n          <p>\u00A9 2025 GOALETE Club. This is an automated notification from the system.</p>\n        </div>\n      </body>\n      </html>\n    ");
                    return [4 /*yield*/, sendEmail({
                            to: adminEmail,
                            subject: "New Registration: ".concat(user.firstName, " ").concat(user.lastName, " (").concat(planDisplay, ")"),
                            html: htmlContent
                        })];
                case 1: 
                // Send the notification email to admin
                return [2 /*return*/, _c.sent()];
                case 2:
                    error_2 = _c.sent();
                    console.error('Error sending admin notification email:', error_2);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Helper: family plan admin notification
function sendFamilyAdminNotificationEmail(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var adminEmail, dateOptions, formattedStartDate, formattedEndDate, formattedAmount, planDisplay, currentDateTime, htmlContent, error_3;
        var users = _b.users, planType = _b.planType, startDate = _b.startDate, endDate = _b.endDate, amount = _b.amount, paymentId = _b.paymentId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    adminEmail = process.env.ADMIN_EMAIL;
                    if (!adminEmail) {
                        console.error('ADMIN_EMAIL environment variable is not set');
                        return [2 /*return*/, false];
                    }
                    dateOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' };
                    formattedStartDate = startDate.toLocaleDateString('en-IN', dateOptions);
                    formattedEndDate = endDate.toLocaleDateString('en-IN', dateOptions);
                    formattedAmount = "\u20B9".concat(amount.toFixed(2));
                    planDisplay = void 0;
                    switch (planType.toLowerCase()) {
                        case 'monthlyfamily':
                            planDisplay = 'Monthly Family Plan';
                            break;
                        case 'daily':
                            planDisplay = 'Daily Session';
                            break;
                        case 'monthly':
                            planDisplay = 'Monthly Plan';
                            break;
                        case 'unlimited':
                            planDisplay = 'Unlimited Plan';
                            break;
                        default: planDisplay = planType;
                    }
                    currentDateTime = new Date().toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                    });
                    htmlContent = "\n      <!DOCTYPE html>\n      <html>\n      <head>\n        <meta charset=\"utf-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n        <title>New Family Registration Notification</title>\n        <style>\n          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }\n          .header { text-align: center; margin-bottom: 20px; background-color: #2c3e50; color: white; padding: 10px; border-radius: 5px; }\n          h1 { margin-bottom: 5px; font-size: 24px; }\n          .user-details, .subscription-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #3498db; }\n          .payment-details { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #27ae60; }\n          table { width: 100%; border-collapse: collapse; }\n          table td { padding: 8px; border-bottom: 1px solid #eee; }\n          table td:first-child { font-weight: bold; width: 35%; }\n          .footer { margin-top: 30px; font-size: 14px; color: #7f8c8d; text-align: center; }\n        </style>\n      </head>\n      <body>\n        <div class=\"header\">\n          <h1>\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66 New Family Registration Alert</h1>\n        </div>\n        <p>A new <b>Monthly Family Plan</b> registration and payment has been completed on GOALETE Club.</p>\n        <div class=\"user-details\">\n          <h2>Family Members</h2>\n          <table>\n            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Subscription ID</th></tr>\n            ".concat(users.map(function (u) { return "<tr><td>".concat(u.firstName, " ").concat(u.lastName, "</td><td>").concat(u.email, "</td><td>").concat(u.phone, "</td><td>").concat(u.subscriptionId, "</td></tr>"); }).join(''), "\n          </table>\n        </div>\n        <div class=\"subscription-details\">\n          <h2>Subscription Details</h2>\n          <table>\n            <tr><td>Plan Type:</td><td>").concat(planDisplay, "</td></tr>\n            <tr><td>Start Date:</td><td>").concat(formattedStartDate, "</td></tr>\n            <tr><td>End Date:</td><td>").concat(formattedEndDate, "</td></tr>\n          </table>\n        </div>\n        <div class=\"payment-details\">\n          <h2>Payment Details</h2>\n          <table>\n            <tr><td>Amount:</td><td>").concat(formattedAmount, "</td></tr>\n            ").concat(paymentId ? "<tr><td>Payment ID:</td><td>".concat(paymentId, "</td></tr>") : '', "\n            <tr><td>Timestamp:</td><td>").concat(currentDateTime, "</td></tr>\n          </table>\n        </div>\n        <p>You can view and manage these users in the <a href=\"https://goaletemeet.vercel.app/admin\">admin dashboard</a>.</p>\n        <div class=\"footer\">\n          <p>\u00A9 2025 GOALETE Club. This is an automated notification from the system.</p>\n        </div>\n      </body>\n      </html>\n    ");
                    return [4 /*yield*/, sendEmail({
                            to: adminEmail,
                            subject: "New Family Registration: ".concat(users.map(function (u) { return u.firstName; }).join(' & '), " (").concat(planDisplay, ")"),
                            html: htmlContent
                        })];
                case 1: return [2 /*return*/, _c.sent()];
                case 2:
                    error_3 = _c.sent();
                    console.error('Error sending admin notification email (family):', error_3);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
