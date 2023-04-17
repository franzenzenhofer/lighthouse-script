import fs from 'fs/promises';
import { performance } from 'perf_hooks';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { writeFile } from './file-utils.mjs';
import { formatAsCSV, formatAsHTML } from './format-utils.mjs';
import { readPastRunsFile, writePastRunsFile, generateIndexHTML } from './index-utils.mjs';

const inputFile = 'urls.txt';
const logDir = 'logs';
const resultsDir = 'results';

/*const getLighthouseVersion = async () => {
  const lighthousePkg = await import('lighthouse/package.json', { assert: { type: 'json' } });
  return lighthousePkg.default.version;
};

getLighthouseVersion().then(version => {
  console.log(`Using Lighthouse version: ${version}`);
});*/



async function processURLs(urls, ts, resultsSubDir) {
  const results = [];

  for (const url of urls) {
    const start = performance.now();
    console.log(`Starting Lighthouse test for ${url}`);
    const r = await runLighthouse(url, ts, resultsSubDir);
    if (r.error) {
      console.log(`Lighthouse test failed for ${url}: ${r.error.message}`);
    } else {
      console.log(`Lighthouse test successful for ${url}`);
    }
    results.push(r);
    const end = performance.now();
    const duration = (end - start) / 1000;
    console.log(`Lighthouse test for ${url} took ${duration.toFixed(2)} seconds`);
  }
  return results;
}

async function createResultsSubDir(resultsSubDir) {
  try {
    await fs.access(resultsSubDir, fs.constants.F_OK);
  } catch (error) {
    await fs.mkdir(resultsSubDir, { recursive: true });
  }
}


async function saveCSV(results, csvFilePath) {
  try {
    await writeFile(csvFilePath, formatAsCSV(results));
  } catch (e) {
    console.error(`Error writing CSV results: ${e.message}`);
  }
}

async function saveHTML(results, htmlFilePath) {
  try {
    await writeFile(htmlFilePath, formatAsHTML(results));
  } catch (e) {
    console.error(`Error writing HTML results: ${e.message}`);
  }
}

async function runLighthouseForUrls() {
  
  const urls = (await fs.readFile(inputFile, 'utf-8')).split('\n').filter(Boolean);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const resultsSubDir = `${resultsDir}/${yearMonth}`;

  await fs.mkdir(logDir, { recursive: true });
  await fs.mkdir(resultsSubDir, { recursive: true });

  const runSubDir = `${resultsSubDir}/${ts}`;
  await fs.mkdir(runSubDir, { recursive: true });

  const results = await processURLs(urls, ts, runSubDir);
  
  // Save results internally
  await createResultsSubDir(resultsSubDir);
  const csvFilePath = `${resultsSubDir}/${ts}/lighthouse-results-${ts}.csv`;
  const htmlFilePath = `${resultsSubDir}/${ts}/lighthouse-results-${ts}.html`;
  await saveCSV(results, csvFilePath);
  await saveHTML(results, htmlFilePath);

  return {
    results,
    timestamp: ts,
    reportDir: runSubDir,
  };
}


function removeBase64Images(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      removeBase64Images(obj[key]);
    } else if (key === 'data' && typeof obj[key] === 'string' && obj[key].startsWith('data:image/')) {
      delete obj[key];
    }
  }
}

async function runLighthouse(url, ts, runSubDir) {
  try {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const opts = { output: ['json', 'html'], onlyCategories: ['performance'], port: chrome.port };
    const results = await lighthouse(url, opts);
    await chrome.kill();

    const { audits, categories } = results.lhr;

    const networkRequests = results.lhr.audits['network-requests'].details.items;
    const numNetworkRequests = networkRequests.length;
    const rootResponseProtocol = networkRequests.find(item => item.resourceType === 'Document')?.protocol || 'unknown';

    const diagnostics = audits['diagnostics'].details.items[0];
    const performanceScore = categories.performance.score;
    const totalByteWeight = audits['total-byte-weight'].numericValue;
    const mainThreadTime = audits['mainthread-work-breakdown'].numericValue;
    const timeToInteractive = audits['interactive'].numericValue;

    const hash = url.split('').reduce((acc, char) => {
      return (acc * 31 + char.charCodeAt(0)) & 0x7fffffff;
    }, 0);

    const reportFilename = `${runSubDir}/report-${hash}-${ts}.html`;
    await fs.writeFile(reportFilename, results.report[1]);

    removeBase64Images(results.lhr);

    const jsonReportFilename = `${runSubDir}/report-${hash}-${ts}.json`;
    await fs.writeFile(jsonReportFilename, JSON.stringify(results.lhr));

    return {
      url,
      reportFilename,
      jsonReportFilename,
      performance: categories.performance.score,
      firstContentfulPaint: audits['first-contentful-paint'].numericValue,
      speedIndex: audits['speed-index'].numericValue,
      largestContentfulPaint: audits['largest-contentful-paint'].numericValue,
      interactive: audits.interactive.numericValue,
      totalBlockingTime: audits['total-blocking-time'].numericValue,
      cumulativeLayoutShift: audits['cumulative-layout-shift'].numericValue,
      numNetworkRequests,
      rootResponseProtocol,
      diagnostics,
      performanceScore,
      totalByteWeight,
      mainThreadTime,
      timeToInteractive
    };
  } catch (error) {
    return { error, url };
  }
}


export { runLighthouse, runLighthouseForUrls };
