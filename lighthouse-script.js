import fs from 'fs/promises';
import { performance } from 'perf_hooks';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { writeFile } from './file-utils.mjs';
import { formatAsCSV, formatAsHTML } from './format-utils.mjs';

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

async function saveResults(results, ts, resultsSubDir, logFile) {
  try {
    await writeFile(`${resultsSubDir}/lighthouse-results-${ts}.csv`, formatAsCSV(results));
    await writeFile(`${resultsSubDir}/lighthouse-results-${ts}.html`, formatAsHTML(results));
    console.log('Results written to timestamped CSV and HTML files.');
    await logToFile(logFile, 'Results written to timestamped CSV and HTML files.');
  } catch (e) {
    console.error('Error writing results:', e.message);
    await logToFile(logFile, `Error writing results: ${e.message}`);
  }
}

async function main() {
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
  await saveResults(results, ts, resultsSubDir, logFile);
}

async function runLighthouse(url, ts, runSubDir) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const opts = { output: ['json', 'html'], onlyCategories: ['performance'], port: chrome.port };
  const results = await lighthouse(url, opts);
  await chrome.kill();
  const { audits, categories } = results.lhr;

  // Create a simple hash for the URL
  const hash = url.split('').reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) & 0x7fffffff;
  }, 0);

  // Save the HTML report
  const reportFilename = `${runSubDir}/report-${hash}-${ts}.html`;
  await fs.writeFile(reportFilename, results.report[1]);

  return {
    url,
    reportFilename,
    performance: categories.performance.score,
    firstContentfulPaint: audits['first-contentful-paint'].numericValue,
    speedIndex: audits['speed-index'].numericValue,
    largestContentfulPaint: audits['largest-contentful-paint'].numericValue,
    interactive: audits.interactive.numericValue,
    totalBlockingTime: audits['total-blocking-time'].numericValue,
    cumulativeLayoutShift: audits['cumulative-layout-shift'].numericValue
  };
}

async function logToFile(file, message) {
  const ts = new Date().toISOString();
  await fs.appendFile(file, `[${ts}] ${message}\n`);
}

main().catch(async (e) => {
  console.error('Unexpected error:', e.message);
  const logFile = `${logDir}/lighthouse-script.log`;
  await logToFile(logFile, `Unexpected error: ${e.message}`);
});
