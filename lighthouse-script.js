import fs from 'fs/promises';
import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { writeFile } from './file-utils.mjs';
import { formatAsCSV, formatAsHTML } from './format-utils.mjs';

const inputFile = 'urls.txt';
const logFile = 'lighthouse-script.log';

async function main() {
  const urls = (await fs.readFile(inputFile, 'utf-8')).split('\n').filter(Boolean);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const results = [];
  
  for (const url of urls) {
    console.log(`Running Lighthouse for ${url}`);
    await logToFile(logFile, `Running Lighthouse for ${url}`);
    const start = performance.now();
    const r = await runLighthouse(url);
    results.push(r);
    const end = performance.now();
    const d = (end - start) / 1000;
    console.log(`Lighthouse finished for ${url} in ${d.toFixed(2)} seconds`);
    await logToFile(logFile, `Lighthouse finished for ${url} in ${d.toFixed(2)} seconds`);
  }

  try {
    await writeFile(`lighthouse-results-${ts}.csv`, formatAsCSV(results));
    await writeFile(`lighthouse-results-${ts}.html`, formatAsHTML(results));
    console.log('Results written to timestamped CSV and HTML files.');
    await logToFile(logFile, 'Results written to timestamped CSV and HTML files.');
  } catch (e) {
    console.error('Error writing results:', e.message);
    await logToFile(logFile, `Error writing results: ${e.message}`);
  }
}

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const opts = { output: 'json', onlyCategories: ['performance'], port: chrome.port };
  const res = await lighthouse(url, opts);
  await chrome.kill();
  const { audits, categories } = res.lhr;
  return {
    url,
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
  await logToFile(logFile, `Unexpected error: ${e.message}`);
});
