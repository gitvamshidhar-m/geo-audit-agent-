import fetch from "node-fetch";
const response = await fetch("https://autorox.ai", {
    headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    }
});
console.log(response.status);
console.log(await response.text());
