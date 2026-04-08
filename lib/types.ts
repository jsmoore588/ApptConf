export type FeaturedReview = {
  reviewer_name: string;
  review_text: string;
  review_source?: string;
};

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "viewed"
  | "running_late"
  | "reschedule_requested"
  | "canceled"
  | "not_opened"
  | "calendar_sync_failed";

export type Appointment = {
  id: string;
  customer_name: string;
  name: string;
  vehicle: string;
  appointment_at?: string;
  time: string;
  advisor_name: string;
  advisor: string;
  advisor_phone?: string;
  advisor_photo_url?: string;
  appointment_page_url?: string;
  google_calendar_event_id?: string;
  calendar_sync_status?: "pending" | "synced" | "failed";
  status: AppointmentStatus;
  created_at: string;
  updated_at?: string;
  source?: string;
  mileage?: string;
  notes?: string;
  phone?: string;
  email?: string;
  customer_phone?: string;
  confirmed?: boolean;
  opened_count?: number;
  last_opened_at?: string;
  first_opened_at?: string;
  confirmed_at?: string;
  engagement_score?: number;
  reminder_2hr_sent?: boolean;
  reminder_30min_sent?: boolean;
  location_name?: string;
  location_address?: string;
  google_maps_url?: string;
  entrance_photo_urls?: string[];
  google_reviews_url?: string;
  yelp_reviews_url?: string;
  featured_reviews?: FeaturedReview[];
  review_photo_urls?: string[];
  customer_delivery_photo_urls?: string[];
  check_handoff_photo_urls?: string[];
};

export type AppointmentEventType =
  | "page_opened"
  | "confirm_clicked"
  | "running_late_clicked"
  | "reschedule_requested_clicked"
  | "cant_make_it_clicked";

export type AppointmentEvent = {
  id: string;
  appointmentId: string;
  type: AppointmentEventType;
  created_at: string;
  metadata?: Record<string, string | number | boolean>;
};
