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

export function formatAsHTML(results) {
  const goalValues = {
    FCP: { goal: 1820, max: 2160 },
    SI: { goal: 3420, max: 4100 },
    LCP: { goal: 2520, max: 2950 },
    TBT: { goal: 200, max: 290 },
    CLS: { goal: 0.1, max: 0.14 }
  };

  const header = `<tr><th>URL</th><th>PSI</th><th>Performance</th><th>FCP</th><th>SI</th><th>LCP</th><th>TBT</th><th>CLS</th></tr>`;
  const rows = results
    .map(
      ({
        url,
        performance,
        firstContentfulPaint,
        speedIndex,
        largestContentfulPaint,
        totalBlockingTime,
        cumulativeLayoutShift
      }) => {
        const psiLink = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`;
        const fcpColor = getColor(firstContentfulPaint, goalValues.FCP.goal, goalValues.FCP.max);
        const siColor = getColor(speedIndex, goalValues.SI.goal, goalValues.SI.max);
        const lcpColor = getColor(largestContentfulPaint, goalValues.LCP.goal, goalValues.LCP.max);
        const tbtColor = getColor(totalBlockingTime, goalValues.TBT.goal, goalValues.TBT.max);
        const clsColor = getColor(cumulativeLayoutShift, goalValues.CLS.goal, goalValues.CLS.max);

        return `<tr><td><a href="${url}" target="_blank">${url}</a></td><td><a href="${psiLink}" target="_blank">PSI</a></td><td>${performance}</td><td style="background-color: ${fcpColor}">${firstContentfulPaint}</td><td style="background-color: ${siColor}">${speedIndex}</td><td style="background-color: ${lcpColor}">${largestContentfulPaint}</td><td style="background-color: ${tbtColor}">${totalBlockingTime}</td><td style="background-color: ${clsColor}">${cumulativeLayoutShift}</td></tr>`;
      }
    )
    .join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Lighthouse Results</title></head><body><table>${header}${rows}</table></body></html>`;
}
