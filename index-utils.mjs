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
        <ul>${listItems}</ul>
      </body>
    </html>`;
}
