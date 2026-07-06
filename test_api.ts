import fetch from "node-fetch";

const run = async () => {
    console.log("Starting audit...");
    const res = await fetch('http://127.0.0.1:3000/api/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://autorox.ai', depth: 10, maxPages: 1000 })
    });
    console.log("Start res", res.status);
    
    // Check status until done
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        let stat = await fetch('http://127.0.0.1:3000/api/audit/status').then(r=>r.json()) as any;
        console.log("Status:", stat.is_running, stat.progress, stat.current_url);
        if (!stat.is_running) {
             let results = await fetch('http://127.0.0.1:3000/api/audit/results').then(r=>r.json()) as any;
             console.log("FINAL results pages count:", results.pages?.length || 0);
             break;
        }
    }
};

run().catch(console.error);
