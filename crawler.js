import axios from 'axios';
import cheerio from 'cheerio';

async function fetchHTML(url) {
  const { data: html } = await axios.get(url);
  return html;
}

async function fetchSitemapLinks(url) {
  const sitemapUrl = new URL('/sitemap.xml', url).toString();
  const html = await fetchHTML(sitemapUrl);
  const $ = cheerio.load(html, { xmlMode: true });
  const urls = [];

  $('url > loc, sitemap > loc').each((_, el) => {
    urls.push($(el).text());
  });

  return urls;
}

async function fetchHTMLLinks(url) {
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const urls = [];

  $('a[href]').each((_, el) => {
    const link = $(el).attr('href');
    urls.push(new URL(link, url).toString());
  });

  return urls;
}

function makeURLAbsolute(url, baseUrl) {
  const absoluteUrl = new URL(url, baseUrl);
  absoluteUrl.hash = ''; // Remove the hash fragment
  return absoluteUrl.toString();
}

function uniqueArray(array) {
  return Array.from(new Set(array));
}

// Helper function to filter URLs from the same root domain
function filterSameRootDomainUrls(urls, rootUrl) {
  const rootHostname = new URL(rootUrl).hostname;
  return urls.filter((url) => {
    const urlHostname = new URL(url).hostname;
    return urlHostname === rootHostname;
  });
}

// Helper function to remove common tracking parameters from URLs
function removeTrackingParameters(url) {
  const parsedUrl = new URL(url);
  const excludeParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
  ];

  excludeParams.forEach((param) => parsedUrl.searchParams.delete(param));
  return parsedUrl.toString();
}

async function crawl(url) {
  try {
    const sitemapUrls = await fetchSitemapLinks(url);
    if (sitemapUrls.length > 0) {
      const filteredUrls = filterSameRootDomainUrls(sitemapUrls, url);
      const cleanedUrls = filteredUrls.map(removeTrackingParameters);
      const absoluteUrls = cleanedUrls.map((link) => makeURLAbsolute(link, url));
      const uniqueUrls = uniqueArray(absoluteUrls);
      return uniqueUrls.sort((a, b) => a.length - b.length);
    } else {
      console.log('No URLs found in the sitemap.');
      console.log('Falling back to crawling HTML links...');
      const htmlLinks = await fetchHTMLLinks(url);
      const filteredUrls = filterSameRootDomainUrls(htmlLinks, url);
      const cleanedUrls = filteredUrls.map(removeTrackingParameters);
      const absoluteUrls = cleanedUrls.map((link) => makeURLAbsolute(link, url));
      const uniqueUrls = uniqueArray(absoluteUrls);
      return uniqueUrls.sort((a, b) => a.length - b.length);
    }
  } catch (error) {
    console.log('Error fetching sitemap:', error.message);
    console.log('Falling back to crawling HTML links...');
    const htmlLinks = await fetchHTMLLinks(url);
    const filteredUrls = filterSameRootDomainUrls(htmlLinks, url);
const cleanedUrls = filteredUrls.map(removeTrackingParameters);
const absoluteUrls = cleanedUrls.map((link) => makeURLAbsolute(link, url));
const uniqueUrls = uniqueArray(absoluteUrls);
return uniqueUrls.sort((a, b) => a.length - b.length);
}
}

export default crawl;
