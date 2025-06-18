// FINAL VERSION - This function now receives tournament parameters dynamically

exports.handler = async (event, context) => {
  const apiKey = process.env.RAPIDAPI_KEY;

  // --- NEW: Get tournament parameters from the request URL ---
  const { orgId, tournId, year } = event.queryStringParameters;

  // Safety checks for required parameters
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API Key is missing.' }) };
  }
  if (!tournId || !year) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required tournament parameters.' }) };
  }

  // --- NEW: Build the API URL dynamically ---
  const url = `https://live-golf-data.p.rapidapi.com/leaderboard?orgId=${orgId || '1'}&tournId=${tournId}&year=${year}`;
  
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'live-golf-data.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data from the golf API.' })
    };
  }
};
