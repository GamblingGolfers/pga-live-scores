// File: netlify/functions/get-scores.js

exports.handler = async (event, context) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';
  const apiHost = 'live-golf-data.p.rapidapi.com';

  if (!apiKey) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'API Key is missing from server environment.' }) 
    };
  }

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    // Pass the response from RapidAPI through to the front-end
    return {
      statusCode: response.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data due to an internal function error.' })
    };
  }
};
