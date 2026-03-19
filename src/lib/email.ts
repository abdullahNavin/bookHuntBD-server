import { Resend } from "resend";
import { config } from "../config.js";

const resend = new Resend(config.RESEND_API_KEY);

interface PriceAlertEmailParams {
    to: string;
    bookTitle: string;
    currentPrice: number;
    targetPrice: number;
    bookLink: string;
    site: string;
}

export async function sendPriceAlertEmail(params: PriceAlertEmailParams) {
    const { to, bookTitle, currentPrice, targetPrice, bookLink, site } = params;

    const { data, error } = await resend.emails.send({
        from: config.ALERT_FROM_EMAIL,
        to,
        subject: `📚 Price Drop Alert: ${bookTitle}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📚 Price Drop Alert!</h2>
        <p>Great news! The book you're tracking has hit your target price.</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${bookTitle}</h3>
          <p style="margin: 4px 0;"><strong>Current Price:</strong> ৳${currentPrice}</p>
          <p style="margin: 4px 0;"><strong>Your Target:</strong> ৳${targetPrice}</p>
          <p style="margin: 4px 0;"><strong>Site:</strong> ${site}</p>
        </div>
        <a href="${bookLink}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                  border-radius: 6px; text-decoration: none; font-weight: bold;">
          View Book →
        </a>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
          — BookHuntBD Price Alerts
        </p>
      </div>
    `,
    });

    if (error) {
        console.error("Failed to send price alert email:", error);
        throw error;
    }

    return data;
}
