// --- MODULE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, getDoc, getDocs, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Import configuration directly, eliminating the failed 'fetch' calls
import { tournamentInfo, gamblerNames, playerPicks } from './config.js';

// --- 1. GLOBAL STATE & CONFIGURATION ---
let db, auth; 
let allPlayersData = [];
let isAuctionInitialized = false;

// --- 2. DOM ELEMENT REFERENCES ---
const navContainer = document.getElementById('nav-container');
const pages = document.querySelectorAll('.page');
const leaderboardBody = document.getElementById('leaderboard-body');
const gamblersContainer = document.getElementById('gamblers-container');

// --- 3. LEADERBOARD MODULE ---
const leaderboard = {
    parseScore(score) {
        if (typeof score !== 'string' || score.toUpperCase() === 'E' || !score) return 0;
        const number = parseInt(score, 10);
        return isNaN(number) ? 0 : number;
    },
    formatScore(score) {
        if (typeof score !== 'number' || isNaN(score)) return { text: 'N/A', className: 'score-even' };
        if (score === 0) return { text: 'E', className: 'score-even' };
        if (score > 0) return { text: `+${score}`, className: 'score-over' };
        return { text: score.toString(), className: 'score-under' };
    },
    updateUI() {
        if (!gamblersContainer || !leaderboardBody) return;
        const gamblerData = {};
        gamblerNames.forEach(gambler => {
            gamblerData[gambler] = { totalScore: 0, todayScore: 0, players: [], hasMissedCutPlayer: false, missedCutCount: 0, totalPicks: 0 };
        });
        allPlayersData.forEach(player => {
            if (!player || !player.playerId) return;
            const isOutOfTournament = player.status === 'cut' || player.status === 'wd';
            const parsedPlayerScore = this.parseScore(player.total);
            const parsedTodayScore = this.parseScore(player.currentRoundScore);
            const tagsForPlayer = playerPicks[player.playerId] || [];
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
        
        gamblersContainer.innerHTML = '';
        sortedGamblers.forEach(([gamblerName, gamblerInfo]) => {
            const card = document.createElement('div');
            card.className = 'gambler-card';
            let finalScore = gamblerInfo.hasMissedCutPlayer ? { text: this.formatScore(gamblerInfo.totalScore).text, className: 'score-over' } : this.formatScore(gamblerInfo.totalScore);
            const todayScoreInfo = this.formatScore(gamblerInfo.todayScore);
            const madeCutCount = gamblerInfo.totalPicks - gamblerInfo.missedCutCount;
            const teamStatusText = `${madeCutCount}/${gamblerInfo.totalPicks} MADE CUT`;
            const playerBreakdownHtml = gamblerInfo.players.map(p => `<div class="player-row ${p.hasMissedCut ? 'missed-cut' : ''}"><span class="player-name">${p.name}</span><span class="player-score ${this.formatScore(p.score).className}">${this.formatScore(p.score).text}${p.hasMissedCut ? ' (MC)' : ''}</span></div>`).join('');
            card.innerHTML = `<div class="name">${gamblerName}</div><div class="total-score ${finalScore.className}">${finalScore.text}</div><div class="today-score ${todayScoreInfo.className}">Today: ${todayScoreInfo.text}</div><div class="team-status">${teamStatusText}</div><div class="player-breakdown">${playerBreakdownHtml}</div>`;
            gamblersContainer.appendChild(card);
        });
        
        leaderboardBody.innerHTML = allPlayersData.map(player => {
            if (!player || !player.playerId) return '';
            const tagsHtml = (playerPicks[player.playerId] || []).map(tag => `<span class="tag">${tag}</span>`).join('');
            const totalScoreInfo = this.formatScore(this.parseScore(player.total));
            const todayScoreInfo = this.formatScore(this.parseScore(player.currentRoundScore));
            
            // --- FIX FOR 'THRU' (now correctly handles object structure if present) ---
            let thruValue;
            if (player.roundComplete) {
                thruValue = 'F'; // 'F' for Finished Round
            } else {
                // If player.currentHole is an object like { '$numberInt': '13' }
                if (typeof player.currentHole === 'object' && player.currentHole['$numberInt']) {
                    thruValue = player.currentHole['$numberInt'];
                } else {
                    thruValue = player.currentHole || 'N/A'; // Use currentHole if it's a direct value
                }
            }
            
            // --- FIX FOR 'LAST ROUND' (ROUND SCORE) ---
            let roundScoreDisplay = 'N/A';
            if (player.rounds && player.rounds.length > 0) {
                const lastCompletedRound = player.rounds[player.rounds.length - 1];
                if (lastCompletedRound && lastCompletedRound.strokes) {
                    // Assuming strokes might also be an object { '$numberInt': 'X' }
                    if (typeof lastCompletedRound.strokes === 'object' && lastCompletedRound.strokes['$numberInt']) {
                        roundScoreDisplay = lastCompletedRound.strokes['$numberInt'];
                    } else {
                        roundScoreDisplay = lastCompletedRound.strokes;
                    }
                }
            } else if (player.currentRoundScore) {
                roundScoreDisplay = todayScoreInfo.text; // Use the formatted today's score
            }

            return `<tr><td>${tagsHtml}</td><td>${player.position || 'N/A'}</td><td>${player.firstName || ''} ${player.lastName || ''}</td><td class="${totalScoreInfo.className}">${totalScoreInfo.text}</td><td class="${todayScoreInfo.className}">${todayScoreInfo.text}</td><td>${thruValue}</td><td>${roundScoreDisplay}</td></tr>`;
        }).join('');
    },
    async fetchPlayerData(config) {
        const url = `/.netlify/functions/get-scores?orgId=${config.orgId}&tournId=${config.tournId}&year=${config.year}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Live API failed with status: ${response.status}`);
        const data = await response.json();
        if (!data.leaderboardRows || data.leaderboardRows.length === 0) throw new Error("Live API returned no players.");
        return data.leaderboardRows;
    }
};

// --- 4. AUCTION MODULE ---
const auction = {
    async init() {
        if (isAuctionInitialized) return;
        isAuctionInitialized = true;
        
        const form = document.getElementById('auction-form');
        if (!form) return;

        const appId = 'dgg-auction-final';
        const auctionBidsRef = collection(db, `/artifacts/${appId}/public/data/auctionBids`);
        const auctionStateRef = doc(db, `/artifacts/${appId}/public/data/auctionState/currentState`);

        try {
            const provisionalResponse = await fetch('provisional_players.json');
            if (!provisionalResponse.ok) throw new Error("Could not load auction player list.");
            const provisionalData = await provisionalResponse.json();
            
            const auctionPlayers = provisionalData.map((player, index) => ({
                id: `${player.lastName.toLowerCase()}_${player.firstName.toLowerCase()}_${index}`.replace(/\s/g, ''),
                name: `${player.firstName} ${player.lastName}`
            })).sort((a,b) => a.name.localeCompare(b.name));

            if (auctionPlayers.length === 0) {
                this.setPageError('Provisional player list is empty.');
                return;
            }
            
            let currentStatus = 'not_started';
            let bidsUnsubscribe = null;

            onSnapshot(auctionStateRef, (stateDoc) => {
                currentStatus = stateDoc.exists() ? stateDoc.data().status : 'not_started';
                if (bidsUnsubscribe) { bidsUnsubscribe(); }
                bidsUnsubscribe = onSnapshot(auctionBidsRef, (bidsSnapshot) => {
                    const auctionData = {};
                    bidsSnapshot.forEach(doc => { auctionData[doc.id] = doc.data(); });
                    this.setupPageByStatus(currentStatus, auctionData, auctionPlayers);
                }, (error) => this.setPageError("Error loading auction data."));
            }, (error) => this.setPageError("Could not determine auction status."));
        } catch (error) {
            this.setPageError(`Auction Initialization failed: ${error.message}`);
        }
    },
    setPageError(message) {
        const pageDiv = document.getElementById('page-gamblers');
        if (pageDiv) pageDiv.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-weight: 600; padding: 40px;">${message}</p>`;
    },
    populateDropdown(select, data, placeholder, isObject = false) {
        select.innerHTML = `<option value="">${placeholder}</option>`;
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = isObject ? item.id : item;
            option.textContent = isObject ? item.name : item;
            select.appendChild(option);
        });
        select.disabled = false;
    },
    renderFinishedResults(auctionData) {
        const auctionResultsContainer = document.getElementById('auction-results-container');
        auctionResultsContainer.innerHTML = '';
        const playersWithBids = Object.keys(auctionData);
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
                const tiedGamblers = topBids.map(b => b.gambler).join(', ');
                card.style.borderColor = 'var(--status-orange)';
                card.innerHTML = `<div class="player-name">${playerData.playerName}</div><div class="bid-info">Highest Bid (Tied):</div><div class="highest-bid">£${highestBidAmount.toFixed(0)}</div><div class="winner-name" style="color: var(--status-orange);">Tied Bidders: ${tiedGamblers}</div><div class="team-status" style="color: var(--danger-color); margin-top: 10px; border-top: none; font-weight: 700;">REMOVED FROM AUCTION</div>`;
            } else {
                const winningBid = topBids[0];
                card.innerHTML = `<div class="player-name">${playerData.playerName}</div><div class="bid-info">Winning Bid:</div><div class="highest-bid">£${winningBid.amount.toFixed(0)}</div><div class="winner-name">Won by: ${winningBid.gambler}</div>`;
            }
            auctionResultsContainer.appendChild(card);
        });
    },
    async handleFormSubmit(e, localPlayers) {
        e.preventDefault();
        const form = e.target;
        const errorMessageDiv = document.getElementById('auction-error-message');
        const submitButton = document.getElementById('auction-submit-button');
        const gamblerSelect = document.getElementById('auction-gambler-select');
        const playerSelect = document.getElementById('auction-player-select');
        const bidAmountInput = document.getElementById('auction-bid-amount');

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
        submitButton.textContent = 'Validating...';
        try {
            const auctionBidsRef = collection(db, `/artifacts/dgg-auction-final/public/data/auctionBids`);
            const allBidsSnapshot = await getDocs(auctionBidsRef);
            let gamblerBidCount = 0;
            allBidsSnapshot.forEach(doc => {
                doc.data().bids.forEach(bid => {
                    if (bid.gambler === selectedGambler) gamblerBidCount++;
                });
            });
            if (gamblerBidCount >= 2) {
                throw new Error("You have already placed your maximum of 2 bids.");
            }
            submitButton.textContent = 'Placing Bid...';
            const playerDocRef = doc(auctionBidsRef, selectedPlayerId);
            const playerDocSnap = await getDoc(playerDocRef);
            const newBid = { amount: bidAmount, gambler: selectedGambler, timestamp: Date.now() };
            if (playerDocSnap.exists()) {
                await updateDoc(playerDocRef, { bids: arrayUnion(newBid) });
            } else {
                const playerInfo = localPlayers.find(p => p.id === selectedPlayerId);
                const name = playerInfo ? playerInfo.name : 'Unknown Player';
                await setDoc(playerDocRef, { playerName: name, bids: [newBid] });
            }
            form.reset();
        } catch (error) {
            errorMessageDiv.textContent = error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Place Bid';
        }
    },
    setupPageByStatus(status, auctionData, localPlayers) {
        const activeView = document.getElementById('auction-active-view');
        const finishedView = document.getElementById('auction-finished-view');
        const notStartedView = document.getElementById('auction-not-started-view');
        const statusIndicator = document.getElementById('auction-status-indicator');
        const auctionPageLayout = document.getElementById('auction-page-layout');
        const auctionFormContainer = document.getElementById('auction-form-container');
        const auctionStatusWrapper = document.getElementById('auction-status-container').parentElement;

        [activeView, finishedView, notStartedView].forEach(v => v.classList.add('hidden'));
        if (auctionPageLayout) auctionPageLayout.style.gridTemplateColumns = '';
        if (auctionFormContainer) {
            auctionFormContainer.style.maxWidth = '';
            auctionFormContainer.style.margin = '';
        }
        if(auctionStatusWrapper) auctionStatusWrapper.style.display = '';
        
        if (statusIndicator) {
             switch (status) {
                case 'active': 
                    statusIndicator.textContent = 'Active'; 
                    statusIndicator.style.backgroundColor = 'var(--status-green)'; 
                    activeView.classList.remove('hidden'); 
                    if (auctionStatusWrapper) auctionStatusWrapper.style.display = 'none';
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
            const form = document.getElementById('auction-form');
            const gamblerSelect = document.getElementById('auction-gambler-select');
            const playerSelect = document.getElementById('auction-player-select');
            const submitButton = document.getElementById('auction-submit-button');
            
            this.populateDropdown(gamblerSelect, gamblerNames, 'Select Your Name');
            this.populateDropdown(playerSelect, localPlayers, 'Select a Player', true);
            submitButton.disabled = false;
            
            if (!form.dataset.listenerAttached) {
                form.addEventListener('submit', (e) => this.handleFormSubmit(e, localPlayers));
                form.dataset.listenerAttached = 'true';
            }
        } else if (status === 'finished') {
            this.renderFinishedResults(auctionData);
        }
    }
};

// --- 5. MAIN APPLICATION INITIALIZATION ---
async function main() {
    // Step 1: Initialize Firebase
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyCxORo_xPNGACIRk5JryuXvxU4wSzwtdvE",
            authDomain: "gambling-golfers.firebaseapp.com",
            projectId: "gambling-golfers",
            storageBucket: "gambling-golfers.appspot.com",
            messagingSenderId: "76662537222",
            appId: "1:76662537222:web:1e9edf0158827a49ab5787",
            measurementId: "G-WMR6147S63"
        };
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Firebase Initialization Failed:", error);
        document.body.innerHTML = `<p style="color: red; text-align: center; padding-top: 50px;">Critical Error: Could not connect to services. Please try again later.</p>`;
        return;
    }

    // Step 2: Setup Navigation
    if (navContainer) {
        navContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.nav-button');
            if (button && !button.disabled) {
                const targetPageId = button.dataset.page;
                pages.forEach(p => p.classList.toggle('hidden', p.id !== `page-${targetPageId}`));
                navContainer.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                if (targetPageId === 'gamblers') {
                    auction.init();
                }
            }
        });
    }

    // Step 3: Initialize the default view (Leaderboard)
    try {
        allPlayersData = await leaderboard.fetchPlayerData(tournamentInfo);
        leaderboard.updateUI();
        // Setup leaderboard refresh
        setInterval(async () => {
            try {
                allPlayersData = await leaderboard.fetchPlayerData(tournamentInfo);
                leaderboard.updateUI();
            } catch (error) {
                console.error("Periodic leaderboard update failed:", error);
            }
        }, 60000);
    } catch (error) {
        console.error("Leaderboard initialization failed:", error);
        if (gamblersContainer) gamblersContainer.innerHTML = `<p style="color: #d9534f; font-weight: bold;">Error: ${error.message}</p>`;
        if (leaderboardBody) leaderboardBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;"><strong>Error:</strong> ${error.message}</td></tr>`;
    }
}

// --- KICK OFF THE APPLICATION ---
document.addEventListener('DOMContentLoaded', main);
