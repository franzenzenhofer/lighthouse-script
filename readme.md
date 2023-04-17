Lighthouse Script

This Node.js script runs Google Lighthouse tests on a list of URLs provided in a text file and outputs the results to timestamped CSV and HTML files. It highlights suboptimal values that lead to orange or red PageSpeed Insights ratings.

Prerequisites:

-   Node.js v12.20.0 or higher (Recommended: v14.x or higher)
-   Google Chrome installed

Installation:

1.  Clone the repository: git clone <https://github.com/franzenzenhofer/lighthouse-script.git>

2.  Change the directory: cd lighthouse-script

3.  Install the dependencies: npm install

Usage:

1.  Create a text file named urls.txt in the project root directory, listing the URLs you want to test, one per line.

Example: https://www.fullstackoptimization.com/

2.  Run the script: node main.js

3.  The script will run Lighthouse tests for each URL and save the results in timestamped CSV and HTML files in the results directory. It will also generate an index.html file listing the results of previous runs.

Note: The script may take some time to complete, depending on the number of URLs and the performance of your computer.

-  Then visit [http://localhost:3000](http://localhost:3000/) in your web browser.

-   Delete Previous Results To delete all previous results and start with a clean slate, run: npm run cleanRun.js

License: This project is licensed under the MIT License - see the LICENSE.md file for details.
