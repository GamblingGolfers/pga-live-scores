document.addEventListener('DOMContentLoaded', () => {

    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
        '58619': ['Kris']           // Kevin Velo
    };

    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let allPlayersData = []; 

    // --- UPDATED: The URL now points to our own secure function ---
    const url = '/.netlify/functions/leaderboard'; 
    // The apiKey and options object are no longer needed here!

    const leaderboardBody = document.getElementById('leaderboard-body');
    const gamblersContainer = document.getElementById('gamblers-container');

    // ... (The rest of the helper functions: parseScore, formatScore, updateGamblersTable remain exactly the same) ...
    const parseScore = (score) => { /* ... unchanged ... */ };
    const formatScore = (score) => { /* ... unchanged ... */ };
    const updateGamblersTable = (cutScore) => { /* ... unchanged ... */ };

    const fetchLeaderboardData = () => {
        // --- UPDATED: The fetch call is now much simpler ---
        fetch(url) // No options or headers needed
            .then(response => {
                if (!response.ok) { throw new Error(`API Request Failed: ${response.statusText} (Status: ${response.status})`); }
                return response.json();
            })
            .then(data => {
                // The rest of the data processing logic is exactly the same as before
                allPlayersData = data.leaderboardRows || [];
                let cutScoreValue = 'N/A';
                if (data.cutLines && data.cutLines.length > 0 && data.cutLines[0].cutScore) {
                    cutScoreValue = data.cutLines[0].cutScore;
                }
                leaderboardBody.innerHTML = allPlayersData.map(player => {
                    const tagsHtml = (gamblerPicks[player.playerId] || []).map(tag => `<span class="tag">${tag}</span>`).join('');
                    const scoreInfo = formatScore(parseScore(player.total));
                    let lastRound = 'N/A';
                    if (player.rounds && player.rounds.length > 0) {
                        const lastRoundData = player.rounds[player.rounds.length - 1];
                        if (lastRoundData && lastRoundData.strokes && lastRoundData.strokes['$numberInt']) {
                            lastRound = lastRoundData.strokes['$numberInt'];
                        }
                    }
                    return `
                        <tr>
                            <td>${tagsHtml}</td>
                            <td>${player.position}</td>
                            <td>${player.firstName} ${player.lastName}</td>
                            <td class="${scoreInfo.className}">${scoreInfo.text}</td>
                            <td>${player.thru || 'N/A'}</td>
                            <td>${lastRound}</td>
                        </tr>
                    `;
                }).join('');
                updateGamblersTable(cutScoreValue); 
            })
            .catch(error => {
                console.error("Failed to fetch data:", error);
                gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Could not load live data.</p>`;
                leaderboardBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #d9534f;"><strong>${error.message}</strong></td></tr>`;
            });
    };

    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000);
});
