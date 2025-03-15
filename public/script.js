
let map;
let marker;
let mapInitialized = false;
let panorama;
let streetViewContainer;
let locationiqApiKey;

// Fetch the LocationIQ API key
fetch('/api/config')
  .then(response => response.json())
  .then(data => {
    locationiqApiKey = data.locationiqKey;
  })
  .catch(error => {
    console.error('Failed to fetch API key:', error);
  });

function initializeMap() {
    if (mapInitialized) return;
    
    // Set initial zoom level based on device
    const isMobile = window.innerWidth <= 768;
    const initialZoom = isMobile ? 1 : 2;
    
    map = L.map('map').setView([0, 0], initialZoom);
    const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Location Map (OpenStreetMap contributors)'
    });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Esri'
    });
    const baseMaps = {
        "Streets": streets,
        "Satellite": satellite
    };
    streets.addTo(map);
    L.control.layers(baseMaps).addTo(map);
    
    // Add click event to map for placing markers
    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        if (marker) {
            map.removeLayer(marker);
        }
        
        marker = L.marker([lat, lng])
            .bindPopup(`
                <b>Selected Location</b><br>
                Latitude: ${lat}<br>
                Longitude: ${lng}<br>
                <button class="street-view-btn" onclick="showStreetView(${lat}, ${lng})">Street View</button>
            `)
            .addTo(map);
        marker.openPopup();
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
    streetViewContainer.style.overflowY = 'auto'; // Allow scrolling on mobile
    
    // Create exit button
    const exitButton = document.createElement('button');
    exitButton.textContent = 'Exit Street View';
    exitButton.className = 'exit-street-view';
    exitButton.onclick = closeStreetView;
    
    // Create street view element
    const streetViewElement = document.createElement('div');
    streetViewElement.id = 'street-view';
    streetViewElement.style.width = '100%';
    streetViewElement.style.height = '100%';
    
    streetViewContainer.appendChild(exitButton);
    streetViewContainer.appendChild(streetViewElement);
    document.body.appendChild(streetViewContainer);
    
    mapInitialized = true;
    window.mapInitialized = true;
}

function showStreetView(lat, lng) {
    // Get Street View container and make it visible
    const streetViewContainer = document.getElementById('street-view-container');
    streetViewContainer.style.display = 'block';
    
    const streetViewElement = document.getElementById('street-view');
    
    // Adjust layout based on device
    const isMobile = window.innerWidth <= 768;
    const padding = isMobile ? "10px" : "20px";
    const titleSize = isMobile ? "h3" : "h2";
    
    // Create an embedded Google Street View with the coordinates
    streetViewElement.innerHTML = `
        <div style="text-align: center; padding: ${padding}; height: 100%; box-sizing: border-box;">
            <${titleSize}>Street View</${titleSize}>
            <p style="font-size: ${isMobile ? '12px' : '14px'}">Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            <div style="height: calc(100% - ${isMobile ? '100px' : '120px'}); width: 100%; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    scrolling="no" 
                    marginheight="0" 
                    marginwidth="0" 
                    src="https://www.google.com/maps/embed/v1/streetview?key=AIzaSyAOVYRIgupAurZup5y1PRh8Ismb1A3lLao&location=${lat},${lng}&heading=210&pitch=10&fov=90" 
                    style="border: none;"
                ></iframe>
            </div>
            <div style="margin-top: 10px;">
                <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" target="_blank" class="support-button">
                    Open Full Street View
                </a>
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

function toggleMobileMenu() {
    const navLinks = document.getElementById('mobile-nav');
    navLinks.classList.toggle('active');
    
    // Add/remove overlay
    let overlay = document.querySelector('.overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.onclick = toggleMobileMenu;
        document.body.appendChild(overlay);
    }
    
    if (navLinks.classList.contains('active')) {
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    } else {
        overlay.style.display = 'none';
        document.body.style.overflow = ''; // Allow scrolling
        
        // Reset right position to ensure it's completely off-screen when closed
        navLinks.style.right = '-100%';
        setTimeout(() => {
            // Reset the inline styles after animation completes
            navLinks.style.right = '';
        }, 300);
    }
}

// Close mobile menu when clicking on menu items
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
});

function showPage(pageId) {
    // Hide all pages
    document.getElementById('home').style.display = 'none';
    document.getElementById('locationSearch').style.display = 'none';
    document.getElementById('info').style.display = 'none';
    document.getElementById('status').style.display = 'none';
    
    // Show the requested page
    document.getElementById(pageId).style.display = 'block';
    
    // Update URL and history
    let path = '/';
    if (pageId === 'locationSearch') {
        path = '/location-search';
    } else if (pageId === 'info') {
        path = '/info';
    } else if (pageId === 'status') {
        path = '/status';
        
        // Fetch real-time stats when showing status page
        fetchStatusData();
    }
    
    history.pushState(null, null, path);
    
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

function closeStreetView() {
    const streetViewContainer = document.getElementById('street-view-container');
    streetViewContainer.style.display = 'none';
}

async function searchLocation() {
    const location = document.getElementById('searchInput').value;
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
    } catch (error) {
        alert('Error finding location');
    }
}