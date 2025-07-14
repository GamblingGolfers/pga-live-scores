// This script is self-contained and handles the "DG Auction" page.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // This function will initialize the auction logic if the auction page is visible
    const initializeAuctionFeature = () => {
        const form = document.getElementById('auction-form');
        if (!form || window.isAuctionInitialized) return; // Exit if no form or already initialized
        window.isAuctionInitialized = true;

        let allPlayersData = [];
        let availableGamblers = [];
        
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
            if (isNaN(bidAmount) || bidAmount <= 0) {
                errorMessageDiv.textContent = 'Please enter a valid bid amount.'; return;
            }
            submitButton.disabled = true;
            submitButton.textContent = 'Validating...';
            try {
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
                errorMessageDiv.textContent = error.message;
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Place Bid';
            }
        };
        
        const setupPageByStatus = (status, auctionData) => {
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
                const playersForDropdown = allPlayersData.map(p => ({ id: p.playerId, name: `${p.firstName} ${p.lastName}` })).sort((a,b) => a.name.localeCompare(b.name));
                populateDropdown(gamblerSelect, availableGamblers, 'Select Your Name');
                populateDropdown(playerSelect, playersForDropdown, 'Select a Player', true);
                submitButton.disabled = false;
                form.addEventListener('submit', handleFormSubmit);
            } else if (status === 'finished') {
                renderFinishedResults(auctionData);
            }
        };

        (async function main() {
            try {
                await signInAnonymously(firebaseAuth);
                
                const configResponse = await fetch('/config.json');
                const configData = await configResponse.json();
                availableGamblers = configData.gamblers;
                const currentStatus = configData.auctionStatus || 'not_started';

                // Fetch player data independently
                const fetchPlayerData = async () => {
                    if (configData.playerDataSource === 'provisional') {
                        const response = await fetch('/provisional_players.json');
                        const provisionalData = await response.json();
                        return provisionalData.map((player, index) => ({
                            playerId: `${player.lastName.toLowerCase()}_${player.firstName.toLowerCase()}_${index}`.replace(/\s/g, ''),
                            firstName: player.firstName,
                            lastName: player.lastName
                        }));
                    } else {
                        const url = `/.netlify/functions/get-scores?orgId=${configData.tournament.orgId}&tournId=${configData.tournament.tournId}&year=${configData.tournament.year}`;
                        const response = await fetch(url);
                        const data = await response.json();
                        return data.leaderboardRows;
                    }
                };
                
                allPlayersData = await fetchPlayerData();

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
    
    // Set up navigation
    const navContainer = document.getElementById('nav-container');
    const pages = document.querySelectorAll('.page');
    if (navContainer) {
        navContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.nav-button');
            if (button) {
                const targetPageId = button.dataset.page;
                pages.forEach(p => p.classList.toggle('hidden', p.id !== `page-${targetPageId}`));
                navContainer.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                if (targetPageId === 'gamblers') {
                    initializeAuctionFeature();
                }
            }
        });
    }
});
