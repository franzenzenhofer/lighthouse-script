import fs from 'fs/promises';
import { performance } from 'perf_hooks';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { writeFile } from './file-utils.mjs';
import { formatAsCSV, formatAsHTML } from './format-utils.mjs';
import { readPastRunsFile, writePastRunsFile, generateIndexHTML } from './index-utils.mjs';
//import { broadcast } from './websocket-utils.mjs';


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

function getTopOpportunities(results) {
  const opportunities = [];

  results.forEach(result => {
    if (result.error) {
      console.log(`Skipping result with error for URL ${result.url}`);
      return;
    }

    if (!result.audits) {
      console.log(`No audits found for URL ${result.url}. Result:`, result);
      return;
    }

    Object.values(result.audits).forEach(audit => {
      if (audit.details && audit.details.type === 'opportunity' && audit.score !== 1) {
        console.log(`Found opportunity for URL ${result.url}: ${audit.description}`);
        opportunities.push(audit);
      }
    });
  });

  const grouped = {};

  opportunities.forEach(opportunity => {
    const key = opportunity.description;
    if (grouped[key]) {
      grouped[key].count++;
    } else {
      grouped[key] = {
        opportunity,
        count: 1,
      };
    }
  });

  const sortedOpportunities = Object.values(grouped).sort((a, b) => {
    const scoreDiff = a.opportunity.score - b.opportunity.score;
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return b.count - a.count;
  });

  const topOpportunities = sortedOpportunities.slice(0, 10).map(({ opportunity, count }) => {
    return {
      ...opportunity,
      count,
    };
  });

  console.log("Top 10 opportunities:");
  console.log(topOpportunities);
  return topOpportunities;
}





async function processURLs(urls, ts, resultsSubDir, broadcast, chromeProfileDir) {
  const results = [];

  function logAndBroadcast(type, message, data = {}) {
    console.log(message);
    broadcast({ type, message, ...data });
  }

  for (const [index, url] of urls.entries()) {
    const start = performance.now();
    logAndBroadcast('testStart', `Starting Lighthouse test for ${url}`, { url, index, total: urls.length });
    
    try {
      const r = await runLighthouse(url, ts, resultsSubDir, chromeProfileDir);
      logAndBroadcast('testEnd', `Lighthouse test successful for ${url}`, { url, index, success: true });
      results.push(r);
    } catch (error) {
      logAndBroadcast('testError', `Lighthouse test failed for ${url}: ${error.message}`, { url, index, success: false, error: error.message });
      results.push({ error, url });
    } finally {
      const end = performance.now();
      const duration = (end - start) / 1000;
      logAndBroadcast('testDuration', `Lighthouse test for ${url} took ${duration.toFixed(2)} seconds`, { url, duration });
    }
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

async function saveHTML(results, htmlFilePath, topOpportunities) {
  try {
    const htmlContent = formatAsHTML(results, topOpportunities);
    await writeFile(htmlFilePath, htmlContent);
  } catch (e) {
    console.error(`Error writing HTML results: ${e.message}`);
    console.error(`Error stack trace: ${e.stack}`);
    console.log(`HTML content:\n${formatAsHTML(results,topOpportunities)}`);
    
    try {
      await writeFile(`${htmlFilePath}_failed-run.html`, formatAsHTML(results,topOpportunities));
    } catch (e) {
      console.error(`Error saving failed HTML results: ${e.message}`);
    }
  }
}


async function runLighthouseForUrls(broadcast, chromeProfileDir = null) {
  //debug chreomeProfileDir
  console.log(`chromeProfileDir: ${chromeProfileDir}`);
  
  const urls = (await fs.readFile(inputFile, 'utf-8')).split('\n').filter(Boolean);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const resultsSubDir = `${resultsDir}/${yearMonth}`;

  await fs.mkdir(logDir, { recursive: true });
  await fs.mkdir(resultsSubDir, { recursive: true });

  const runSubDir = `${resultsSubDir}/${ts}`;
  await fs.mkdir(runSubDir, { recursive: true });

 


  const results = await processURLs(urls, ts, runSubDir, broadcast, chromeProfileDir);
  const topOpportunities = getTopOpportunities(results);

  // Save results internally
  await createResultsSubDir(resultsSubDir);
  const csvFilePath = `${resultsSubDir}/${ts}/lighthouse-results-${ts}.csv`;
  const htmlFilePath = `${resultsSubDir}/${ts}/lighthouse-results-${ts}.html`;
  await saveCSV(results, csvFilePath);
  console.log('Top issues:', topOpportunities); // Add this line
  await saveHTML(results, htmlFilePath, topOpportunities);

  // Update index.html with the new results
  //await generateIndexHTML(results);

  broadcast({ type: 'testsFinished' });

  await generateIndexHTML(results);

  

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

async function runLighthouse(url, ts, runSubDir, chromeProfileDir = null) {

  try {
const chromeFlags = []; //['--headless'];
if (chromeProfileDir) {
  chromeFlags.push(`--user-data-dir=${chromeProfileDir}`);
  //profileId is the last part of chromeProfileDir 
  let profileId = chromeProfileDir.split("/").pop();
  chromeFlags.push(`--profile-directory=${profileId}`);
  
  console.log(`Chrome flags set to: ${chromeFlags.join(' ')}`);
} else {
  console.warn('Chrome profile directory not set. Running headless.');
  chromeFlags.push(`--headless`);

}

const chrome = await chromeLauncher.launch({ chromeFlags });
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
    const serverResponseTime = audits['server-response-time'].numericValue;


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
      timeToInteractive,
      serverResponseTime,
      audits
    };
  } catch (error) {
    return { error, url };
  }
}


export { runLighthouse, runLighthouseForUrls };
