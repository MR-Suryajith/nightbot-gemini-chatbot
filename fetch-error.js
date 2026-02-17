const fetch = require('node-fetch');

async function checkError() {
    try {
        const response = await fetch("https://ytpocoai.netlify.app/api/ask?query=what%20is%20freefire%20");
        const body = await response.text();
        console.log("Status:", response.status);
        console.log("Body:", body);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

checkError();
