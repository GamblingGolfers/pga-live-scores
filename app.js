document.addEventListener('DOMContentLoaded', () => {
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY', // <<< YOUR API KEY HERE
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com'
        }
    };

    fetch('https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=012&year=2025', options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const leaderboardBody = document.getElementById('leaderboard-body');
            leaderboardBody.innerHTML = ''; // Clear existing data

            if (data && data.leaderboard && data.leaderboard.players) {
                data.leaderboard.players.forEach(player => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${player.position}</td>
                        <td>${player.first_name} ${player.last_name}</td>
                        <td>${player.total_to_par}</td>
                        <td>${player.thru}</td>
                        <td>${player.rounds.slice(-1)[0] ? player.rounds.slice(-1)[0].strokes : 'N/A'}</td>
                    `;

                    leaderboardBody.appendChild(row);
                });
            } else {
                leaderboardBody.innerHTML = '<tr><td colspan="5">No data available.</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            const leaderboardBody = document.getElementById('leaderboard-body');
            leaderboardBody.innerHTML = `<tr><td colspan="5">Failed to load leaderboard data. See console for details.</td></tr>`;
        });
});
