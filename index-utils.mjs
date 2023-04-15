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


export function generateIndexHTML(runs) {
  const listItems = runs
    .filter(run => run) // Add this line to filter out undefined or null elements
    .map(run => {
      const timestamp = run.timestamp;
      const date = timestamp.slice(0, 7);
      const fileName = `lighthouse-results-${timestamp}.html`;
      return `<li><a href="./${date}/${timestamp}/${fileName}">${timestamp}</a></li>`; // Update this line
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Past Lighthouse Runs</title>
      </head>
      <body>
        <h1>Past Lighthouse Runs</h1>
        <ul>${listItems}</ul>
      </body>
    </html>`;
}
