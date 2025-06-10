document.addEventListener('DOMContentLoaded', () => {

    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
        '58619': ['Kris']           // Kevin Velo
        // Example of a missed cut player (if J. Thomas was picked)
        // '30925': ['Kris']           // Justin Thomas
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

    // --- REWRITTEN: This function now builds a much more detailed card ---
    const updateGamblersTable = (cutScore) => {
        // 1. Initialize a more complex structure to hold details
        const gamblerData = {};
        availableGamblers.forEach(gambler => {
            gamblerData[gambler] = { totalScore: 0, players: [] };
        });

        // 2. Process every player from the API
        allPlayersData.forEach(player => {
            const parsedPlayerScore = parseScore(player.total);
            
            // Determine if the player missed the cut
            const hasMissedCut = player.status === 'cut' || (cutScore !== 'N/A' && parsedPlayerScore > parseScore(cutScore));

            // Find which gamblers picked this player
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            
            // For each gambler that picked this player, add their details
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerData.hasOwnProperty(gamblerName)) {
                    // Don't add missed cut players to the total score
                    if (!hasMissedCut) {
                        gamblerData[gamblerName].totalScore += parsedPlayerScore;
                    }
                    gamblerData[gamblerName].players.push({
                        name: `${player.firstName.charAt(0)}. ${player.lastName}`,
                        score: parsedPlayerScore,
                        hasMissedCut: hasMissedCut
                    });
                }
            });
        });

        // 3. Render the new, detailed cards
        gamblersContainer.innerHTML = '';
        availableGamblers.forEach(gambler => {
            const card = document.createElement('div');
            card.className = 'gambler-card';
            
            const gamblerInfo = gamblerData[gambler];
            const finalScore = formatScore(gamblerInfo.totalScore);

            // Build the list of players for the breakdown section
            const playerBreakdownHtml = gamblerInfo.players.map(p => {
                const playerScore = formatScore(p.score);
                const missedCutClass = p.hasMissedCut ? 'missed-cut' : '';
                const missedCutMarker = p.hasMissedCut ? ' (MC)' : '';
                return `
                    <div class="player-row ${missedCutClass}">
                        <span class="player-name">${p.name}</span>
                        <span class="player-score ${playerScore.className}">${playerScore.text}${missedCutMarker}</span>
                    </div>
                `;
            }).join('');

            card.innerHTML = `
                <div class="name">${gambler}</div>
                <div class="total-score ${finalScore.className}">${finalScore.text}</div>
                <div class="player-breakdown">${playerBreakdownHtml}</div>
            `;
            gamblersContainer.appendChild(card);
        });
    };
    
    const fetchLeaderboardData = () => {
        fetch(url, options)
            .then(response => response.json())
            .then(data => {
                allPlayersData = data.leaderboardRows || [];
                
                // Extract the cut score to pass to our update function
                let cutScoreValue = 'N/A';
                if (data.cutLines && data.cutLines.length > 0 && data.cutLines[0].cutScore) {
                    cutScoreValue = data.cutLines[0].cutScore;
                }

                // Render the main leaderboard table (this part is simplified)
                leaderboardBody.innerHTML = allPlayersData.map(player => {
                    const tagsHtml = (gamblerPicks[player.playerId] || []).map(tag => `<span class="tag">${tag}</span>`).join('');
                    const scoreInfo = formatScore(parseScore(player.total));
                    return `
                        <tr>
                            <td>${tagsHtml}</td>
                            <td>${player.position}</td>
                            <td>${player.firstName} ${player.lastName}</td>
                            <td class="${scoreInfo.className}">${scoreInfo.text}</td>
                            <td>${player.thru || 'N/A'}</td>
                            <td>${player.rounds.length > 0 ? player.rounds[player.rounds.length - 1].strokes['$numberInt'] : 'N/A'}</td>
                        </tr>
                    `;
                }).join('');

                // Update both the Gambler and Cut Score cards
                updateGamblersTable(cutScoreValue); 
                // The Cut Score card from the previous step will now be created inside updateGamblersTable if you wish to combine them
                // Or you can keep it separate as before. For this implementation, we focus on the gambler cards.
            })
            .catch(error => console.error("Failed to fetch data:", error));
    };

    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000);
});
