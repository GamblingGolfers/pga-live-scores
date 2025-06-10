// File: app.js

document.addEventListener('DOMContentLoaded', () => {

    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
        '58619': ['Kris']           // Kevin Velo
    };

    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let allPlayersData = []; 

    // --- CORRECTED: The URL now points to our own secure function ---
    const url = '/.netlify/functions/get-scores'; 
    // The apiKey and extra options are correctly removed from this file.

    const leaderboardBody = document.getElementById('leaderboard-body');
    const gamblersContainer = document.getElementById('gamblers-container');

    const parseScore = (score) => {
        if (typeof score !== 'string' || score.toUpperCase() === 'E') return 0;
        const number = parseInt(score, 10);
        return isNaN(number) ? 0 : number;
    };
    
    const formatScore = (score) => {
        if (typeof score !== 'number' || isNaN(score)) return { text: 'N/A', className: 'score-even' };
        if (score === 0) return { text: 'E', className: 'score-even' };
        if (score > 0) return { text: `+${score}`, className: 'score-over' };
        return { text: score.toString(), className: 'score-under' };
    };

    const updateGamblersTable = (cutScore) => {
        const gamblerData = {};
        availableGamblers.forEach(gambler => {
            gamblerData[gambler] = { totalScore: 0, players: [], hasMissedCutPlayer: false };
        });

        if (!Array.isArray(allPlayersData)) return;

        allPlayersData.forEach(player => {
            if (!player || !player.playerId) return;
            const parsedPlayerScore = parseScore(player.total);
            const hasMissedCut = player.status === 'cut' || (cutScore !== 'N/A' && parsedPlayerScore > parseScore(cutScore));
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerData.hasOwnProperty(gamblerName)) {
                    if (!hasMissedCut) { gamblerData[gamblerName].totalScore += parsedPlayerScore; }
                    if (hasMissedCut) { gamblerData[gamblerName].hasMissedCutPlayer = true; }
                    gamblerData[gamblerName].players.push({
                        name: `${player.firstName.charAt(0)}. ${player.lastName}`,
                        score: parsedPlayerScore,
                        hasMissedCut: hasMissedCut
                    });
                }
            });
        });

        const sortedGamblers = Object.entries(gamblerData).sort((a, b) => {
            const gamblerA = a[1]; const gamblerB = b[1];
            if (gamblerA.hasMissedCutPlayer && !gamblerB.hasMissedCutPlayer) return 1;
            if (!gamblerA.hasMissedCutPlayer && gamblerB.hasMissedCutPlayer) return -1;
            return gamblerA.totalScore - gamblerB.totalScore;
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
            card.innerHTML = `<div class="name">${gamblerName}</div><div class="total-score ${finalScore.className}">${finalScore.text}</div><div class="player-breakdown">${playerBreakdownHtml}</div>`;
            gamblersContainer.appendChild(card);
        });
    };
    
    const fetchLeaderboardData = () => {
        // The fetch call correctly points to our secure function with no headers
        fetch(url)
            .then(response => {
                if (!response.ok) { throw new Error(`Request Failed: ${response.statusText} (${response.status})`); }
                return response.json();
            })
            .then(data => {
                allPlayersData = data.leaderboardRows || [];
                let cutScoreValue = 'N/A';
                if (data.cutLines && data.cutLines.length > 0 && data.cutLines[0].cutScore) {
                    cutScoreValue = data.cutLines[0].cutScore;
                }
                leaderboardBody.innerHTML = allPlayersData.map(player => {
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
                    return `<tr><td>${tagsHtml}</td><td>${player.position || 'N/A'}</td><td>${player.firstName || ''} ${player.lastName || ''}</td><td class="${scoreInfo.className}">${scoreInfo.text}</td><td>${player.thru || 'N/A'}</td><td>${lastRound}</td></tr>`;
                }).join('');
                updateGamblersTable(cutScoreValue); 
            })
            .catch(error => {
                console.error("Error fetching or rendering data:", error);
                gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Could not load live data.</p>`;
                leaderboardBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #d9534f;"><strong>${error.message}</strong></td></tr>`;
            });
    };

    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000);
});
