// API ENDPOINTS CONFIGURATION
const AUTH_API_URL = "http://127.0.0.1:8000";
const WEATHER_API_URL = "http://127.0.0.1:8002";

let map;
let isTilted = false;

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initMap();
    initCharts();
    checkAuthStatus();
});

// 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
function checkAuthStatus() {
    const token = localStorage.getItem("token");
    const modal = document.getElementById("authModal");
    const navPlan = document.getElementById("nav-plan");

    if (!token) {
        modal.classList.remove("hidden");
        document.getElementById("userEmail").innerText = "Not Logged In";
        document.getElementById("userRole").innerText = "GUEST";
        if (navPlan) navPlan.classList.add("hidden");
    } else {
        modal.classList.add("hidden");
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const role = payload.role || "VIEWER";

            document.getElementById("userEmail").innerText = payload.sub || "Connected";
            document.getElementById("userRole").innerText = role;

            // Show AI Response Plan Tab only to EMERGENCY_OFFICER
            if (role === "EMERGENCY_OFFICER") {
                if (navPlan) navPlan.classList.remove("hidden");
            } else {
                if (navPlan) navPlan.classList.add("hidden");
            }
        } catch (e) {
            logout();
        }
    }
}

// 2. TACTICAL MAP INITIALIZATION & WEATHER INTEGRATION
function initMap() {
    // Center on India (Default Coordinates)
    map = L.map('map').setView([20.5937, 78.9629], 6);

    // High Resolution Colorful OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Central Command Marker
    L.marker([20.5937, 78.9629]).addTo(map)
        .bindPopup("<b>Central Command Station</b><br>GIS Operations Center.")
        .openPopup();

    // Critical Flood Risk Zone Polygon Highlight
    const floodZoneCoordinates = [
        [21.1458, 79.0882], // Nagpur
        [20.9320, 77.7523], // Amravati
        [19.8762, 75.3433], // Chhatrapati Sambhajinagar
        [19.9975, 79.2961]  // Chandrapur
    ];

    L.polygon(floodZoneCoordinates, {
        color: '#ef4444',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 0.35
    }).addTo(map).bindPopup("<b>CRITICAL ZONE B4</b><br>Monitored Flood Hazard Area.");

    // MAP CLICK EVENT -> MODULE 3 WEATHER API CALL
    map.on('click', async (e) => {
        const lat = e.latlng.lat.toFixed(4);
        const lon = e.latlng.lng.toFixed(4);

        document.getElementById("clickedCoords").innerText = `${lat}, ${lon}`;

        // Initial Loading Popup
        const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div class="font-sans text-xs p-1">
                    <b class="text-slate-800">Target Coordinates:</b> ${lat}, ${lon}<br>
                    <span class="text-blue-600 font-semibold animate-pulse">Connecting to Weather Service (Port 8002)...</span>
                </div>
            `)
            .openOn(map);

        // Fetch Live Weather from Module 3 Microservice
        try {
            const res = await fetch(`${WEATHER_API_URL}/weather/current?lat=${lat}&lon=${lon}`);
            const data = await res.json();

            if (res.ok) {
                const isCritical = data.risk_level === 'CRITICAL';
                const isModerate = data.risk_level === 'MODERATE';
                
                const badgeColor = isCritical 
                    ? 'bg-red-600 text-white' 
                    : (isModerate ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white');

                popup.setContent(`
                    <div class="font-sans text-xs space-y-1.5 p-1 min-w-[180px]">
                        <div class="font-bold text-slate-900 border-b pb-1 flex justify-between items-center">
                            <span>Weather Report</span>
                            <span class="px-2 py-0.5 text-[9px] rounded font-mono font-bold ${badgeColor}">${data.risk_level}</span>
                        </div>
                        <div class="text-slate-700"><b>Temperature:</b> ${data.temperature_c}°C</div>
                        <div class="text-slate-700"><b>Humidity:</b> ${data.humidity_percent}%</div>
                        <div class="text-slate-700"><b>Rainfall:</b> ${data.precipitation_mm} mm</div>
                        <div class="text-slate-700"><b>Wind Speed:</b> ${data.wind_speed_kmh} km/h</div>
                        <div class="text-[10px] text-slate-400 font-mono border-t pt-1">Timestamp: ${data.timestamp || 'Live'}</div>
                    </div>
                `);
            } else {
                popup.setContent(`<div class="font-sans text-xs text-red-600 font-bold">Error: Weather data unavailable.</div>`);
            }
        } catch (err) {
            popup.setContent(`
                <div class="font-sans text-xs text-red-600 font-bold">
                    Weather Service Offline!
                    <br><span class="text-[10px] text-slate-500 font-normal">Start Module 3 backend on Port 8002</span>
                </div>
            `);
        }
    });
}

// 3. 3D MAP TILT PERSPECTIVE
function toggleMapTilt() {
    const mapEl = document.getElementById("map");
    if (!isTilted) {
        mapEl.style.transform = "rotateX(25deg) scale(0.98)";
        isTilted = true;
    } else {
        mapEl.style.transform = "rotateX(0deg) scale(1)";
        isTilted = false;
    }
}

// 4. HISTORICAL WEATHER ANALYTICS CHART (MODULE 3 ARCHIVE INTEGRATION)
async function loadHistoricalWeatherChart(lat = 20.5937, lon = 78.9629) {
    try {
        const res = await fetch(`${WEATHER_API_URL}/weather/historical?lat=${lat}&lon=${lon}`);
        const data = await res.json();

        if (res.ok) {
            const labels = data.history.map(item => item.date);
            const rainfallData = data.history.map(item => item.total_rainfall_mm);

            const ctx = document.getElementById('disasterChart')?.getContext('2d');
            if (ctx) {
                if (window.historicalChart) window.historicalChart.destroy();

                window.historicalChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Daily Rainfall (mm)',
                            data: rainfallData,
                            backgroundColor: '#3b82f6',
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { labels: { color: '#cbd5e1' } },
                            title: { display: true, text: `Historical Rain Analysis (${data.start_date} to ${data.end_date})`, color: '#fff' }
                        },
                        scales: {
                            x: { ticks: { color: '#94a3b8' } },
                            y: { ticks: { color: '#94a3b8' } }
                        }
                    }
                });
            }
        }
    } catch (err) {
        console.error("Failed to fetch historical weather data", err);
    }
}

// 5. INITIALIZE STATIC & DYNAMIC CHARTS
function initCharts() {
    const ctxMini = document.getElementById('miniTrendChart')?.getContext('2d');
    if (ctxMini) {
        new Chart(ctxMini, {
            type: 'line',
            data: {
                labels: ['12:00', '13:00', '14:00', '15:00', '16:00'],
                datasets: [{
                    data: [12, 19, 8, 15, 22],
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
    }

    const ctxIngestion = document.getElementById('ingestionChart')?.getContext('2d');
    if (ctxIngestion) {
        new Chart(ctxIngestion, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{
                    label: 'Satellite Data Volume (GB)',
                    data: [120, 190, 300, 250, 420, 510],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, plugins: { legend: { labels: { color: '#cbd5e1' } } } }
        });
    }
}

// 6. NAVIGATION SWITCHER
function switchView(viewName) {
    document.querySelectorAll(".view-content").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("bg-gradient-to-r", "from-blue-600", "to-blue-700", "text-white", "shadow-lg", "shadow-blue-600/30");
        btn.classList.add("text-slate-400");
    });

    document.getElementById(`view-${viewName}`).classList.remove("hidden");
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) {
        activeNav.classList.add("bg-gradient-to-r", "from-blue-600", "to-blue-700", "text-white", "shadow-lg", "shadow-blue-600/30");
        activeNav.classList.remove("text-slate-400");
    }

    if (viewName === 'overview' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }

    // Auto load historical weather graph when visiting Analytics tab
    if (viewName === 'analytics') {
        loadHistoricalWeatherChart();
    }
}

// 7. AUTH FORM HANDLERS
function toggleAuthTab(type) {
    const formLogin = document.getElementById("formLogin");
    const formRegister = document.getElementById("formRegister");
    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");

    if (type === 'login') {
        formLogin.classList.remove("hidden");
        formRegister.classList.add("hidden");
        tabLogin.className = "w-1/2 py-2.5 font-semibold text-blue-400 border-b-2 border-blue-500";
        tabRegister.className = "w-1/2 py-2.5 font-semibold text-slate-400 border-b-2 border-transparent";
    } else {
        formRegister.classList.remove("hidden");
        formLogin.classList.add("hidden");
        tabRegister.className = "w-1/2 py-2.5 font-semibold text-emerald-400 border-b-2 border-emerald-500";
        tabLogin.className = "w-1/2 py-2.5 font-semibold text-slate-400 border-b-2 border-transparent";
    }
}

async function submitLogin(e) {
    e.preventDefault();
    const formData = new URLSearchParams();
    formData.append("username", document.getElementById("loginEmail").value);
    formData.append("password", document.getElementById("loginPassword").value);

    try {
        const res = await fetch(`${AUTH_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem("token", data.access_token);
            checkAuthStatus();
        } else {
            showAuthAlert(data.detail || "Login failed", true);
        }
    } catch (err) {
        showAuthAlert("Auth Service Offline (Port 8000)!", true);
    }
}

async function submitRegister(e) {
    e.preventDefault();
    const data = {
        full_name: document.getElementById("regName").value,
        email: document.getElementById("regEmail").value,
        password: document.getElementById("regPassword").value,
        role: document.getElementById("regRole").value
    };

    try {
        const res = await fetch(`${AUTH_API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok) {
            showAuthAlert("Account created! Please Login now.", false);
            toggleAuthTab('login');
        } else {
            showAuthAlert(result.detail || "Registration failed", true);
        }
    } catch (err) {
        showAuthAlert("Auth Service Offline (Port 8000)!", true);
    }
}

function showAuthAlert(msg, isError) {
    const alertBox = document.getElementById("authAlert");
    alertBox.classList.remove("hidden", "bg-red-500/20", "text-red-300", "bg-emerald-500/20", "text-emerald-300");
    alertBox.classList.add(isError ? "bg-red-500/20" : "bg-emerald-500/20", isError ? "text-red-300" : "text-emerald-300", "border");
    alertBox.innerText = msg;
}

// 8. OFFICER AI PLANNER INTERACTION
let isEditing = false;
function toggleEditPlan() {
    const planBox = document.getElementById("aiPlanContent");
    const btnText = document.getElementById("btnEditText");
    
    if (!isEditing) {
        planBox.contentEditable = "true";
        planBox.focus();
        planBox.classList.add("border-blue-500", "ring-2", "ring-blue-500/20");
        btnText.innerText = "Save Changes";
        isEditing = true;
    } else {
        planBox.contentEditable = "false";
        planBox.classList.remove("border-blue-500", "ring-2", "ring-blue-500/20");
        btnText.innerText = "Edit Plan";
        isEditing = false;

        document.getElementById("planStatusText").innerText = "PLAN EDITED & SAVED";
    }
}

function executePlan() {
    const statusBadge = document.getElementById("planStatusBadge");
    const statusText = document.getElementById("planStatusText");

    statusBadge.className = "px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono flex items-center space-x-2";
    statusText.innerText = "EXECUTING DISPATCH & BROADCAST...";

    alert("🚨 ACTION EXECUTED!\n1. Emergency SMS Alerts Broadcasted.\n2. Rescue Units Dispatched.");
}

function cancelPlan() {
    const statusBadge = document.getElementById("planStatusBadge");
    const statusText = document.getElementById("planStatusText");

    statusBadge.className = "px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-xs font-mono flex items-center space-x-2";
    statusText.innerText = "PLAN CANCELLED";

    alert("❌ Plan cancelled by Officer.");
}

function logout() {
    localStorage.removeItem("token");
    checkAuthStatus();
}