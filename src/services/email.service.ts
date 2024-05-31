import { SESClient, SendEmailCommand, Message } from "@aws-sdk/client-ses";
import { html } from "hono/html";

let client: SESClient;

export interface EmailData {
  Mode: string;
  code: string;
  Device: string;
  Date: string;
}

const getClient = (accessKeyId: string, secretAccessKey: string): SESClient => {
  client =
    client ||
    new SESClient({
      region: "eu-central-1",
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  return client;
};

const sendEmail = async (
  to: string,
  message: Message,
  accessKeyId: string,
  secretAccessKey: string
): Promise<void> => {
  const sesClient = getClient(accessKeyId, secretAccessKey);
  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Source: "no-reply@bibliobay.net",
    Message: message,
  });
  await sesClient.send(command);
};

export const sendOtpEmail = async (
  email: string,
  emailData: EmailData,
  accessKeyId: string,
  secretAccessKey: string
): Promise<void> => {
  const message = {
    Subject: {
      Data: "Reset your password",
      Charset: "UTF-8",
    },
    Body: {
      Text: {
        Charset: "UTF-8",
        Data: `
           ${emailData.Mode}
           ${emailData.code}
           Please note that this OTP code will expire in 15 minutes fom the time it was sent. The code was sent from: ${emailData.Device} on ${emailData.Date}
        `,
      },
      html: {
        Data: html`
          <html>
            <body>
              <h1>${emailData.Mode}</h1>
              <p>${emailData.code}</p>
              <p>
                Please note that this OTP code will expire in 15 minutes fom the
                time it was sent. The code was sent from: ${emailData.Device} on
                ${emailData.Date}
              </p>
            </body>
          </html>
        `,
      },
    },
  };

  await sendEmail(email, message, accessKeyId, secretAccessKey);
};
