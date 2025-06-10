// This version includes console.log() statements for debugging

exports.handler = async (event, context) => {
  console.log("--- Serverless function handler started ---");

  // Get the secret API key from the environment variables
  const apiKey = process.env.RAPIDAPI_KEY;

  // --- NEW: Logging to check if the API key is loaded ---
  if (apiKey) {
    console.log("API Key has been loaded successfully.");
    console.log(`API Key starts with: ${apiKey.substring(0, 5)}...`); // Log first 5 chars for verification
  } else {
    console.error("CRITICAL ERROR: API Key was not found in environment variables (process.env.RAPIDAPI_KEY is undefined).");
  }
  
  const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';
  const apiHost = 'live-golf-data.p.rapidapi.com';

  console.log(`Attempting to fetch from RapidAPI with host: ${apiHost}`);

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost
    }
  };

  try {
    const response = await fetch(url, options);
    console.log(`Received response from RapidAPI with status: ${response.status}`);
    
    // If the response is not OK, we'll log the reason
    if (!response.ok) {
        console.error(`RapidAPI responded with an error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("An error occurred inside the try-catch block:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data due to an internal function error.' })
    };
  }
};
