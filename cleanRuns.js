// cleanRuns.js
import { readPastRunsFile, writePastRunsFile, generateIndexHTML } from './index-utils.mjs';
import fs from 'fs/promises';
import path from 'path';

const pastRunsFile = 'pastRuns.json';
const indexFile = 'index.html';
const resultsDirectory = 'results';

async function deleteFilesAndDirectories(directory) {
  const files = await fs.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await deleteFilesAndDirectories(filePath);
      const filesInDir = await fs.readdir(filePath);
      if (filesInDir.length === 0) {
        await fs.rmdir(filePath);
      }
    } else {
      const ext = path.extname(filePath);
      if (['.json', '.html', '.csv'].includes(ext)) {
        await fs.unlink(filePath);
      }
    }
  }
}

async function cleanRuns() {
  // Empty the past runs in the JSON file
  await writePastRunsFile(pastRunsFile, []);

  // Generate an empty index.html file
  const emptyIndexHTML = generateIndexHTML([]);
  await fs.writeFile(indexFile, emptyIndexHTML);

  // Delete JSON, HTML, and CSV files in the results directory and remove empty subdirectories
  await deleteFilesAndDirectories(resultsDirectory);

  console.log('Past runs cleaned.');
}

cleanRuns().catch(error => {
  console.error('Unexpected error:', error);
});
