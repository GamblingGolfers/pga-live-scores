document.addEventListener('DOMContentLoaded', () => {
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': '04531f08dcmshe6e2b529c43c201p1557b0jsn0c81274dfc7c', // <-- IMPORTANT: Use your new key
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com'
        }
    };

    const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';

    fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(data); // Good for debugging

            const leaderboardBody = document.getElementById('leaderboard-body');
            leaderboardBody.innerHTML = ''; 

            if (data && data.leaderboard && data.leaderboard.players && data.leaderboard.players.length > 0) {
                data.leaderboard.players.forEach(player => {
                    const row = document.createElement('tr');

                    // --- ADJUSTMENTS BASED ON YOUR DATA SAMPLE ---

                    const position = player.position;

                    // CHANGED: Use firstName and lastName (camelCase)
                    const playerName = `${player.firstName} ${player.lastName}`;

                    // CHANGED: Use 'total' instead of 'total_to_par'
                    const totalToPar = player.total;

                    // IMPROVED: Use 'status' to determine what to show for 'Thru'
                    // If the status is 'complete', we show 'F' for Finished.
                    const thru = player.status === 'complete' ? 'F' : (player.thru || 'N/A');
                    
                    // CHANGED: Use 'currentRoundScore' for the round total. This is much more direct.
                    const roundScore = player.currentRoundScore;

                    row.innerHTML = `
