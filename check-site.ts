import fetch from 'node-fetch';

async function check() {
  const url = 'https://autozilla.co/robots.txt';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Robots.txt content:', text.substring(0, 500));
    
    const sitemapRes = await fetch('https://autozilla.co/sitemap.xml');
    console.log('Sitemap.xml status:', sitemapRes.status);
    if (sitemapRes.ok) {
       const sText = await sitemapRes.text();
       console.log('Sitemap snippet:', sText.substring(0, 500));
    }
  } catch (e) {
    console.error('Check failed:', e);
  }
}

check();
