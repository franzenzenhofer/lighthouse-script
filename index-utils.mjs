import fs from 'fs/promises';

export async function readPastRunsFile(file) {
  try {
    const content = await fs.readFile(file, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return [];
    } else {
      throw e;
    }
  }
}

export async function writePastRunsFile(file, runs) {
  await fs.writeFile(file, JSON.stringify(runs, null, 2));
}

function convertTimestamp(timestamp) {
  const datePart = timestamp.slice(0, 10);
  const timePart = timestamp.slice(11).replace(/-/g, ':');
  return `${datePart} ${timePart}`;
}

export function generateIndexHTML(runs) {
  const listItems = runs
    .filter(run => run)
    .map(run => {
      const timestamp = run.timestamp;
      const date = timestamp.slice(0, 7);
      const fileName = `lighthouse-results-${timestamp}.html`;
      const readableDate = new Date(convertTimestamp(timestamp)).toLocaleString();
      const testsCount = run.testsCount ? `Tests: ${run.testsCount}` : '';
      const uniqueDomains = run.uniqueDomains ? `Domains: ${run.uniqueDomains.join(', ')}` : '';

      return `
        <li>
          <a href="./${date}/${timestamp}/${fileName}">${readableDate}</a>
          <br>
          ${testsCount}
          <br>
          ${uniqueDomains}
        </li>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Past Lighthouse Runs</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 1rem;
            line-height: 1.5;
          }

          h1 {
            font-size: 2rem;
            color: #333;
          }

          ul {
            list-style-type: none;
            padding: 0;
          }

          li {
            margin-bottom: 0.5rem;
          }

          a {
            color: #2a7ae2;
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
      <h1>Past Lighthouse Runs</h1>
      <button id="edit-urls">Edit URLs</button> <!-- Add this button -->
      <button id="rerun-tests">Rerun Tests</button> <!-- Add this button -->
      <ul>${listItems}</ul>
      <script>
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

        // Add this script to check for updates in pastRuns.json
        async function checkForUpdates() {
          try {
            const response = await fetch('/pastRuns.json');
            if (response.ok) {
              const pastRuns = await response.json();
              if (JSON.stringify(pastRuns) !== JSON.stringify(${JSON.stringify(runs)})) {
                location.reload();
              }
            }
          } catch (error) {
            console.error('Error checking for updates:', error);
          }
        }

        setInterval(checkForUpdates, 10 * 1000); // Check for updates every 10 seconds

        const socket = new WebSocket('ws://localhost:3001');
  
        socket.onopen = (event) => {
          console.log('WebSocket connection established:', event);
          socket.send('getStatus');
        };

        console.log("socket should be open");
        console.log(socket);
              
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
        };
      
        socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
        };
      
        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

      </script>
    </body>
  </html>`;
}
