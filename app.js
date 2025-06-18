// FINAL VERSION - Uses the official player 'status' field for cut/wd logic.

document.addEventListener('DOMContentLoaded', () => {

    // --- State & Configuration ---
    let gamblerPicks = {}; 
    let availableGamblers = [];
    let tournamentConfig = {};
    let allPlayersData = []; 

    const url = '/.netlify/functions/get-scores'; 

    const leaderboardBody = document.getElementById('leaderboard-body');
    const gamblersContainer = document.getElementById('gamblers-container');

    // --- Helper Functions ---
    const parseScore = (score) => {
        if (typeof score !== 'string' || score.toUpperCase() === 'E' || !score) return 0;
        const number = parseInt(score, 10);
        return isNaN(number) ? 0 : number;
    };
    const formatScore = (score) => {
        if (typeof score !== 'number' || isNaN(score)) return { text: 'N/A', className: 'score-even' };
        if (score === 0) return { text: 'E', className: 'score-even' };
        if (score > 0) return { text: `+${score}`, className: 'score-over' };
        return { text: score.toString(), className: 'score-under' };
    };

    // --- Core Functions ---
    const updateGamblersTable = () => {
        const gamblerData = {};
        availableGamblers.forEach(gambler => {
            gamblerData[gambler] = { totalScore: 0, todayScore: 0, players: [], hasMissedCutPlayer: false, missedCutCount: 0, totalPicks: 0 };
        });

        if (!Array.isArray(allPlayersData)) return;
        
        allPlayersData.forEach(player => {
            if (!player || !player.playerId) return;

            // --- NEW: More robust "Missed Cut" logic ---
            // A player is out if their status is 'cut' or 'wd' (withdrawn).
            const isOutOfTournament = player.status === 'cut' || player.status === 'wd';

            const parsedPlayerScore = parseScore(player.total);
            const parsedTodayScore = parseScore(player.currentRoundScore);
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            
            tagsForPlayer.forEach(gamblerName => {
                const gambler = gamblerData[gamblerName];
                if (gambler) {
                    gambler.totalPicks++;
                    if (isOutOfTournament) {
                        gambler.hasMissedCutPlayer = true;
                        gambler.missedCutCount++;
                    } else {
                        gambler.totalScore += parsedPlayerScore;
                        gambler.todayScore += parsedTodayScore;
                    }
                    gambler.players.push({ 
                        name: `${player.firstName.charAt(0)}. ${player.lastName}`, 
                        score: parsedPlayerScore, 
                        hasMissedCut: isOutOfTournament 
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
            let finalScore = gamblerInfo.hasMissedCutPlayer ? { text: formatScore(gamblerInfo.totalScore).text, className: 'score-over' } : formatScore(gamblerInfo.totalScore);
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
        const { orgId, tournId, year } = tournamentConfig;
        const url = `/.netlify/functions/get-scores?orgId=${orgId}&tournId=${tournId}&year=${year}`;

        fetch(url)
            .then(response => {
                if (!response.ok) { throw new Error(`Request Failed: ${response.statusText} (${response.status})`); }
                return response.json();
            })
            .then(data => {
                allPlayersData = data.leaderboardRows || [];
                leaderboardBody.innerHTML = allPlayersData.map(player => {
                    if (!player || !player.playerId) return ''; 
                    const tagsHtml = (gamblerPicks[player.playerId] || []).map(tag => `<span class="tag">${tag}</span>`).join('');
                    const totalScoreInfo = formatScore(parseScore(player.total));
                    const todayScoreInfo = formatScore(parseScore(player.currentRoundScore));
                    let lastRound = 'N/A';
                    if (player.rounds && player.rounds.length > 0) {
                        const lastRoundData = player.rounds[player.rounds.length - 1];
                        if (lastRoundData && lastRoundData.strokes && lastRoundData.strokes['$numberInt']) {
                            lastRound = lastRoundData.strokes['$numberInt'];
                        }
                    }
                    return `<tr><td>${tagsHtml}</td><td>${player.position || 'N/A'}</td><td>${player.firstName || ''} ${player.lastName || ''}</td><td class="${totalScoreInfo.className}">${totalScoreInfo.text}</td><td class="${todayScoreInfo.className}">${todayScoreInfo.text}</td><td>${player.thru || 'N/A'}</td><td>${lastRound}</td></tr>`;
                }).join('');
                updateGamblersTable(); 
            })
            .catch(error => {
                console.error("Error fetching or rendering data:", error);
                gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Could not load live data.</p>`;
                leaderboardBody.innerHTML = `<tr><td colspan="7"><strong>Error:</strong> ${error.message}</td></tr>`;
            });
    };

    const main = async () => {
        try {
            const [configResponse, picksResponse] = await Promise.all([
                fetch('/config.json'),
                fetch('/picks.json')
            ]);
            if (!configResponse.ok) throw new Error('Could not load config.json file.');
            if (!picksResponse.ok) throw new Error('Could not load picks.json file.');
            const configData = await configResponse.json();
            gamblerPicks = await picksResponse.json();
            availableGamblers = configData.gamblers;
            tournamentConfig = configData.tournament;
            fetchLeaderboardData(); 
            setInterval(fetchLeaderboardData, 60000);
        } catch (error) {
            console.error("Initialization failed:", error);
            gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Error: ${error.message}</p>`;
        }
    };

    main();
});
