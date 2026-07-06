import { analyzeHTML } from './dist/services/analyzer.js';
const html = `
<html>
<head><title>Test</title></head>
<body>
<a href="https://example.com/about">About</a>
<a href="/contact">Contact</a>
</body>
</html>
`;
const result = analyzeHTML('https://example.com', html, 100);
console.log(result.links);
