// This script now uses Firebase Firestore for a real-time, multi-user auction.
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
        // We must import the Firebase modules to use them
        // This is a special type of import for modern web scripts.
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js").then(firebase => {
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js").then(auth => {
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js").then(firestore => {
            
            const form = document.getElementById('auction-form');
            if (!form) return;

            let ALL_PLAYERS = [];
            let GAMBLERS = [];
            const MIN_BID_INCREMENT = 5;
            const ABSOLUTE_MIN_BID = 10;
            
            // Firebase Config (will be provided by the environment)
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "YOUR_API_KEY" };
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'dgg-auction-default';

            // Views & Elements
            const activeView = document.getElementById('auction-active-view');
            const finishedView = document.getElementById('auction-finished-view');
            const notStartedView = document.getElementById('auction-not-started-view');
            const gamblerSelect = document.getElementById('auction-gambler-select');
            const playerSelect = document.getElementById('auction-player-select');
            const bidAmountInput = document.getElementById('auction-bid-amount');
            const errorMessageDiv = document.getElementById('auction-error-message');
            const submitButton = document.getElementById('auction-submit-button');
            const auctionStatusContainer = document.getElementById('auction-status-container');
            const auctionResultsContainer = document.getElementById('auction-results-container');
            const mainTitle = document.getElementById('auction-main-title');
            const statusIndicator = document.getElementById('auction-status-indicator');

            // Initialize Firebase App
            const firebaseApp = firebase.initializeApp(firebaseConfig);
            const firebaseAuth = auth.getAuth(firebaseApp);
            const db = firestore.getFirestore(firebaseApp);
            const auctionCollectionRef = firestore.collection(db, `/artifacts/${appId}/public/data/auctionBids`);

            const setPageError = (message) => {
                const pageDiv = document.getElementById('page-gamblers');
                if (pageDiv) pageDiv.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-weight: 600; padding: 40px;">${message}</p>`;
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
            
            const renderAuctionStatus = (auctionData) => {
                auctionStatusContainer.innerHTML = '';
                const playersWithBids = Object.keys(auctionData);

                if (playersWithBids.length === 0) {
                    auctionStatusContainer.innerHTML = `<p style="color: var(--text-muted-color);">No bids placed yet. Be the first!</p>`;
                    return;
                }
                const sortedPlayerIds = playersWithBids.sort((a, b) => auctionData[a].playerName.localeCompare(auctionData[b].playerName));

                sortedPlayerIds.forEach(playerId => {
                    const playerData = auctionData[playerId];
                    const highestBid = Math.max(...playerData.bids.map(b => b.amount));
                    const card = document.createElement('div');
                    card.className = 'auction-card';
                    card.innerHTML = `
                        <div class="player-name">${playerData.playerName}</div>
                        <div class="bid-info">Bids Received: <strong>${playerData.bids.length}</strong></div>
                        <div class="highest-bid">£${highestBid.toFixed(0)}</div>
                    `;
                    auctionStatusContainer.appendChild(card);
                });
            };
            
            const renderFinishedResults = (auctionData) => {
                auctionResultsContainer.innerHTML = '';
                const playersWithBids = Object.keys(auctionData);

                if (playersWithBids.length === 0) {
                     auctionResultsContainer.innerHTML = `<p style="color: var(--text-muted-color);">The auction finished with no bids placed.</p>`;
                     return;
                }
                const sortedPlayerIds = playersWithBids.sort((a, b) => auctionData[a].playerName.localeCompare(auctionData[b].playerName));
                 
                sortedPlayerIds.forEach(playerId => {
                     const playerData = auctionData[playerId];
                     const winningBid = playerData.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max);
                     const card = document.createElement('div');
                     card.className = 'auction-card';
                     card.innerHTML = `
                         <div class="player-name">${playerData.playerName}</div>
                         <div class="bid-info">Winning Bid:</div>
                         <div class="highest-bid">£${winningBid.amount.toFixed(0)}</div>
                         <div class="winner-name">Won by: ${winningBid.gambler}</div>
                     `;
                     auctionResultsContainer.appendChild(card);
                });
            };
            
            const handleFormSubmit = async (e) => {
                e.preventDefault();
                errorMessageDiv.textContent = '';
                
                const selectedGambler = gamblerSelect.value;
                const selectedPlayerId = playerSelect.value;
                const bidAmount = parseFloat(bidAmountInput.value);

                if (!selectedGambler || !selectedPlayerId || !bidAmountInput.value) {
                    errorMessageDiv.textContent = 'Please select your name, a player, and a bid.'; return;
                }
                if (isNaN(bidAmount)) {
                    errorMessageDiv.textContent = 'Please enter a valid number for the bid.'; return;
                }

                submitButton.disabled = true;
                submitButton.textContent = 'Validating Bid...';

                try {
                    const playerDocRef = firestore.doc(db, auctionCollectionRef.path, selectedPlayerId);
                    const playerDocSnap = await firestore.getDoc(playerDocRef);
                    const playerData = playerDocSnap.exists() ? playerDocSnap.data() : null;
                    const currentHighestBid = playerData ? Math.max(...playerData.bids.map(b => b.amount)) : 0;

                    if (currentHighestBid === 0) {
                        if (bidAmount < ABSOLUTE_MIN_BID) {
                            throw new Error(`The first bid must be at least £${ABSOLUTE_MIN_BID}.`);
                        }
                    } else {
                        const requiredMinBid = currentHighestBid + MIN_BID_INCREMENT;
                        if (bidAmount < requiredMinBid) {
                            throw new Error(`Bid must be at least £${requiredMinBid}.`);
                        }
                    }

                    submitButton.textContent = 'Placing Bid...';
                    const newBid = { amount: bidAmount, gambler: selectedGambler, timestamp: Date.now() };
                    
                    if (playerData) {
                        await firestore.updateDoc(playerDocRef, { bids: firestore.arrayUnion(newBid) });
                    } else {
                        const playerName = ALL_PLAYERS.find(p => p.id === selectedPlayerId)?.name || 'Unknown Player';
                        await firestore.setDoc(playerDocRef, { playerName, bids: [newBid] });
                    }
                    
                    form.reset();
                } catch (error) {
                    errorMessageDiv.textContent = error.message;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Place Bid';
                }
            };
            
            const setupPageByStatus = (status, auctionData) => {
                activeView.classList.add('hidden');
                finishedView.classList.add('hidden');
                notStartedView.classList.add('hidden');
                
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
                        default:
                            statusIndicator.textContent = 'Not Started';
                            statusIndicator.style.backgroundColor = 'var(--status-orange)';
                            notStartedView.classList.remove('hidden');
                            break;
                    }
                }
                if (status === 'active') {
                    populateDropdown(gamblerSelect, GAMBLERS, 'Select Your Name');
                    populateDropdown(playerSelect, ALL_PLAYERS, 'Select a Player', true);
                    submitButton.disabled = false;
                    form.addEventListener('submit', handleFormSubmit);
                    renderActiveAuctionStatus(auctionData);
                } else if (status === 'finished') {
                    renderFinishedResults(auctionData);
                }
            };

            const initializeAuctionPage = async () => {
                try {
                    const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                    if (token) await auth.signInWithCustomToken(firebaseAuth, token);
                    else await auth.signInAnonymously(firebaseAuth);

                    if (!window.GOLF_DATA || !window.GOLF_DATA.players) {
                        setPageError("Waiting for live tournament data from main page...");
                        return;
                    }
                    ALL_PLAYERS = (window.GOLF_DATA.players || []).map(p => ({
                        id: p.playerId, name: `${p.firstName} ${p.lastName}`
                    })).sort((a, b) => a.name.localeCompare(b.name));
                    
                    if (ALL_PLAYERS.length === 0) {
                        setPageError('Player list is empty. Tournament may not be live.'); return;
                    }

                    const configResponse = await fetch('/config.json');
                    const configData = await configResponse.json();
                    GAMBLERS = configData.gamblers || [];
                    const auctionStatus = configData.auctionStatus || 'not_started';

                    // Real-time listener
                    firestore.onSnapshot(auctionCollectionRef, (snapshot) => {
                        const auctionData = {};
                        snapshot.forEach(doc => {
                            auctionData[doc.id] = doc.data();
                        });
                        setupPageByStatus(auctionStatus, auctionData);
                    });

                } catch (error) {
                    console.error("Initialization failed:", error);
                    setPageError(`Initialization failed: ${error.message}`);
                }
            };

            document.addEventListener('golfDataReady', initializeAuctionPage);
            if (window.GOLF_DATA) initializeAuctionPage();
            
        }); }); }); // End of dynamic Firebase imports
    })();
});
