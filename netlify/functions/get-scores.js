// A simple test version of leaderboard.js
exports.handler = async () => {
  console.log("--- Leaderboard test handler executed! ---");

  // We are returning a dummy data structure that looks like the real API response
  const dummyData = {
    leaderboardRows: [], 
    cutLines: []
  };

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(dummyData)
  };
};
