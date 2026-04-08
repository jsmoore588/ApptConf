type SendSmsInput = {
  to: string;
  body: string;
};

function getTwilioEnv(name: "TWILIO_ACCOUNT_SID" | "TWILIO_AUTH_TOKEN" | "TWILIO_FROM_NUMBER") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export async function sendSms({ to, body }: SendSmsInput) {
  const accountSid = getTwilioEnv("TWILIO_ACCOUNT_SID");
  const authToken = getTwilioEnv("TWILIO_AUTH_TOKEN");
  const from = getTwilioEnv("TWILIO_FROM_NUMBER");
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: body
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed: ${text}`);
  }

  return response.json();
}
