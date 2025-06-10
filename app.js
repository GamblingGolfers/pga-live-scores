document.addEventListener('DOMContentLoaded', () => {

    // --- UPDATED: Added your new pick for Kevin Velo ---
    const gamblerPicks = {
        '37378': ['Kris', 'Cal'],   // Min Woo Lee
        '31323': ['Phil'],          // Gary Woodland
        '58619': ['Kris']           // Kevin Velo
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

    // --- UPDATED: This function now sorts the gamblers by score ---
    const updateGamblersTable = (cutScore) => {
        // 1. Initialize data structure (unchanged)
        const gamblerData = {};
        availableGamblers.forEach(gambler => {
            gamblerData[gambler] = { totalScore: 0, players: [] };
        });

        // 2. Process every player from the API (unchanged)
        allPlayersData.forEach(player => {
            const parsedPlayerScore = parseScore(player.total);
            const hasMissedCut = player.status === 'cut' || (cutScore !== 'N/A' && parsedPlayerScore > parseScore(cutScore));
            const tagsForPlayer = gamblerPicks[player.playerId] || [];
            
            tagsForPlayer.forEach(gamblerName => {
                if (gamblerData.hasOwnProperty(gamblerName)) {
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

        // --- NEW: Convert the gambler data object into a sortable array and sort it ---
        const sortedGamblers = Object.entries(gamblerData).sort((a, b) => {
            // a[1] and b[1] refer to the { totalScore, players } object
            return a[1].totalScore - b[1].totalScore;
        });

        // 3. Render the cards using the newly sorted array
        gamblersContainer.innerHTML = '';
        sortedGamblers.forEach(([gamblerName, gamblerInfo]) => { // Destructure the array entry
            const card = document.createElement('div');
            card.className = 'gambler-card';
            
            const finalScore = formatScore(gamblerInfo.totalScore);

            const playerBreakdownHtml = gamblerInfo.players.map(p => {
                const playerScore = formatScore(p.score);
                const missedCutClass = p.hasMissedCut ? 'missed-cut' : '';
                const missedCutMarker = p.hasMissedCut ? ' (MC)' : '';
                return `
                    <div class="player-row <span class="math-inline">\{missedCutClass\}"\>
<span class\="player\-name"\></span>{p.name}</span>
                        <span class="player-score <span class="math-inline">\{playerScore\.className\}"\></span>{playerScore.text}${missedCutMarker}</span>
                    </div>
                `;
            }).join('');

            card.innerHTML = `
                <div class="name">${gamblerName}</div>
                <div class="total-score <span class="math-inline">\{finalScore\.className\}"\></span>{finalScore.text}</div>
                <div class="player-breakdown">${playerBreakdownHtml}</div>
            `;
            gamblersContainer.appendChild(card);
        });
    };
    
    const fetchLeaderboardData = () => {
        fetch(url, options)
