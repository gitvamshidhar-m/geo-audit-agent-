import fetch from 'node-fetch';

async function test() {
  const url = 'https://autozilla.co/';
  console.log('Testing fetch for:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Content length:', text.length);
    console.log('Snippet:', text.substring(0, 1000));
  } catch (e) {
    console.error('Fetch failed:', e);
  }
}

test();
