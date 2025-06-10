document.addEventListener('DOMContentLoaded', () => {

    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
    };

    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let allPlayersData = []; 

    const apiKey = '04531f08dcmshe6e2b529c43c201p1557b0jsn0c81274dfc7c';
    const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';
    const options = {
        method: 'GET',
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'live-golf-data.p.rapidapi.com' }
    };

    const leaderboardBody = document.getElementById('leaderboard-body');
    const gamblersContainer = document.getElementById('gamblers-container');

    const parseScore = (score) => {
        if (score === 'E') return 0;
        const number = parseInt(score, 10);
        return isNaN(number) ? 0 : number;
    };
    
    const formatScore = (score) => {
        if (score === 0) return { text: 'E', className: 'score-even' };
        if (score > 0) return { text: `+${score}`, className: 'score-over' };
        return { text: score.toString(), className: 'score-under' };
    };

    const updateGamblersTable = () => {
        const gamblerScores = {};
        availableGamblers.forEach(gambler => { gamblerScores[gambler] = 0; });

        allPlayersData.forEach(player => {
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerScores.hasOwnProperty(gamblerName)) {
                    gamblerScores[gamblerName] += parseScore(player.total);
                }
            });
        });

        // Clear only the gambler cards, not the new cut score card
        gamblersContainer.querySelectorAll('.gambler-card').forEach(card => card.remove());

        availableGamblers.forEach(gambler => {
            const total = gamblerScores[gambler];
            const scoreInfo = formatScore(total);

            const card = document.createElement('div');
            card.className = 'gambler-card'; // Mark as a gambler card for easy removal
            card.innerHTML = `
                <div class="name">${gambler}</div>
                <div class="score ${scoreInfo.className}">${scoreInfo.text}</div>
            `;
            gamblersContainer.appendChild(card);
        });
    };
    
    const fetchLeaderboardData = () => {
        fetch(url, options)
            .then(response => response.json())
            .then(data => {
                leaderboardBody.innerHTML = ''; 
                allPlayersData = data.leaderboardRows || [];

                if (allPlayersData.length > 0) {
                    allPlayersData.forEach(player => {
                        const row = document.createElement('tr');
                        const playerId = player.playerId;
                        
                        const tagsForPlayer = gamblerPicks[playerId] || [];
                        const tagsHtml = tagsForPlayer.map(tag => `<span class="tag">${tag}</span>`).join('');
                        
                        const scoreInfo = formatScore(parseScore(player.total));
                        const lastRound = player.rounds.length > 0 ? player.rounds[player.rounds.length - 1].strokes['$numberInt'] : 'N/A';
                        
                        row.innerHTML = `
                            <td>${tagsHtml}</td>
                            <td>${player.position}</td>
                            <td>${player.firstName} ${player.lastName}</td>
                            <td class="${scoreInfo.className}">${scoreInfo.text}</td>
                            <td>${player.thru || 'N/A'}</td>
                            <td>${lastRound}</td>
                        `;
                        leaderboardBody.appendChild(row);
                    });
                } else {
                    leaderboardBody.innerHTML = '<tr><td colspan="6">No player data available.</td></tr>';
                }

                // First, update the gambler totals
                updateGamblersTable();

                // --- NEW: Create and display the Cut Score Card ---
                // Remove the old cut score card if it exists, to prevent duplicates on refresh
                const existingCutCard = document.getElementById('cut-score-card');
                if (existingCutCard) {
                    existingCutCard.remove();
                }

                // Safely get the cut score from the API data
                let cutScoreValue = 'N/A';
                if (data.cutLines && data.cutLines.length > 0 && data.cutLines[0].cutScore) {
                    cutScoreValue = data.cutLines[0].cutScore;
                }

                // Create the new card element
                const cutCard = document.createElement('div');
                cutCard.id = 'cut-score-card'; // Give it an ID for easy removal
                cutCard.className = 'gambler-card'; // Reuse the same style as the other cards

                const scoreInfo = formatScore(parseScore(cutScoreValue));
                cutCard.innerHTML = `
                    <div class="name">Cut Line</div>
                    <div class="score ${scoreInfo.className}">${scoreInfo.text}</div>
                `;
                
                // Add the new card to the beginning of the container to make it prominent
                gamblersContainer.prepend(cutCard);
            })
            .catch(error => console.error("Failed to fetch data:", error));
    };

    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000);
});
