import * as cheerio from "cheerio";
fetch('https://autorox.ai').then(r=>r.text()).then(html => {
  const $ = cheerio.load(html);
  const links: string[] = [];
  $('a').each((_,el)=>{ links.push($(el).attr('href') || ''); });
  console.log("Found links:", links.length);
  console.log(links.filter(l => l && l.startsWith('http')));
});
