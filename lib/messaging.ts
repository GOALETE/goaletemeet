/**
 * Unified messaging service for GOALETE
 * Currently supports email, can be extended to support WhatsApp and other platforms
 */
import { sendMeetingInvite as sendEmailInvite } from './email';

export interface MessageRecipient {
  name: string;
  email: string;
  phone?: string;
}

export interface MeetingInviteData {
  recipient: MessageRecipient;
  meetingTitle: string;
  meetingDescription: string;
  meetingLink: string;
  startTime: Date;
  endTime: Date;
  platform: string;
  hostLink?: string;
}

export interface MessageResult {
  success: boolean;
  platform: 'email' | 'whatsapp';
  error?: string;
  messageId?: string;
}

export interface MessagingOptions {
  enableEmail?: boolean;
  enableWhatsApp?: boolean;
}

/**
 * Main messaging service class
 */
export class MessagingService {
  private options: MessagingOptions;

  constructor(options: MessagingOptions = {}) {
    this.options = {
      enableEmail: true,
      enableWhatsApp: false, // Will be enabled later
      ...options
    };
  }

  /**
   * Send meeting invite using the configured messaging platforms
   * @param data Meeting invite data
   * @returns Array of results from different messaging platforms
   */
  async sendMeetingInvite(data: MeetingInviteData): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    // Currently only email is implemented
    if (this.options.enableEmail) {
      try {
        const emailSuccess = await sendEmailInvite(data);
        results.push({
          success: emailSuccess,
          platform: 'email',
          error: emailSuccess ? undefined : 'Email sending failed'
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          success: false,
          platform: 'email',
          error: errorMessage
        });
      }
    }

    // TODO: Add WhatsApp implementation here
    if (this.options.enableWhatsApp) {
      try {
        const whatsappResult = await this.sendWhatsAppInvite(data);
        results.push(whatsappResult);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          success: false,
          platform: 'whatsapp',
          error: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * Send immediate invite for users who register after cron but before meeting
   * @param data Meeting invite data
   * @returns Result of the immediate invite
   */
  async sendImmediateInvite(data: MeetingInviteData): Promise<MessageResult> {
    // For immediate invites, we prefer the fastest reliable method (email)
    try {
      const emailSuccess = await sendEmailInvite(data);
      return {
        success: emailSuccess,
        platform: 'email',
        error: emailSuccess ? undefined : 'Immediate email invite failed'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        platform: 'email',
        error: errorMessage
      };
    }
  }

  /**
   * WhatsApp implementation (placeholder for future)
   * @param data Meeting invite data
   * @returns Promise<MessageResult>
   */
  private async sendWhatsAppInvite(data: MeetingInviteData): Promise<MessageResult> {
    // TODO: Implement WhatsApp Business API integration
    // This will be implemented when WhatsApp messaging is required
    
    console.log('WhatsApp messaging not yet implemented');
    return {
      success: false,
      platform: 'whatsapp',
      error: 'WhatsApp messaging not yet implemented'
    };
  }

  /**
   * Get the platform preference from environment variables
   * @returns Default platform configuration
   */
  static getDefaultOptions(): MessagingOptions {
    return {
      enableEmail: process.env.ENABLE_EMAIL_MESSAGING !== 'false', // Default to true
      enableWhatsApp: process.env.ENABLE_WHATSAPP_MESSAGING === 'true' // Default to false
    };
  }
}

/**
 * Default messaging service instance with environment-based configuration
 */
export const defaultMessagingService = new MessagingService(MessagingService.getDefaultOptions());

/**
 * Convenience function for sending meeting invites using the default service
 * @param data Meeting invite data
 * @returns Promise<boolean> - true if at least one platform succeeded
 */
export async function sendMeetingInviteViaMessaging(data: MeetingInviteData): Promise<boolean> {
  const results = await defaultMessagingService.sendMeetingInvite(data);
  return results.some(result => result.success);
}

/**
 * Convenience function for sending immediate invites
 * @param data Meeting invite data
 * @returns Promise<boolean> - true if the invite was sent successfully
 */
export async function sendImmediateInviteViaMessaging(data: MeetingInviteData): Promise<boolean> {
  const result = await defaultMessagingService.sendImmediateInvite(data);
  return result.success;
}

/**
 * Bulk messaging function for sending invites to multiple recipients
 * @param invites Array of meeting invite data
 * @param options Messaging options
 * @returns Promise with summary of results
 */
export async function sendBulkMeetingInvites(
  invites: MeetingInviteData[], 
  options?: MessagingOptions
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: { recipient: string; success: boolean; errors?: string[] }[];
}> {
  const messagingService = options ? new MessagingService(options) : defaultMessagingService;
  const results: { recipient: string; success: boolean; errors?: string[] }[] = [];

  let successful = 0;
  let failed = 0;

  for (const invite of invites) {
    try {
      const messageResults = await messagingService.sendMeetingInvite(invite);
      const overallSuccess = messageResults.some(result => result.success);
      
      if (overallSuccess) {
        successful++;
      } else {
        failed++;
      }

      results.push({
        recipient: invite.recipient.email,
        success: overallSuccess,
        errors: overallSuccess ? undefined : messageResults.map(r => r.error).filter(Boolean) as string[]
      });
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        recipient: invite.recipient.email,
        success: false,
        errors: [errorMessage]
      });
    }
  }

  return {
    total: invites.length,
    successful,
    failed,
    results
  };
}
