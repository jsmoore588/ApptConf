const DEFAULT_API_BASE_URL = "http://localhost:6767";
const DEFAULT_LOCATION_NAME = "Bullard Buying Center";
const DEFAULT_LOCATION_ADDRESS = "1147 E. I65 Service Rd., Mobile, AL 36606";

const ids = [
  "name",
  "vehicle",
  "appointmentDate",
  "appointmentTime",
  "email",
  "apiBaseUrl",
  "advisor",
  "advisorPhone",
  "advisorPhotoUrl",
  "locationName",
  "locationAddress",
  "googleMapsUrl",
  "googleReviewsUrl",
  "yelpReviewsUrl",
  "entrancePhotoUrl",
  "review1",
  "reviewer1",
  "review2",
  "reviewer2",
  "review3",
  "reviewer3",
  "openTab"
];

const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const statusNode = document.getElementById("status");
const generateButton = document.getElementById("generate");
const savePresetsButton = document.getElementById("savePresets");

function setStatus(message, tone = "") {
  statusNode.textContent = message;
  statusNode.dataset.tone = tone;
}

function collectFeaturedReviews() {
  return [
    { review_text: elements.review1.value.trim(), reviewer_name: elements.reviewer1.value.trim() },
    { review_text: elements.review2.value.trim(), reviewer_name: elements.reviewer2.value.trim() },
    { review_text: elements.review3.value.trim(), reviewer_name: elements.reviewer3.value.trim() }
  ].filter((item) => item.review_text && item.reviewer_name);
}

function buildAppointmentAt(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const iso = new Date(`${dateValue}T${timeValue}:00`);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

async function restoreSettings() {
  const storage = await chrome.storage.local.get([
    "openTab",
    "draftName",
    "draftVehicle",
    "apiBaseUrl",
    "presetAdvisor",
    "presetAdvisorPhone",
    "presetAdvisorPhotoUrl",
    "presetLocationName",
    "presetLocationAddress",
    "presetGoogleMapsUrl",
    "presetGoogleReviewsUrl",
    "presetYelpReviewsUrl",
    "presetEntrancePhotoUrl",
    "presetReview1",
    "presetReviewer1",
    "presetReview2",
    "presetReviewer2",
    "presetReview3",
    "presetReviewer3"
  ]);

  elements.apiBaseUrl.value = storage.apiBaseUrl || DEFAULT_API_BASE_URL;
  elements.advisor.value = storage.presetAdvisor || "Jude";
  elements.advisorPhone.value = storage.presetAdvisorPhone || "";
  elements.advisorPhotoUrl.value = storage.presetAdvisorPhotoUrl || "";
  elements.locationName.value = storage.presetLocationName || DEFAULT_LOCATION_NAME;
  elements.locationAddress.value = storage.presetLocationAddress || DEFAULT_LOCATION_ADDRESS;
  elements.googleMapsUrl.value = storage.presetGoogleMapsUrl || "";
  elements.googleReviewsUrl.value = storage.presetGoogleReviewsUrl || "";
  elements.yelpReviewsUrl.value = storage.presetYelpReviewsUrl || "";
  elements.entrancePhotoUrl.value = storage.presetEntrancePhotoUrl || "";
  elements.review1.value = storage.presetReview1 || "";
  elements.reviewer1.value = storage.presetReviewer1 || "";
  elements.review2.value = storage.presetReview2 || "";
  elements.reviewer2.value = storage.presetReviewer2 || "";
  elements.review3.value = storage.presetReview3 || "";
  elements.reviewer3.value = storage.presetReviewer3 || "";
  elements.openTab.checked = storage.openTab !== false;

  if (storage.draftName) {
    elements.name.value = storage.draftName;
  }

  if (storage.draftVehicle) {
    elements.vehicle.value = storage.draftVehicle;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "APPOINTMENT_ENGINE_EXTRACT"
    });

    if (response?.name && !elements.name.value) {
      elements.name.value = response.name;
    }

    if (response?.vehicle && !elements.vehicle.value) {
      elements.vehicle.value = response.vehicle;
    }
  } catch (_error) {
    // Ignore pages where the content script is unavailable.
  }
}

async function savePresets() {
  await chrome.storage.local.set({
    apiBaseUrl: elements.apiBaseUrl.value.trim() || DEFAULT_API_BASE_URL,
    presetAdvisor: elements.advisor.value.trim(),
    presetAdvisorPhone: elements.advisorPhone.value.trim(),
    presetAdvisorPhotoUrl: elements.advisorPhotoUrl.value.trim(),
    presetLocationName: elements.locationName.value.trim(),
    presetLocationAddress: elements.locationAddress.value.trim(),
    presetGoogleMapsUrl: elements.googleMapsUrl.value.trim(),
    presetGoogleReviewsUrl: elements.googleReviewsUrl.value.trim(),
    presetYelpReviewsUrl: elements.yelpReviewsUrl.value.trim(),
    presetEntrancePhotoUrl: elements.entrancePhotoUrl.value.trim(),
    presetReview1: elements.review1.value.trim(),
    presetReviewer1: elements.reviewer1.value.trim(),
    presetReview2: elements.review2.value.trim(),
    presetReviewer2: elements.reviewer2.value.trim(),
    presetReview3: elements.review3.value.trim(),
    presetReviewer3: elements.reviewer3.value.trim(),
    openTab: elements.openTab.checked
  });

  setStatus("Presets saved.", "success");
}

async function generateLink() {
  const apiBaseUrl = (elements.apiBaseUrl.value.trim() || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  const appointmentAt = buildAppointmentAt(elements.appointmentDate.value, elements.appointmentTime.value);
  const payload = {
    name: elements.name.value.trim(),
    vehicle: elements.vehicle.value.trim(),
    appointment_at: appointmentAt,
    email: elements.email.value.trim(),
    advisor: elements.advisor.value.trim() || "Jude",
    advisor_name: elements.advisor.value.trim() || "Jude",
    advisor_phone: elements.advisorPhone.value.trim(),
    advisor_photo_url: elements.advisorPhotoUrl.value.trim(),
    location_name: elements.locationName.value.trim() || DEFAULT_LOCATION_NAME,
    location_address: elements.locationAddress.value.trim() || DEFAULT_LOCATION_ADDRESS,
    google_maps_url: elements.googleMapsUrl.value.trim(),
    google_reviews_url: elements.googleReviewsUrl.value.trim(),
    yelp_reviews_url: elements.yelpReviewsUrl.value.trim(),
    entrance_photo_urls: elements.entrancePhotoUrl.value.trim()
      ? [elements.entrancePhotoUrl.value.trim()]
      : [],
    featured_reviews: collectFeaturedReviews()
  };

  if (!payload.name || !payload.vehicle || !payload.appointment_at) {
    setStatus("Name, vehicle, date, and clock time are required.", "error");
    return;
  }

  generateButton.disabled = true;
  setStatus("Generating link...");

  try {
    const response = await fetch(`${apiBaseUrl}/api/create-appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let message = "Unable to create link. Check the live deployment.";

      try {
        const errorBody = await response.json();

        if (errorBody?.error) {
          message = errorBody.error;
        }
      } catch (_error) {
        // Ignore non-JSON errors.
      }

      throw new Error(message);
    }

    const data = await response.json();
    await navigator.clipboard.writeText(data.url);
    await chrome.storage.local.set({
      apiBaseUrl,
      draftName: payload.name,
      draftVehicle: payload.vehicle,
      openTab: elements.openTab.checked
    });

    chrome.runtime.sendMessage({
      type: "APPOINTMENT_ENGINE_CREATED",
      url: data.url,
      open: elements.openTab.checked
    });

    setStatus("Link copied - ready to send", "success");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Unable to create link. Check the live deployment.", "error");
  } finally {
    generateButton.disabled = false;
  }
}

generateButton.addEventListener("click", generateLink);
savePresetsButton.addEventListener("click", savePresets);
restoreSettings();
