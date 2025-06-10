document.addEventListener('DOMContentLoaded', () => {
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': '04531f08dcmshe6e2b529c43c201p1557b0jsn0c81274dfc7c', // <<< YOUR API KEY HERE
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com'
        }
    };

    fetch('https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025', options)
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
                        <td>${player.firstName} ${player.lastName}</td>
                        <td>${player.total}</td>
                        <td>${player.currentHole}</td>
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
