document.addEventListener('DOMContentLoaded', () => {

    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
        '58619': ['Kris']           // Kevin Velo
    };

    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let allPlayersData = []; 

    const apiKey = 'YOUR_SECRET_API_KEY';
    const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';
    const options = {
        method: 'GET',
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'live-golf-data.p.rapidapi.com' }
    };

    const leaderboardBody = document.getElementById('leaderboard-body');
    const gamblersContainer = document.getElementById('gamblers-container');

    // --- UPDATED: Hardened helper functions for more safety ---
    const parseScore = (score) => {
        if (typeof score !== 'string') return 0; // Safety check
        if (score.toUpperCase() === 'E') return 0;
        const number = parseInt(score, 10);
        return isNaN(number) ? 0 : number;
    };
    
    const formatScore = (score) => {
        if (typeof score !== 'number' || isNaN(score)) {
            return { text: 'N/A', className: 'score-even' }; // Safety net
        }
        if (score === 0) return { text: 'E', className: 'score-even' };
        if (score > 0) return { text: `+${score}`, className: 'score-over' };
        return { text: score.toString(), className: 'score-under' };
    };

    const updateGamblersTable = (cutScore) => {
        const gamblerData = {};
        availableGamblers.forEach(gambler => {
            gamblerData[gambler] = { totalScore: 0, players: [], hasMissedCutPlayer: false };
        });

        // Safety check: ensure allPlayersData is an array
        if (!Array.isArray(allPlayersData)) return;

        allPlayersData.forEach(player => {
            // Safety check: ensure player is a valid object
            if (!player || !player.playerId) return;

            const parsedPlayerScore = parseScore(player.total);
            const hasMissedCut = player.status === 'cut' || (cutScore !== 'N/A' && parsedPlayerScore > parseScore(cutScore));
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerData.hasOwnProperty(gamblerName)) {
                    if (!hasMissedCut) {
                        gamblerData[gamblerName].totalScore += parsedPlayerScore;
                    }
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

        const sortedGamblers = Object.entries(gamblerData).sort((a, b) => {
            const gamblerA = a[1];
            const gamblerB = b[1];
            if (gamblerA.hasMissedCutPlayer && !gamblerB.hasMissedCutPlayer) return 1;
            if (!gamblerA.hasMissedCutPlayer && gamblerB.hasMissedCutPlayer) return -1;
            return gamblerA.totalScore - b[1].totalScore;
        });

        gamblersContainer.innerHTML = '';
        sortedGamblers.forEach(([gamblerName, gamblerInfo]) => {
            const card = document.createElement('div');
            card.className = 'gambler-card';
            let finalScore;
            if (gamblerInfo.hasMissedCutPlayer) {
                const scoreText = formatScore(gamblerInfo.totalScore).text;
                finalScore = { text: scoreText, className: 'score-over' };
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
                <div class="player-breakdown">${playerBreakdownHtml}</div>`;
            gamblersContainer.appendChild(card);
        });
    };
    
    const fetchLeaderboardData = () => {
        fetch(url, options)
            .then(response => {
                if (!response.ok) { throw new Error(`API Request Failed: ${response.statusText} (Status: ${response.status})`); }
                return response.json();
            })
            .then(data => {
                try {
                    allPlayersData = data.leaderboardRows || [];
                    
                    let cutScoreValue = 'N/A';
                    if (data.cutLines && data.cutLines.length > 0 && data.cutLines[0].cutScore) {
                        cutScoreValue = data.cutLines[0].cutScore;
                    }

                    leaderboardBody.innerHTML = allPlayersData.map(player => {
                        // Safety check for invalid player objects in the array
                        if (!player || !player.playerId) return ''; 

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
                                <td>${player.position || 'N/A'}</td>
                                <td>${player.firstName || ''} ${player.lastName || ''}</td>
                                <td class="${scoreInfo.className}">${scoreInfo.text}</td>
                                <td>${player.thru || 'N/A'}</td>
                                <td>${lastRound}</td>
                            </tr>`;
                    }).join('');

                    updateGamblersTable(cutScoreValue); 

                } catch (renderError) {
                    console.error("Error rendering data:", renderError);
                    gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">An error occurred while processing the data.</p>`;
                    leaderboardBody.innerHTML = `<tr><td colspan="6" style="text-align: left; color: #d9534f; padding: 20px;">
                        <strong>Rendering Error:</strong><br>
                        <code>${renderError.toString()}</code>
                        <br><br>
                        <strong>Stack Trace:</strong><br>
                        <code style="white-space: pre-wrap;">${renderError.stack}</code>
                    </td></tr>`;
                }
            })
            .catch(fetchError => {
                console.error("Failed to fetch data:", fetchError);
                gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Could not load live data.</p>`;
                leaderboardBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #d9534f;">
                    <strong>${fetchError.message}</strong>
                    <br><br>This could be due to an invalid API key, exceeding usage limits, or a network issue.
                </td></tr>`;
            });
    };

    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000);
});
