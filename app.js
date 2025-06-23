// --- THIS SCRIPT NOW CONTROLS THE ENTIRE APPLICATION ---

// Import Firebase modules first
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
                // Initialize auction only when the tab is clicked for the first time
                if (targetPageId === 'gamblers' && !isAuctionInitialized) {
                    initializeAuctionFeature();
                }
            }
        });
    }

    // --- LEADERBOARD LOGIC ---
    const initLeaderboard = () => {
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
            // Update Gamblers Table
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

            // Update Leaderboard Table
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
    };

    // --- AUCTION LOGIC ---
    const initializeAuctionFeature = () => {
        if (isAuctionInitialized) return;
        isAuctionInitialized = true;
        
        const form = document.getElementById('auction-form');
        if (!form) return;

        const MIN_BID_INCREMENT = 5;
        const ABSOLUTE_MIN_BID = 10;
        
        // --- IMPORTANT ---
        // REPLACE THIS with your actual Firebase project configuration
        const firebaseConfig = {
  apiKey: "AIzaSyCxORo_xPNGACIRk5JryuXvxU4wSzwtdvE",
  authDomain: "gambling-golfers.firebaseapp.com",
  projectId: "gambling-golfers",
  storageBucket: "gambling-golfers.firebasestorage.app",
  messagingSenderId: "76662537222",
  appId: "1:76662537222:web:1e9edf0158827a49ab5787",
  measurementId: "G-WMR6147S63"
};
        // Fallback for my dev environment
        const finalConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'dgg-auction-final';

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

        const firebaseApp = initializeApp(finalConfig);
        const firebaseAuth = getAuth(firebaseApp);
        const db = getFirestore(firebaseApp);
        const auctionCollectionRef = collection(db, `/artifacts/${appId}/public/data/auctionBids`);

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
        
        const renderAuctionStatus = (auctionData) => {
            const playersWithBids = Object.keys(auctionData);
            auctionStatusContainer.innerHTML = playersWithBids.length === 0 
                ? `<p style="color: var(--text-muted-color);">No bids placed yet. Be the first!</p>`
                : playersWithBids.sort((a, b) => auctionData[a].playerName.localeCompare(auctionData[b].playerName))
                  .map(playerId => {
                    const playerData = auctionData[playerId];
                    const highestBid = Math.max(...playerData.bids.map(b => b.amount));
                    return `<div class="auction-card"><div class="player-name">${playerData.playerName}</div><div class="bid-info">Bids Received: <strong>${playerData.bids.length}</strong></div><div class="highest-bid">£${highestBid.toFixed(0)}</div></div>`;
                  }).join('');
        };
        
        const renderFinishedResults = (auctionData) => {
            const playersWithBids = Object.keys(auctionData);
            auctionResultsContainer.innerHTML = playersWithBids.length === 0
                ? `<p style="color: var(--text-muted-color);">The auction finished with no bids placed.</p>`
                : playersWithBids.sort((a, b) => auctionData[a].playerName.localeCompare(auctionData[b].playerName))
                  .map(playerId => {
                    const playerData = auctionData[playerId];
                    const winningBid = playerData.bids.reduce((max, bid) => bid.amount > max.amount ? bid : max);
                    return `<div class="auction-card"><div class="player-name">${playerData.playerName}</div><div class="bid-info">Winning Bid:</div><div class="highest-bid">£${winningBid.amount.toFixed(0)}</div><div class="winner-name">Won by: ${winningBid.gambler}</div></div>`;
                  }).join('');
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
            submitButton.textContent = 'Validating...';

            try {
                const playerDocRef = doc(db, auctionCollectionRef.path, selectedPlayerId);
                const playerDocSnap = await getDoc(playerDocRef);
                const playerData = playerDocSnap.exists() ? playerDocSnap.data() : null;
                const currentHighestBid = playerData ? Math.max(...playerData.bids.map(b => b.amount)) : 0;

                if (currentHighestBid === 0) {
                    if (bidAmount < ABSOLUTE_MIN_BID) throw new Error(`First bid must be at least £${ABSOLUTE_MIN_BID}.`);
                } else {
                    const requiredMinBid = currentHighestBid + MIN_BID_INCREMENT;
                    if (bidAmount < requiredMinBid) throw new Error(`Bid must be at least £${requiredMinBid}.`);
                }

                submitButton.textContent = 'Placing Bid...';
                const newBid = { amount: bidAmount, gambler: selectedGambler, timestamp: Date.now() };
                
                if (playerData) {
                    await updateDoc(playerDocRef, { bids: arrayUnion(newBid) });
                } else {
                    const playerName = allPlayersData.find(p => p.playerId === selectedPlayerId);
                    const name = playerName ? `${playerName.firstName} ${playerName.lastName}` : 'Unknown Player';
                    await setDoc(playerDocRef, { playerName: name, bids: [newBid] });
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
            [activeView, finishedView, notStartedView].forEach(v => v.classList.add('hidden'));
            if (statusIndicator) {
                 switch (status) {
                    case 'active': statusIndicator.textContent = 'Active'; statusIndicator.style.backgroundColor = 'var(--status-green)'; activeView.classList.remove('hidden'); break;
                    case 'finished': statusIndicator.textContent = 'Finished'; statusIndicator.style.backgroundColor = 'var(--status-red)'; finishedView.classList.remove('hidden'); break;
                    default: statusIndicator.textContent = 'Not Started'; statusIndicator.style.backgroundColor = 'var(--status-orange)'; notStartedView.classList.remove('hidden'); break;
                }
            }
            if (status === 'active') {
                const playersForDropdown = allPlayersData.map(p => ({ id: p.playerId, name: `${p.firstName} ${p.lastName}` })).sort((a,b) => a.name.localeCompare(b.name));
                populateDropdown(gamblerSelect, availableGamblers, 'Select Your Name');
                populateDropdown(playerSelect, playersForDropdown, 'Select a Player', true);
                submitButton.disabled = false;
                form.addEventListener('submit', handleFormSubmit);
                renderAuctionStatus(auctionData);
            } else if (status === 'finished') {
                renderFinishedResults(auctionData);
            }
        };

        (async function main() {
            try {
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (token) await signInWithCustomToken(firebaseAuth, token); else await signInAnonymously(firebaseAuth);
                
                if (allPlayersData.length === 0) {
                    setPageError('Player data is not yet available. Please refresh if the leaderboard has loaded.');
                    return;
                }
                
                const configResponse = await fetch('/config.json');
                const configData = await configResponse.json();
                const auctionStatus = configData.auctionStatus || 'not_started';
                
                onSnapshot(auctionCollectionRef, (snapshot) => {
                    const auctionData = {};
                    snapshot.forEach(doc => { auctionData[doc.id] = doc.data(); });
                    setupPageByStatus(auctionStatus, auctionData);
                });

            } catch (error) {
                console.error("Auction Initialization failed:", error);
                setPageError(`Auction Initialization failed: ${error.message}`);
            }
        })();
    };

    // --- INITIALIZE LEADERBOARD FIRST ---
    initLeaderboard();
});
