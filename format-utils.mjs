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

function getColor(value, goal, max) {
  if (value <= goal) return 'green';
  if (value <= max) return 'orange';
  return 'red';
}

function formatCell(value, goal, max) {
  const color = getColor(value, goal, max);
  return `<td style="background-color: ${color}">${value}</td>`;
}

function formatRow(result) {
  const goalValues = {
    FCP: { goal: 1820, max: 2160 },
    SI: { goal: 3420, max: 4100 },
    LCP: { goal: 2520, max: 2950 },
    TBT: { goal: 200, max: 290 },
    CLS: { goal: 0.1, max: 0.14 },
  };

  const {
    url,
    performance,
    firstContentfulPaint,
    speedIndex,
    largestContentfulPaint,
    totalBlockingTime,
    cumulativeLayoutShift,
    reportFilename,
  } = result;

  const psiLink = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`;
  const reportLink = `<a href="${reportFilename.replace('results', '..')}" target="_blank">HTML Report</a>`;

  return `
    <tr>
      <td><a href="${url}" target="_blank">${url}</a></td>
      <td><a href="${psiLink}" target="_blank">PSI</a></td>
      <td>${performance}</td>
      ${formatCell(firstContentfulPaint, goalValues.FCP.goal, goalValues.FCP.max)}
      ${formatCell(speedIndex, goalValues.SI.goal, goalValues.SI.max)}
      ${formatCell(largestContentfulPaint, goalValues.LCP.goal, goalValues.LCP.max)}
      ${formatCell(totalBlockingTime, goalValues.TBT.goal, goalValues.TBT.max)}
      ${formatCell(cumulativeLayoutShift, goalValues.CLS.goal, goalValues.CLS.max)}
      <td>${reportLink}</td>
    </tr>`;
}

export function formatAsHTML(results) {
  const header = `<tr><th>URL</th><th>PSI</th><th>Performance</th><th>FCP</th><th>SI</th><th>LCP</th><th>TBT</th><th>CLS</th><th>HTML Report</th></tr>`;
  const rows = results.map(formatRow).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Lighthouse Results</title></head><body><table>${header}${rows}</table></body></html>`;
}
