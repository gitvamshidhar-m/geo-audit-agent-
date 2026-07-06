import { analyzeHTML } from './src/services/analyzer.ts';
fetch('https://autorox.ai').then(r=>r.text()).then(html => {
  const result = analyzeHTML('https://autorox.ai', html, 100, {});
  console.log("Internal:", result.links.internal.length);
  console.log("External:", result.links.external.length);
});
