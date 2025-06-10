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

    // --- UPDATED: This function now calculates and renders the new stats ---
    const updateGamblersTable = (cutScore) => {
        // 1. Initialize a structure to track all new stats
        const gamblerData = {};
        availableGamblers.forEach(gambler => {
            gamblerData[gambler] = { 
                totalScore: 0, 
                todayScore: 0, // NEW: For "Today's Score"
                players: [], 
                hasMissedCutPlayer: false,
                missedCutCount: 0, // NEW: To count players who missed the cut
                totalPicks: 0      // NEW: To count total players picked
            };
        });

        // 2. Process every player to gather detailed stats
        allPlayersData.forEach(player => {
            if (!player || !player.playerId) return;

            const parsedPlayerScore = parseScore(player.total);
            const parsedTodayScore = parseScore(player.currentRoundScore); // Get today's score
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
                        gambler.todayScore += parsedTodayScore; // Add to today's total
                    }
                    gambler.players.push({
                        name: `${player.firstName.charAt(0)}. ${player.lastName}`,
                        score: parsedPlayerScore,
                        hasMissedCut: hasMissedCut
                    });
                }
            });
        });

        const sortedGamblers = Object.entries(gamblerData).sort((a, b) => { /* ...sorting logic is unchanged... */ });

        // 3. Render the new, more detailed cards
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

            // Format the new stats for display
            const todayScoreInfo = formatScore(gamblerInfo.todayScore);
            const madeCutCount = gamblerInfo.totalPicks - gamblerInfo.missedCutCount;
            const teamStatusText = `${madeCutCount}/${gamblerInfo.totalPicks} MADE CUT`;

            const playerBreakdownHtml = gamblerInfo.players.map(p => { /* ...unchanged... */ }).join('');

            card.innerHTML = `
                <div class="name">${gamblerName}</div>
                <div class="total-score ${finalScore.className}">${finalScore.text}</div>
                <div class="today-score ${todayScoreInfo.className}">Today: ${todayScoreInfo.text}</div>
                <div class="team-status">${teamStatusText}</div>
                <div class="player-breakdown">${playerBreakdownHtml}</div>
            `;
            gamblersContainer.appendChild(card);
        });
    };
    
    // The fetchLeaderboardData function remains the same as the last version
    const fetchLeaderboardData = () => { /* ...unchanged... */ };

    fetchLeaderboardData(); 
    setInterval(fetchLeaderboardData, 60000);
});
