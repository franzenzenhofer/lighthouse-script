  // Add this script to handle button clicks
  document.getElementById('edit-urls').addEventListener('click', () => {
    location.href = '/urls-editor';
  });

  document.getElementById('rerun-tests').addEventListener('click', async () => {
    const response = await fetch('/rerun-tests', { method: 'POST' });
    if (response.ok) {
      location.reload();
    } else {
      alert('Error rerunning tests');
    }
  });


  // Remove the setInterval and checkForUpdates function

  const socket = new WebSocket('ws://localhost:3000');

  socket.onopen = (event) => {
    console.log('WebSocket connection established:', event);
    console.log('WebSocket readyState:', socket.readyState);
    socket.send('getStatus');
  };

  console.log("Attempting to open WebSocket connection");
  console.log(socket);

  let wasRunningTests = false;

  socket.onmessage = (event) => {
    console.log('WebSocket message received:', event.data);
    const { runningTests } = JSON.parse(event.data);
    const rerunTestsButton = document.getElementById('rerun-tests');
    rerunTestsButton.disabled = runningTests;

    if (runningTests) {
      rerunTestsButton.textContent = 'Running tests...';
    } else {
      rerunTestsButton.textContent = 'Rerun Tests';
    }

    if (wasRunningTests && !runningTests) {
      location.reload();
    }

    wasRunningTests = runningTests;
  };

  socket.onclose = (event) => {
    console.log('WebSocket connection closed:', event);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };