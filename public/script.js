let map;
let marker;
let mapInitialized = false;
let panorama;
let streetViewContainer;
let toastTimer;

// Toast notification function
function showToast(message, type = 'info') {
    // Clear any existing toast
    if (toastTimer) {
        clearTimeout(toastTimer);
        const existingToast = document.getElementById('toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.innerHTML = message;
    
    // Style based on type
    const backgroundColor = type === 'error' ? '#f44336' : '#4CAF50';
    
    // Set styles
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = backgroundColor;
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '10000';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    toast.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 3.7s';
    toast.style.maxWidth = '80%';
    toast.style.textAlign = 'center';
    
    // Add to document
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    toastTimer = setTimeout(() => {
        toast.remove();
        toastTimer = null;
    }, 4000);
}

// Add custom animations for toast
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes fadeOut {
    from { opacity: 1; transform: translate(-50%, 0); }
    to { opacity: 0; transform: translate(-50%, 20px); }
}`;
document.head.appendChild(style);
// Do not redeclare searchHistory, use the one defined earlier
// Define toggleMobileMenu function
function toggleMobileMenu() {
    const navLinks = document.getElementById('mobile-nav');
    navLinks.classList.toggle('active');

    // Toggle body scrolling based on menu state
    if (navLinks.classList.contains('active')) {
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        // Ensure menu is visible
        navLinks.style.visibility = 'visible';
    } else {
        document.body.style.overflow = ''; // Allow scrolling
        // Use setTimeout to hide the menu after transition completes
        setTimeout(() => {
            if (!navLinks.classList.contains('active')) {
                navLinks.style.visibility = 'hidden';
            }
        }, 300); // Match the transition duration
    }
    
    // Add event listener to close menu button
    const closeBtn = document.getElementById('close-menu-btn');
    if (closeBtn) {
        closeBtn.onclick = toggleMobileMenu;
    }
}

// Add event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    const closeMenuBtn = document.getElementById('close-menu-btn');
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Check if we're on the profile page
    const serversContainer = document.getElementById('servers-container');
    if (serversContainer) {
        // Fetch and display user's servers
        loadUserServers();
    }
});

// Function to load user's servers on profile page
async function loadUserServers() {
    try {
        const response = await fetch('/api/user');
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        
        // Check if user has guilds/servers
        if (!userData.guilds || !Array.isArray(userData.guilds) || userData.guilds.length === 0) {
            displayNoServersMessage();
            return;
        }
        
        // Display servers
        displayServers(userData.guilds);
        
    } catch (error) {
        console.error('Error loading servers:', error);
        displayErrorMessage('Failed to load your servers. Please try again later.');
    }
}

// Function to display error message in servers container
function displayErrorMessage(message) {
    const serversContainer = document.getElementById('servers-container');
    if (serversContainer) {
        serversContainer.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 20px;">
                <i class="fas fa-exclamation-triangle fa-3x" style="color: #f44336; margin-bottom: 15px;"></i>
                <p>${message}</p>
                <button onclick="loadUserServers()" style="margin-top: 15px; padding: 8px 16px; background-color: #5865F2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Function to display "no servers" message
function displayNoServersMessage() {
    const serversContainer = document.getElementById('servers-container');
    if (serversContainer) {
        serversContainer.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 20px;">
                <i class="fas fa-server fa-3x" style="color: #999; margin-bottom: 15px;"></i>
                <p>You don't have any Discord servers yet, or you haven't granted permission to view them.</p>
            </div>
        `;
    }
}

// Function to display servers
function displayServers(servers) {
    const serversContainer = document.getElementById('servers-container');
    if (!serversContainer) return;
    
    // Sort servers - put admin servers first, then sort alphabetically
    servers.sort((a, b) => {
        // Sort by admin status first
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
    });
    
    // Clear loading spinner
    serversContainer.innerHTML = '';
    
    // Add server cards
    servers.forEach(server => {
        const serverCard = document.createElement('div');
        serverCard.className = 'server-card';
        
        // Determine server icon URL
        let iconUrl = 'https://cdn.discordapp.com/embed/avatars/0.png'; // Default icon
        if (server.icon) {
            iconUrl = `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`;
        }
        
        // Create admin badge if user is admin
        const adminBadge = server.isAdmin ? 
            '<div class="admin-badge">Admin</div>' : '';
        
        // Create bot status badge
        const botStatusBadge = `
            <div class="bot-status ${server.botInServer ? 'bot-in-server' : 'bot-not-in-server'}">
                ${server.botInServer ? 'Bot Added' : 'Bot Not Added'}
            </div>
        `;
        
        // Create action button
        let actionButton;
        if (server.botInServer && server.isAdmin) {
            // Configure button for servers with bot and admin rights
            actionButton = `
                <div class="server-action">
                    <a href="/server/${server.id}/config" class="btn-server btn-configure">
                        <i class="fas fa-cog"></i> Configure
                    </a>
                </div>
            `;
        } else if (!server.botInServer && server.isAdmin) {
            // Invite button for servers without bot but with admin rights
            actionButton = `
                <div class="server-action">
                    <a href="${server.inviteUrl}" class="btn-server btn-invite">
                        <i class="fas fa-plus-circle"></i> Add Bot
                    </a>
                </div>
            `;
        } else {
            // No action button for servers where user is not admin
            actionButton = '';
        }
        
        // Set card HTML
        serverCard.innerHTML = `
            ${adminBadge}
            <img src="${iconUrl}" alt="${server.name}" class="server-icon">
            <h3>${server.name}</h3>
            ${botStatusBadge}
            ${actionButton}
        `;
        
        // Add click handler for the entire card (if actions are available)
        if (server.isAdmin) {
            serverCard.style.cursor = 'pointer';
            serverCard.addEventListener('click', (e) => {
                // Don't trigger if clicking on the action button itself
                if (e.target.closest('.server-action')) return;
                
                // Redirect to appropriate page
                if (server.botInServer) {
                    window.location.href = `/server/${server.id}/config`;
                } else {
                    window.location.href = server.inviteUrl;
                }
            });
        }
        
        serversContainer.appendChild(serverCard);
    });
}

function initializeMap() {
    if (mapInitialized) return;

    // Set initial zoom level based on device
    const isMobile = window.innerWidth <= 768;
    const initialZoom = isMobile ? 1 : 2;

    map = L.map('map').setView([0, 0], initialZoom);
    
    const openStreetMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'OpenStreetMap contributors'
    });
    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Esri'
    });
    const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Maps'
    });
    const googleSatellite = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: 'Google Maps'
    });
    // Add Yandex Satellite layer
    const yandexSatellite = L.tileLayer('https://sat0{s}.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}', {
        maxZoom: 19,
        subdomains: ['1', '2', '3', '4'],
        attribution: 'Yandex Maps'
    });
    const baseMaps = {
        "OpenStreetMap": openStreetMap,
        "Esri Satellite": esriSatellite,
        "Google Streets": googleStreets,
        "Google Satellite": googleSatellite,
        "Yandex Satellite": yandexSatellite
    };
    openStreetMap.addTo(map);
    L.control.layers(baseMaps).addTo(map);
    
    // Add "Know Your Location" control
    L.Control.LocateControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
            container.style.fontSize = '18px';
            container.style.padding = '7px';
            container.style.cursor = 'pointer';
            container.style.background = 'white';
            container.style.transition = 'transform 0.2s';
            container.title = 'Find my location';
            
            container.addEventListener('click', function() {
                if (navigator.geolocation) {
                    container.style.background = '#4CAF50';
                    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            
                            if (marker) {
                                map.removeLayer(marker);
                            }
                            
                            marker = L.marker([lat, lng])
                                .bindPopup(`
                                    <b>Your Current Location</b><br>
                                    Latitude: ${lat.toFixed(6)}<br>
                                    Longitude: ${lng.toFixed(6)}<br>
                                    <button class="street-view-btn" onclick="showStreetView(${lat}, ${lng})">Street View</button>
                                `)
                                .addTo(map);
                            map.setView([lat, lng], 15);
                            marker.openPopup();
                            
                            // Save to search history
                            saveSearchHistory(lat, lng, "My Current Location");
                            
                            // Reset button
                            container.style.background = 'white';
                            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
                            
                            showToast('Location found successfully!');
                        },
                        function(error) {
                            // Reset button
                            container.style.background = 'white';
                            container.innerHTML = '<i class="fas fa-location-arrow"></i>';
                            
                            let errorMessage = 'Unable to retrieve your location';
                            switch(error.code) {
                                case error.PERMISSION_DENIED:
                                    errorMessage = "Location access denied. Please allow location access.";
                                    break;
                                case error.POSITION_UNAVAILABLE:
                                    errorMessage = "Location information is unavailable.";
                                    break;
                                case error.TIMEOUT:
                                    errorMessage = "Location request timed out.";
                                    break;
                            }
                            showToast(errorMessage, 'error');
                        }
                    );
                } else {
                    showToast("Geolocation is not supported by this browser.", 'error');
                }
            });
            
            return container;
        }
    });
    
    new L.Control.LocateControl({ position: 'topleft' }).addTo(map);

    // Create custom Street View control
    L.Control.StreetViewControl = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.innerHTML = '🚶';
            container.style.fontSize = '24px';
            container.style.padding = '5px';
            container.style.cursor = 'pointer';
            container.style.background = 'white';
            container.style.transition = 'transform 0.2s';
            container.title = 'Street View - Click to toggle mode';

            let streetViewMode = false;
            
            // Toggle street view mode on click
            container.addEventListener('click', function(e) {
                streetViewMode = !streetViewMode;
                
                if (streetViewMode) {
                    // Enable street view mode
                    container.style.background = '#4CAF50';
                    container.style.color = 'white';
                    map.getContainer().style.cursor = 'crosshair';
                    
                    // Show toast notification
                    showToast('Street View mode enabled. Click anywhere on map to open Street View');
                } else {
                    // Disable street view mode
                    container.style.background = 'white';
                    container.style.color = 'black';
                    map.getContainer().style.cursor = '';
                    
                    // Show toast notification
                    showToast('Street View mode disabled');
                }
                
                e.preventDefault();
                e.stopPropagation();
            });

            return container;
        }
    });

    new L.Control.StreetViewControl({ position: 'topleft' }).addTo(map);

    // Add click event to map for Street View
    window.streetViewMarker = null; // Make it globally accessible
    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Remove existing street view marker if any
        if (window.streetViewMarker) {
            map.removeLayer(window.streetViewMarker);
        }
        
        // Add a marker at the clicked location
        window.streetViewMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                html: '📍',
                className: 'street-view-marker',
                iconSize: [30, 30]
            })
        }).addTo(map);
        
        // Add popup with Street View button
        streetViewMarker.bindPopup(`
            <strong>Selected Location</strong><br>
            ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
            <button class="street-view-btn" onclick="showStreetView(${lat}, ${lng})">Open Street View</button>
        `).openPopup();
    });

    // Create street view container
    streetViewContainer = document.createElement('div');
    streetViewContainer.id = 'street-view-container';
    streetViewContainer.style.display = 'none';
    streetViewContainer.style.position = 'fixed';
    streetViewContainer.style.top = '0';
    streetViewContainer.style.left = '0';
    streetViewContainer.style.width = '100%';
    streetViewContainer.style.height = '100%';
    streetViewContainer.style.zIndex = '9999';
    streetViewContainer.style.overflowY = 'auto';
    streetViewContainer.style.transition = 'opacity 0.3s ease';
    streetViewContainer.style.background = '#000'; // Allow scrolling on mobile


    // Create street view element
    const streetViewElement = document.createElement('div');
    streetViewElement.id = 'street-view';
    streetViewElement.style.width = '100%';
    streetViewElement.style.height = '100%';

    streetViewContainer.appendChild(streetViewElement);
    document.body.appendChild(streetViewContainer);

    mapInitialized = true;
    window.mapInitialized = true;
}

function showStreetView(lat, lng) {
    // Get Street View container and make it visible with fade effect
    const streetViewContainer = document.getElementById('street-view-container');
    
    // Create the container if it doesn't exist
    if (!streetViewContainer) {
        streetViewContainer = document.createElement('div');
        streetViewContainer.id = 'street-view-container';
        streetViewContainer.style.position = 'fixed';
        streetViewContainer.style.top = '0';
        streetViewContainer.style.left = '0';
        streetViewContainer.style.width = '100%';
        streetViewContainer.style.height = '100%';
        streetViewContainer.style.zIndex = '9999';
        streetViewContainer.style.background = '#000';
        streetViewContainer.style.overflowY = 'auto';
        streetViewContainer.style.transition = 'opacity 0.3s ease';
        
        // Create street view element
        const streetViewElement = document.createElement('div');
        streetViewElement.id = 'street-view';
        streetViewElement.style.width = '100%';
        streetViewElement.style.height = '100%';
        
        streetViewContainer.appendChild(streetViewElement);
        document.body.appendChild(streetViewContainer);
    }
    
    streetViewContainer.style.display = 'block';
    streetViewContainer.style.opacity = '0';

    // Create exit button if it doesn't exist
    let exitButton = streetViewContainer.querySelector('.exit-street-view');
    if (!exitButton) {
        exitButton = document.createElement('button');
        exitButton.className = 'exit-street-view';
        exitButton.innerHTML = '✕ Exit';
        exitButton.onclick = () => {
            streetViewContainer.style.opacity = '0';
            setTimeout(() => {
                streetViewContainer.style.display = 'none';
                
                // Remove street view marker if exists
                if (window.streetViewMarker) {
                    map.removeLayer(window.streetViewMarker);
                    window.streetViewMarker = null;
                }
            }, 300);
        };
        streetViewContainer.appendChild(exitButton);
    }

    setTimeout(() => {
        streetViewContainer.style.opacity = '1';
    }, 10);

    const streetViewElement = document.getElementById('street-view');

    // Adjust layout based on device
    const isMobile = window.innerWidth <= 768;
    const padding = isMobile ? "10px" : "20px";
    const titleSize = isMobile ? "h3" : "h2";

    // Create an embedded Google Street View with the coordinates
    streetViewElement.innerHTML = `
        <div style="height: 100%; position: relative;">
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0" 
                src="https://www.google.com/maps/embed/v1/streetview?key=AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao&location=${lat},${lng}&heading=210&pitch=10&fov=90" 
                style="border: none; position: absolute; top: 0; left: 0;"
            ></iframe>
            <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; color: white; font-size: 12px;">
                Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
        </div>
    `;
}

// Handle client-side routing
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Hide all pages first
    document.getElementById('home').style.display = 'none';
    document.getElementById('locationSearch').style.display = 'none';
    document.getElementById('info').style.display = 'none';

    // Show the appropriate page based on URL
    if (path === '/' || path === '') {
        document.getElementById('home').style.display = 'block';
        history.replaceState(null, null, '/');
    } else if (path === '/location-search') {
        document.getElementById('locationSearch').style.display = 'block';
        // Initialize map if we're on the location page
        if (!window.mapInitialized) {
            setTimeout(initializeMap, 100);
        }
    } else if (path === '/info') {
        document.getElementById('info').style.display = 'block';
    } else if (path === '/status') {
        // Status page is handled separately with its own HTML file
    }
});

// Improved page navigation with history API
// Function to fetch and update status data
async function fetchStatusData() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        // Update last updated time
        const lastUpdated = new Date(data.lastUpdated);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('last-updated').textContent = lastUpdated.toLocaleDateString('en-US', options);

        // Update server stats with real Discord data
        const serverStatsElem = document.getElementById('server-stats');
        if (serverStatsElem) {
            serverStatsElem.innerHTML = `${data.servers.toLocaleString()}+ Discord Servers`;
        }

        const userStatsElem = document.getElementById('user-stats');
        if (userStatsElem) {
            userStatsElem.innerHTML = `${data.users.toLocaleString()}+ Discord Users`;
        }

        const commandStatsElem = document.getElementById('command-stats');
        if (commandStatsElem) {
            commandStatsElem.innerHTML = `${data.commandsUsed}+ Searches`;
        }
    } catch (error) {
        console.error('Error fetching status data:', error);
    }
}


// Set up event listeners for menu links
document.addEventListener('DOMContentLoaded', function() {
    const menuLinks = document.querySelectorAll('.nav-links li a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Close menu when a link is clicked
            const navLinks = document.getElementById('mobile-nav');
            if (navLinks.classList.contains('active')) {
                toggleMobileMenu();
            }
        });
    });

    // Set up mobile menu toggle buttons
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    const closeMenuBtn = document.getElementById('close-menu-btn');
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', toggleMobileMenu);
    }
});

function showPage(pageId) {
    // Hide all pages
    document.getElementById('home').style.display = 'none';
    document.getElementById('locationSearch').style.display = 'none';
    document.getElementById('info').style.display = 'none';
    document.getElementById('status').style.display = 'none';

    // Show the requested page
    document.getElementById(pageId).style.display = 'block';

    // Update active menu item
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Set active class on current page link
    let currentPath = '';
    if (pageId === 'locationSearch') {
        currentPath = '/location-search';
    } else if (pageId === 'info') {
        currentPath = '/info';
    } else if (pageId === 'status') {
        currentPath = '/status';
    } else {
        currentPath = '/';
    }
    
    const activeLink = document.querySelector(`.nav-links a[href="${currentPath}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Update URL and history
    history.pushState(null, null, currentPath);

    // Fetch real-time stats when showing status page
    if (pageId === 'status') {
        fetchStatusData();
    }

    // Initialize map if needed
    if (pageId === 'locationSearch' && !window.mapInitialized) {
        setTimeout(initializeMap, 100);
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', function() {
    const path = window.location.pathname;

    if (path === '/' || path === '') {
        showPage('home');
    } else if (path === '/location-search') {
        showPage('locationSearch');
    } else if (path === '/info') {
        showPage('info');
    } else if (path === '/status') {
        showPage('status');
    }
});


async function searchLocation() {
    const location = document.getElementById('searchInput').value;
    if (!location.trim()) {
        alert('Please enter a location to search');
        return;
    }

    try {
        const response = await fetch(`/search?q=${encodeURIComponent(location)}`);
        const data = await response.json();

        const lat = parseFloat(data.lat);
        const lon = parseFloat(data.lon);

        if (marker) {
            map.removeLayer(marker);
        }

        marker = L.marker([lat, lon])
            .bindPopup(`
                <b>${data.display_name}</b><br>
                Latitude: ${lat}<br>
                Longitude: ${lon}<br>
                <button class="street-view-btn" onclick="showStreetView(${lat}, ${lon})">Street View</button>
            `)
            .addTo(map);
        map.setView([lat, lon], 12);
        marker.openPopup();

        // Save to search history
        saveSearchHistory(lat, lon, data.display_name);
    } catch (error) {
        console.error('Error finding location:', error);
        alert('Error finding location. Please try a different search term.');
    }
}

// Function to save search history
function saveSearchHistory(lat, lng, displayName) {
    // Get the latest history from localStorage
    let currentHistory = JSON.parse(localStorage.getItem('locationSearchHistory') || '[]');

    // Create history entry
    const historyEntry = {
        lat: lat,
        lng: lng,
        displayName: displayName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        timestamp: new Date().toISOString()
    };

    // Add to history array (at the beginning)
    currentHistory.unshift(historyEntry);

    // Limit history to 20 items
    if (currentHistory.length > 20) {
        currentHistory = currentHistory.slice(0, 20);
    }

    // Save to localStorage
    localStorage.setItem('locationSearchHistory', JSON.stringify(currentHistory));

    // If user is logged in, also send to server
    const isLoggedIn = document.querySelector('a[href="/profile"]') !== null;
    if (isLoggedIn) {
        fetch('/api/save-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat,
                lng,
                displayName: displayName || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            })
        }).catch(error => {
            console.error('Error saving search to server:', error);
        });
    }

    // Update display if container exists
    if (document.getElementById('search-history-container')) {
        updateSearchHistoryDisplay();
    }
}

// Function to update the search history display
function updateSearchHistoryDisplay() {
    // Refresh search history from localStorage
    searchHistory = JSON.parse(localStorage.getItem('locationSearchHistory') || '[]');
    const historyContainer = document.getElementById('search-history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';

    if (searchHistory.length === 0) {
        historyContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #777;">No search history yet.</p>';
        return;
    }

    // Create history items
    searchHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.style.display = 'flex';
        historyItem.style.justifyContent = 'space-between';
        historyItem.style.alignItems = 'center';
        historyItem.style.padding = '10px 15px';
        historyItem.style.borderBottom = '1px solid #eee';
        historyItem.style.cursor = 'pointer';
        historyItem.style.transition = 'background-color 0.3s';

        // Hover effects
        historyItem.onmouseover = () => {
            historyItem.style.backgroundColor = '#f5f5f5';
        };
        historyItem.onmouseout = () => {
            historyItem.style.backgroundColor = 'transparent';
        };

        // Format date
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleString();

        // Location info part
        const locationInfo = document.createElement('div');
        locationInfo.style.flex = '1';
        locationInfo.style.overflow = 'hidden';

        // Make clicking on the info set the input and go to that location
        locationInfo.onclick = () => {
            document.getElementById('searchInput').value = `${item.lat}, ${item.lng}`;
            if (marker) {
                map.removeLayer(marker);
            }
            marker = L.marker([item.lat, item.lng])
                .bindPopup(`
                    <b>Saved Location</b><br>
                    Latitude: ${item.lat}<br>
                    Longitude: ${item.lng}<br>
                    <button class="street-view-btn" onclick="showStreetView(${item.lat}, ${item.lng})">Street View</button>
                `)
                .addTo(map);
            map.setView([item.lat, item.lng], 12);
            marker.openPopup();
            toggleSearchHistory();
        };

        locationInfo.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}
            </div>
            <div style="font-size: 0.8em; color: #777;">${formattedDate}</div>
        `;

        // Action buttons
        const actionButtons = document.createElement('div');
        actionButtons.style.display = 'flex';
        actionButtons.style.gap = '5px';

        // Street View button
        const streetViewBtn = document.createElement('button');
        streetViewBtn.innerHTML = '🚶';
        streetViewBtn.title = 'Open in Street View';
        streetViewBtn.style.padding = '5px 10px';
        streetViewBtn.style.border = 'none';
        streetViewBtn.style.borderRadius = '4px';
        streetViewBtn.style.background = '#4CAF50';
        streetViewBtn.style.color = 'white';
        streetViewBtn.style.cursor = 'pointer';
        streetViewBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering the parent click
            showStreetView(item.lat, item.lng);
            toggleSearchHistory();
        };

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Remove from history';
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.background = '#f44336';
        deleteBtn.style.color = 'white';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering the parent click
            // Remove this item from history
            searchHistory.splice(index, 1);
            localStorage.setItem('locationSearchHistory', JSON.stringify(searchHistory));
            updateSearchHistoryDisplay();
        };

        actionButtons.appendChild(streetViewBtn);
        actionButtons.appendChild(deleteBtn);

        historyItem.appendChild(locationInfo);
        historyItem.appendChild(actionButtons);

        historyContainer.appendChild(historyItem);
    });
}

// Function to clear all search history
function clearSearchHistory() {
    localStorage.removeItem('locationSearchHistory');
    updateSearchHistoryDisplay();
}

// Function to toggle search history panel
function toggleSearchHistory() {
    let historyPanel = document.getElementById('search-history-panel');
    const mapElement = document.getElementById('map');

    if (!historyPanel) {
        // Create the history panel
        historyPanel = document.createElement('div');
        historyPanel.id = 'search-history-panel';
        historyPanel.style.position = 'absolute';
        historyPanel.style.top = '80px';
        historyPanel.style.left = '0';
        historyPanel.style.right = '0';
        historyPanel.style.padding = '15px';
        historyPanel.style.zIndex = '10';
        historyPanel.style.overflow = 'auto';

        // Add header with close and clear buttons
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '15px';

        const title = document.createElement('h3');
        title.innerText = 'Search History';
        title.style.margin = '0';
        title.style.color = 'white';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';

        const clearBtn = document.createElement('button');
        clearBtn.innerText = 'Clear All';
        clearBtn.style.padding = '5px 10px';
        clearBtn.style.background = '#f44336';
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '4px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.onclick = clearSearchHistory;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.padding = '5px 10px';
        closeBtn.style.background = '#555';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = function() {
            historyPanel.style.display = 'none';
            
            // Re-enable map
            if (mapElement) {
                mapElement.style.pointerEvents = 'auto';
                mapElement.style.opacity = '1';
                showToast('Map re-enabled');
            }
        };

        buttonContainer.appendChild(clearBtn);
        buttonContainer.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(buttonContainer);

        // Create container for history items
        const historyContainer = document.createElement('div');
        historyContainer.id = 'search-history-container';
        historyContainer.style.maxHeight = '300px';
        historyContainer.style.overflow = 'auto';

        historyPanel.appendChild(header);
        historyPanel.appendChild(historyContainer);

        // Add to the search container
        const searchContainer = document.querySelector('.search-container');
        searchContainer.appendChild(historyPanel);

        // Update the display
        updateSearchHistoryDisplay();
        
        // Disable map temporarily
        if (mapElement) {
            mapElement.style.pointerEvents = 'none';
            mapElement.style.opacity = '0.7';
            showToast('Map disabled while viewing history');
        }
    } else {
        // Toggle visibility
        if (historyPanel.style.display === 'none' || !historyPanel.style.display) {
            historyPanel.style.display = 'block';
            updateSearchHistoryDisplay();
            
            // Disable map
            if (mapElement) {
                mapElement.style.pointerEvents = 'none';
                mapElement.style.opacity = '0.7';
                showToast('Map disabled while viewing history');
            }
        } else {
            historyPanel.style.display = 'none';
            
            // Re-enable map
            if (mapElement) {
                mapElement.style.pointerEvents = 'auto';
                mapElement.style.opacity = '1';
                showToast('Map re-enabled');
            }
        }
    }
}

// Add history button to search container
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('locationSearch')) {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            const historyButton = document.createElement('button');
            historyButton.innerHTML = '<i class="fas fa-history"></i> History';
            historyButton.style.backgroundColor = '#4CAF50';
            historyButton.onclick = toggleSearchHistory;

            // Add after search button
            const searchButton = searchContainer.querySelector('button');
            if (searchButton) {
                searchContainer.insertBefore(historyButton, searchButton.nextSibling);
            } else {
                searchContainer.appendChild(historyButton);
            }
        }
    }
});