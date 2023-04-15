// cleanRuns.js
import { readPastRunsFile, writePastRunsFile, generateIndexHTML } from './index-utils.mjs';
import fs from 'fs/promises';

const pastRunsFile = 'pastRuns.json';
const indexFile = 'index.html';

async function cleanRuns() {
  // Empty the past runs in the JSON file
  await writePastRunsFile(pastRunsFile, []);

  // Generate an empty index.html file
  const emptyIndexHTML = generateIndexHTML([]);
  await fs.writeFile(indexFile, emptyIndexHTML);

  console.log('Past runs cleaned.');
}

cleanRuns().catch(error => {
  console.error('Unexpected error:', error);
});
