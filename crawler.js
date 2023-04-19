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

async function crawl(url) {
  try {
    const sitemapUrls = await fetchSitemapLinks(url);
    if (sitemapUrls.length > 0) {
      const absoluteUrls = sitemapUrls.map((link) => makeURLAbsolute(link, url));
      const uniqueUrls = uniqueArray(absoluteUrls);
      return uniqueUrls.sort((a, b) => a.length - b.length);
    } else {
      console.log('No URLs found in the sitemap.');
      console.log('Falling back to crawling HTML links...');
      const htmlLinks = await fetchHTMLLinks(url);
      const absoluteUrls = htmlLinks.map((link) => makeURLAbsolute(link, url));
      const uniqueUrls = uniqueArray(absoluteUrls);
      return uniqueUrls.sort((a, b) => a.length - b.length);
    }
  } catch (error) {
    console.log('Error fetching sitemap:', error.message);
    console.log('Falling back to crawling HTML links...');
    const htmlLinks = await fetchHTMLLinks(url);
    const absoluteUrls = htmlLinks.map((link) => makeURLAbsolute(link, url));
    const uniqueUrls = uniqueArray(absoluteUrls);
    return uniqueUrls.sort((a, b) => a.length - b.length);
  }
}

export default crawl;
