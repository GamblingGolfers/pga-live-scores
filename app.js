document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    const apiKey = 'YOUR_SECRET_API_KEY'; // <<< MAKE SURE YOUR API KEY IS HERE
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // --- This is the "Success" block, now corrected ---

            // Display the raw successful data in the debug area
            debugOutput.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            leaderboardBody.innerHTML = ''; // Clear the table

            // 1.  CORRECTED: Check for 'leaderboardRows' instead of 'leaderboard.players'
            if (data && data.leaderboardRows && data.leaderboardRows.length > 0) {
                
                // 2.  CORRECTED: Loop through the 'leaderboardRows' array
                data.leaderboardRows.forEach(player => {
                    const row = document.createElement('tr');

                    // 3.  CORRECTED: Use the new property names from the JSON data
                    const position = player.position;
                    const playerName = `${player.firstName} ${player.lastName}`;
                    const totalToPar = player.total;
                    const thru = player.thru || 'N/A';

                    // Safely get the last round's score from the nested object
                    let lastRound = 'N/A';
                    if (player.rounds && player.rounds.length > 0) {
                        const lastRoundData = player.rounds[player.rounds.length - 1];
                        if (lastRoundData.strokes && lastRoundData.strokes['$numberInt']) {
                            lastRound = lastRoundData.strokes['$numberInt'];
                        }
                    }

                    row.innerHTML = `
                        <td>${position}</td>
                        <td>${playerName}</td>
                        <td>${totalToPar}</td>
                        <td>${thru}</td>
                        <td>${lastRound}</td>
                    `;
                    leaderboardBody.appendChild(row);
                });
            } else {
                leaderboardBody.innerHTML = '<tr><td colspan="5">Leaderboard data received, but it contains no players.</td></tr>';
            }
        })
        .catch(error => {
            // This is the "Failure" block, it will remain for future debugging
            debugOutput.innerHTML = `
                <h3>An Error Occurred!</h3>
                <p><strong>${error.toString()}</strong></p>
            `;
            leaderboardBody.innerHTML = `<tr><td colspan="5">Failed to load data. See error details in the Debug Output section.</td></tr>`;
        });
});
