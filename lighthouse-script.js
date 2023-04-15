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

async function processURLs(urls, logFile, ts, resultsSubDir) {
  const results = [];

  for (const url of urls) {
    console.log(`Running Lighthouse for ${url}`);
    await logToFile(logFile, `Running Lighthouse for ${url}`);
    const start = performance.now();
    const r = await runLighthouse(url, ts, resultsSubDir);
    results.push(r);
    const end = performance.now();
    const d = (end - start) / 1000;
    console.log(`Lighthouse finished for ${url} in ${d.toFixed(2)} seconds`);
    await logToFile(logFile, `Lighthouse finished for ${url} in ${d.toFixed(2)} seconds`);
  }
  return results;
}

async function saveResults(results) {
  console.log("in SAVE RESULTS");
  console.log(results);
  const ts = results[0].reportFilename.split('/')[2];
  const resultsSubDir = results[0].reportFilename.split('/').slice(0, 3).join('/');

  const logFile = `${logDir}/lighthouse-script.log`;

  try {
    await writeFile(`${resultsSubDir}/lighthouse-results-${ts}.csv`, formatAsCSV(results));
    await writeFile(`${resultsSubDir}/lighthouse-results-${ts}.html`, formatAsHTML(results));
    console.log('Results written to timestamped CSV and HTML files.');
    await logToFile(logFile, 'Results written to timestamped CSV and HTML files.');
  } catch (e) {
    console.error('Error writing results:', e.message);
    console.log(results);
    await logToFile(logFile, `Error writing results: ${e.message}`);
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

  const logFile = `${logDir}/lighthouse-script.log`;
  const runSubDir = `${resultsSubDir}/${ts}`;
  await fs.mkdir(runSubDir, { recursive: true });

  const results = await processURLs(urls, logFile, ts, runSubDir);
  await saveResults(results);

  return results;
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
}

async function logToFile(file, message) {
  const ts = new Date().toISOString();
  await fs.appendFile(file, `[${ts}] ${message}\n`);
}

export { runLighthouse, saveResults, runLighthouseForUrls };

