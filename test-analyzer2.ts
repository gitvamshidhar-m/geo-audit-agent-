import { analyzeHTML } from './src/services/analyzer.js';

const html = `
<a href="https://www.apple.com/mac/">Mac</a>
`;
const result = analyzeHTML('https://apple.com', html, 100);
console.log(result.links);
