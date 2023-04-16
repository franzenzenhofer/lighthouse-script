import { runLighthouseForUrls } from './lighthouse-script.js';
import { readPastRunsFile, writePastRunsFile, generateIndexHTML } from './index-utils.mjs';
import { writeFile, readFile, revertFile, writeFileWithBackup } from './file-utils.mjs';
import fs from 'fs/promises';
import express from 'express';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import url from 'url';

import { createWebSocketServer } from './websocket-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pastRunsFile = './results/pastRuns.json';
const indexFile = './results/index.html';
const port = 3000;
const wsPort = 3008;
const reportDirectory = './results';

const app = express();
app.use('/img', express.static(path.join(__dirname, 'static', 'img')));
app.use(express.json());


// Serve the urls-editor.html file from the static folder
app.get('/urls-editor', (req, res) => {
  res.sendFile(resolve(__dirname, 'static', 'urls-editor.html'));
});

app.post('/file-operation', async (req, res) => {
  try {
    const operation = req.body.operation;
    if (operation === 'read') {
      const content = await readFile('./urls.txt');
      res.json({ content });
    } else if (operation === 'write') {
      const content = req.body.content;
      await writeFileWithBackup('./urls.txt', content); // Use writeFileWithBackup instead of writeFile
      res.json({ success: true });
    } else if (operation === 'revert') {
      await revertFile('./urls.txt');
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid operation' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/rerun-tests', async (req, res) => {
  try {
    setRunningTests(true);

    console.log('Rerunning Lighthouse tests...');
    const { results } = await runLighthouseForUrls();
    console.log('Lighthouse run complete.');

    console.log('Updating past runs...');
    const pastRuns = (await updatePastRuns(results)).filter(run => run !== null);
    console.log('Past runs updated.');

    console.log('Writing index HTML...');
    await writeIndexHTML(pastRuns);
    console.log('Index HTML written.');

    res.sendStatus(200);
  } catch (error) {
    console.error('Error rerunning tests:', error);
    res.sendStatus(500);
  } finally {
    setRunningTests(false);
  }
});






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

  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  try {
    await open(`http://localhost:${port}`);
  } catch (error) {
    console.error('Error opening browser:', error);
  }

  return server;
}

async function main() {
  try {
    console.log('Running Lighthouse...');
    const { results, timestamp, reportDir } = await runLighthouseForUrls();
    console.log('Lighthouse run complete.');
    console.log('Lighthouse results:', JSON.stringify(results, null, 2));

    console.log('Updating past runs...');
    const pastRuns = (await updatePastRuns(results)).filter(run => run !== null);
    console.log('Past runs:', JSON.stringify(pastRuns, null, 2));
    console.log('Past runs updated.');

    console.log('Writing index HTML...');
    const updatedIndexHTML = await writeIndexHTML(pastRuns);
    console.log('Index HTML written.');
    console.log('Starting local server...');
    const server = await startLocalServer(reportDirectory);

    // Attach the handleUpgrade listener to the HTTP server instance
    server.on('upgrade', handleUpgrade);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

const { wss, setRunningTests, handleUpgrade } = createWebSocketServer(wsPort);

main();