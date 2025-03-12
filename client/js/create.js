document.addEventListener('DOMContentLoaded', () => {
    const createForm = document.getElementById('createForm');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description');
    const selectedEventInput = document.getElementById('selectedEvent');
    const nameError = document.getElementById('nameError');
    const descriptionError = document.getElementById('descriptionError');
    const selectedEventError = document.getElementById('selectedEventError');
  
    createForm.addEventListener('submit', async (e) => {
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
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
  
        if (res.ok) {
          const data = await res.json();
          feedbackMessage.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
              Object created successfully! ID: ${data.id}
              <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          `;
          createForm.reset(); // Clear the form
        } else {
          const errorData = await res.json();
          feedbackMessage.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
              Failed to create object: ${errorData.error || 'Unknown error'}
              <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          `;
        }
      } catch (error) {
        console.error('Error:', error);
        feedbackMessage.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            An error occurred while creating the object.
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        `;
      }
    });
  });