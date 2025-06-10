exports.handler = async (event, context) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';

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
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data' })
    };
  }
};
