import fetch from "node-fetch";
const run = async () => {
    const response = await fetch("https://autorox.ai", {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          redirect: "follow",
        });
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Text length:", text.length);
    console.log("Snippet:", text.substring(0, 300));
};
run();
