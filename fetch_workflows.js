import fs from 'fs';

async function fetchWorkflow(id, filename) {
  const res = await fetch(`https://appn8n-n8n.83aqlq.easypanel.host/api/v1/workflows/${id}`, {
    headers: {
      "X-N8N-API-KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYWYxYzc1ZS01OGM3LTQ1NjctOGY4OC1lNWNhYWM4YWQxNTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc3ODU5ODY3fQ.9a4a3_-U8SDM9xVzxVpY1oFhcQdwRMuOtntLgSfwtLQ"
    }
  });
  const data = await res.json();
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
}

async function run() {
  await fetchWorkflow("5537mcUjW8GdaxF4", "workflow_ycloud.json");
  await fetchWorkflow("6ynuaCSGhQp76IqO", "workflow_reachportones.json");
  await fetchWorkflow("vkOh59nc5ece8pgF", "workflow_onecontrol.json");
  console.log("Done");
}

run();
