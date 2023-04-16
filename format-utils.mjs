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
};

// Goal and max values for each metric
const goalValues = {
  FCP: { goal: 1820, max: 2160 },
  SI: { goal: 3420, max: 4100 },
  LCP: { goal: 2520, max: 2950 },
  TBT: { goal: 200, max: 290 },
  CLS: { goal: 0.1, max: 0.14 },
};

// Get color based on the value compared to goal and max values
function getColor(value, goal, max) {
  if (value <= goal) return 'green';
  if (value <= max) return 'orange';
  return 'red';
}

// Format a table cell with color based on the value
function formatCell(value, goal, max) {
  const color = getColor(value, goal, max);
  return `<td style="background-color: ${color}">${value}</td>`;
}

// Format the legend table
function formatLegend() {
  const legendRows = Object.entries(abbreviations).map(([abbr, explanation]) => {
    const { goal, max } = goalValues[abbr];
    return `
      <tr>
        <td>${abbr}</td>
        <td>${explanation}</td>
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
    diagnostics, // Add this line
    performanceScore, // Add this line
    totalByteWeight, // Add this line
    mainThreadTime, // Add this line
    timeToInteractive // Add this line
  } = result;

  const psiLink = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`;
  
  const reportLink = `<a href="/${reportFilename.replace('results/', '')}" >HTML Report</a>`; // Update this line
  const jsonReportLink = `<a href="/${jsonReportFilename.replace('results/', '')}" >JSON Report</a>`; // Update this line


  
  return `
    <tr>
      <td><a href="${url}" target="_blank">${url}</a></td>
      <td><a href="${psiLink}" target="_blank">PSI</a></td>
      <td>${performanceScore}</td> <!-- Update this line -->
      ${formatCell(firstContentfulPaint, goalValues.FCP.goal, goalValues.FCP.max)}
      ${formatCell(speedIndex, goalValues.SI.goal, goalValues.SI.max)}
      ${formatCell(largestContentfulPaint, goalValues.LCP.goal, goalValues.LCP.max)}
      ${formatCell(totalBlockingTime, goalValues.TBT.goal, goalValues.TBT.max)}
      ${formatCell(cumulativeLayoutShift, goalValues.CLS.goal, goalValues.CLS.max)}
      <td>${totalByteWeight}</td> <!-- Add this line -->
      <td>${mainThreadTime}</td> <!-- Add this line -->
      <td>${timeToInteractive}</td> <!-- Add this line -->
      <td>${reportLink}</td>
      <td>${jsonReportLink}</td>
      <td>${numNetworkRequests}</td>
      <td>${rootResponseProtocol}</td>
    </tr>`;
}
// Format the header row for the HTML table
function formatHeader() {
  return `
    <tr>
      <th>URL</th>
      <th>PSI</th>
      <th>Performance Score</th>
      <th>FCP</th>
      <th>SI</th>
      <th>LCP</th>
      <th>TBT</th>
      <th>CLS</th>
      <th>Total Byte Weight</th>
      <th>Main Thread Time</th>
      <th>Time to Interactive</th>
      <th>HTML Report</th>
      <th>JSON Report</th>
      <th>Network Requests</th>
      <th>Root Protocol</th>
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
      <a href="/"><img src='/img/logo.png' widht="150px" height="150px"></a>
        <h2>Results</h2>
        ${table}
        <h2>Legend</h2>
        ${legend}
      </body>
    </html>`;
}
