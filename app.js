document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration ---
    const apiKey = '04531f08dcmshe6e2b529c43c201p1557b0jsn0c81274dfc7c'; // <<< MAKE SURE YOUR API KEY IS HERE
    const url = 'https://live-golf-data.p.rapidapi.com/leaderboard?orgId=1&tournId=020&year=2025';

    // --- API Request Options ---
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com'
        }
    };

    // --- Get HTML Elements ---
    const leaderboardBody = document.getElementById('leaderboard-body');
    const favouritesBody = document.getElementById('favourites-body');
    const favouritesPlaceholder = document.getElementById('favourites-placeholder');
    const debugOutput = document.getElementById('debug-output');

    // --- NEW: Function to show/hide the placeholder message in the Favourites table ---
    const updateFavouritesPlaceholder = () => {
        if (favouritesBody.children.length > 1) { // More than just the placeholder row
             favouritesPlaceholder.style.display = 'none';
        } else {
             favouritesPlaceholder.style.display = '';
        }
    };

    // --- NEW: Event Listener for checkboxes ---
    // We use event delegation on the main table body to handle all checkbox clicks.
    leaderboardBody.addEventListener('change', (event) => {
        // Only run if the clicked element was a checkbox
        if (event.target.type === 'checkbox') {
            const checkbox = event.target;
            const originalRow = checkbox.closest('tr');
            const playerId = checkbox.dataset.playerId;

            if (checkbox.checked) {
                // --- Add to Favourites ---
                const newFavouriteRow = originalRow.cloneNode(true); // Clone the entire row
                newFavouriteRow.id = `fav-${playerId}`; // Give the new row a unique ID
                favouritesBody.appendChild(newFavouriteRow);
            } else {
                // --- Remove from Favourites ---
                const rowToRemove = document.getElementById(`fav-${playerId}`);
                if (rowToRemove) {
                    rowToRemove.remove();
                }
            }
            updateFavouritesPlaceholder();
        }
    });

    // --- Fetch Data from API ---
    fetch(url, options)
        .then(response => {
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            return response.json();
        })
        .then(data => {
            debugOutput.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            leaderboardBody.innerHTML = '';

            if (data && data.leaderboardRows && data.leaderboardRows.length > 0) {
                data.leaderboardRows.forEach(player => {
                    const row = document.createElement('tr');
                    
                    const position = player.position;
                    const playerName = `${player.firstName} ${player.lastName}`;
                    const totalToPar = player.total;
                    const thru = player.thru || 'N/A';
                    let lastRound = 'N/A';
                    if (player.rounds && player.rounds.length > 0) {
                        const lastRoundData = player.rounds[player.rounds.length - 1];
                        if (lastRoundData.strokes && lastRoundData.strokes['$numberInt']) {
                            lastRound = lastRoundData.strokes['$numberInt'];
                        }
                    }

                    // --- UPDATED: Add a new cell for the checkbox ---
                    row.innerHTML = `
                        <td>
                            <input type="checkbox" data-player-id="${player.playerId}">
                        </td>
                        <td>${position}</td>
                        <td>${playerName}</td>
                        <td>${totalToPar}</td>
                        <td>${thru}</td>
                        <td>${lastRound}</td>
                    `;
                    leaderboardBody.appendChild(row);
                });
            } else {
                leaderboardBody.innerHTML = '<tr><td colspan="6">Leaderboard data received, but it contains no players.</td></tr>';
            }
        })
        .catch(error => {
            debugOutput.innerHTML = `<h3>An Error Occurred!</h3><p><strong>${error.toString()}</strong></p>`;
            leaderboardBody.innerHTML = `<tr><td colspan="6">Failed to load data. See error details.</td></tr>`;
        });
});
