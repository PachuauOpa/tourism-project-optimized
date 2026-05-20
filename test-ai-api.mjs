#!/usr/bin/env node

const testPayload = {
  duration: '1 Day',
  interests: ['History & Culture'],
  destinations: []
};

try {
  const response = await fetch('http://localhost:4001/api/ai/generate-itinerary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });

  console.log('\n=== API Response ===');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  
  const data = await response.json();
  console.log('\nFull Response:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.error) {
    console.log('\n⚠️  ERROR DETAILS:');
    console.log(data.error);
  } else {
    console.log('\n⚠️  No error details in response. Check server logs above.');
  }
  
} catch (err) {
  console.error('Error testing API:');
  console.error(err.message);
  if (err.code === 'ECONNREFUSED') {
    console.log('\n⚠️  Cannot connect to http://localhost:4001');
    console.log('Make sure the tourist-AI service is running: npm run dev');
  }
}
