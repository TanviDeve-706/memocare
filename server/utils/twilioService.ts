import twilio from 'twilio';
import type { Contact } from '@shared/schema';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

class TwilioService {
  private client: twilio.Twilio | null = null;
  private config: TwilioConfig | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Only initialize if all credentials are properly configured
    if (accountSid && accountSid.startsWith('AC') && authToken && phoneNumber) {
      this.config = { accountSid, authToken, phoneNumber };
      this.client = twilio(accountSid, authToken);
      console.log('Twilio service initialized successfully');
    } else {
      console.warn('Twilio credentials not configured. SMS functionality will be disabled.');
      console.warn('Required environment variables: TWILIO_ACCOUNT_SID (must start with AC), TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    }
  }

  async sendEmergencyAlert(emergencyContacts: Contact[], patientName: string = 'Your patient', location?: string): Promise<{
    success: boolean;
    results: Array<{ contact: string; success: boolean; error?: string }>;
  }> {
    if (!this.client || !this.config) {
      return {
        success: false,
        results: [{
          contact: 'system',
          success: false,
          error: 'Twilio not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.'
        }]
      };
    }

    const locationText = location ? ` from ${location}` : '';
    const message = `🚨 ALERT: ${patientName} has issued an emergency alert${locationText}. Please check on them immediately.`;

    const results: Array<{ contact: string; success: boolean; error?: string }> = [];

    for (const contact of emergencyContacts) {
      if (!contact.phone) {
        results.push({
          contact: contact.name,
          success: false,
          error: 'No phone number available'
        });
        continue;
      }

      try {
        const result = await this.client.messages.create({
          body: message,
          from: this.config.phoneNumber,
          to: contact.phone
        });

        console.log(`Emergency SMS sent to ${contact.name} (${contact.phone}): ${result.sid}`);
        results.push({
          contact: contact.name,
          success: true
        });
      } catch (error: any) {
        console.error(`Failed to send SMS to ${contact.name} (${contact.phone}):`, error.message);
        results.push({
          contact: contact.name,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      results
    };
  }

  isConfigured(): boolean {
    return this.client !== null && this.config !== null;
  }

  getConfigStatus(): { configured: boolean; missingVars?: string[] } {
    const requiredVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    return {
      configured: missingVars.length === 0,
      missingVars: missingVars.length > 0 ? missingVars : undefined
    };
  }
}

export const twilioService = new TwilioService();