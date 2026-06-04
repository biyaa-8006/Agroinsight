// SIDEBAR TOGGLE
const sidebar = document.getElementById("sidebar");

const toggleBtn = document.getElementById("toggleBtn");

const logoText = document.getElementById("logoText");

let collapsed = false;


toggleBtn.addEventListener("click", () => {

  collapsed = !collapsed;

  sidebar.classList.toggle("collapsed");

  if(collapsed){

    logoText.style.display = "none";

    document.querySelectorAll(".nav-btn span")
      .forEach(span => span.style.display = "none");

  } else {

    logoText.style.display = "block";

    document.querySelectorAll(".nav-btn span")
      .forEach(span => span.style.display = "block");
  }

});
// ── CHART DEFAULTS ────────────────────────────────────────────
Chart.defaults.color = '#6b7280';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Segoe UI',system-ui,sans-serif";

// ── DATA ──────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const RAINFALL = [82,45,28,55,30,18,95,120,88,42,25,60];
const YIELD    = [4.1,3.2,3.0,3.8,3.5,2.9,2.6,2.8,3.4,3.1,2.7,3.6];
const PRICE    = [3100,3400,3650,3300,3450,3700,3900,3800,3600,3850,4100,3950];
const TEMP     = [18,20,26,32,37,40,42,41,37,30,23,18];

const DISTRICT_LOSSES = [
  ['Multan',28.4],['RY Khan',21.7],['DG Khan',19.8],['Muzaffargarh',16.4],['Bahawalpur',18.9],
  ['Khanewal',14.2],['Bahawalnagar',13.2],['Lahore',12.1],['Jhang',11.5],['Sahiwal',10.6],
  ['Gujranwala',9.8],['Okara',9.4],['Pakpattan',8.7],['Chiniot',8.3],['Toba',7.9],
  ['Sialkot',7.2],['Hafizabad',6.8],['Narowal',5.1],['Faisalabad',15.3],['Sheikhupura',6.5],
];

const MARKET_DATA = [
  {crop:'🌾 Wheat',   unit:'Rs/40kg', cur:3800, wk:3650, mo:3200, cause:'Flood',    sev:'critical'},
  {crop:'🌿 Basmati', unit:'Rs/kg',   cur:420,  wk:400,  mo:380,  cause:'Heatwave', sev:'high'},
  {crop:'🌸 Cotton',  unit:'Rs/maund',cur:8500, wk:8200, mo:7800, cause:'Flood',    sev:'critical'},
  {crop:'🎋 Sugarcane',unit:'Rs/maund',cur:350, wk:340,  mo:320,  cause:'Drought',  sev:'moderate'},
  {crop:'🌽 Maize',   unit:'Rs/40kg', cur:2800, wk:2750, mo:2600, cause:'Normal',   sev:'low'},
  {crop:'🧅 Onion',   unit:'Rs/kg',   cur:180,  wk:150,  mo:90,   cause:'Drought',  sev:'high'},
  {crop:'🥔 Potato',  unit:'Rs/kg',   cur:85,   wk:75,   mo:65,   cause:'Flood',    sev:'moderate'},
];

const POLICIES = [
  {icon:'💧',title:'Drip Irrigation Subsidy',desc:'50% subsidy on drip irrigation equipment for smallholders reduces water use 40% and buffers drought income loss.',impact:'Rs 8.2B saved/year',color:'#60a5fa',roi:'340%'},
  {icon:'🛡️',title:'Crop Insurance Scheme',desc:'Mandatory weather-indexed crop insurance for all landholdings under 25 acres. Covers 80% of loss.',impact:'1.2M families protected',color:'#22c55e',roi:'280%'},
  {icon:'🌱',title:'Climate-Resilient Seeds',desc:'Distribute drought/heat-tolerant seed varieties — proven 35% yield advantage in extreme weather.',impact:'Rs 42B yield recovery',color:'#f59e0b',roi:'520%'},
  {icon:'📡',title:'Early Warning SMS Network',desc:'14-day weather forecasting with district-level SMS alerts. Allows pre-emptive action reducing loss 25%.',impact:'Rs 18B loss prevented',color:'#a78bfa',roi:'190%'},
];

const SHOCK = [
  {label:'Wheat Flour',change:'+28%',color:'#ef4444'},
  {label:'Rice',change:'+22%',color:'#f97316'},
  {label:'Vegetables',change:'+41%',color:'#ef4444'},
  {label:'Cotton Cloth',change:'+18%',color:'#f59e0b'},
];

// ── CHART INSTANCES ───────────────────────────────────────────
let tlChart=null, donut=null, bubble=null, simCh=null, roiCh=null;

// ── TIMELINE CHART ────────────────────────────────────────────
function initTimeline(mode='all'){
  const ctx = document.getElementById('timelineChart').getContext('2d');
  if(tlChart) tlChart.destroy();
  const datasets = [];
  if(mode==='all'||mode==='yield'){
    datasets.push({label:'Rainfall (mm)',data:RAINFALL,borderColor:'#60a5fa',backgroundColor:'rgba(96,165,250,.08)',fill:true,tension:.42,yAxisID:'y',pointRadius:4,pointBackgroundColor:'#60a5fa',pointBorderColor:'#080e0b',pointBorderWidth:2});
    datasets.push({label:'Yield (t/ha)',data:YIELD,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.1)',fill:true,tension:.42,yAxisID:'y1',pointRadius:4,pointBackgroundColor:'#22c55e',pointBorderColor:'#080e0b',pointBorderWidth:2});
  }
  if(mode==='all'||mode==='price'){
    datasets.push({label:'Wheat Price (Rs/40kg)',data:PRICE,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,.06)',fill:true,tension:.42,yAxisID:mode==='price'?'y':'y2',borderDash:mode==='price'?[]:[5,3],pointRadius:4,pointBackgroundColor:'#f59e0b',pointBorderColor:'#080e0b',pointBorderWidth:2});
  }
  if(mode==='all')
    datasets.push({label:'Temp (°C)',data:TEMP,borderColor:'#f97316',backgroundColor:'transparent',fill:false,tension:.42,yAxisID:'y',borderDash:[3,4],pointRadius:3,pointBackgroundColor:'#f97316'});

  tlChart = new Chart(ctx,{
    type:'line',
    data:{labels:MONTHS,datasets},
    options:{
      responsive:true,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{labels:{color:'#6b7280',font:{size:10},boxWidth:12,padding:16}},
        tooltip:{backgroundColor:'#0a0f0d',borderColor:'rgba(255,255,255,.1)',borderWidth:1,titleColor:'#22c55e'},
      },
      scales:{
        x:{ticks:{color:'#374151',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#374151',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'},position:'left'},
        y1:{ticks:{color:'#22c55e',font:{size:9}},grid:{display:false},position:'right'},
        y2:{ticks:{color:'#f59e0b',font:{size:9}},grid:{display:false},position:'right',display:mode==='all'},
      },
    },
  });
}
function setTimelineView(m,btn){
  document.querySelectorAll('#timelineViewBtns .vbtn').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  initTimeline(m);
}

// ── DONUT CHART ───────────────────────────────────────────────
function initDonut(){
  const ctx = document.getElementById('donutChart').getContext('2d');
  const labels=['🌊 Flood','🏜️ Drought','🌡️ Heatwave','⛈ Storm','Other'];
  const vals=[42,28,18,8,4];
  const colors=['#ef4444','#f59e0b','#f97316','#60a5fa','#6b7280'];
  const amounts=[102.9,68.6,44.1,19.6,9.8];
  donut = new Chart(ctx,{
    type:'doughnut',
    data:{labels,datasets:[{data:vals,backgroundColor:colors.map(c=>c+'cc'),borderColor:colors,borderWidth:2,hoverOffset:8}]},
    options:{
      responsive:true,cutout:'68%',
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'#0a0f0d',borderColor:'rgba(255,255,255,.1)',borderWidth:1,callbacks:{label:c=>`${c.label}: ${c.raw}% = Rs ${amounts[c.dataIndex]}B`}},
      },
    },
  });
  // Legend
  document.getElementById('donutLegend').innerHTML = labels.map((l,i)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="display:flex;align-items:center;gap:6px;font-size:11px;"><span style="width:10px;height:10px;border-radius:3px;background:${colors[i]};display:inline-block;"></span>${l}</span>
      <span style="font-size:11px;font-weight:700;color:${colors[i]};">Rs ${amounts[i]}B <span style="color:var(--muted);font-weight:400;">(${vals[i]}%)</span></span>
    </div>`).join('');
  // Macro bars
  const macros=[['Agricultural GDP',72,'#ef4444'],['Export Revenue',45,'#f97316'],['Rural Employment',38,'#f59e0b'],['Food Security Index',28,'#60a5fa'],['Livestock Economy',35,'#a78bfa']];
  document.getElementById('macroBars').innerHTML = macros.map(([l,v,c])=>`
    <div class="macro-bar-wrap">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:3px;"><span>${l}</span><span style="color:${c};font-weight:700;">-${v}%</span></div>
      <div class="macro-bar"><div class="macro-bar-fill" style="background:${c};" data-w="${v}%"></div></div>
    </div>`).join('');
}

// ── BUBBLE CHART ──────────────────────────────────────────────
function initBubble(){
  const ctx = document.getElementById('bubbleChart').getContext('2d');
  bubble = new Chart(ctx,{
    type:'bubble',
    data:{datasets:[
      {label:'Wheat',backgroundColor:'rgba(245,158,11,.65)',borderColor:'#f59e0b',data:[{x:82,y:4.1,r:8},{x:45,y:3.2,r:12},{x:28,y:3.0,r:14},{x:120,y:2.8,r:11},{x:55,y:3.8,r:9},{x:42,y:3.1,r:11}]},
      {label:'Rice', backgroundColor:'rgba(34,197,94,.65)', borderColor:'#22c55e', data:[{x:95,y:4.8,r:7},{x:140,y:5.2,r:6},{x:60,y:3.6,r:13},{x:85,y:4.5,r:8},{x:110,y:4.9,r:7}]},
      {label:'Cotton',backgroundColor:'rgba(167,139,250,.65)',borderColor:'#a78bfa',data:[{x:35,y:2.4,r:16},{x:20,y:1.8,r:18},{x:55,y:2.2,r:14},{x:45,y:2.0,r:15},{x:70,y:2.6,r:12}]},
      {label:'Maize', backgroundColor:'rgba(251,191,36,.65)', borderColor:'#fbbf24', data:[{x:90,y:5.1,r:7},{x:70,y:4.7,r:9},{x:50,y:4.2,r:11},{x:110,y:5.3,r:6},{x:40,y:3.9,r:12}]},
    ]},
    options:{
      responsive:true,
      plugins:{
        legend:{labels:{color:'#6b7280',font:{size:10},boxWidth:10}},
        tooltip:{backgroundColor:'#0a0f0d',borderColor:'rgba(255,255,255,.1)',borderWidth:1,callbacks:{
          label:c=>`${c.dataset.label}: Rain=${c.raw.x}mm, Yield=${c.raw.y}t/ha`
        }},
      },
      scales:{
        x:{title:{display:true,text:'Rainfall (mm/month)',color:'#6b7280',font:{size:10}},ticks:{color:'#374151',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}},
        y:{title:{display:true,text:'Yield (t/ha)',color:'#6b7280',font:{size:10}},ticks:{color:'#374151',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'}},
      },
    },
  });
}

// ── ROI CHART ─────────────────────────────────────────────────
function initROI(){
  const ctx = document.getElementById('roiChart').getContext('2d');
  roiCh = new Chart(ctx,{
    type:'bar',
    data:{
      labels:['Drip Irrigation','Crop Insurance','Resilient Seeds','SMS Alerts'],
      datasets:[{label:'ROI %',data:[340,280,520,190],backgroundColor:['rgba(96,165,250,.7)','rgba(34,197,94,.7)','rgba(245,158,11,.7)','rgba(167,139,250,.7)'],borderColor:['#60a5fa','#22c55e','#f59e0b','#a78bfa'],borderWidth:1,borderRadius:5}],
    },
    options:{
      responsive:true,indexAxis:'y',
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#0a0f0d',borderColor:'rgba(255,255,255,.1)',borderWidth:1,callbacks:{label:c=>`ROI: ${c.raw}% per Rs 1B invested`}}},
      scales:{
        x:{ticks:{color:'#374151',font:{size:9}},grid:{color:'rgba(255,255,255,.04)'},title:{display:true,text:'ROI %',color:'#6b7280',font:{size:9}}},
        y:{ticks:{color:'#9ca3af',font:{size:9}},grid:{display:false}},
      },
    },
  });
}

// ── INCOME SIMULATOR ──────────────────────────────────────────
function initSimChart(){
  const ctx = document.getElementById('simChart').getContext('2d');
  simCh = new Chart(ctx,{
    type:'bar',
    data:{
      labels:['Gross Revenue','Input Costs','Net Profit'],
      datasets:[{data:[456,300,156],backgroundColor:['rgba(96,165,250,.7)','rgba(245,158,11,.7)','rgba(34,197,94,.7)'],borderColor:['#60a5fa','#f59e0b','#22c55e'],borderWidth:1,borderRadius:6}],
    },
    options:{
      responsive:true,
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#0a0f0d',borderColor:'rgba(255,255,255,.1)',borderWidth:1,callbacks:{label:c=>`Rs ${c.raw}k`}}},
      scales:{
        x:{ticks:{color:'#374151',font:{size:9}},grid:{display:false}},
        y:{ticks:{color:'#374151',font:{size:9},callback:v=>'Rs '+v+'k'},grid:{color:'rgba(255,255,255,.04)'}},
      },
    },
  });
}

const CROP_PARAMS = {
  wheat:    {base:4.0,optRain:350,optTemp:22,priceUnit:'Rs/40kg',baseCost:25000},
  rice:     {base:4.5,optRain:600,optTemp:30,priceUnit:'Rs/40kg',baseCost:32000},
  cotton:   {base:2.2,optRain:300,optTemp:34,priceUnit:'Rs/maund',baseCost:28000},
  maize:    {base:4.8,optRain:400,optTemp:27,priceUnit:'Rs/40kg',baseCost:22000},
  sugarcane:{base:58, optRain:800,optTemp:32,priceUnit:'Rs/maund',baseCost:18000},
};

// ── PER-CROP ECONOMIC & CHART DATA ────────────────────────────
const CROP_ECON = {
  wheat: {
    totalLoss:'Rs 245B', gdp:'-2.8%', income:'Rs 28.4k', inflation:'+22.4%',
    lossBadge:'↑ 34% vs last year', gdpBadge:'↓ Worst in 8 years',
    incomeBadge:'↓ 31% of avg income', inflBadge:'↑ Above 20% threshold',
    lossBar:'82%', gdpBar:'68%', incomeBar:'72%', inflBar:'55%',
    rainfall:[82,45,28,55,30,18,95,120,88,42,25,60],
    yield:   [4.1,3.2,3.0,3.8,3.5,2.9,2.6,2.8,3.4,3.1,2.7,3.6],
    price:   [3100,3400,3650,3300,3450,3700,3900,3800,3600,3850,4100,3950],
    temp:    [18,20,26,32,37,40,42,41,37,30,23,18],
    priceLabel:'Wheat Price (Rs/40kg)',
    districts:[
      ['Multan',28.4],['RY Khan',21.7],['DG Khan',19.8],['Muzaffargarh',16.4],['Bahawalpur',18.9],
      ['Khanewal',14.2],['Bahawalnagar',13.2],['Lahore',12.1],['Jhang',11.5],['Sahiwal',10.6],
      ['Gujranwala',9.8],['Okara',9.4],['Pakpattan',8.7],['Chiniot',8.3],['Toba',7.9],
      ['Sialkot',7.2],['Hafizabad',6.8],['Narowal',5.1],['Faisalabad',15.3],['Sheikhupura',6.5],
    ],
    distTotal:'Rs 186.4B', distTop:'Multan (Rs 28.4B)',
  },
  rice: {
    totalLoss:'Rs 165B', gdp:'-1.9%', income:'Rs 19.8k', inflation:'+15.2%',
    lossBadge:'↑ 22% vs last year', gdpBadge:'↓ Below 5-yr average',
    incomeBadge:'↓ 22% of avg income', inflBadge:'↑ Above 15% threshold',
    lossBar:'62%', gdpBar:'48%', incomeBar:'52%', inflBar:'38%',
    rainfall:[15,20,25,40,70,100,130,120,80,50,30,18],
    yield:   [0.4,0.5,0.7,1.1,1.8,2.5,3.2,3.5,3.0,2.4,1.6,0.8],
    price:   [3800,3850,3900,4000,4100,4200,4300,4400,4500,4400,4300,4200],
    temp:    [16,20,26,32,36,38,36,34,30,24,18,14],
    priceLabel:'Basmati Price (Rs/40kg)',
    districts:[
      ['Gujranwala',18.2],['Sheikhupura',15.1],['Sialkot',14.8],['Narowal',12.4],['Hafizabad',13.2],
      ['Lahore',10.8],['Gujrat',10.1],['Mandi B.',9.2],['Jhang',8.8],['Sahiwal',8.4],
      ['Multan',11.2],['Okara',7.6],['Pakpattan',6.8],['Sargodha',6.2],['Toba',5.8],
      ['Nankana',9.4],['Kasur',8.2],['RY Khan',7.4],['Faisalabad',10.8],['Chiniot',5.2],
    ],
    distTotal:'Rs 157.6B', distTop:'Gujranwala (Rs 18.2B)',
  },
  cotton: {
    totalLoss:'Rs 190B', gdp:'-2.1%', income:'Rs 22.0k', inflation:'+18.5%',
    lossBadge:'↑ 28% vs last year', gdpBadge:'↓ Textile exports hit hard',
    incomeBadge:'↓ 24% of avg income', inflBadge:'↑ Cloth prices rising',
    lossBar:'70%', gdpBar:'55%', incomeBar:'60%', inflBar:'46%',
    rainfall:[20,25,30,35,40,60,90,100,70,40,25,20],
    yield:   [0.5,0.6,0.8,1.2,1.5,1.8,2.0,2.1,1.9,1.6,1.0,0.7],
    price:   [7500,7600,7800,8000,8200,8400,8500,8700,9000,9200,8800,8500],
    temp:    [18,22,28,34,38,40,38,36,32,26,20,16],
    priceLabel:'Cotton Price (Rs/maund)',
    districts:[
      ['Multan',22.1],['RY Khan',18.4],['DG Khan',16.2],['Muzaffargarh',14.8],['Bahawalpur',16.1],
      ['Khanewal',12.0],['Bahawalnagar',11.5],['Vehari',10.2],['Jhang',10.8],['Sahiwal',9.6],
      ['Gujranwala',8.1],['Okara',7.9],['Pakpattan',7.2],['Chiniot',6.8],['Toba',6.4],
      ['Sialkot',5.8],['Hafizabad',5.4],['Narowal',4.1],['Faisalabad',12.4],['Sheikhupura',5.2],
    ],
    distTotal:'Rs 176.1B', distTop:'Multan (Rs 22.1B)',
  },
  maize: {
    totalLoss:'Rs 98B', gdp:'-1.1%', income:'Rs 12.2k', inflation:'+10.4%',
    lossBadge:'↑ 18% vs last year', gdpBadge:'↓ Moderate sector pressure',
    incomeBadge:'↓ 13% of avg income', inflBadge:'↑ Feed prices rising',
    lossBar:'40%', gdpBar:'28%', incomeBar:'32%', inflBar:'26%',
    rainfall:[20,25,30,45,65,85,110,100,65,40,25,18],
    yield:   [1.5,1.8,2.2,2.8,3.5,4.2,4.8,4.5,4.0,3.4,2.6,1.8],
    price:   [2000,2050,2100,2150,2200,2250,2300,2350,2300,2250,2200,2150],
    temp:    [14,18,24,30,36,38,36,34,28,22,16,12],
    priceLabel:'Maize Price (Rs/40kg)',
    districts:[
      ['Chakwal',10.2],['Attock',8.8],['Rawalpindi',8.4],['Jhelum',7.6],['Mianwali',8.1],
      ['Sargodha',6.8],['Bhakkar',6.2],['Gujranwala',5.8],['Gujrat',6.0],['Sahiwal',5.6],
      ['Multan',5.2],['Okara',4.8],['Pakpattan',4.2],['Faisalabad',6.4],['Toba',4.0],
      ['Sialkot',3.8],['Hafizabad',3.4],['Narowal',2.8],['Lahore',4.8],['Sheikhupura',3.2],
    ],
    distTotal:'Rs 110.8B', distTop:'Chakwal (Rs 10.2B)',
  },
  sugarcane: {
    totalLoss:'Rs 142B', gdp:'-1.6%', income:'Rs 16.4k', inflation:'+12.8%',
    lossBadge:'↑ 20% vs last year', gdpBadge:'↓ Sugar mills under pressure',
    incomeBadge:'↓ 18% of avg income', inflBadge:'↑ Sugar prices elevated',
    lossBar:'52%', gdpBar:'40%', incomeBar:'45%', inflBar:'32%',
    rainfall:[20,25,35,50,70,90,120,130,90,55,30,22],
    yield:   [35,38,42,48,52,56,58,60,58,54,48,40],
    price:   [320,325,330,340,345,350,355,360,365,360,355,350],
    temp:    [18,22,28,34,38,40,38,36,32,26,20,16],
    priceLabel:'Sugarcane Price (Rs/maund)',
    districts:[
      ['Multan',16.2],['RY Khan',14.1],['DG Khan',12.8],['Muzaffargarh',11.4],['Bahawalpur',12.2],
      ['Khanewal',9.8],['Bahawalnagar',8.4],['Lahore',7.8],['Jhang',8.2],['Sahiwal',7.6],
      ['Gujranwala',6.8],['Okara',6.4],['Pakpattan',5.8],['Sargodha',9.2],['Toba',5.4],
      ['Sialkot',4.8],['Hafizabad',4.2],['Narowal',3.8],['Faisalabad',11.2],['Sheikhupura',4.8],
    ],
    distTotal:'Rs 150.1B', distTop:'Multan (Rs 16.2B)',
  },
};

function updateSim(){
  const rain  = +document.getElementById('rainSlider').value;
  const temp  = +document.getElementById('tempSlider').value;
  const crop  = document.getElementById('cropSel').value;
  const area  = +document.getElementById('areaSlider').value;
  const price = +document.getElementById('priceSlider').value;
  const p     = CROP_PARAMS[crop];

  document.getElementById('rainVal').textContent  = rain + ' mm';
  document.getElementById('tempVal').textContent  = temp + ' °C';
  document.getElementById('areaVal').textContent  = area + ' Acres';
  document.getElementById('priceVal').textContent = 'Rs ' + price.toLocaleString();

  // Update slider backgrounds
  const rPct = (rain/700*100).toFixed(0);
  const tPct = ((temp-10)/40*100).toFixed(0);
  const aPct = (area/100*100).toFixed(0);
  const prPct= ((price-800)/8200*100).toFixed(0);
  document.getElementById('rainSlider').style.background  = `linear-gradient(90deg,#60a5fa ${rPct}%,rgba(255,255,255,.1) ${rPct}%)`;
  document.getElementById('tempSlider').style.background  = `linear-gradient(90deg,#f97316 ${tPct}%,rgba(255,255,255,.1) ${tPct}%)`;
  document.getElementById('areaSlider').style.background  = `linear-gradient(90deg,#22c55e ${aPct}%,rgba(255,255,255,.1) ${aPct}%)`;
  document.getElementById('priceSlider').style.background = `linear-gradient(90deg,#f59e0b ${prPct}%,rgba(255,255,255,.1) ${prPct}%)`;

  const rFactor = Math.max(0.2, 1 - Math.pow(Math.abs(rain-p.optRain)/p.optRain, .8)*0.9);
  const tFactor = Math.max(0.15, 1 - Math.pow(Math.abs(temp-p.optTemp)/28, 1.2)*0.85);
  const yld     = Math.max(0.1, p.base * rFactor * tFactor);
  const rev     = yld * area * (price/40);
  const cost    = area * p.baseCost;
  const profit  = rev - cost;
  const risk    = Math.round((1 - rFactor*tFactor)*100);

  document.getElementById('simYield').textContent   = yld.toFixed(2) + ' t/ha';
  document.getElementById('simRevenue').textContent = 'Rs ' + Math.round(rev/1000) + 'k';
  document.getElementById('simCosts').textContent   = 'Rs ' + Math.round(cost/1000) + 'k';
  document.getElementById('simProfit').textContent  = 'Rs ' + Math.round(Math.abs(profit)/1000) + (profit<0?'k (Loss)':'k');
  document.getElementById('simProfit').style.color  = profit>0?'#22c55e':'#ef4444';
  document.getElementById('simRisk').textContent    = risk + '%';
  const rl = document.getElementById('simRiskLabel');
  if(risk<30){rl.textContent='✅ Low Risk';rl.style.color='#22c55e';}
  else if(risk<60){rl.textContent='⚠ Moderate Risk';rl.style.color='#f59e0b';}
  else{rl.textContent='🔴 High Risk';rl.style.color='#ef4444';}

  const insights={
    low:'✅ Excellent conditions — optimal weather forecast for maximum yield. Consider increasing farm input investment for maximum returns this season.',
    moderate:'⚠ Moderate weather stress detected. Consider supplemental irrigation and foliar fertilizer to mitigate yield reduction. Estimated 15-25% below potential.',
    high:'🔴 Severe weather-income risk. Activate crop insurance claim process. Consider switching to drought/heat-resistant variety immediately.',
  };
  const tier = risk<30?'low':risk<60?'moderate':'high';
  document.getElementById('simInsight').textContent = insights[tier];

  if(simCh){
    simCh.data.datasets[0].data = [Math.round(rev/1000), Math.round(cost/1000), Math.max(0,Math.round(profit/1000))];
    simCh.data.datasets[0].backgroundColor = ['rgba(96,165,250,.7)','rgba(245,158,11,.7)',profit>0?'rgba(34,197,94,.7)':'rgba(239,68,68,.7)'];
    simCh.data.datasets[0].borderColor = ['#60a5fa','#f59e0b',profit>0?'#22c55e':'#ef4444'];
    simCh.update('none');
  }

  // ── Sync KPI cards, timeline chart & heatmap with selected crop ──
  updateCropDependentUI(crop);
}

let _lastCrop = 'wheat';
function updateCropDependentUI(crop) {
  if(crop === _lastCrop) return;
  _lastCrop = crop;
  const cd = CROP_ECON[crop];
  if(!cd) return;

  // 1) KPI cards
  const kpiEls = document.querySelectorAll('.kpi-val');
  const kpiBadges = document.querySelectorAll('.kpi-badge');
  const kpiProgs = document.querySelectorAll('.prog-f');
  if(kpiEls.length >= 4){
    kpiEls[0].textContent = cd.totalLoss;
    kpiEls[1].textContent = cd.gdp;
    kpiEls[2].textContent = cd.income;
    kpiEls[3].textContent = cd.inflation;
  }
  if(kpiBadges.length >= 4){
    kpiBadges[0].textContent = cd.lossBadge;
    kpiBadges[1].textContent = cd.gdpBadge;
    kpiBadges[2].textContent = cd.incomeBadge;
    kpiBadges[3].textContent = cd.inflBadge;
  }
  if(kpiProgs.length >= 4){
    kpiProgs[0].style.width = cd.lossBar;
    kpiProgs[1].style.width = cd.gdpBar;
    kpiProgs[2].style.width = cd.incomeBar;
    kpiProgs[3].style.width = cd.inflBar;
  }

  // 2) Sync global arrays used by timeline chart
  RAINFALL.length = 0; cd.rainfall.forEach(v => RAINFALL.push(v));
  YIELD.length    = 0; cd.yield.forEach(v   => YIELD.push(v));
  PRICE.length    = 0; cd.price.forEach(v   => PRICE.push(v));
  TEMP.length     = 0; cd.temp.forEach(v    => TEMP.push(v));

  // Update price dataset label inside existing chart
  if(tlChart){
    const priceDs = tlChart.data.datasets.find(d => d.label && d.label.includes('Price'));
    if(priceDs){ priceDs.label = cd.priceLabel; priceDs.data = [...cd.price]; }
    const rainDs  = tlChart.data.datasets.find(d => d.label === 'Rainfall (mm)');
    if(rainDs)  rainDs.data  = [...cd.rainfall];
    const yieldDs = tlChart.data.datasets.find(d => d.label === 'Yield (t/ha)');
    if(yieldDs) yieldDs.data = [...cd.yield];
    const tempDs  = tlChart.data.datasets.find(d => d.label === 'Temp (°C)');
    if(tempDs)  tempDs.data  = [...cd.temp];
    tlChart.update();
  }

  // 3) Heatmap — swap district data
  DISTRICT_LOSSES.length = 0;
  cd.districts.forEach(d => DISTRICT_LOSSES.push(d));
  renderHeatmap();

  // 4) Update heatmap footer text
  const hmFooter = document.querySelector('#ecoHeatmap')?.closest('.glass')?.querySelectorAll('div[style*="justify-content:space-between"]');
  if(hmFooter && hmFooter.length){
    const last = hmFooter[hmFooter.length - 1];
    last.innerHTML = `<span>Total Punjab Loss: <strong style="color:#ef4444;">${cd.distTotal}</strong></span><span>Most Affected: <strong style="color:#ef4444;">${cd.distTop}</strong></span>`;
  }
}

// ── MARKET TABLE ──────────────────────────────────────────────
function renderMarket(){
  const causeColor = {Flood:'rgba(239,68,68,.15)',Heatwave:'rgba(249,115,22,.15)',Drought:'rgba(245,158,11,.15)',Normal:'rgba(34,197,94,.15)'};
  const causeText  = {Flood:'#ef4444',Heatwave:'#f97316',Drought:'#f59e0b',Normal:'#22c55e'};
  const t = document.getElementById('mktTable');
  t.innerHTML = `<thead><tr>
    <th>Crop</th><th>Current Price</th><th>7-Day Δ</th><th>30-Day Δ</th><th>Weather Cause</th><th>Trend</th>
  </tr></thead><tbody>${MARKET_DATA.map(r=>{
    const d7  = ((r.cur-r.wk)/r.wk*100).toFixed(1);
    const d30 = ((r.cur-r.mo)/r.mo*100).toFixed(1);
    const isUp7  = r.cur>r.wk, isUp30 = r.cur>r.mo;
    const trend = isUp7?'↑ Surging':d7>0?'↗ Rising':'↓ Cooling';
    return `<tr>
      <td style="font-weight:700;">${r.crop}</td>
      <td style="font-weight:800;color:var(--text);">${r.unit.includes('kg')?'Rs '+r.cur:r.cur.toLocaleString()} <span style="font-size:9px;color:var(--muted);">${r.unit}</span></td>
      <td class="${isUp7?'trend-up':'trend-dn'}">${isUp7?'▲':'▼'} ${Math.abs(d7)}%</td>
      <td class="${isUp30?'trend-up':'trend-dn'}">${isUp30?'▲':'▼'} ${Math.abs(d30)}%</td>
      <td><span class="cause-badge" style="background:${causeColor[r.cause]};color:${causeText[r.cause]};">${r.cause}</span></td>
      <td style="font-size:11px;font-weight:600;color:${isUp7?'#ef4444':'#22c55e'};">${trend}</td>
    </tr>`;
  }).join('')}</tbody>`;

  // Shock cards
  document.getElementById('shockCards').innerHTML = SHOCK.map(s=>`
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px;text-align:center;">
      <div style="font-size:9px;color:var(--muted);">${s.label}</div>
      <div style="font-size:14px;font-weight:800;color:${s.color};margin-top:2px;">${s.change}</div>
    </div>`).join('');
}

// ── DISTRICT HEATMAP ──────────────────────────────────────────
function renderHeatmap(){
  const vals = DISTRICT_LOSSES.map(d=>d[1]);
  const mn=Math.min(...vals), mx=Math.max(...vals);
  const norm=v=>(v-mn)/(mx-mn);
  const col=t=>t<.33?`rgba(34,197,94,${.55+t*.4})`:t<.66?`rgba(245,158,11,${.55+t*.4})`:`rgba(239,68,68,${.45+t*.5})`;
  const hm = document.getElementById('ecoHeatmap');
  hm.style.gridTemplateColumns='repeat(5,1fr)';
  hm.innerHTML = DISTRICT_LOSSES.map(([n,v])=>{
    const t=norm(v);
    return `<div class="hm-cell" style="background:${col(t)};" title="${n}: Rs ${v}B loss">
      <div style="color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.8);font-size:10px;">Rs ${v}B</div>
      <div style="color:rgba(255,255,255,.75);font-size:8.5px;font-weight:400;margin-top:2px;text-shadow:0 1px 3px rgba(0,0,0,.8);">${n.length>9?n.slice(0,8)+'…':n}</div>
    </div>`;
  }).join('');
}

// ── POLICY CARDS ──────────────────────────────────────────────
function renderPolicies(){
  document.getElementById('policyCards').innerHTML = POLICIES.map(p=>`
    <div class="policy-card" style="background:${p.color}0d;border-color:${p.color}28;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:1.4rem;flex-shrink:0;">${p.icon}</span>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:800;margin-bottom:3px;">${p.title}
            <span style="float:right;padding:1px 8px;border-radius:20px;font-size:9px;font-weight:700;background:${p.color}20;color:${p.color};border:1px solid ${p.color}40;">ROI ${p.roi}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af;line-height:1.5;margin-bottom:5px;">${p.desc}</div>
          <div style="font-size:10px;color:${p.color};font-weight:700;">✓ ${p.impact}</div>
        </div>
      </div>
    </div>`).join('');
}

// ── EXPORT SIMULATION ─────────────────────────────────────────
function simulateExport(btn, label){
  const orig = btn.innerHTML;
  btn.innerHTML = `<i class="fa fa-spinner" style="animation:spin 1s linear infinite"></i><div><div style="font-size:11px;">Generating…</div></div>`;
  btn.disabled = true;
  const type = /alert/i.test(label) ? 'alerts' : /prediction/i.test(label) ? 'predictions' : 'weather';
  const url = typeof exportReportUrl === 'function' ? exportReportUrl(type) : null;
  if (url) {
    window.open(url, '_blank');
  }
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.disabled = false;
    const res = document.getElementById('exportResult');
    if (res) {
      res.innerHTML = `<div style="padding:10px 14px;border-radius:9px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);font-size:11px;color:#86efac;">
        <strong>${label}</strong> CSV download started — ${new Date().toLocaleString()}
      </div>`;
      setTimeout(() => { res.innerHTML = ''; }, 4000);
    }
  }, 600);
}

// ── ANIMATE BARS ──────────────────────────────────────────────
function animateBars(){
  setTimeout(()=>{
    document.querySelectorAll('.prog-f').forEach(b=>b.style.width=b.dataset.w);
    document.querySelectorAll('.macro-bar-fill').forEach(b=>b.style.width=b.dataset.w);
  },300);
}

// ── BOOT ──────────────────────────────────────────────────────
// Called by economi-live.js after API data loads; also called on bare DOMContentLoaded as fallback
function initEconomiCharts(apiData) {
  if (apiData?.monthly_climate?.length) {
    MONTHS.length = 0;
    RAINFALL.length = 0;
    TEMP.length = 0;
    apiData.monthly_climate.forEach((m) => {
      MONTHS.push(m.month_label || '—');
      RAINFALL.push(Math.round(parseFloat(m.avg_rain) || 0));
      TEMP.push(Math.round(parseFloat(m.avg_temp) || 0));
    });
    while (YIELD.length < MONTHS.length) YIELD.push(3 + Math.random());
    while (PRICE.length < MONTHS.length) PRICE.push(3000 + Math.round(Math.random() * 800));
  }
  if (apiData?.market?.length) {
    MARKET_DATA.length = 0;
    apiData.market.forEach((r) => {
      MARKET_DATA.push({
        crop: r.crop_name,
        unit: r.unit,
        cur: parseFloat(r.price_current),
        wk: parseFloat(r.price_week_ago),
        mo: parseFloat(r.price_month_ago),
        cause: r.shock_cause,
        sev: r.severity,
      });
    });
  }
  if (apiData?.district_losses?.length) {
    DISTRICT_LOSSES.length = 0;
    apiData.district_losses.forEach((r) => {
      DISTRICT_LOSSES.push([r.district, parseFloat(r.loss_pct)]);
    });
  }
  if (apiData?.policies?.length) {
    POLICIES.length = 0;
    apiData.policies.forEach((p) => {
      POLICIES.push({
        icon: p.icon || '📋',
        title: p.title,
        desc: p.desc || p.impact || '',
        impact: p.impact || '',
        color: '#22c55e',
        roi: p.roi || '200%',
      });
    });
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
  initTimeline();
  initDonut();
  initBubble();
  initSimChart();
  initROI();
  renderMarket();
  renderHeatmap();
  renderPolicies();
  updateSim();
  animateBars();
}

document.addEventListener('DOMContentLoaded', () => {
  // economi-live.js will call initEconomiCharts() once API data arrives.
  // This fallback fires ONLY if economi-live.js is absent or API fails.
  setTimeout(() => {
    if (!window.__economiLiveLoaded) {
      initEconomiCharts(null);
    }
  }, 800);
});