// This script is self-contained and handles the "Gamblers Golf" page.
// It runs after the main DOM is loaded because of the 'defer' attribute in the script tag.
document.addEventListener('DOMContentLoaded', () => {

    // --- PAGE SWITCHING LOGIC ---
    // This handles showing/hiding the two main pages of the app.
    const navContainer = document.getElementById('nav-container');
    const pages = document.querySelectorAll('.page');
    if (navContainer) {
        navContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-button')) {
                const targetPageId = e.target.dataset.page;
                
                // Show the target page and hide the others
                pages.forEach(p => {
                    p.classList.toggle('hidden', p.id !== `page-${targetPageId}`);
                });
                
                // Update the active state of the navigation buttons
                navContainer.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }

    // --- GAMBLERS GOLF PAGE LOGIC ---
    // This function wraps all the logic for the new betting page to avoid conflicts.
    (function() {
        const form = document.getElementById('bet-form');
        // If the form doesn't exist on the page, don't run any of this code.
        if (!form) return; 

        let ALL_PLAYERS = [];
        const BETS_STORAGE_KEY = 'dgg_live_bets';

        // Get all the necessary elements from the page
        const gamblerSelect = document.getElementById('gambler-name');
        const golfer1Select = document.getElementById('golfer-1');
        const value1Input = document.getElementById('value-1');
        const golfer2Select = document.getElementById('golfer-2');
        const value2Input = document.getElementById('value-2');
        const errorMessageDiv = document.getElementById('error-message');
        const betsContainer = document.getElementById('bets-container');
        const submitButton = document.getElementById('submit-button');

        /**
         * A helper function to display a critical error message, replacing the form.
         * @param {string} message The error message to display.
         */
        const setFormError = (message) => {
            const contentDiv = document.getElementById('page-gamblers-content');
            if (contentDiv) {
                contentDiv.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-weight: 600;">${message}</p>`;
            }
        };
        
        /**
         * Populates a dropdown <select> element with data.
         * @param {HTMLSelectElement} select The dropdown element.
         * @param {Array} data The array of data (strings or objects).
         * @param {string} placeholder The default placeholder text.
         * @param {boolean} isObject If true, treats data items as {id, name} objects.
         */
        const populateDropdown = (select, data, placeholder, isObject = false) => {
            select.innerHTML = `<option value="">${placeholder}</option>`;
            data.forEach(item => {
                const option = document.createElement('option');
                if (isObject) {
                    option.value = item.id;
                    option.textContent = item.name;
                } else {
                    option.value = item;
                    option.textContent = item;
                }
                select.appendChild(option);
            });
            select.disabled = false;
        };

        /**
         * Disables the selected golfer in the other dropdown to prevent picking the same one twice.
         */
        const updateGolferDropdowns = () => {
            const val1 = golfer1Select.value;
            const val2 = golfer2Select.value;
            Array.from(golfer2Select.options).forEach(opt => opt.disabled = (opt.value && opt.value === val1));
            Array.from(golfer1Select.options).forEach(opt => opt.disabled = (opt.value && opt.value === val2));
        };

        /**
         * Renders the list of submitted bets from local storage into the UI.
         */
        const renderBets = () => {
            const bets = JSON.parse(localStorage.getItem(BETS_STORAGE_KEY) || '[]');
            betsContainer.innerHTML = '';
            if (bets.length === 0) {
                betsContainer.innerHTML = `<p style="color: var(--text-muted-color);">No bets submitted yet.</p>`;
                return;
            }
            const sortedBets = bets.sort((a,b) => b.timestamp - a.timestamp);
            sortedBets.forEach(bet => {
                const card = document.createElement('div');
                card.className = 'gambler-card'; // Reusing your stylish card class
                card.innerHTML = `
                    <div class="name" style="color: var(--accent-color);">${bet.gamblerName}</div>
                    <div class="player-breakdown" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                        <div class="player-row"><span>Pick 1: ${bet.golfer1Name}</span><span class="player-score" style="color: var(--text-color);">£${parseFloat(bet.bet1).toFixed(2)}</span></div>
                        <div class="player-row"><span>Pick 2: ${bet.golfer2Name}</span><span class="player-score" style="color: var(--text-color);">£${parseFloat(bet.bet2).toFixed(2)}</span></div>
                    </div>
                `;
                betsContainer.appendChild(card);
            });
        };
        
        /**
         * Handles the form submission, validates input, and saves the bet.
         * @param {Event} e The form submission event.
         */
        const handleFormSubmit = (e) => {
            e.preventDefault();
            errorMessageDiv.textContent = '';

            // Validation checks
            if (!gamblerSelect.value || !golfer1Select.value || !golfer2Select.value || !value1Input.value || !value2Input.value) {
                errorMessageDiv.textContent = 'All fields are required.'; return;
            }
            if (golfer1Select.value === golfer2Select.value) {
                errorMessageDiv.textContent = 'You must select two different golfers.'; return;
            }
            if (parseFloat(value1Input.value) < 10 || parseFloat(value2Input.value) < 10) {
                errorMessageDiv.textContent = 'Minimum bet is £10 for each pick.'; return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            // Save the new bet to local storage
            const currentBets = JSON.parse(localStorage.getItem(BETS_STORAGE_KEY) || '[]');
            const newBet = {
                gamblerName: gamblerSelect.value,
                golfer1Name: golfer1Select.options[golfer1Select.selectedIndex].text,
                bet1: parseFloat(value1Input.value),
                golfer2Name: golfer2Select.options[golfer2Select.selectedIndex].text,
                bet2: parseFloat(value2Input.value),
                timestamp: Date.now() // For sorting
            };
            currentBets.push(newBet);
            localStorage.setItem(BETS_STORAGE_KEY, JSON.stringify(currentBets));

            renderBets();
            form.reset();
            updateGolferDropdowns();
            
            // Re-enable button after a short delay
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Picks';
            }, 500);
        };
        
        /**
         * The main initialization function for the betting page.
         * Fetches config and player data, then sets up the form.
         */
        const initializeGamblersPage = async () => {
            try {
                // Fetch config.json from the root
                const configResponse = await fetch('/config.json');
                if (!configResponse.ok) throw new Error(`Could not load '/config.json' (Status: ${configResponse.status})`);
                const configData = await configResponse.json();

                // Fetch live player data using the Netlify function
                const scoresUrl = `/.netlify/functions/get-scores?orgId=${configData.tournament.orgId}&tournId=${configData.tournament.tournId}&year=${configData.tournament.year}`;
                const scoresResponse = await fetch(scoresUrl);
                if (!scoresResponse.ok) throw new Error(`Could not load player data from API (Status: ${scoresResponse.status})`);
                const scoresData = await scoresResponse.json();

                // Process player data for the dropdowns
                ALL_PLAYERS = (scoresData.leaderboardRows || []).map(p => ({
                    id: p.playerId,
                    name: `${p.firstName} ${p.lastName}`
                })).sort((a, b) => a.name.localeCompare(b.name));
                
                if (ALL_PLAYERS.length === 0) {
                    throw new Error('Player list is empty. The tournament may not be live yet.');
                }

                // Populate the dropdowns with the fetched data
                populateDropdown(gamblerSelect, configData.gamblers, 'Select a Gambler');
                populateDropdown(golfer1Select, ALL_PLAYERS, 'Select Pick 1', true);
                populateDropdown(golfer2Select, ALL_PLAYERS, 'Select Pick 2', true);
                submitButton.disabled = false;

                // Add event listeners
                golfer1Select.addEventListener('change', updateGolferDropdowns);
                golfer2Select.addEventListener('change', updateGolferDropdowns);
                form.addEventListener('submit', handleFormSubmit);

                // Render any bets that are already saved
                renderBets();

            } catch (error) {
                console.error("Initialization of Gamblers Page failed:", error);
                setFormError(`Error: ${error.message}`);
            }
        };
        
        initializeGamblersPage();

    })(); // End of the self-contained logic for the gamblers page
});
