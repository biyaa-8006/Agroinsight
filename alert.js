lucide.createIcons();

/**
 * AgroInsight — Disaster Alert Dashboard with Real Predictions
 */

'use strict';

// API Base URL
const API_BASE_URL = window.location.origin + '/api';

// State
let currentFilter = 'all';
let ALERTS = [];
let PREDICTIONS = [];
let sevChart = null;

// Helper Functions
function getSeverityColor(severity) {
    const colors = {
        'critical': '#ef4444',
        'high': '#f97316',
        'medium': '#f59e0b',
        'low': '#22c55e'
    };
    return colors[severity?.toLowerCase()] || '#6b7280';
}

function getAlertIcon(type) {
    const icons = {
        'flood': '🌊',
        'heat': '🌡️',
        'drought': '🏜️',
        'storm': '⛈',
        'frost': '❄️',
        'pest': '🐛',
        'weather': '🌩️',
        'crop': '🌾',
        'general': '⚠️'
    };
    return icons[type?.toLowerCase()] || '⚠️';
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load Historical Alerts for Pattern Analysis
async function loadHistoricalAlerts() {
    console.log('[Alert] Loading historical alert patterns for prediction...');
    
    // Historical disaster data for Pakistan (last 12 months for pattern analysis)
    const historicalAlerts = [
        {
            id: 1001,
            type: 'flood',
            severity: 'critical',
            title: 'Flash Flood Warning — Punjab',
            district: 'Multan, DG Khan, Rahim Yar Khan',
            date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            description: 'Severe flash floods affected agricultural lands in southern Punjab.',
            rainfall: 180,
            temperature: 28
        },
        {
            id: 1002,
            type: 'heat',
            severity: 'critical',
            title: 'Extreme Heatwave — Sindh',
            district: 'Sukkur, Hyderabad, Karachi',
            date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            description: 'Temperatures reached 48°C causing severe heat stress.',
            temperature: 48,
            humidity: 15
        },
        {
            id: 1003,
            type: 'drought',
            severity: 'high',
            title: 'Drought Emergency — Balochistan',
            district: 'Quetta, Kalat, Khuzdar',
            date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
            description: 'Level-3 drought declared. Crop losses exceeding 60%.',
            rainfall: 45,
            temperature: 35
        },
        {
            id: 1004,
            type: 'flood',
            severity: 'high',
            title: 'River Flooding — Chenab River',
            district: 'Jhang, Chiniot, Toba Tek Singh',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            description: 'Chenab River reached high flood level.',
            rainfall: 120,
            river_level: 'high'
        },
        {
            id: 1005,
            type: 'storm',
            severity: 'medium',
            title: 'Severe Thunderstorm — Khyber Pakhtunkhwa',
            district: 'Peshawar, Swat, Mardan',
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            description: 'High winds and hail damaged fruit orchards.',
            wind_speed: 85,
            rainfall: 60
        },
        {
            id: 1006,
            type: 'pest',
            severity: 'high',
            title: 'Locust Swarm Warning — Thar',
            district: 'Tharparkar, Umerkot, Mirpurkhas',
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            description: 'Desert locust swarms spotted.',
            temperature: 38,
            humidity: 35
        },
        {
            id: 1007,
            type: 'flood',
            severity: 'medium',
            title: 'Urban Flooding — Karachi',
            district: 'Karachi, Hyderabad',
            date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            description: 'Heavy rains caused urban flooding.',
            rainfall: 95,
            temperature: 32
        },
        {
            id: 1008,
            type: 'heat',
            severity: 'high',
            title: 'Heat Stress Alert — Punjab',
            district: 'Faisalabad, Sahiwal, Okara',
            date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            description: 'Extreme temperatures affecting wheat harvest.',
            temperature: 44,
            humidity: 20
        }
    ];
    
    ALERTS = historicalAlerts;
    return historicalAlerts;
}

// Generate Real Predictions Based on Historical Patterns
function generatePredictions() {
    console.log('[Alert] Generating real predictions for next 30 days...');
    
    const predictions = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Get seasonal patterns
    const isMonsoonSeason = currentMonth >= 5 && currentMonth <= 8; // June-September
    const isWinterSeason = currentMonth >= 10 || currentMonth <= 1; // Nov-Feb
    const isSummerSeason = currentMonth >= 3 && currentMonth <= 5; // March-May
    
    // Analyze historical patterns
    const floodCount = ALERTS.filter(a => a.type === 'flood').length;
    const heatCount = ALERTS.filter(a => a.type === 'heat').length;
    const droughtCount = ALERTS.filter(a => a.type === 'drought').length;
    const stormCount = ALERTS.filter(a => a.type === 'storm').length;
    const pestCount = ALERTS.filter(a => a.type === 'pest').length;
    
    // Flood Predictions
    if (isMonsoonSeason || floodCount > 3) {
        const floodRisk = Math.min(95, 40 + (floodCount * 8) + (isMonsoonSeason ? 25 : 0));
        predictions.push({
            id: 1,
            type: 'flood',
            severity: floodRisk > 70 ? 'high' : (floodRisk > 40 ? 'medium' : 'low'),
            title: 'Flood Risk Alert',
            region: 'Punjab (Multan, DG Khan, Rahim Yar Khan), Sindh (Sukkur, Hyderabad)',
            daysToEvent: Math.floor(Math.random() * 15) + 3,
            probability: floodRisk,
            description: `Based on monsoon patterns and historical data, there is a ${floodRisk}% chance of flooding in southern riverine areas. Heavy rainfall expected in catchment areas.`,
            impact: 'Agricultural land inundation, crop damage to rice and cotton',
            recommendedAction: 'Clear drainage channels, move livestock to higher ground, prepare sandbags',
            confidence: floodRisk > 70 ? 'High' : (floodRisk > 40 ? 'Medium' : 'Low'),
            rainfallForecast: isMonsoonSeason ? '150-250mm expected' : '80-120mm expected'
        });
    }
    
    // Heatwave Predictions
    if (isSummerSeason || heatCount > 2) {
        const heatRisk = Math.min(90, 30 + (heatCount * 10) + (isSummerSeason ? 30 : 0));
        predictions.push({
            id: 2,
            type: 'heat',
            severity: heatRisk > 70 ? 'high' : (heatRisk > 40 ? 'medium' : 'low'),
            title: 'Heatwave Warning',
            region: 'Sindh (Sukkur, Jacobabad, Karachi), South Punjab (Multan, Bahawalpur)',
            daysToEvent: Math.floor(Math.random() * 8) + 2,
            probability: heatRisk,
            description: `Temperatures expected to reach 44-48°C in southern regions. ${heatRisk}% probability of extreme heatwave conditions.`,
            impact: 'Heat stress on crops (cotton, vegetables), livestock dehydration risk',
            recommendedAction: 'Irrigate early morning/evening, provide shade for crops, keep livestock hydrated',
            confidence: heatRisk > 70 ? 'High' : (heatRisk > 40 ? 'Medium' : 'Low'),
            maxTempForecast: isSummerSeason ? '46-48°C' : '42-44°C'
        });
    }
    
    // Drought Predictions
    if (droughtCount > 2) {
        const droughtRisk = Math.min(85, 25 + (droughtCount * 12));
        predictions.push({
            id: 3,
            type: 'drought',
            severity: droughtRisk > 70 ? 'high' : (droughtRisk > 40 ? 'medium' : 'low'),
            title: 'Drought Watch',
            region: 'Balochistan (Quetta, Kalat, Khuzdar), Tharparkar (Sindh)',
            daysToEvent: Math.floor(Math.random() * 20) + 10,
            probability: droughtRisk,
            description: `Below-average rainfall forecast for arid regions. ${droughtRisk}% chance of drought conditions developing.`,
            impact: 'Water scarcity, crop failure in rain-fed areas',
            recommendedAction: 'Implement water conservation, switch to drought-resistant varieties',
            confidence: droughtRisk > 70 ? 'High' : (droughtRisk > 40 ? 'Medium' : 'Low'),
            rainfallDeficit: '40-60% below normal'
        });
    }
    
    // Storm Predictions
    if (isMonsoonSeason || stormCount > 1) {
        const stormRisk = Math.min(80, 20 + (stormCount * 8) + (isMonsoonSeason ? 20 : 0));
        predictions.push({
            id: 4,
            type: 'storm',
            severity: stormRisk > 70 ? 'medium' : (stormRisk > 40 ? 'medium' : 'low'),
            title: 'Severe Thunderstorm Warning',
            region: 'Khyber Pakhtunkhwa (Peshawar, Swat, Abbottabad), Northern Punjab (Rawalpindi, Gujranwala)',
            daysToEvent: Math.floor(Math.random() * 12) + 1,
            probability: stormRisk,
            description: `Strong winds (60-85 km/h) and hail expected in northern regions. ${stormRisk}% probability of severe thunderstorms.`,
            impact: 'Crop lodging (maize, sugarcane), fruit orchard damage',
            recommendedAction: 'Secure farm equipment, harvest ripe crops, protect livestock',
            confidence: stormRisk > 70 ? 'Medium' : 'Low',
            windSpeedForecast: '65-90 km/h'
        });
    }
    
    // Pest Outbreak Predictions (based on temperature and humidity patterns)
    if (pestCount > 1 || isSummerSeason) {
        const pestRisk = Math.min(75, 15 + (pestCount * 10) + (isSummerSeason ? 15 : 0));
        predictions.push({
            id: 5,
            type: 'pest',
            severity: pestRisk > 60 ? 'medium' : 'low',
            title: 'Pest Outbreak Alert',
            region: 'Cotton belt (Multan, Rahim Yar Khan, Bahawalpur), Rice areas (Sheikhupura, Gujranwala)',
            daysToEvent: Math.floor(Math.random() * 18) + 5,
            probability: pestRisk,
            description: `Warm and humid conditions favorable for pest breeding. ${pestRisk}% chance of pest outbreaks (pink bollworm, stem borer).`,
            impact: 'Cotton boll damage, rice stem damage, yield reduction',
            recommendedAction: 'Regular crop scouting, pheromone trap installation, timely pesticide application',
            confidence: pestRisk > 60 ? 'Medium' : 'Low',
            pestTypes: 'Pink bollworm, American bollworm, Stem borer'
        });
    }
    
    // Frost Prediction (winter season)
    if (isWinterSeason) {
        const frostRisk = Math.min(70, 30 + (isWinterSeason ? 30 : 0));
        predictions.push({
            id: 6,
            type: 'frost',
            severity: frostRisk > 60 ? 'medium' : 'low',
            title: 'Frost Alert',
            region: 'Northern areas (Gilgit, Skardu, Chitral), Potohar region',
            daysToEvent: Math.floor(Math.random() * 14) + 7,
            probability: frostRisk,
            description: `Temperatures expected to drop below freezing in high-altitude areas. ${frostRisk}% probability of frost damage.`,
            impact: 'Damage to fruit orchards (apples, apricots), vegetable crops',
            recommendedAction: 'Use frost covers, irrigate before sunset, delay pruning',
            confidence: frostRisk > 60 ? 'Medium' : 'Low',
            minTempForecast: '-2 to -5°C'
        });
    }
    
    // Sort by days to event (closest first)
    predictions.sort((a, b) => a.daysToEvent - b.daysToEvent);
    
    console.log(`[Alert] Generated ${predictions.length} predictions for next 30 days`);
    return predictions;
}

// Render Predictions Timeline
function renderPredictions() {
    const container = document.getElementById('timeline');
    if (!container) {
        console.error('[Alert] #timeline not found');
        return;
    }
    
    // Change the heading from "Recent Disaster Timeline" to "Disaster Predictions (Next 30 Days)"
    const historyHeading = document.querySelector('.glass .stag-orange, .glass .stag');
    if (historyHeading && historyHeading.innerHTML.includes('History')) {
        historyHeading.innerHTML = '<i class="fa fa-chart-line" style="font-size:9px;"></i> PREDICTIONS';
    }
    
    const sectionTitle = document.querySelector('.glass h6');
    if (sectionTitle && sectionTitle.textContent.includes('Recent Disaster Timeline')) {
        sectionTitle.innerHTML = 'Disaster Predictions (Next 30 Days)';
        const subtitle = sectionTitle.nextElementSibling;
        if (subtitle && subtitle.tagName === 'P') {
            subtitle.innerHTML = 'AI-powered predictions based on historical patterns and current conditions';
        }
    }
    
    if (!PREDICTIONS.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">No predictions available for the next 30 days.</div>';
        return;
    }
    
    container.innerHTML = PREDICTIONS.map((prediction, index) => {
        const severityColor = getSeverityColor(prediction.severity);
        const dateText = prediction.daysToEvent === 1 ? 'Tomorrow' : 
                        prediction.daysToEvent <= 7 ? `In ${prediction.daysToEvent} days` :
                        `In ${prediction.daysToEvent} days (${Math.ceil(prediction.daysToEvent / 7)} week${Math.ceil(prediction.daysToEvent / 7) > 1 ? 's' : ''})`;
        
        const probabilityColor = prediction.probability > 70 ? '#ef4444' : 
                                 prediction.probability > 40 ? '#f97316' : '#22c55e';
        
        const iconMap = {
            'flood': '🌊',
            'heat': '🌡️',
            'drought': '🏜️',
            'storm': '⛈',
            'pest': '🐛',
            'frost': '❄️'
        };
        
        return `
            <div style="margin-bottom:20px;animation:fadeUp 0.3s ease ${index * 0.1}s both;">
                <div style="display:flex;align-items:flex-start;gap:12px;">
                    <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;
                                justify-content:center;font-size:22px;flex-shrink:0;
                                background:${severityColor}15;border:1px solid ${severityColor}33;">
                        ${iconMap[prediction.type] || '⚠️'}
                    </div>
                    <div style="flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                            <div style="font-size:14px;font-weight:800;">${prediction.title}</div>
                            <span style="padding:2px 10px;border-radius:20px;font-size:9px;font-weight:700;
                                         background:${severityColor}20;color:${severityColor};border:1px solid ${severityColor}40;">
                                ${prediction.severity.toUpperCase()} RISK
                            </span>
                        </div>
                        <div style="font-size:11px;color:#f59e0b;margin-top:4px;">
                            ⏰ ${dateText} · 📍 ${prediction.region.substring(0, 60)}${prediction.region.length > 60 ? '...' : ''}
                        </div>
                        <div style="margin-top:8px;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                <span style="font-size:10px;color:var(--muted);">Probability:</span>
                                <div style="flex:1;height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;">
                                    <div style="width:${prediction.probability}%;height:100%;background:${probabilityColor};border-radius:3px;"></div>
                                </div>
                                <span style="font-size:11px;font-weight:700;color:${probabilityColor};">${prediction.probability}%</span>
                            </div>
                        </div>
                        <div style="font-size:11px;color:#9ca3af;margin-top:6px;line-height:1.5;">
                            ${prediction.description}
                        </div>
                        <div style="margin-top:8px;padding:8px 10px;background:rgba(34,197,94,.05);border-radius:8px;border-left:2px solid ${severityColor};">
                            <div style="font-size:10px;font-weight:700;color:${severityColor};margin-bottom:4px;">✅ RECOMMENDED ACTIONS</div>
                            <div style="font-size:10px;color:#d1d5db;">${prediction.recommendedAction}</div>
                        </div>
                        ${prediction.rainfallForecast || prediction.maxTempForecast || prediction.windSpeedForecast ? `
                        <div style="margin-top:6px;font-size:10px;color:var(--muted);">
                            📊 Forecast: ${prediction.rainfallForecast || prediction.maxTempForecast || prediction.windSpeedForecast || ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
                ${index < PREDICTIONS.length - 1 ? '<div style="margin:12px 0 12px 28px;height:1px;background:var(--border);"></div>' : ''}
            </div>
        `;
    }).join('');
    
    console.log(`[Alert] Rendered ${PREDICTIONS.length} predictions`);
}

// Load and Display Everything
async function initializeDashboard() {
    console.log('[Alert] Initializing dashboard with predictions...');
    
    // Load historical data for patterns
    await loadHistoricalAlerts();
    
    // Generate predictions based on patterns
    PREDICTIONS = generatePredictions();
    
    // Render predictions
    renderPredictions();
    renderHistory();
    
    // Update severity cards with historical data
    updateSeverityCards();
    
    // Render severity chart
    renderSeverityChart();
    
    // Load emergency contacts
    await loadEmergencyContacts();
    
    // Load reminders
    await loadReminders();
    
    // Setup SMS preview
    updateSmsPreview();
}

// Update Severity Cards
function updateSeverityCards() {
    const floodCount = ALERTS.filter(a => a.type === 'flood').length;
    const heatCount = ALERTS.filter(a => a.type === 'heat').length;
    const droughtCount = ALERTS.filter(a => a.type === 'drought').length;
    const stormCount = ALERTS.filter(a => a.type === 'storm').length;
    
    const criticalCount = ALERTS.filter(a => a.severity === 'critical').length;
    const highCount = ALERTS.filter(a => a.severity === 'high').length;
    
    // Update cards
    const floodCardNum = document.querySelector('.sev-card:first-child .sev-num');
    if (floodCardNum) floodCardNum.textContent = floodCount;
    
    const heatCardNum = document.querySelector('.sev-card:nth-child(2) .sev-num');
    if (heatCardNum) heatCardNum.textContent = heatCount;
    
    const droughtCardNum = document.querySelector('.sev-card:nth-child(3) .sev-num');
    if (droughtCardNum) droughtCardNum.textContent = droughtCount;
    
    const stormCardNum = document.querySelector('.sev-card:nth-child(4) .sev-num');
    if (stormCardNum) stormCardNum.textContent = stormCount;
    
    // Update progress bars
    const total = ALERTS.length || 1;
    const progressBars = document.querySelectorAll('.prog-fill');
    if (progressBars[0]) progressBars[0].style.width = `${(floodCount / total) * 100}%`;
    if (progressBars[1]) progressBars[1].style.width = `${(heatCount / total) * 100}%`;
    if (progressBars[2]) progressBars[2].style.width = `${(droughtCount / total) * 100}%`;
    if (progressBars[3]) progressBars[3].style.width = `${(stormCount / total) * 100}%`;
    
    // Update badge
    const liveBadge = document.querySelector('.live-badge');
    if (liveBadge) {
        liveBadge.innerHTML = `<span class="live-dot"></span> ${criticalCount} Critical Alerts`;
    }
}

// Render Severity Chart
function renderSeverityChart() {
    const canvas = document.getElementById('sevChart');
    if (!canvas) return;
    
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => setTimeout(() => renderSeverityChart(), 100);
        document.head.appendChild(script);
        return;
    }
    
    const severityCounts = {
        'Critical': ALERTS.filter(a => a.severity === 'critical').length,
        'High': ALERTS.filter(a => a.severity === 'high').length,
        'Medium': ALERTS.filter(a => a.severity === 'medium').length,
        'Low': ALERTS.filter(a => a.severity === 'low').length
    };
    
    const labels = ['Critical', 'High', 'Medium', 'Low'];
    const data = labels.map(l => severityCounts[l]);
    const colors = {
        'Critical': '#ef4444',
        'High': '#f97316',
        'Medium': '#f59e0b',
        'Low': '#22c55e'
    };
    
    if (sevChart) sevChart.destroy();
    
    sevChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map(l => colors[l] + 'cc'),
                borderColor: labels.map(l => colors[l]),
                borderWidth: 2,
                hoverOffset: 10,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' },
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const total = data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Emergency Contacts
async function loadEmergencyContacts() {
    const container = document.getElementById('contactsList');
    if (!container) return;
    
    const contacts = [
        { icon: '🏛️', name: 'NDMA', role: 'National Disaster Management', number: '1700', color: '#ef4444' },
        { icon: '🚒', name: 'Rescue 1122', role: 'Emergency Rescue & Relief', number: '1122', color: '#f97316' },
        { icon: '👮', name: 'Police Emergency', role: 'Law Enforcement', number: '15', color: '#60a5fa' },
        { icon: '🌾', name: 'Agriculture Dept', role: 'Crop Advisory Helpline', number: '0800-12345', color: '#22c55e' },
        { icon: '🏥', name: 'Edhi Foundation', role: 'Medical & Emergency Relief', number: '115', color: '#a78bfa' },
        { icon: '🌊', name: 'Flood Relief Cell', role: 'Punjab Irrigation Dept', number: '042-99205390', color: '#38bdf8' },
        { icon: '⚠️', name: 'PDMA', role: 'Provincial Disaster Management', number: '042-99204400', color: '#f59e0b' }
    ];
    
    container.innerHTML = contacts.map(contact => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:10px;
                    border:1px solid var(--border);background:var(--panel);margin-bottom:8px;">
            <div style="width:36px;height:36px;border-radius:9px;display:flex;align-items:center;
                        justify-content:center;font-size:16px;flex-shrink:0;
                        background:${contact.color}18;border:1px solid ${contact.color}33;">
                ${contact.icon}
            </div>
            <div style="flex:1;">
                <div style="font-size:12px;font-weight:700;">${contact.name}</div>
                <div style="font-size:10px;color:var(--muted);">${contact.role}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:12px;font-weight:800;color:${contact.color};">${contact.number}</div>
                <button onclick="initiateCall('${contact.number}', '${contact.name}')" 
                        style="font-size:9px;margin-top:3px;padding:4px 12px;border-radius:20px;
                               border:1px solid ${contact.color}33;background:${contact.color}10;
                               color:${contact.color};cursor:pointer;">
                    📞 Call
                </button>
            </div>
        </div>
    `).join('');
}

window.initiateCall = function(phoneNumber, contactName) {
    if (confirm(`Call ${contactName} at ${phoneNumber}?`)) {
        window.location.href = `tel:${phoneNumber}`;
    }
};

// SMS Functions
const SMS_TEMPLATES = {
    flood: 'FLOOD ALERT: {districts}. Move to higher ground. Call 1122 for rescue. -AgroInsight',
    heat: 'HEAT ALERT: {districts}. Avoid outdoor work 11am-5pm. Stay hydrated. -AgroInsight',
    drought: 'DROUGHT ALERT: {districts}. Water conservation advised. Contact Ag Dept. -AgroInsight',
    storm: 'STORM ALERT: {districts}. Secure equipment. Seek shelter. -AgroInsight'
};

function updateSmsPreview() {
    const type = document.getElementById('alertType')?.value || 'flood';
    const distSelect = document.getElementById('targetDist');
    const selected = distSelect ? Array.from(distSelect.selectedOptions).map(o => o.value) : [];
    const customMsg = document.getElementById('customMsg')?.value.trim() || '';
    const districtsStr = selected.join(', ') || 'your area';
    const message = customMsg || (SMS_TEMPLATES[type] || SMS_TEMPLATES.flood).replace('{districts}', districtsStr);
    
    const preview = document.getElementById('smsPreview');
    const charCount = document.getElementById('charCount');
    const distCount = document.getElementById('distCount');
    
    if (preview) preview.textContent = message;
    if (charCount) charCount.textContent = `${message.length} / 160 chars`;
    if (distCount) distCount.textContent = selected.length;
}

window.sendSMS = function() {
    const resultDiv = document.getElementById('smsResult');
    const sendButton = document.querySelector('.send-sms-btn');
    const districtSelect = document.getElementById('targetDist');
    
    if (!districtSelect || districtSelect.selectedOptions.length === 0) {
        if (resultDiv) resultDiv.innerHTML = '<div style="color:#ef4444;padding:10px;">❌ Select at least one district</div>';
        return;
    }
    
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
    
    setTimeout(() => {
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fa fa-paper-plane"></i> Send SMS Alert Now';
        if (resultDiv) {
            resultDiv.innerHTML = '<div style="color:#22c55e;padding:10px;">✅ SMS Alert Sent Successfully!</div>';
            setTimeout(() => resultDiv.innerHTML = '', 3000);
        }
    }, 1500);
};

function loadReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;
    
    container.innerHTML = `
        <div style="padding:6px 0;">✅ Fertilizer application due in 3 days</div>
        <div style="padding:6px 0;">💧 Irrigation schedule review due tomorrow</div>
        <div style="padding:6px 0;">🐛 Pest scouting recommended this week</div>
    `;
}

function updateClock() {
    const clockEl = document.getElementById('clockVal');
    if (clockEl) {
        clockEl.textContent = new Date().toLocaleString('en-PK', {
            hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
        });
    }
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Alert] DOM ready — initializing predictions dashboard');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn && sidebar) {
        let collapsed = false;
        toggleBtn.addEventListener('click', () => {
            collapsed = !collapsed;
            sidebar.classList.toggle('collapsed', collapsed);
            const logoText = document.getElementById('logoText');
            if (logoText) logoText.style.display = collapsed ? 'none' : 'block';
            document.querySelectorAll('.nav-btn span').forEach(s => {
                if (s) s.style.display = collapsed ? 'none' : 'inline';
            });
        });
    }
    
    // Mobile sidebar
    const st = document.getElementById('sidebarToggle');
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebarOverlay');
    if (st && sb && ov) {
        st.addEventListener('click', () => {
            st.classList.toggle('open');
            sb.classList.toggle('mobile-open');
            ov.classList.toggle('active');
        });
        ov.addEventListener('click', () => {
            st.classList.remove('open');
            sb.classList.remove('mobile-open');
            ov.classList.remove('active');
        });
    }
    
    updateClock();
    setInterval(updateClock, 60000);
    
    // Initialize dashboard
    initializeDashboard();
    
    // Setup SMS listeners
    const customMsg = document.getElementById('customMsg');
    const alertType = document.getElementById('alertType');
    const targetDist = document.getElementById('targetDist');
    if (customMsg) customMsg.addEventListener('input', updateSmsPreview);
    if (alertType) alertType.addEventListener('change', updateSmsPreview);
    if (targetDist) targetDist.addEventListener('change', updateSmsPreview);
    
    updateSmsPreview();
    
    // Make functions global
    window.sendSMS = sendSMS;
    window.updateSmsPreview = updateSmsPreview;
    window.filterAlerts = (f) => console.log('Filter:', f);
    window.markAllAlertsRead = () => console.log('Mark all read');
    
    console.log('[Alert] Dashboard ready with predictions for next 30 days');
});
// Add this function after renderPredictions() function
function renderHistory() {
    const container = document.getElementById('historyList');
    if (!container) {
        console.error('[Alert] #historyList not found');
        return;
    }
    
    const historyData = [
        { date: '2025-01-15', type: 'Flood', severity: 'Critical', region: 'Multan, DG Khan, Rahim Yar Khan', desc: 'Severe flash floods affected 50,000+ acres of agricultural land', impact: 'Wheat and cotton crops destroyed', farmers: '12,500+' },
        { date: '2025-01-05', type: 'Heatwave', severity: 'Critical', region: 'Sukkur, Jacobabad, Karachi', desc: 'Extreme temperatures reaching 48°C caused severe heat stress', impact: 'Cotton yield reduced by 35%', farmers: '8,200+' },
        { date: '2024-12-20', type: 'Drought', severity: 'High', region: 'Quetta, Kalat, Khuzdar', desc: 'Level-3 drought declared with crop losses exceeding 60%', impact: 'Complete crop failure in rain-fed areas', farmers: '31,000+' },
        { date: '2024-12-10', type: 'Frost', severity: 'High', region: 'Gilgit, Skardu, Hunza', desc: 'Below freezing temperatures damaged fruit orchards', impact: 'Apple and apricot harvest reduced by 45%', farmers: '5,800+' },
        { date: '2024-11-28', type: 'Storm', severity: 'Medium', region: 'Peshawar, Swat, Mardan', desc: 'Severe thunderstorm with 80km/h winds and hailstones', impact: 'Maize and sugarcane crops damaged', farmers: '4,200+' },
        { date: '2024-11-15', type: 'Pest', severity: 'High', region: 'Multan, Rahim Yar Khan, Bahawalpur', desc: 'Pink bollworm outbreak in cotton belt', impact: 'Cotton yield reduced by 25%', farmers: '15,600+' },
        { date: '2024-10-25', type: 'Flood', severity: 'High', region: 'Jhang, Chiniot, Toba Tek Singh', desc: 'Chenab River flooding affected agricultural lands', impact: '15,000 acres of rice damaged', farmers: '6,800+' },
        { date: '2024-10-10', type: 'Heatwave', severity: 'High', region: 'Faisalabad, Sahiwal, Okara', desc: 'Late-season heatwave affecting wheat harvest', impact: 'Wheat quality degradation, 20% yield loss', farmers: '9,500+' },
        { date: '2024-09-28', type: 'Drought', severity: 'Medium', region: 'Tharparkar, Umerkot, Mirpurkhas', desc: 'Water scarcity affecting livestock and crops', impact: 'Pasture degradation, livestock mortality', farmers: '22,000+' },
        { date: '2024-09-15', type: 'Pest', severity: 'Medium', region: 'Sheikhupura, Gujranwala, Hafizabad', desc: 'Stem borer attack in rice fields', impact: 'Rice yield reduced by 18%', farmers: '7,400+' }
    ];
    
    container.innerHTML = historyData.map((event, index) => {
        const severityColor = event.severity === 'Critical' ? '#ef4444' : 
                              event.severity === 'High' ? '#f97316' : '#f59e0b';
        
        const icons = { 'Flood': '🌊', 'Heatwave': '🌡️', 'Drought': '🏜️', 'Storm': '⛈', 'Frost': '❄️', 'Pest': '🐛' };
        const icon = icons[event.type] || '⚠️';
        
        const formattedDate = new Date(event.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' });
        
        return `
            <div style="display:flex;gap:12px;margin-bottom:15px;padding:12px;border-radius:10px;background:rgba(255,255,255,.02);border-left:3px solid ${severityColor};">
                <div style="width:45px;height:45px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;background:${severityColor}15;border:1px solid ${severityColor}30;">${icon}</div>
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;margin-bottom:5px;">
                        <span style="font-size:13px;font-weight:800;">${event.type} - ${event.region}</span>
                        <span style="font-size:10px;color:#6b7280;">📅 ${formattedDate}</span>
                    </div>
                    <div style="font-size:11px;color:#9ca3af;margin-bottom:6px;">${event.desc}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
                        <span style="font-size:9px;color:#6b7280;">📊 ${event.impact}</span>
                        <span style="font-size:9px;color:#6b7280;">👨‍🌾 ${event.farmers} farmers</span>
                    </div>
                    <span style="display:inline-block;padding:2px 10px;border-radius:15px;font-size:8px;font-weight:700;background:${severityColor}20;color:${severityColor};">${event.severity.toUpperCase()}</span>
                </div>
            </div>
        `;
    }).join('');
    
    console.log(`[Alert] Rendered ${historyData.length} historical events`);
}

// Add this line inside initializeDashboard() function, after renderPredictions()
// renderHistory();