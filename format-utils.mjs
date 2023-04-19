export function formatAsCSV(results) {
  const header = 'URL,Performance,FCP,SI,LCP,TBT,CLS\n';
  const rows = results.map(
    ({
      url,
      performance,
      firstContentfulPaint,
      speedIndex,
      largestContentfulPaint,
      totalBlockingTime,
      cumulativeLayoutShift
    }) => `${url},${performance},${firstContentfulPaint},${speedIndex},${largestContentfulPaint},${totalBlockingTime},${cumulativeLayoutShift}`
  );
  return header + rows.join('\n');
}

// Abbreviations
const abbreviations = {
  FCP: 'First Contentful Paint',
  SI: 'Speed Index',
  LCP: 'Largest Contentful Paint',
  TBT: 'Total Blocking Time',
  CLS: 'Cumulative Layout Shift',
  TTFB: 'Time to First Byte',
};

// Goal and max values for each metric
const goalValues = {
  FCP: { goal: 1820, max: 2160 },
  SI: { goal: 3420, max: 4100 },
  LCP: { goal: 2520, max: 2950 },
  TBT: { goal: 200, max: 290 },
  CLS: { goal: 0.1, max: 0.14 },
  TTFB: { goal: 200, max: 400 },
};

// Get color based on the value compared to goal and max values
function getColor(value, goal, max) {
  if (value <= goal) return 'green';
  if (value <= max) return 'orange';
  return 'red';
}

// Helper function to format a number with a variable number of decimal places
function formatNumber(value) {
  return Number.isInteger(value) ? value : value.toFixed(2);
}

// Update the formatCell function to use the formatNumber helper function
function formatCell(value, goal, max) {
  const color = getColor(value, goal, max);
  return `<td style="background-color: ${color}">${formatNumber(value)}</td>`;
}

// Format the legend table
function formatLegend() {
  const legendRows = Object.entries(abbreviations).map(([abbr, explanation]) => {
    const { goal, max } = goalValues[abbr];
    const unit = abbr === 'CLS' ? '' : 'ms'; // Add unit for all metrics except CLS
    return `
      <tr>
        <td>${abbr}</td>
        <td>${explanation} (${unit})</td> <!-- Add unit here -->
        <td>${goal}</td>
        <td>${max}</td>
      </tr>`;
  }).join('');

  return `
    <table>
      <tr>
        <th>Abbreviation</th>
        <th>Explanation</th>
        <th>Goal</th>
        <th>Max</th>
      </tr>
      ${legendRows}
    </table>`;
}



function getBaseURL(url) {
  const parsedUrl = new URL(url);
  parsedUrl.pathname = parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/'));
  return parsedUrl.toString();
}


function formatRow(result) {
  const {
    url,
    performance,
    firstContentfulPaint,
    speedIndex,
    largestContentfulPaint,
    totalBlockingTime,
    cumulativeLayoutShift,
    reportFilename,
    jsonReportFilename,
    numNetworkRequests,
    rootResponseProtocol,
    diagnostics,
    totalByteWeight,
    mainThreadTime,
    timeToInteractive,
    serverResponseTime
  } = result;

  const psiLink = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`;

  const reportLink = `<a href="/${reportFilename.replace('results/', '')}" >HTML Report</a>`;
  const jsonReportLink = `<a href="/${jsonReportFilename.replace('results/', '')}" >JSON Report</a>`;

  // Calculate the performance score and assign a color
  const performanceScoreValue = performance * 100;
  let performanceScoreColor;
  if (performanceScoreValue >= 90) {
    performanceScoreColor = "green";
  } else if (performanceScoreValue >= 80) {
    performanceScoreColor = "orange";
  } else {
    performanceScoreColor = "red";
  }

  return `
    <tr>
      <td><a href="${url}" target="_blank">${url}</a></td>
      <td><a href="${psiLink}" target="_blank">PSI</a></td>
      <td style="background-color: ${performanceScoreColor}; text-align: center;">
        <span style="display: inline-block; padding: 5px; border-radius: 50%;">${formatNumber(performanceScoreValue)}</span>
      </td>
      ${formatCell(serverResponseTime, goalValues.TTFB.goal, goalValues.TTFB.max)}
      ${formatCell(firstContentfulPaint, goalValues.FCP.goal, goalValues.FCP.max)}
      ${formatCell(speedIndex, goalValues.SI.goal, goalValues.SI.max)}
      ${formatCell(largestContentfulPaint, goalValues.LCP.goal, goalValues.LCP.max)}
      ${formatCell(totalBlockingTime, goalValues.TBT.goal, goalValues.TBT.max)}
      ${formatCell(cumulativeLayoutShift, goalValues.CLS.goal, goalValues.CLS.max)}
      <td>${formatNumber(totalByteWeight)}</td>
      <td>${formatNumber(mainThreadTime)}</td>
      <td>${formatNumber(timeToInteractive)}</td>
      <td>${reportLink}</td>
      <td>${jsonReportLink}</td>
      <td>${numNetworkRequests}</td>
      <td>${rootResponseProtocol}</td>
    </tr>`;
}



function formatHeader() {
  return `
    <tr>
      <th>URL</th>
      <th title="PageSpeed Insights">PSI</th>
      <th title="Performance Score">Performance Score</th>
      <th title="Time to First Byte">TTFB</th>
      <th title="First Contentful Paint">FCP</th>
      <th title="Speed Index">SI</th>
      <th title="Largest Contentful Paint">LCP</th>
      <th title="Total Blocking Time">TBT</th>
      <th title="Cumulative Layout Shift">CLS</th>
      <th title="Total Byte Weight">Total Byte Weight</th>
      <th title="Main Thread Time">Main Thread Time</th>
      <th title="Time to Interactive">Time to Interactive</th>
      <th title="HTML Report">HTML Report</th>
      <th title="JSON Report">JSON Report</th>
      <th title="Network Requests">Network Requests</th>
      <th title="Root Protocol">Root Protocol</th>
    </tr>`;
}


// Format the table rows for the results
function formatRows(results) {
  return results.map(formatRow).join('');
}

// Format the HTML table
function formatTable(results) {
  const header = formatHeader();
  const rows = formatRows(results);
  return `<table>${header}${rows}</table>`;
}

export function formatAsHTML(results) {
  const table = formatTable(results);
  const legend = formatLegend();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lighthouse Results</title>
        <style>
          body {
            font-family: Arial, sans-serif;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          a {
            text-decoration: none;
            color: #1a0dab;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
      <a href="/"><img src='/img/logo.png' widht="140px" height="140px"></a>
        <h2>Results</h2>
        ${table}
        <h2>Legend</h2>
        ${legend}
      </body>
    </html>`;
}
