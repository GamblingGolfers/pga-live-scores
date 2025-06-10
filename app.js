// FINAL - This version correctly calls the secure Netlify function.

document.addEventListener('DOMContentLoaded', () => {

// --- THIS IS THE FINAL, CORRECTED LIST ---
const gamblerPicks = {
    '37378': ['Kris'],          // Min Woo Lee
    '31323': ['Phil'],          // Gary Woodland
    '58619': ['Kris'],          // Kevin Velo
    '46046': ['Dean'],          // Scottie Scheffler
    '52666': ['Phil'],          // Sami Valimaki
    '51766': ['Cal'],           // Wyndham Clark
    '40250': ['Billy'],         // Taylor Pendrith
    '28237': ['Dean'],          // Rory McIlroy
    '38991': ['Billy'],         // Jorge Campillo  <-- Corrected quote and comma
    '59018': ['Cal'],           // Ludvig Aberg    <-- Corrected comma
    '35506': ['Pet'],           // Adam Hadwin     <-- Corrected comma
    '54628': ['Pet']            // Tom Hoge
};

    const availableGamblers = ['Kris', 'Phil', 'Pet', 'Cal', 'Billy', 'Dean'];
    let allPlayersData = []; 

    // --- THIS IS THE CORRECT URL ---
    // It points to YOUR secure function, not the public API.
    const url = '/.netlify/functions/get-scores'; 

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
            gamblerData[gambler] = { totalScore: 0, todayScore: 0, players: [], hasMissedCutPlayer: false, missedCutCount: 0, totalPicks: 0 };
        });
        if (!Array.isArray(allPlayersData)) return;
        allPlayersData.forEach(player => {
            if (!player || !player.playerId) return;
            const parsedPlayerScore = parseScore(player.total);
            const parsedTodayScore = parseScore(player.currentRoundScore);
            const hasMissedCut = player.status === 'cut' || (cutScore !== 'N/A' && parsedPlayerScore > parseScore(cutScore));
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            tagsForPlayer.forEach(gamblerName => {
                const gambler = gamblerData[gamblerName];
                if (gambler) {
                    gambler.totalPicks++;
                    if (hasMissedCut) {
                        gambler.hasMissedCutPlayer = true;
                        gambler.missedCutCount++;
                    } else {
                        gambler.totalScore += parsedPlayerScore;
                        gambler.todayScore += parsedTodayScore;
                    }
                    gambler.players.push({ name: `${player.firstName.charAt(0)}. ${player.lastName}`, score: parsedPlayerScore, hasMissedCut: hasMissedCut });
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
                finalScore = { text: formatScore(gamblerInfo.totalScore).text, className: 'score-over' };
            } else {
                finalScore = formatScore(gamblerInfo.totalScore);
            }
            const todayScoreInfo = formatScore(gamblerInfo.todayScore);
            const madeCutCount = gamblerInfo.totalPicks - gamblerInfo.missedCutCount;
            const teamStatusText = `${madeCutCount}/${gamblerInfo.totalPicks} MADE CUT`;
            const playerBreakdownHtml = gamblerInfo.players.map(p => {
                const playerScore = formatScore(p.score);
                const missedCutClass = p.hasMissedCut ? 'missed-cut' : '';
                const missedCutMarker = p.hasMissedCut ? ' (MC)' : '';
                return `<div class="player-row ${missedCutClass}"><span class="player-name">${p.name}</span><span class="player-score ${playerScore.className}">${playerScore.text}${missedCutMarker}</span></div>`;
            }).join('');
            card.innerHTML = `<div class="name">${gamblerName}</div><div class="total-score ${finalScore.className}">${finalScore.text}</div><div class="today-score ${todayScoreInfo.className}">Today: ${todayScoreInfo.text}</div><div class="team-status">${teamStatusText}</div><div class="player-breakdown">${playerBreakdownHtml}</div>`;
            gamblersContainer.appendChild(card);
        });
    };
    
    const fetchLeaderboardData = () => {
        // The fetch call correctly points to our secure function with NO key or headers.
        fetch(url)
            .then(response => {
                if (!response.ok) { throw new Error(`Request Failed: ${response.statusText} (${response.status})`); }
                return response.json();
            })
            .then(data => {
                // The try...catch block is removed as the previous error was my fault. 
                // We can add it back if new rendering errors appear.
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
