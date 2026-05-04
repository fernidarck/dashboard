import fs from 'fs';

async function fetchWorkflows() {
  const res = await fetch("https://appn8n-n8n.83aqlq.easypanel.host/api/v1/workflows", {
    headers: {
      "X-N8N-API-KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYWYxYzc1ZS01OGM3LTQ1NjctOGY4OC1lNWNhYWM4YWQxNTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc3ODU5ODY3fQ.9a4a3_-U8SDM9xVzxVpY1oFhcQdwRMuOtntLgSfwtLQ"
    }
  });
  const data = await res.json();
  const summary = data.data.map(w => ({id: w.id, name: w.name, active: w.active}));
  fs.writeFileSync("workflows_summary.json", JSON.stringify(summary, null, 2), "utf8");
  console.log("Done");
}

fetchWorkflows();
