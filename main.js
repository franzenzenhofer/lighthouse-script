import { runLighthouseForUrls, saveResults } from './lighthouse-script.js';
import { readPastRunsFile, writePastRunsFile, generateIndexHTML } from './index-utils.mjs';
import fs from 'fs/promises';
import express from 'express';
import path from 'path';
import open from 'open';
import url from 'url';

const pastRunsFile = './results/pastRuns.json';
const indexFile = './results/index.html';
const port = 3000;
const reportDirectory = './results';

const app = express();

function extractMainDomain(domainUrl) {
  const { hostname } = new url.URL(domainUrl);
  const parts = hostname.split('.');
  const mainDomain = parts.slice(-2).join('.');
  return mainDomain;
}

async function updatePastRuns(results) {
  try {
    console.log('Reading past runs file...');
    const pastRuns = await readPastRunsFile(pastRunsFile);
    console.log('Past runs file read successfully.');

    const timestamp = results[0].reportFilename.split('/')[2];
    const reportDir = results[0].reportFilename.split('/').slice(0, 3).join('/');
    const testsCount = results.length;

    const uniqueDomains = Array.from(
      new Set(results.map(result => extractMainDomain(result.url)))
    );

    pastRuns.unshift({ timestamp, reportDir, testsCount, uniqueDomains });

    console.log('Writing updated past runs to file...');
    await writePastRunsFile(pastRunsFile, pastRuns);
    console.log('Updated past runs written to file successfully.');

    console.log('Past runs updated successfully.');
    return pastRuns;
  } catch (error) {
    console.error('Error updating past runs:', error);
    return [];
  }
}


async function writeIndexHTML(pastRuns) {
  try {
    const updatedIndexHTML = generateIndexHTML(pastRuns);
    await fs.writeFile(indexFile, updatedIndexHTML);
    return updatedIndexHTML;
  } catch (error) {
    console.error('Error writing index HTML:', error);
    return '';
  }
}

async function startLocalServer(reportDirectory) {
  app.use(express.static(reportDirectory));

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  try {
    await open(`http://localhost:${port}`);
  } catch (error) {
    console.error('Error opening browser:', error);
  }
}

async function main() {
  try {
    console.log('Running Lighthouse...');
    const results = await runLighthouseForUrls();
    console.log('Lighthouse run complete.');
    console.log('Lighthouse results:', JSON.stringify(results, null, 2));

    console.log('Saving results...');
    await saveResults(results);
    console.log('Results saved.');

    console.log('Updating past runs...');
    const pastRuns = (await updatePastRuns(results)).filter(run => run !== null);
    console.log('Past runs:', JSON.stringify(pastRuns, null, 2));
    console.log('Past runs updated.');

    console.log('Writing index HTML...');
    const updatedIndexHTML = await writeIndexHTML(pastRuns);
    console.log('Index HTML written.');

    console.log('Starting local server...');
    await startLocalServer(reportDirectory);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

main();
