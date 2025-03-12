document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('tableBody');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const deleteModal = document.getElementById('deleteModal');
    let objectToDelete = null;
  
    // Load all objects
    async function loadObjects() {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch objects');
        const objects = await response.json();
        tableBody.innerHTML = '';
        objects.forEach(obj => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${obj._id}</td>
            <td>${obj.name}</td>
            <td>${obj.description}</td>
            <td>
              <a href="/admin/update?id=${obj._id}" class="btn btn-warning btn-circle btn-sm mr-2">
                <i class="fas fa-edit"></i>
              </a>
              <button class="btn btn-danger btn-circle btn-sm delete-btn" data-id="${obj._id}">
                <i class="fas fa-trash"></i>
              </button>
              <a href="/admin/details?id=${obj._id}" class="btn btn-info btn-circle btn-sm">
                <i class="fas fa-eye"></i>
              </a>
            </td>
          `;
          tableBody.appendChild(row);
        });
      } catch (error) {
        feedbackMessage.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${error.message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        `;
      }
    }
  
    // Handle delete confirmation
    tableBody.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) {
        objectToDelete = e.target.closest('.delete-btn').dataset.id;
        $('#deleteModal').modal('show');
      }
    });
  
    // Confirm delete
    document.getElementById('confirmDelete').addEventListener('click', async () => {
      if (objectToDelete) {
        try {
          const response = await fetch(`/api/events/${objectToDelete}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            feedbackMessage.innerHTML = `
              <div class="alert alert-success alert-dismissible fade show" role="alert">
                Object deleted successfully!
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            `;
            loadObjects(); // Refresh table
          } else {
            throw new Error('Failed to delete object');
          }
        } catch (error) {
          feedbackMessage.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
              ${error.message}
              <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          `;
        }
        $('#deleteModal').modal('hide');
        objectToDelete = null;
      }
    });
  
    // Initial load
    loadObjects();
  });