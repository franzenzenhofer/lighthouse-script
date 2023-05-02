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

function getRelativeDate(timestamp) {
  const now = new Date();
  const date = new Date(convertTimestamp(timestamp));
  const differenceInSeconds = (now - date) / 1000;

  if (differenceInSeconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(differenceInSeconds / 60);
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks === 1) {
    return 'One week ago';
  }
  return `${weeks} weeks ago`;
}

function convertTimestamp(timestamp) {
  const datePart = timestamp.slice(0, 10);
  const timePart = timestamp.slice(11).replace(/-/g, ':');
  return `${datePart} ${timePart}`;
}
//this funtion is used to generate the index.html file
//it works by taking the runs array and mapping over it
export function generateIndexHTML(runs) {
  const listItems = runs
    .filter(run => run && run.timestamp)
    .map((run, index) => {
      const timestamp = run.timestamp;
      const date = timestamp.slice(0, 7);
      const fileName = `lighthouse-results-${timestamp}.html`;
      const readableDate = new Date(convertTimestamp(timestamp)).toLocaleString();
      const testsCount = run.testsCount ? `Tests: ${run.testsCount}` : '';
      const uniqueDomains = run.uniqueDomains ? `Domains: ${run.uniqueDomains.join(', ')}` : '';
      const errorIndicator = run.errorCount ? ` (Error(s): ${run.errorCount})` : '';

      const isNew = index === 0 && Date.now() - new Date(convertTimestamp(timestamp)) < 15 * 60 * 1000;
      const newEmoji = isNew ? ' 🆕 ' : '';
      const newClass = isNew ? ' new-run' : '';
      const relativeDate = getRelativeDate(timestamp);

      return `
        <li class="run${newClass}">
          <a href="./${date}/${timestamp}/${fileName}">${readableDate}${errorIndicator}${newEmoji}</a>
          <br>
          ${relativeDate}
          <br>
          ${testsCount}
          <br>
          ${uniqueDomains}
          <br>
          <button class="download-zip" data-date="${date}" data-timestamp="${timestamp}">Download Zip</button>
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
        <title>Franz Enzenhofers Lighthouse Bulk Testing Tool</title>
        <link rel="stylesheet" href="/static/styles.css">
      </head>
      <body>
        <a href="/"><img src='/img/logo.png'></a>
        <h1>Franz Enzenhofers Lighthouse Testing Tool</h1>
        <pre id="console">Edit URLs or Start Tests
</pre>
        <button id="edit-urls">Edit URLs</button>
        <button id="rerun-tests">Start Tests</button>
        <button id="reload-page" style="display:none;">
  Tests are finished, reload page. <span>&#x1F503;</span>
</button>

        <h2>Past Test Runs</h2>
        <ul>${listItems}</ul>
        <script src="/static/script.js"></script>
      </body>
    </html>`;
}
