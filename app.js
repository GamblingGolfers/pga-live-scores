document.addEventListener('DOMContentLoaded', () => {

    // --- NEW "SOURCE OF TRUTH" ---
    // This is the only place you need to edit.
    // Assign players to gamblers by adding the player's ID and an array of names.
    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
        // --- Add more players here in the format: 'PLAYER_ID': ['GAMBLER_NAME'] ---
        // e.g., '12345': ['Dean', 'Billy']
    };

    // --- Configuration ---
    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let allPlayersData = []; 

    // --- API Configuration ---
    const apiKey = '04531f08dcmshe6e2b529c43c201p1557b0jsn0c81274dfc7c';
    const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';
    const options = {
        method: 'GET',
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'live-golf-data.p.rapidapi.com' }
    };

    // --- Get HTML Elements ---
    const leaderboardBody = document.getElementById('leaderboard-body');
    const gamblersBody = document.getElementById('gamblers-body');
    const debugOutput = document.getElementById('debug-output');

    // --- Helper Functions ---
    const parseScore = (score) => {
        if (score === 'E') return 0;
        const number = parseInt(score, 10);
        return isNaN(number) ? 0 : number;
    };
    const formatScore = (score) => {
        if (score === 0) return 'E';
        if (score > 0) return `+${score}`;
        return score.toString();
    };

    // --- Core function to calculate gambler totals ---
    const updateGamblersTable = () => {
        const gamblerScores = {};
        availableGamblers.forEach(gambler => { gamblerScores[gambler] = 0; });

        allPlayersData.forEach(player => {
            // UPDATED: Reads from our hardcoded 'gamblerPicks' object
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerScores.hasOwnProperty(gamblerName)) {
                    gamblerScores[gamblerName] += parseScore(player.total);
                }
            });
        });

        gamblersBody.innerHTML = '';
        availableGamblers.forEach(gambler => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${gambler}</td>
                <td>${formatScore(gamblerScores[gambler])}</td>
            `;
            gamblersBody.appendChild(row);
        });
    };
    
    // --- Data fetching and rendering function ---
    const fetchLeaderboardData = () => {
        fetch(url, options)
            .then(response => response.json())
            .then(data => {
                debugOutput.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                leaderboardBody.innerHTML = ''; 
                allPlayersData = data.leaderboardRows || [];

                if (allPlayersData.length > 0) {
                    allPlayersData.forEach(player => {
                        const row = document.createElement('tr');
                        const playerId = player.playerId;
                        
                        // UPDATED: Displays tags as text instead of a dropdown
                        const tagsForPlayer = gamblerPicks[playerId] || [];
                        const tagsText = tagsForPlayer.join(', '); // e.g., "Kris, Cal"
                        
                        const lastRound = player.rounds.length > 0 ? player.rounds[player.rounds.length - 1].strokes['$numberInt'] : 'N/A';
                        
                        row.innerHTML = `
                            <td>${tagsText}</td>
                            <td>${player.position}</td>
                            <td>${player.firstName} ${player.lastName}</td>
                            <td>${player.total}</td>
                            <td>${player.thru || 'N/A'}</td>
                            <td>${lastRound}</td>
                        `;
                        leaderboardBody.appendChild(row);
                    });
                } else {
                    leaderboardBody.innerHTML = '<tr><td colspan="6">No player data available.</td></tr>';
                }

                updateGamblersTable();
            })
            .catch(error => {
                console.error("Failed to fetch data:", error);
            });
    };

    // --- REMOVED: The event listener for dropdowns is no longer needed. ---

    // --- Initial setup and refresh interval ---
    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000); // Auto-refresh still works
});
