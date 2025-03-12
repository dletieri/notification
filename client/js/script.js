document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch initial JSON using objID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const objID = urlParams.get('objID');
    if (!objID) {
      throw new Error('No objID provided in the URL. Please add ?objID=yourObjectId');
    }

    const response = await fetch(`/api/events?objID=${objID}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    const data = await response.json();

    // Populate form
    document.getElementById('name').textContent = data.name;
    document.getElementById('description').textContent = data.description;

    const eventOptions = document.getElementById('eventOptions');
    data.events.forEach((event, index) => {
      const div = document.createElement('div');
      div.className = 'form-check';
      div.innerHTML = `
        <input class="form-check-input" type="radio" name="event" id="event${index}" value="${event}" ${index === 0 ? 'checked' : ''}>
        <label class="form-check-label" for="event${index}">${event}</label>
      `;
      eventOptions.appendChild(div);
    });

    // Handle form submission
    const eventForm = document.getElementById('eventForm');
    eventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selectedEvent = document.querySelector('input[name="event"]:checked').value;
      const payload = {
        name: data.name,
        description: data.description,
        selectedEvent
      };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Display success message
        eventForm.innerHTML = '<p class="text-success">Thanks for reporting it, the notification was sent to the responsible team!</p>';
      } else {
        const errorData = await res.json();
        alert(`Failed to submit event: ${errorData.error || 'Unknown error'}`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    document.getElementById('name').textContent = 'Error';
    document.getElementById('description').textContent = error.message;
    document.getElementById('eventOptions').innerHTML = '<p>Unable to load events.</p>';
  }
});