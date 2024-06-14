import { runLighthouseForUrls } from './lighthouse-script.js';
import { readPastRunsFile, writePastRunsFile, generateIndexHTML } from './index-utils.mjs';
import { writeFile, readFile, revertFile, writeFileWithBackup } from './file-utils.mjs';
import fs from 'fs/promises';
import express from 'express';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import url from 'url';
import archiver from 'archiver';

import crawl from './crawler.js';

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
app.use('/static', express.static(path.join(__dirname, 'static')));



// Serve the urls-editor.html file from the static folder
app.get('/urls-editor', (req, res) => {
  res.sendFile(resolve(__dirname, 'static', 'urls-editor.html'));
});

app.get('/download-zip/:date/:timestamp', (req, res) => {
  const { date, timestamp } = req.params;
  const folderPath = path.join(__dirname, `./results/${date}/${timestamp}`);
  const archive = archiver('zip');

  res.attachment(`lighthouse-results-${timestamp}.zip`);

  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  archive.directory(folderPath, false);
  archive.finalize();
});

app.post('/crawl', async (req, res) => {
  try {
    const crawlUrl = req.body.url;
    const urls = await crawl(crawlUrl);
    console.log(`Crawled URLs for ${crawlUrl}:`, urls); // Add this line for debugging
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

const { wss, setRunningTests, handleUpgrade, broadcast } = createWebSocketServer(wsPort);

app.post('/rerun-tests', async (req, res) => {
  try {
    setRunningTests(true);

    console.log('Rerunning Lighthouse tests...');
    const { results } = await runLighthouseForUrls(broadcast, chromeProfileDir);
    console.log('Lighthouse run complete.');

    console.log('Updating past runs...');
    const pastRuns = (await updatePastRuns(results)).filter(run => run !== null);
    console.log('Past runs updated.');

    if (pastRuns && pastRuns.length > 0) {
      console.log('Writing index HTML...');
      await writeIndexHTML(pastRuns);
      console.log('Index HTML written.');
    } else {
      console.warn('No past runs available. Skipping index HTML update.');
    }
    

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

    if (!results || results.length === 0) {
      console.warn('No results available. Skipping past runs update.');
      return pastRuns;
    }

    const firstResult = results[0];

    const timestamp = firstResult?.reportFilename?.split('/')[2] ?? '';
    const reportDir = firstResult?.reportFilename?.split('/').slice(0, 3).join('/') ?? '';
    const testsCount = results.length;

    const uniqueDomains = Array.from(
      new Set(results.map(result => result.error ? null : extractMainDomain(result.url)))
    ).filter(domain => domain !== null);

    const errorCount = results.filter(result => result.error).length;

    if (errorCount === 0) {
      pastRuns.unshift({ timestamp, reportDir, testsCount, uniqueDomains, errorCount });

      console.log('Writing updated past runs to file...');
      await writePastRunsFile(pastRunsFile, pastRuns);
      console.log('Updated past runs written to file successfully.');
    } else {
      console.warn('Lighthouse run failed. Skipping past runs update.');
    }

    console.log('Writing index HTML...');
    await writeIndexHTML(pastRuns);
    console.log('Index HTML written.');

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

var chromeProfileDir = null;

async function main() {
  let args = process.argv.slice(2);
  // Find the index of '--user-data-dir' argument
  let userDataDirArgIndex = args.findIndex(arg => arg === '--user-data-dir');

  

  if (userDataDirArgIndex > -1) {
    // Check if next argument exists (should be the path)
    if (args[userDataDirArgIndex + 1]) {
      let userDataDir = args[userDataDirArgIndex + 1];
      console.log(`User data directory: ${userDataDir}`);

      if (userDataDir && userDataDir.trim().length > 0) {
        chromeProfileDir = userDataDir;
        console.log(`Chrome profile directory set to: ${chromeProfileDir}`);
      } else {
        console.error('Invalid --user-data-dir argument');
      }
    } else {
      console.error('No path provided for --user-data-dir argument');
    }
  } else {
    console.warn('No --user-data-dir argument provided');
  }

  console.log(`Chrome profile directory: ${chromeProfileDir}`);


  try {
    // Create the results directory if it doesn't exist
    await fs.mkdir(reportDirectory, { recursive: true });

    // Check if index.html exists before generating an empty one
    let pastRuns;
    try {
      await fs.access(indexFile, fs.constants.F_OK);
      console.log('index.html exists.');

      // Read past runs from the pastRuns.json file
      console.log('Reading past runs file...');
      pastRuns = await readPastRunsFile(pastRunsFile);
      console.log('Past runs file read successfully.');
    } catch (error) {
      console.log('index.html does not exist, running Lighthouse for the first time.');

      // Check if urls.txt exists before generating one
      try {
        await fs.access('./urls.txt', fs.constants.F_OK);
      } catch (error) {
        console.log('urls.txt does not exist, creating a new one with a default URL.');
        await fs.writeFile('./urls.txt', 'https://www.fullstackoptimization.com/\n');
      }

      console.log('Running Lighthouse for URLs...');
      console.log(chromeProfileDir);
      const { results } = await runLighthouseForUrls(broadcast, chromeProfileDir);
      console.log('Lighthouse run complete.');

      console.log('Updating past runs...');
      pastRuns = (await updatePastRuns(results)).filter(run => run !== null);
      console.log('Past runs updated.');
    }

    // Write index.html based on pastRuns every time the application starts
    console.log('Writing index HTML...');
    await writeIndexHTML(pastRuns);
    console.log('Index HTML written.');

    console.log('Starting local server...');
    const server = await startLocalServer(reportDirectory);

    // Attach the handleUpgrade listener to the HTTP server instance
    server.on('upgrade', handleUpgrade);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

main();
