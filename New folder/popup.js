document.getElementById('generate').addEventListener('click', async () => {
  const name = document.getElementById('name').value;
  const vehicle = document.getElementById('vehicle').value;
  const time = document.getElementById('time').value;

  if (!name || !vehicle || !time) {
    alert('Please fill in all fields');
    return;
  }

  const btn = document.getElementById('generate');
  btn.disabled = true;
  btn.innerText = 'Generating...';

  try {
    const response = await fetch('https://ais-dev-r6qmgvnhmdsuiobqrwkegs-102267950910.us-east1.run.app/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name,
        vehicle: vehicle,
        appointment_at: new Date(time).toISOString(),
        advisor_name: "Michael S.",
        advisor_phone: "555-0123",
        advisor_photo_url: "https://picsum.photos/seed/Michael/200/200",
        google_maps_url: "https://maps.google.com",
        location_address: "123 Auto Way, Car City",
        entrance_photo_urls: ["https://picsum.photos/seed/entrance/800/450"],
        featured_reviews: [
          { author: "Sarah J.", text: "Michael was great. Quick and fair.", stars: 5 },
          { author: "Tom R.", text: "Easiest car sale ever.", stars: 5 }
        ],
        google_reviews_url: "https://google.com/reviews",
        yelp_reviews_url: "https://yelp.com"
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create appointment');
    }

    const data = await response.json();
    navigator.clipboard.writeText(data.url);
    document.getElementById('success').style.display = 'block';
    document.getElementById('success').innerText = 'Link copied to clipboard!';
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Generate Link';
  }
});
