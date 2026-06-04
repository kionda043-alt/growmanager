// Melody's Farm — Groq Proxy Worker
// Pegá este código en Cloudflare Workers

const GROQ_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + GROQ_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
