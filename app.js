document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let playerTags = JSON.parse(localStorage.getItem('playerTags')) || {};
    let allPlayersData = []; // Will store the raw player data from the API

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

    // --- NEW: Helper function to parse score strings like "E" or "-5" into numbers ---
    const parseScore = (score) => {
        if (score === 'E') return 0;
        const number = parseInt(score, 10);
        return isNaN(number) ? 0 : number; // Return 0 if score is not a number (e.g., "CUT")
    };
    
    // --- NEW: Helper function to format numbers back into score strings ---
    const formatScore = (score) => {
        if (score === 0) return 'E';
        if (score > 0) return `+${score}`;
        return score.toString();
    };

    // --- NEW: Core function to calculate and display gambler totals ---
    const updateGamblersTable = () => {
        // 1. Initialize scores for all gamblers to 0
        const gamblerScores = {};
        availableGamblers.forEach(gambler => {
            gamblerScores[gambler] = 0;
        });

        // 2. Loop through every player from the API data
        allPlayersData.forEach(player => {
            const tagsForPlayer = playerTags[player.playerId] || [];
            
            // 3. For each tag on a player, add their score to the corresponding gambler's total
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerScores.hasOwnProperty(gamblerName)) {
                    gamblerScores[gamblerName] += parseScore(player.total);
                }
            });
        });

        // 4. Clear the old table and display the new totals
        gamblersBody.innerHTML = '';
        availableGamblers.forEach(gambler => {
            const row = document.createElement('tr');
            const total = gamblerScores[gambler];

            row.innerHTML = `
                <td>${gambler}</td>
                <td>${formatScore(total)}</td>
            `;
            gamblersBody.appendChild(row);
        });
    };

    // --- Event listener for the tag dropdowns ---
    leaderboardBody.addEventListener('change', (event) => {
        if (event.target.tagName === 'SELECT') {
            const selectElement = event.target;
            const playerId = selectElement.dataset.playerId;
            const selectedTags = Array.from(selectElement.selectedOptions).map(option => option.value);

            playerTags[playerId] = selectedTags;
            localStorage.setItem('playerTags', JSON.stringify(playerTags));

            // After any change, recalculate the gambler totals
            updateGamblersTable();
        }
    });

    // --- Fetch Data from API ---
    fetch(url, options)
        .then(response => {
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            return response.json();
        })
        .then(data => {
            debugOutput.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            leaderboardBody.innerHTML = '';

            if (data && data.leaderboardRows && data.leaderboardRows.length > 0) {
                allPlayersData = data.leaderboardRows; // Store player data globally

                allPlayersData.forEach(player => {
                    const row = document.createElement('tr');
                    const playerId = player.playerId;
                    
                    const selectOptions = availableGamblers.map(gambler => {
                        const tagsForThisPlayer = playerTags[playerId] || [];
                        const isSelected = tagsForThisPlayer.includes(gambler) ? 'selected' : '';
                        return `<option value="${gambler}" ${isSelected}>${gambler}</option>`;
                    }).join('');
                    
                    const selectDropdown = `<select multiple data-player-id="${playerId}" size="4">${selectOptions}</select>`;
                    
                    const lastRound = player.rounds.length > 0 ? player.rounds[player.rounds.length - 1].strokes['$numberInt'] : 'N/A';
                    
                    row.innerHTML = `
                        <td>${selectDropdown}</td>
                        <td>${player.position}</td>
                        <td>${player.firstName} ${player.lastName}</td>
                        <td>${player.total}</td>
                        <td>${player.thru || 'N/A'}</td>
                        <td>${lastRound}</td>
                    `;
                    leaderboardBody.appendChild(row);
                });

                // Perform the initial calculation and display the Gamblers table
                updateGamblersTable();

            } else {
                leaderboardBody.innerHTML = '<tr><td colspan="6">Leaderboard data received, but it contains no players.</td></tr>';
            }
        })
        .catch(error => {
            debugOutput.innerHTML = `<h3>An Error Occurred!</h3><p><strong>${error.toString()}</strong></p>`;
            leaderboardBody.innerHTML = `<tr><td colspan="6">Failed to load data. See error details.</td></tr>`;
        });
});
