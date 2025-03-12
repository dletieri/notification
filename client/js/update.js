document.addEventListener('DOMContentLoaded', async () => {
  const updateForm = document.getElementById('updateForm');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const idInput = document.getElementById('id');
  const nameInput = document.getElementById('name');
  const descriptionInput = document.getElementById('description');
  const selectedEventInput = document.getElementById('selectedEvent');
  const nameError = document.getElementById('nameError');
  const descriptionError = document.getElementById('descriptionError');
  const selectedEventError = document.getElementById('selectedEventError');

  // Get object ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (!id) {
    feedbackMessage.innerHTML = `
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        No ID provided.
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    `;
    return;
  }

  // Load object data
  try {
    const response = await fetch(`/api/events/${id}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Object not found');
    }
    const obj = await response.json();
    console.log('Fetched object:', obj); // Debug log to inspect the response

    // Ensure the object has the expected properties
    if (!obj || typeof obj !== 'object') {
      throw new Error('Invalid response format');
    }

    idInput.value = obj._id || 'N/A';
    nameInput.value = obj.name || 'N/A';
    descriptionInput.value = obj.description || 'N/A';
    selectedEventInput.value = obj.selectedEvent || 'N/A';
  } catch (error) {
    console.error('Error fetching object:', error);
    feedbackMessage.innerHTML = `
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        ${error.message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    `;
    return;
  }

  // Handle form submission
  updateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset previous feedback
    [nameError, descriptionError, selectedEventError].forEach(error => error.textContent = '');
    feedbackMessage.innerHTML = '';

    // Client-side validation
    let isValid = true;
    if (!nameInput.value.trim()) {
      nameError.textContent = 'Name is required.';
      isValid = false;
    }
    if (!descriptionInput.value.trim()) {
      descriptionError.textContent = 'Description is required.';
      isValid = false;
    }
    if (!selectedEventInput.value.trim()) {
      selectedEventError.textContent = 'Events are required.';
      isValid = false;
    } else {
      const events = selectedEventInput.value.split(',').map(event => event.trim());
      if (events.length < 1) {
        selectedEventError.textContent = 'At least one event is required.';
        isValid = false;
      }
    }

    if (!isValid) {
      return;
    }

    const payload = {
      name: nameInput.value.trim(),
      description: descriptionInput.value.trim(),
      selectedEvent: selectedEventInput.value.trim()
    };

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Redirect to View Objects page after a brief success message (optional delay)
        feedbackMessage.innerHTML = `
          <div class="alert alert-success alert-dismissible fade show" role="alert">
            Object updated successfully!
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `;
        setTimeout(() => {
          window.location.href = '/admin/objects'; // Redirect after 1.5 seconds
        }, 1500);
      } else {
        const errorData = await res.json();
        feedbackMessage.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            Failed to update object: ${errorData.error || 'Unknown error'}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error:', error);
      feedbackMessage.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          An error occurred while updating the object.
          <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      `;
    }
  });
});