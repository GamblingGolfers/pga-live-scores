document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    const apiKey = '04531f08dcmshe6e2b529c43c201p1557b0jsn0c81274dfc7c'; // <<< PASTE YOUR API KEY HERE
    const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';

    // --- API Request Options ---
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com'
        }
    };

    // --- Get HTML Elements ---
    const leaderboardBody = document.getElementById('leaderboard-body');
    const debugOutput = document.getElementById('debug-output');

    // --- Fetch Data from API ---
    fetch(url, options)
        .then(response => {
            // If the response from the server is not "OK" (e.g., 401, 404, 403),
            // throw an error to trigger the .catch() block.
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // Otherwise, continue by parsing the JSON data.
            return response.json();
        })
        .then(data => {
            // --- This code runs ONLY if the fetch was successful ---

            // Display the raw successful data in the debug area
            debugOutput.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            leaderboardBody.innerHTML = ''; // Clear the table

            // Check if the leaderboard and player data actually exist in the response
            if (data && data.leaderboard && data.leaderboard.players && data.leaderboard.players.length > 0) {
                // If we have players, loop through them and build the table
                data.leaderboard.players.forEach(player => {
                    const row = document.createElement('tr');
                    const lastRound = player.rounds && player.rounds.length > 0 ? player.rounds[player.rounds.length - 1].strokes : 'N/A';

                    row.innerHTML = `
                        <td>${player.position}</td>
                        <td>${player.first_name} ${player.last_name}</td>
                        <td>${player.total_to_par}</td>
                        <td>${player.thru || 'N/A'}</td>
                        <td>${lastRound}</td>
                    `;
                    leaderboardBody.appendChild(row);
                });
            } else {
                // If there are no players, display a message in the table
                leaderboardBody.innerHTML = '<tr><td colspan="5">No leaderboard data available. The tournament may not have started yet.</td></tr>';
            }
        })
        .catch(error => {
            // --- This code runs ONLY if the fetch FAILED ---

            // Display a detailed error message on the page for debugging on iPad
            debugOutput.innerHTML = `
                <h3>An Error Occurred!</h3>
                <p><strong>${error.toString()}</strong></p>
                <hr>
                <h4>Common Causes:</h4>
                <ol>
                    <li><b>Incorrect API Key:</b> The key is wrong, or you haven't subscribed to a plan on RapidAPI.</li>
                    <li><b>Invalid Tournament ID:</b> The requested tournament ('tournId=020') does not exist for 2025. A "status: 404" error means this is the problem.</li>
                    <li><b>Quota Exceeded:</b> You have made too many requests on the free plan. A "status: 429" error means this is the problem.</li>
                </ol>
            `;

            // Also update the table to show an error
            leaderboardBody.innerHTML = `<tr><td colspan="5">Failed to load data. See error details in the Debug Output section below.</td></tr>`;
        });
});
