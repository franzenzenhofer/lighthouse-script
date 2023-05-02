const socket = new WebSocket('ws://localhost:3000');

socket.onopen = (event) => {
  console.log('A WebSocket connection was opened');
  console.log('WebSocket readyState:', socket.readyState);
  socket.send('getStatus');
};

console.log("Attempting to open WebSocket connection");
console.log(socket);

function updateConsole(message, isBold = false) {
  console.log('A message was received from the server:', message);
  if (message) {
    const consoleElem = document.getElementById('console');
    if (isBold) {
      consoleElem.innerHTML += '<b>' + message + '</b>\n';
    } else {
      consoleElem.textContent += message + '\n';
    }
    consoleElem.scrollTop = consoleElem.scrollHeight;
  }
}

socket.onmessage = (event) => {
  console.log('A message was received from the server');
  const data = JSON.parse(event.data);
  const { type, message } = data;

  updateConsole(message);

  const rerunTestsButton = document.getElementById('rerun-tests');
  const reloadButton = document.getElementById('reload-page');
  
  switch (type) {
    case 'testStart':
      rerunTestsButton.disabled = true;
      rerunTestsButton.textContent = 'Running tests...';
      break;
    case 'testEnd':
      // Handle individual test completion (if needed)
      break;
    case 'testsFinished':
      console.log('The tests have finished');
      rerunTestsButton.disabled = false;
      rerunTestsButton.textContent = 'Rerun Tests';
      reloadButton.style.display = 'inline-block';
      updateConsole('Tests are finished.', true);
      break;
  }
};

socket.onclose = (event) => {
  console.log('A WebSocket connection was closed');
};

socket.onerror = (error) => {
  console.error('A WebSocket error occurred:', error);
};

document.addEventListener('DOMContentLoaded', () => {
  const downloadZipButtons = document.querySelectorAll('.download-zip');

  downloadZipButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const date = event.target.getAttribute('data-date');
      const timestamp = event.target.getAttribute('data-timestamp');
      const downloadUrl = `/download-zip/${date}/${timestamp}`;
      console.log(downloadUrl);

      window.location.href = downloadUrl;
    });
  });
});

document.getElementById('edit-urls').addEventListener('click', () => {
  console.log('The edit-urls button was clicked');
  location.href = '/urls-editor';
});

document.getElementById('rerun-tests').addEventListener('click', async () => {
  console.log('The rerun-tests button was clicked');
  const response = await fetch('/rerun-tests', { method: 'POST' });
  if (response.ok) {
    console.log('The request to rerun the tests was successful');
    document.getElementById('rerun-tests').disabled = true;
    socket.send('startTests');
  } else {
    console.log('The request to rerun the tests failed');
    alert('Error rerunning tests');
  }
});

document.getElementById('reload-page').addEventListener('click', () => {
  location.reload();
});
