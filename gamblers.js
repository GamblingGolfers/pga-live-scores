// This script now WAITS for app.js to fetch data, preventing API rate limit errors.
document.addEventListener('DOMContentLoaded', () => {

    // --- PAGE SWITCHING LOGIC ---
    const navContainer = document.getElementById('nav-container');
    const pages = document.querySelectorAll('.page');
    if (navContainer) {
        navContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-button')) {
                const targetPageId = e.target.dataset.page;
                pages.forEach(p => p.classList.toggle('hidden', p.id !== `page-${targetPageId}`));
                navContainer.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }

    // --- GAMBLERS GOLF PAGE LOGIC ---
    (function() {
        const form = document.getElementById('bet-form');
        if (!form) return; 

        let ALL_PLAYERS = [];
        const BETS_STORAGE_KEY = 'dgg_live_bets_v2';

        const gamblerSelect = document.getElementById('gambler-name');
        const golfer1Select = document.getElementById('golfer-1');
        const value1Input = document.getElementById('value-1');
        const golfer2Select = document.getElementById('golfer-2');
        const value2Input = document.getElementById('value-2');
        const errorMessageDiv = document.getElementById('error-message');
        const betsContainer = document.getElementById('bets-container');
        const submitButton = document.getElementById('submit-button');

        const setFormError = (message) => {
            const contentDiv = document.getElementById('page-gamblers-content');
            if (contentDiv) {
                contentDiv.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-weight: 600;">${message}</p>`;
            }
        };
        
        const populateDropdown = (select, data, placeholder, isObject = false) => {
            select.innerHTML = `<option value="">${placeholder}</option>`;
            data.forEach(item => {
                const option = document.createElement('option');
                if (isObject) { option.value = item.id; option.textContent = item.name; } 
                else { option.value = item; option.textContent = item; }
                select.appendChild(option);
            });
            select.disabled = false;
        };

        const updateGolferDropdowns = () => {
            const val1 = golfer1Select.value;
            const val2 = golfer2Select.value;
            Array.from(golfer2Select.options).forEach(opt => opt.disabled = (opt.value && opt.value === val1));
            Array.from(golfer1Select.options).forEach(opt => opt.disabled = (opt.value && opt.value === val2));
        };

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
                card.className = 'gambler-card';
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
        
        const handleFormSubmit = (e) => {
            e.preventDefault();
            errorMessageDiv.textContent = '';
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

            const currentBets = JSON.parse(localStorage.getItem(BETS_STORAGE_KEY) || '[]');
            const newBet = {
                gamblerName: gamblerSelect.value,
                golfer1Name: golfer1Select.options[golfer1Select.selectedIndex].text,
                bet1: parseFloat(value1Input.value),
                golfer2Name: golfer2Select.options[golfer2Select.selectedIndex].text,
                bet2: parseFloat(value2Input.value),
                timestamp: Date.now()
            };
            currentBets.push(newBet);
            localStorage.setItem(BETS_STORAGE_KEY, JSON.stringify(currentBets));

            renderBets();
            form.reset();
            updateGolferDropdowns();
            
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Picks';
            }, 500);
        };
        
        /**
         * This function sets up the form using shared data.
         */
        const setupPageWithData = () => {
            // Check if app.js has made the data available
            if (!window.GOLF_DATA || !window.GOLF_DATA.players) {
                setFormError("Waiting for live tournament data from the main page...");
                return;
            }
            
            ALL_PLAYERS = (window.GOLF_DATA.players || []).map(p => ({
                id: p.playerId,
                name: `${p.firstName} ${p.lastName}`
            })).sort((a, b) => a.name.localeCompare(b.name));
            
            if (ALL_PLAYERS.length === 0) {
                 setFormError('Player list is empty. The tournament may not be live yet.');
                 return;
            }

            // Also get gamblers from config.json data shared by app.js
            fetch('/config.json')
                .then(res => res.json())
                .then(configData => {
                     populateDropdown(gamblerSelect, configData.gamblers, 'Select a Gambler');
                })
                .catch(err => {
                    console.error("Could not load config.json for gamblers page", err);
                    setFormError("Could not load gambler list from '/config.json'.");
                });


            populateDropdown(golfer1Select, ALL_PLAYERS, 'Select Pick 1', true);
            populateDropdown(golfer2Select, ALL_PLAYERS, 'Select Pick 2', true);
            submitButton.disabled = false;

            golfer1Select.addEventListener('change', updateGolferDropdowns);
            golfer2Select.addEventListener('change', updateGolferDropdowns);
            form.addEventListener('submit', handleFormSubmit);

            renderBets();
        };

        // --- Initialization ---
        // Listen for the custom event dispatched by app.js
        document.addEventListener('golfDataReady', setupPageWithData);

        // Also, check if data is ALREADY available (if app.js loaded and fetched data first)
        if(window.GOLF_DATA) {
            setupPageWithData();
        }

    })();
});
