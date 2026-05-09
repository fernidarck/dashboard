import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3001';

async function test() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings`);
    const data = await res.json();
    console.log('Settings:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
