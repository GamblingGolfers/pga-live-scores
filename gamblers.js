document.addEventListener('DOMContentLoaded', () => {

    // Page switching logic remains the same
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

    // --- SILENT AUCTION LOGIC ---
    (function() {
        const form = document.getElementById('auction-form');
        if (!form) return;

        let ALL_PLAYERS = [];
        let GAMBLERS = [];
        const AUCTION_STORAGE_KEY = 'dgg_silent_auction_data_v3';
        const MIN_BID_INCREMENT = 5;
        const ABSOLUTE_MIN_BID = 10;

        // Views
        const activeView = document.getElementById('auction-active-view');
        const finishedView = document.getElementById('auction-finished-view');
        const notStartedView = document.getElementById('auction-not-started-view');

        // Form elements
        const gamblerSelect = document.getElementById('auction-gambler-select');
        const playerSelect = document.getElementById('auction-player-select');
        const bidAmountInput = document.getElementById('auction-bid-amount');
        const errorMessageDiv = document.getElementById('auction-error-message');
        const submitButton = document.getElementById('auction-submit-button');
        
        // Display containers
        const auctionStatusContainer = document.getElementById('auction-status-container');
        const auctionResultsContainer = document.getElementById('auction-results-container');
        const mainTitle = document.getElementById('auction-main-title');
        const statusIndicator = document.getElementById('auction-status-indicator');


        const setPageError = (message) => {
            const pageDiv = document.getElementById('page-gamblers');
            if (pageDiv) {
                pageDiv.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-weight: 600; padding: 40px;">${message}</p>`;
            }
        };

        const populateDropdown = (select, data, placeholder) => {
            select.innerHTML = `<option value="">${placeholder}</option>`;
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = typeof item === 'object' ? item.id : item;
                option.textContent = typeof item === 'object' ? item.name : item;
                select.appendChild(option);
            });
            select.disabled = false;
        };
        
        const getAuctionData = () => JSON.parse(localStorage.getItem(AUCTION_STORAGE_KEY) || '{}');
        const saveAuctionData = (data) => localStorage.setItem(AUCTION_STORAGE_KEY, JSON.stringify(data));
        
        const renderActiveAuctionStatus = () => {
            const auctionData = getAuctionData();
            auctionStatusContainer.innerHTML = '';
            
            const playersWithBids = Object.keys(auctionData);

            if (playersWithBids.length === 0) {
                auctionStatusContainer.innerHTML = `<p style="color: var(--text-muted-color);">No bids have been placed yet. Be the first!</p>`;
                return;
            }
            const sortedPlayerIds = playersWithBids.sort((a, b) => {
                const playerA = ALL_PLAYERS.find(p => p.id === a);
                const playerB = ALL_PLAYERS.find(p => p.id === b);
                return playerA && playerB ? playerA.name.localeCompare(playerB.name) : 0;
            });

            sortedPlayerIds.forEach(playerId => {
                const player = ALL_PLAYERS.find(p => p.id === playerId);
                if (!player) return; 

                const playerData = auctionData[playerId];
                const bidCount = playerData.bids.length;
                const highestBid = Math.max(...playerData.bids.map(b => b.amount));

                const card = document.createElement('div');
                card.className = 'auction-card';
                card.innerHTML = `
                    <div class="player-name">${player.name}</div>
                    <div class="bid-info">Bids Received: <strong>${bidCount}</strong></div>
                    <div class="highest-bid">£${highestBid.toFixed(0)}</div>
                `;
                auctionStatusContainer.appendChild(card);
            });
        };

        const handleFormSubmit = (e) => {
            e.preventDefault();
            errorMessageDiv.textContent = '';
            
            const selectedGambler = gamblerSelect.value;
            const selectedPlayerId = playerSelect.value;
            const bidAmount = parseFloat(bidAmountInput.value);

            if (!selectedGambler || !selectedPlayerId || !bidAmountInput.value) {
                errorMessageDiv.textContent = 'Please select your name, a player, and enter a bid.'; return;
            }
            if (isNaN(bidAmount)) {
                errorMessageDiv.textContent = 'Please enter a valid number for the bid.'; return;
            }

            const auctionData = getAuctionData();
            const playerData = auctionData[selectedPlayerId];
            const currentHighestBid = playerData ? Math.max(...playerData.bids.map(b => b.amount)) : 0;
            
            if (currentHighestBid === 0) {
                if (bidAmount < ABSOLUTE_MIN_BID) {
                    errorMessageDiv.textContent = `The first bid must be at least £${ABSOLUTE_MIN_BID}.`; return;
                }
            } else {
                const requiredMinBid = currentHighestBid + MIN_BID_INCREMENT;
                if (bidAmount < requiredMinBid) {
                    errorMessageDiv.textContent = `Bid must be at least £${requiredMinBid}.`; return;
                }
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Placing Bid...';

            if (!auctionData[selectedPlayerId]) {
                auctionData[selectedPlayerId] = { bids: [] };
            }
            auctionData[selectedPlayerId].bids.push({
                amount: bidAmount,
                gambler: selectedGambler,
                timestamp: Date.now()
            });

            saveAuctionData(auctionData);
            renderActiveAuctionStatus();
            form.reset(); 

            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'Place Bid';
            }, 500);
        };
        
        const renderFinishedResults = () => {
            const auctionData = getAuctionData();
            auctionResultsContainer.innerHTML = '';
            const playersWithBids = Object.keys(auctionData);

            if (playersWithBids.length === 0) {
                auctionResultsContainer.innerHTML = `<p style="color: var(--text-muted-color);">The auction finished with no bids placed.</p>`;
                return;
            }

            const sortedPlayerIds = playersWithBids.sort((a, b) => {
                 const playerA = ALL_PLAYERS.find(p => p.id === a);
                 const playerB = ALL_PLAYERS.find(p => p.id === b);
                 return playerA && playerB ? playerA.name.localeCompare(playerB.name) : 0;
            });

            sortedPlayerIds.forEach(playerId => {
                const player = ALL_PLAYERS.find(p => p.id === playerId);
                if (!player) return;

                const playerData = auctionData[playerId];
                const winningBid = playerData.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max);
                
                const card = document.createElement('div');
                card.className = 'auction-card';
                card.innerHTML = `
                    <div class="player-name">${player.name}</div>
                    <div class="bid-info">Winning Bid:</div>
                    <div class="highest-bid">£${winningBid.amount.toFixed(0)}</div>
                    <div class="winner-name">Won by: ${winningBid.gambler}</div>
                `;
                auctionResultsContainer.appendChild(card);
            });
        };

        const setupPageByStatus = (status) => {
            // Hide all views initially
            activeView.classList.add('hidden');
            finishedView.classList.add('hidden');
            notStartedView.classList.add('hidden');
            
            // Set status indicator text and color
            if (statusIndicator) {
                 switch (status) {
                    case 'active':
                        statusIndicator.textContent = 'Active';
                        statusIndicator.style.backgroundColor = 'var(--status-green)';
                        activeView.classList.remove('hidden');
                        break;
                    case 'finished':
                        statusIndicator.textContent = 'Finished';
                        statusIndicator.style.backgroundColor = 'var(--status-red)';
                        finishedView.classList.remove('hidden');
                        break;
                    case 'not_started':
                    default:
                        statusIndicator.textContent = 'Not Started';
                        statusIndicator.style.backgroundColor = 'var(--status-orange)';
                        notStartedView.classList.remove('hidden');
                        break;
                }
            }


            // Run view-specific logic
            if (status === 'active') {
                populateDropdown(gamblerSelect, GAMBLERS, 'Select Your Name');
                populateDropdown(playerSelect, ALL_PLAYERS, 'Select a Player');
                submitButton.disabled = false;
                form.addEventListener('submit', handleFormSubmit);
                renderActiveAuctionStatus();
            } else if (status === 'finished') {
                renderFinishedResults();
            }
        };

        const initializeAuctionPage = () => {
            if (!window.GOLF_DATA || !window.GOLF_DATA.players) {
                setPageError("Waiting for live tournament data from the main page...");
                return;
            }

            ALL_PLAYERS = (window.GOLF_DATA.players || []).map(p => ({
                id: p.playerId,
                name: `${p.firstName} ${p.lastName}`
            })).sort((a, b) => a.name.localeCompare(b.name));
            
            if (ALL_PLAYERS.length === 0) {
                 setPageError('Player list is empty. The tournament may not be live yet.');
                 return;
            }

            fetch('/config.json')
                .then(res => res.json())
                .then(configData => {
                     GAMBLERS = configData.gamblers || [];
                     const status = configData.auctionStatus || 'not_started';
                     setupPageByStatus(status);
                })
                .catch(err => {
                    console.error("Could not load config.json", err);
                    setPageError("Could not load configuration file.");
                });
        };

        document.addEventListener('golfDataReady', initializeAuctionPage);
        if (window.GOLF_DATA) {
            initializeAuctionPage();
        }

    })();
});
