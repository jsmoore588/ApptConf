import { DEFAULT_LOCATION_ADDRESS, DEFAULT_LOCATION_NAME } from "@/lib/constants";

type CreateCalendarEventInput = {
  name: string;
  vehicle: string;
  timeLabel: string;
  scheduledAt?: string | null;
  email?: string;
  pageUrl: string;
  locationName?: string;
  locationAddress?: string;
};

type GoogleEventResponse = {
  id: string;
};

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error("Unable to refresh Google access token");
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

export async function createGoogleCalendarEvent(input: CreateCalendarEventInput) {
  const accessToken = await getGoogleAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const notifyEmail = process.env.CALENDAR_NOTIFY_EMAIL;

  if (!accessToken || !input.scheduledAt) {
    return null;
  }

  const start = new Date(input.scheduledAt);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const location = input.locationAddress || input.locationName || `${DEFAULT_LOCATION_NAME}, ${DEFAULT_LOCATION_ADDRESS}`;

  const description = [
    `Vehicle: ${input.vehicle}`,
    `Appointment time: ${input.timeLabel}`,
    `Location: ${location}`,
    `Page: ${input.pageUrl}`
  ].join("\n");

  const attendees = [input.email, notifyEmail].filter(Boolean).map((email) => ({ email: email as string }));

  const body = {
    summary: `Appointment to Sell ${input.vehicle}`,
    description,
    location,
    start: {
      dateTime: start.toISOString(),
      timeZone: "America/Chicago"
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "America/Chicago"
    },
    attendees: attendees.length > 0 ? attendees : undefined
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=${attendees.length > 0 ? "all" : "none"}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw new Error("Unable to create Google Calendar event");
  }

  const payload = (await response.json()) as GoogleEventResponse;
  return payload.id;
}
