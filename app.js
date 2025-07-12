// --- THIS SCRIPT NOW CONTROLS THE ENTIRE APPLICATION ---

// Import Firebase modules first
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- SHARED STATE & CONFIG ---
    let gamblerPicks = {};
    let availableGamblers = [];
    let tournamentConfig = {};
    let allPlayersData = [];
    let isAuctionInitialized = false;

    // --- NAVIGATION ---
    const navContainer = document.getElementById('nav-container');
    const pages = document.querySelectorAll('.page');
    if (navContainer) {
        navContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-button')) {
                const targetPageId = e.target.dataset.page;
                pages.forEach(p => p.classList.toggle('hidden', p.id !== `page-${targetPageId}`));
                navContainer.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                if (targetPageId === 'gamblers' && !isAuctionInitialized) {
                    initializeAuctionFeature();
                }
            }
        });
    }

    // --- AUCTION LOGIC ---
    const initializeAuctionFeature = () => {
        if (isAuctionInitialized) return;
        isAuctionInitialized = true;
        
        const form = document.getElementById('auction-form');
        if (!form) return;

        const MIN_BID_INCREMENT = 5;
        const ABSOLUTE_MIN_BID = 10;
        
        const firebaseConfig = {
          apiKey: "AIzaSyCxORo_xPNGACIRk5JryuXvxU4wSzwtdvE",
          authDomain: "gambling-golfers.firebaseapp.com",
          projectId: "gambling-golfers",
          storageBucket: "gambling-golfers.appspot.com",
          messagingSenderId: "76662537222",
          appId: "1:76662537222:web:1e9edf0158827a49ab5787",
          measurementId: "G-WMR6147S63"
        };
        const appId = 'dgg-auction-final';

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
        const statusIndicator = document.getElementById('auction-status-indicator');
        const auctionPageLayout = document.getElementById('auction-page-layout');
        const auctionFormContainer = document.getElementById('auction-form-container');
        const auctionStatusWrapper = auctionStatusContainer.parentElement;


        const firebaseApp = initializeApp(firebaseConfig);
        const firebaseAuth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);
        const auctionBidsRef = collection(db, `/artifacts/${appId}/public/data/auctionBids`);
        const auctionArchivesRef = collection(db, `/artifacts/${appId}/public/data/auctionArchives`);

        const setPageError = (message) => {
            const pageDiv = document.getElementById('page-gamblers');
            if (pageDiv) pageDiv.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-weight: 600; padding: 40px;">${message}</p>`;
        };

        const populateDropdown = (select, data, placeholder, isObject = false) => {
            select.innerHTML = `<option value="">${placeholder}</option>`;
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = isObject ? item.id : item;
                option.textContent = isObject ? item.name : item;
                select.appendChild(option);
            });
            select.disabled = false;
        };
        
        const renderFinishedResults = (auctionData) => {
            const playersWithBids = Object.keys(auctionData);
            auctionResultsContainer.innerHTML = '';

            if (playersWithBids.length === 0) {
                auctionResultsContainer.innerHTML = `<p style="color: var(--text-muted-color);">The auction finished with no bids placed.</p>`;
                return;
            }

            const sortedPlayerIds = playersWithBids.sort((a, b) => auctionData[a].playerName.localeCompare(auctionData[b].playerName));
            
            sortedPlayerIds.forEach(playerId => {
                const playerData = auctionData[playerId];
                const card = document.createElement('div');
                card.className = 'auction-card';

                const highestBidAmount = Math.max(...playerData.bids.map(b => b.amount));
                const topBids = playerData.bids.filter(b => b.amount === highestBidAmount);

                if (topBids.length > 1) {
                    // TIE SCENARIO
                    const tiedGamblers = topBids.map(b => b.gambler).join(', ');
                    card.style.borderColor = 'var(--status-orange)';
                    card.innerHTML = `
                        <div class="player-name">${playerData.playerName}</div>
                        <div class="bid-info">Highest Bid (Tied):</div>
                        <div class="highest-bid">£${highestBidAmount.toFixed(0)}</div>
                        <div class="winner-name" style="color: var(--status-orange);">Tied Bidders: ${tiedGamblers}</div>
                        <div class="team-status" style="color: var(--danger-color); margin-top: 10px; border-top: none; font-weight: 700;">REMOVED FROM AUCTION</div>
                    `;
                } else {
                    // SINGLE WINNER SCENARIO
                    const winningBid = topBids[0];
                    card.innerHTML = `
                        <div class="player-name">${playerData.playerName}</div>
                        <div class="bid-info">Winning Bid:</div>
                        <div class="highest-bid">£${winningBid.amount.toFixed(0)}</div>
                        <div class="winner-name">Won by: ${winningBid.gambler}</div>
                    `;
                }
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
            if (isNaN(bidAmount) || bidAmount <= 0) {
                errorMessageDiv.textContent = 'Please enter a valid bid amount.'; return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Placing Bid...';

            try {
                const playerDocRef = doc(db, auctionBidsRef.path, selectedPlayerId);
                const playerDocSnap = await getDoc(playerDocRef);
                const playerData = playerDocSnap.exists() ? playerDocSnap.data() : null;

                const newBid = { amount: bidAmount, gambler: selectedGambler, timestamp: Date.now() };
                
                if (playerData) {
                    await updateDoc(playerDocRef, { bids: arrayUnion(newBid) });
                } else {
                    const playerInfo = allPlayersData.find(p => p.playerId === selectedPlayerId);
                    const name = playerInfo ? `${playerInfo.firstName} ${playerInfo.lastName}` : 'Unknown Player';
                    await setDoc(playerDocRef, { playerName: name, bids: [newBid] });
                }
                form.reset();
            } catch (error) {
                errorMessageDiv.textContent = "Error placing bid. Please try again.";
                console.error("Bid submission error:", error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Place Bid';
            }
        };
        
        const setupPageByStatus = (status, auctionData) => {
            [activeView, finishedView, notStartedView].forEach(v => v.classList.add('hidden'));
            
            // Reset layout styles before applying new ones
            if (auctionPageLayout) auctionPageLayout.style.gridTemplateColumns = '';
            if (auctionFormContainer) {
                auctionFormContainer.style.maxWidth = '';
                auctionFormContainer.style.margin = '';
            }
            if(auctionStatusWrapper) auctionStatusWrapper.classList.remove('hidden');

            if (statusIndicator) {
                 switch (status) {
                    case 'active': 
                        statusIndicator.textContent = 'Active'; 
                        statusIndicator.style.backgroundColor = 'var(--status-green)'; 
                        activeView.classList.remove('hidden'); 
                        // Hide status board and center form
                        if (auctionStatusWrapper) auctionStatusWrapper.classList.add('hidden');
                        if (auctionPageLayout) auctionPageLayout.style.gridTemplateColumns = '1fr';
                        if (auctionFormContainer) {
                            auctionFormContainer.style.maxWidth = '450px';
                            auctionFormContainer.style.margin = '0 auto';
                        }
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
                const playersForDropdown = allPlayersData.map(p => ({ id: p.playerId, name: `${p.firstName} ${p.lastName}` })).sort((a,b) => a.name.localeCompare(b.name));
                populateDropdown(gamblerSelect, availableGamblers, 'Select Your Name');
                populateDropdown(playerSelect, playersForDropdown, 'Select a Player', true);
                submitButton.disabled = false;
                form.addEventListener('submit', handleFormSubmit);
                // No need to render status, as it's hidden
            } else if (status === 'finished') {
                renderFinishedResults(auctionData);
            }
        };

        const resetAuction = async () => {
            console.log("Resetting auction data...");
            const querySnapshot = await getDocs(auctionBidsRef);
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            await Promise.all(deletePromises);
            console.log("Auction data reset successfully.");
        };

        const archiveAuction = async () => {
             console.log("Archiving auction data...");
             const bidsSnapshot = await getDocs(auctionBidsRef);
             if (bidsSnapshot.empty) {
                 console.log("No bids to archive.");
                 return;
             }
             
             const auctionData = {};
             bidsSnapshot.forEach(doc => {
                 auctionData[doc.id] = doc.data();
             });
             
             const results = {};
             for (const playerId in auctionData) {
                 const playerData = auctionData[playerId];
                 if (playerData.bids && playerData.bids.length > 0) {
                     const winningBid = playerData.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max);
                     results[playerId] = {
                         playerName: playerData.playerName,
                         winningBid: winningBid.amount,
                         winner: winningBid.gambler
                     };
                 }
             }
             
             const archiveId = new Date().toISOString();
             const archiveDocRef = doc(auctionArchivesRef, archiveId);
             await setDoc(archiveDocRef, {
                 results,
                 archivedAt: new Date()
             });
             console.log(`Auction results archived successfully with ID: ${archiveId}`);
        };

        (async function main() {
            try {
                await signInAnonymously(firebaseAuth);
                
                if (allPlayersData.length === 0) {
                    setPageError('Player data is not yet available. Please refresh if the leaderboard has loaded.');
                    return;
                }
                
                const configResponse = await fetch('/config.json');
                const configData = await configResponse.json();
                const currentStatus = configData.auctionStatus || 'not_started';

                const PREVIOUS_STATUS_KEY = 'dgg_last_auction_status';
                const lastKnownStatus = localStorage.getItem(PREVIOUS_STATUS_KEY);

                if (lastKnownStatus && lastKnownStatus !== currentStatus) {
                    console.log(`Status changed from ${lastKnownStatus} to ${currentStatus}`);
                    if (currentStatus === 'finished' && lastKnownStatus === 'active') {
                        await archiveAuction();
                    } else if (currentStatus === 'active' && lastKnownStatus === 'finished') {
                        await resetAuction();
                    }
                }
                localStorage.setItem(PREVIOUS_STATUS_KEY, currentStatus);

                onSnapshot(auctionBidsRef, (snapshot) => {
                    const auctionData = {};
                    snapshot.forEach(doc => { auctionData[doc.id] = doc.data(); });
                    setupPageByStatus(currentStatus, auctionData);
                });

            } catch (error) {
                console.error("Auction Initialization failed:", error);
                setPageError(`Auction Initialization failed: ${error.message}`);
            }
        })();
    };

    // --- LEADERBOARD LOGIC (Original) ---
    (() => {
        const leaderboardBody = document.getElementById('leaderboard-body');
        const gamblersContainer = document.getElementById('gamblers-container');

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

        const updateUI = () => {
            const gamblerData = {};
            availableGamblers.forEach(gambler => {
                gamblerData[gambler] = { totalScore: 0, todayScore: 0, players: [], hasMissedCutPlayer: false, missedCutCount: 0, totalPicks: 0 };
            });
            allPlayersData.forEach(player => {
                if (!player || !player.playerId) return;
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
                        gambler.players.push({ name: `${player.firstName.charAt(0)}. ${player.lastName}`, score: parsedPlayerScore, hasMissedCut: isOutOfTournament });
                    }
                });
            });
            const sortedGamblers = Object.entries(gamblerData).sort((a, b) => {
                const gamblerA = a[1]; const gamblerB = b[1];
                if (gamblerA.hasMissedCutPlayer && !gamblerB.hasMissedCutPlayer) return 1;
                if (!gamblerA.hasMissedCutPlayer && gamblerB.hasMissedCutPlayer) return -1;
                return gamblerA.totalScore - gamblerB.totalScore;
            });
            if (gamblersContainer) {
                gamblersContainer.innerHTML = '';
                sortedGamblers.forEach(([gamblerName, gamblerInfo]) => {
                    const card = document.createElement('div');
                    card.className = 'gambler-card';
                    let finalScore = gamblerInfo.hasMissedCutPlayer ? { text: formatScore(gamblerInfo.totalScore).text, className: 'score-over' } : formatScore(gamblerInfo.totalScore);
                    const todayScoreInfo = formatScore(gamblerInfo.todayScore);
                    const madeCutCount = gamblerInfo.totalPicks - gamblerInfo.missedCutCount;
                    const teamStatusText = `${madeCutCount}/${gamblerInfo.totalPicks} MADE CUT`;
                    const playerBreakdownHtml = gamblerInfo.players.map(p => `<div class="player-row ${p.hasMissedCut ? 'missed-cut' : ''}"><span class="player-name">${p.name}</span><span class="player-score ${formatScore(p.score).className}">${formatScore(p.score).text}${p.hasMissedCut ? ' (MC)' : ''}</span></div>`).join('');
                    card.innerHTML = `<div class="name">${gamblerName}</div><div class="total-score ${finalScore.className}">${finalScore.text}</div><div class="today-score ${todayScoreInfo.className}">Today: ${todayScoreInfo.text}</div><div class="team-status">${teamStatusText}</div><div class="player-breakdown">${playerBreakdownHtml}</div>`;
                    gamblersContainer.appendChild(card);
                });
            }
            if (leaderboardBody) {
                leaderboardBody.innerHTML = allPlayersData.map(player => {
                    if (!player || !player.playerId) return '';
                    const tagsHtml = (gamblerPicks[player.playerId] || []).map(tag => `<span class="tag">${tag}</span>`).join('');
                    const totalScoreInfo = formatScore(parseScore(player.total));
                    const todayScoreInfo = formatScore(parseScore(player.currentRoundScore));
                    let lastRound = 'N/A';
                    if (player.rounds && player.rounds.length > 0) {
                        const lastRoundData = player.rounds[player.rounds.length - 1];
                        if (lastRoundData && lastRoundData.strokes && lastRoundData.strokes['$numberInt']) lastRound = lastRoundData.strokes['$numberInt'];
                    }
                    return `<tr><td>${tagsHtml}</td><td>${player.position || 'N/A'}</td><td>${player.firstName || ''} ${player.lastName || ''}</td><td class="${totalScoreInfo.className}">${totalScoreInfo.text}</td><td class="${todayScoreInfo.className}">${todayScoreInfo.text}</td><td>${player.thru || 'N/A'}</td><td>${lastRound}</td></tr>`;
                }).join('');
            }
        };

        const fetchLeaderboardData = () => {
            const { orgId, tournId, year } = tournamentConfig;
            const url = `/.netlify/functions/get-scores?orgId=${orgId}&tournId=${tournId}&year=${year}`;
            fetch(url)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then(data => {
                    allPlayersData = data.leaderboardRows || [];
                    updateUI();
                })
                .catch(err => {
                    console.error("Error fetching data:", err);
                    if (gamblersContainer) gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Could not load live data.</p>`;
                });
        };

        (async function main() {
            try {
                const [configResponse, picksResponse] = await Promise.all([ fetch('/config.json'), fetch('/picks.json') ]);
                if (!configResponse.ok || !picksResponse.ok) throw new Error('Failed to load initial config files.');
                const configData = await configResponse.json();
                gamblerPicks = await picksResponse.json();
                availableGamblers = configData.gamblers;
                tournamentConfig = configData.tournament;
                fetchLeaderboardData();
                setInterval(fetchLeaderboardData, 60000);
            } catch (error) {
                console.error("Initialization failed:", error);
                if (gamblersContainer) gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Error: ${error.message}</p>`;
            }
        })();
    })();
});
