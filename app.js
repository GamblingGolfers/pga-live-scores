document.addEventListener('DOMContentLoaded', () => {

    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
        '58619': ['Kris']           // Kevin Velo
    };

    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let allPlayersData = []; 

    const apiKey = '04531f08dcmshe6e2b529c43c201p1557b0jsn0c81274dfc7cY';
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

    // --- UPDATED: This function now contains the new sorting and styling rules ---
    const updateGamblersTable = (cutScore) => {
        // 1. Initialize a structure to track scores, players, AND missed cut status
        const gamblerData = {};
        availableGamblers.forEach(gambler => {
            gamblerData[gambler] = { totalScore: 0, players: [], hasMissedCutPlayer: false };
        });

        // 2. Process every player
        allPlayersData.forEach(player => {
            const parsedPlayerScore = parseScore(player.total);
            const hasMissedCut = player.status === 'cut' || (cutScore !== 'N/A' && parsedPlayerScore > parseScore(cutScore));
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerData.hasOwnProperty(gamblerName)) {
                    if (!hasMissedCut) {
                        gamblerData[gamblerName].totalScore += parsedPlayerScore;
                    }
                    // NEW: If any player missed the cut, flag the gambler
                    if (hasMissedCut) {
                        gamblerData[gamblerName].hasMissedCutPlayer = true;
                    }
                    gamblerData[gamblerName].players.push({
                        name: `${player.firstName.charAt(0)}. ${player.lastName}`,
                        score: parsedPlayerScore,
                        hasMissedCut: hasMissedCut
                    });
                }
            });
        });

        // --- NEW: Implement advanced sorting ---
        const sortedGamblers = Object.entries(gamblerData).sort((a, b) => {
            const gamblerA = a[1];
            const gamblerB = b[1];

            // Rule 1: If one has a missed cut player and the other doesn't, the one without wins (is ranked higher).
            if (gamblerA.hasMissedCutPlayer && !gamblerB.hasMissedCutPlayer) {
                return 1; // Send Gambler A to the back
            }
            if (!gamblerA.hasMissedCutPlayer && gamblerB.hasMissedCutPlayer) {
                return -1; // Keep Gambler A at the front
            }

            // Rule 2: If both are the same (either both safe or both have MC players), sort by score.
            return gamblerA.totalScore - gamblerB.totalScore;
        });

        // 3. Render the cards using the newly sorted array
        gamblersContainer.innerHTML = '';
        sortedGamblers.forEach(([gamblerName, gamblerInfo]) => {
            const card = document.createElement('div');
            card.className = 'gambler-card';
            
            let finalScore;
            // NEW: If the gambler has a missed cut player, force the score to be red
            if (gamblerInfo.hasMissedCutPlayer) {
                const scoreText = formatScore(gamblerInfo.totalScore).text;
                finalScore = { text: scoreText, className: 'score-over' }; // .score-over is red
            } else {
                finalScore = formatScore(gamblerInfo.totalScore);
            }

            const playerBreakdownHtml = gamblerInfo.players.map(p => {
                const playerScore = formatScore(p.score);
                const missedCutClass = p.hasMissedCut ? 'missed-cut' : '';
                const missedCutMarker = p.hasMissedCut ? ' (MC)' : '';
                return `<div class="player-row ${missedCutClass}"><span class="player-name">${p.name}</span><span class="player-score ${playerScore.className}">${playerScore.text}${missedCutMarker}</span></div>`;
            }).join('');

            card.innerHTML = `
                <div class="name">${gamblerName}</div>
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
                leaderboardBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #d9534f;">
                    <strong>Error: ${error.message}</strong>
                    <br><br>This could be due to an invalid API key, exceeding the usage limit, or a network issue.
                </td></tr>`;
            });
    };

    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000);
});
