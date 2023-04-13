export function formatAsCSV(data) {
  const header = 'URL,Performance,First Contentful Paint,Speed Index,Largest Contentful Paint,Time to Interactive,Total Blocking Time,Cumulative Layout Shift\n';
  const rows = data.map(({ url, performance, firstContentfulPaint, speedIndex, largestContentfulPaint, interactive, totalBlockingTime, cumulativeLayoutShift }) => (
    `${url},${performance},${firstContentfulPaint},${speedIndex},${largestContentfulPaint},${interactive},${totalBlockingTime},${cumulativeLayoutShift}`
  ));
  return header + rows.join('\n');
}

export function formatAsHTML(data) {
  const header = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lighthouse Results</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <table>
    <tr>
      <th>URL</th>
      <th>Performance</th>
      <th>First Contentful Paint</th>
      <th>Speed Index</th>
      <th>Largest Contentful Paint</th>
      <th>Time to Interactive</th>
      <th>Total Blocking Time</th>
      <th>Cumulative Layout Shift</th>
    </tr>`;

  const rows = data.map(({ url, performance, firstContentfulPaint, speedIndex, largestContentfulPaint, interactive, totalBlockingTime, cumulativeLayoutShift }) => (
    `<tr>
      <td>${url}</td>
      <td>${performance}</td>
      <td>${firstContentfulPaint}</td>
      <td>${speedIndex}</td>
      <td>${largestContentfulPaint}</td>
      <td>${interactive}</td>
      <td>${totalBlockingTime}</td>
      <td>${cumulativeLayoutShift}</td>
    </tr>`
  ));

  const footer = `
  </table>
</body>
</html>`;
  return header + rows.join('\n') + footer;
}
