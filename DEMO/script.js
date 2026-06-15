// Global Navigation
function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  // Show target page
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add('active');
    window.scrollTo(0, 0);
  }
}

// Global state
let currentLandlordTab = 'properties';
let currentStudentTab = 'rent';
let currentZoom = 0.5; // Start zoomed out slightly
let signedPropertyPrice = 15000; // Track signed property price

// Initial Data Loading
document.addEventListener('DOMContentLoaded', () => {
  if (window.mockData && window.mockData.properties) {
    renderHomeCarousel(window.mockData.properties);
    renderMapList(window.mockData.properties);
    renderMapMarkers(window.mockData.properties);
    initDraggableMap();
    switchLandlordTab('properties'); // Init Page 7
    switchStudentTab('rent'); // Init Page 6
    
    // Set initial filter count
    document.getElementById('property-count').innerText = window.mockData.properties.length;
  }
});

// Accordion Toggle
function toggleAccordion(element) {
  const content = element.nextElementSibling;
  const icon = element.querySelector('svg');
  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    content.style.marginTop = '0';
    icon.style.transform = 'rotate(0deg)';
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    content.style.marginTop = '0.5rem';
    icon.style.transform = 'rotate(180deg)';
  }
}

// --- Page 0: Home Carousel ---
function renderHomeCarousel(properties) {
  const container = document.getElementById('home-carousel');
  if (!container) return;
  
  const topProps = properties.slice(0, 5);
  let html = '';
  topProps.forEach(prop => {
    const badgeHtml = prop.subsidy 
      ? `<div class="abs-badge badge">可租補</div>`
      : `<div class="abs-badge badge badge-gray">不可租補</div>`;
      
    html += `
      <div class="property-card" onclick="navigateTo(1)">
        ${badgeHtml}
        <img src="${prop.images[0]}" alt="Property Image">
        <div class="content">
          <div class="flex justify-between items-center mb-2">
            <h3 style="margin:0;">${prop.title}</h3>
            <div class="price">$${prop.price.toLocaleString()}</div>
          </div>
          <p style="font-size:0.9rem; margin-bottom:0.5rem;">${prop.address} · ${prop.size}坪 · ${prop.type}</p>
          <div class="flex items-center justify-between mt-2">
            <div style="font-size:0.8rem; color:#E2B255; font-weight:600;">
              ★ ${prop.landlord.rating} (${prop.reviews.length}則評價)
            </div>
            <div style="font-size:0.8rem; color:var(--morandi-sage); font-weight:600;">
              AI 契合度: ${prop.aiMatch}%
            </div>
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// --- Page 2: Landlord Upload Simulation ---
function simulateUpload() {
  const text = document.getElementById('dropzone-text');
  const dropzone = document.getElementById('dropzone');
  
  dropzone.style.borderColor = 'var(--morandi-sage)';
  dropzone.style.background = 'rgba(156, 175, 136, 0.1)';
  text.innerHTML = '✅ 檔案已成功載入：身分證正反面.pdf, 房屋權狀.pdf';
  
  document.getElementById('upload-status').style.display = 'block';
}

function simulateLandlordApproval() {
  const btn = document.getElementById('btn-landlord-submit');
  btn.innerText = '審核中...';
  btn.style.opacity = '0.7';
  
  setTimeout(() => {
    navigateTo(7);
    btn.innerText = '提交並前往管理後台';
    btn.style.opacity = '1';
  }, 1000);
}

// --- Page 3: Map View & Filters ---
function filterProperties() {
  const dist = document.getElementById('filter-district').value;
  const priceRange = document.getElementById('filter-price').value;
  const type = document.getElementById('filter-type').value;
  const subsidyOnly = document.getElementById('filter-subsidy').checked;

  let filtered = window.mockData.properties;

  if (dist !== '全部') {
    filtered = filtered.filter(p => p.district === dist);
  }
  
  if (priceRange !== '不限') {
    const [min, max] = priceRange.split('-').map(Number);
    filtered = filtered.filter(p => p.price >= min && p.price <= max);
  }
  
  if (type !== '全部' && type !== '套房') {
    filtered = filtered.filter(p => p.type === type);
  } else if (type === '套房') {
    filtered = filtered.filter(p => p.type === '套房');
  }

  if (subsidyOnly) {
    filtered = filtered.filter(p => p.subsidy === true);
  }

  document.getElementById('property-count').innerText = filtered.length;
  renderMapList(filtered);
  renderMapMarkers(filtered);
}

function renderMapList(properties) {
  const container = document.getElementById('map-property-list');
  if (!container) return;
  
  const displayProps = properties.slice(0, 15);
  let listHtml = '';
  
  if (properties.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#888; margin-top:2rem;">沒有符合條件的房源</p>`;
    return;
  }
  
  displayProps.forEach(prop => {
    listHtml += `
      <div class="glass-card mb-4" style="padding:1rem;">
        <div class="flex gap-4">
          <img src="${prop.images[0]}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;">
          <div style="flex:1;">
            <h4 style="margin:0; font-size:1rem;">${prop.title}</h4>
            <div style="color:var(--morandi-sage); font-weight:700;">$${prop.price.toLocaleString()}</div>
            <p style="font-size:0.8rem; margin:0.25rem 0;">${prop.type} · ${prop.size} 坪</p>
            <button class="btn btn-primary" style="padding:0.25rem 0.5rem; font-size:0.8rem; margin-top:0.5rem; width:100%;" onclick="prepareContract(${prop.price})">立即簽約</button>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = listHtml;
}

function renderMapMarkers(properties) {
  const layer = document.getElementById('map-markers-layer');
  if (!layer) return;
  
  let html = '';
  properties.forEach(prop => {
    html += `
      <div class="map-marker" style="top:${prop.mapY}%; left:${prop.mapX}%;" onclick="highlightProperty(${prop.id})">
        $${(prop.price/1000).toFixed(1)}k
      </div>
    `;
  });
  layer.innerHTML = html;
}

function highlightProperty(id) {
  const prop = window.mockData.properties.find(p => p.id === id);
  if(!prop) return;
  
  const container = document.getElementById('map-property-list');
  container.innerHTML = `
    <h4 style="color:var(--morandi-sage); margin-bottom:1rem;">您選中的房源：</h4>
    <div class="glass-card mb-4" style="padding:1rem; border:2px solid var(--morandi-sage);">
      <img src="${prop.images[0]}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:1rem;">
      <h4 style="margin:0; font-size:1.1rem;">${prop.title}</h4>
      <div style="color:var(--morandi-sage); font-weight:700; font-size:1.2rem;">$${prop.price.toLocaleString()}</div>
      <p style="font-size:0.9rem; margin:0.25rem 0;">${prop.address}</p>
      <p style="font-size:0.8rem; margin:0.25rem 0;">${prop.type} · ${prop.size} 坪</p>
      <p style="font-size:0.8rem; font-weight:bold;">AI 契合度: ${prop.aiMatch}%</p>
      <button class="btn btn-primary" style="padding:0.5rem; font-size:1rem; margin-top:1rem; width:100%;" onclick="prepareContract(${prop.price})">立即簽約</button>
    </div>
    <button class="btn btn-outline w-full" onclick="filterProperties()">返回過濾列表</button>
  `;
}

function checkRoommateTrigger(val) {
  if (val === '套房') {
    if(confirm("尋找套房？是否進入「AI 室友配對系統」尋找志同道合的室友？")) {
      navigateTo(4);
    }
  }
}

function prepareContract(price) {
  signedPropertyPrice = price;
  navigateTo(5);
}

// Draggable Map Logic & Zoom with clamping
function initDraggableMap() {
  const mapContainerOuter = document.getElementById('map-container-outer');
  const map = document.getElementById('draggable-map');
  if(!map || !mapContainerOuter) return;

  const mapWidth = 2000;
  const mapHeight = 2000;
  let isDragging = false;
  let startX, startY, currentX = -100, currentY = -100; // initial offset
  
  function clampCoordinates() {
    const containerW = mapContainerOuter.offsetWidth;
    const containerH = mapContainerOuter.offsetHeight;
    
    const scaledW = mapWidth * currentZoom;
    const scaledH = mapHeight * currentZoom;
    
    // Min X/Y (furthest negative we can go without showing right/bottom edge)
    const minX = containerW - scaledW;
    const minY = containerH - scaledH;
    
    // Max X/Y (furthest positive we can go without showing left/top edge)
    const maxX = 0;
    const maxY = 0;
    
    // If scaled map is smaller than container, lock it to center (rare but possible if zoomed out too much)
    if (scaledW < containerW) {
      currentX = (containerW - scaledW) / 2;
    } else {
      if (currentX > maxX) currentX = maxX;
      if (currentX < minX) currentX = minX;
    }
    
    if (scaledH < containerH) {
      currentY = (containerH - scaledH) / 2;
    } else {
      if (currentY > maxY) currentY = maxY;
      if (currentY < minY) currentY = minY;
    }
  }
  
  function applyMapTransform() {
    clampCoordinates();
    map.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentZoom})`;
  }
  
  // Set initial position
  applyMapTransform();

  map.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    map.style.cursor = 'grabbing';
    map.style.transition = 'none'; // disable transition while dragging for snappiness
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    applyMapTransform();
  });

  window.addEventListener('mouseup', () => {
    if(isDragging) {
      isDragging = false;
      map.style.cursor = 'grab';
      map.style.transition = 'transform 0.05s linear'; // restore
      applyMapTransform();
    }
  });
  
  // Wheel Zoom
  mapContainerOuter.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    // Calculate mouse position relative to map before zooming
    const rect = mapContainerOuter.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert to relative map coordinates
    const mapMouseX = (mouseX - currentX) / currentZoom;
    const mapMouseY = (mouseY - currentY) / currentZoom;
    
    const oldZoom = currentZoom;
    if (e.deltaY < 0) {
      currentZoom *= 1.1; // zoom in
    } else {
      currentZoom *= 0.9; // zoom out
    }
    
    // clamp zoom
    if(currentZoom < 0.3) currentZoom = 0.3;
    if(currentZoom > 2.5) currentZoom = 2.5;
    
    // Adjust currentX and currentY so the point under the mouse stays under the mouse
    currentX = mouseX - (mapMouseX * currentZoom);
    currentY = mouseY - (mapMouseY * currentZoom);
    
    applyMapTransform();
  });
  
  // Expose zoom map function globally for buttons
  window.zoomMap = function(factor) {
    const containerW = mapContainerOuter.offsetWidth;
    const containerH = mapContainerOuter.offsetHeight;
    
    const centerX = containerW / 2;
    const centerY = containerH / 2;
    
    const mapCenterX = (centerX - currentX) / currentZoom;
    const mapCenterY = (centerY - currentY) / currentZoom;
    
    currentZoom *= factor;
    if(currentZoom < 0.3) currentZoom = 0.3;
    if(currentZoom > 2.5) currentZoom = 2.5;
    
    currentX = centerX - (mapCenterX * currentZoom);
    currentY = centerY - (mapCenterY * currentZoom);
    
    applyMapTransform();
  }
}

// --- Page 4: Roommate Matching ---
function resetRoommates() {
  // Optional UI reset logic when form changes
}

function renderRoommates() {
  document.getElementById('roommate-results-section').style.display = 'block';
  const container = document.getElementById('roommate-results');
  
  // Get form values
  const qSleep = parseInt(document.getElementById('rm-q1').value);
  const qPet = parseInt(document.getElementById('rm-q3').value);
  const qClean = parseInt(document.getElementById('rm-q4').value);
  const qCook = parseInt(document.getElementById('rm-q8').value);
  const qRent = parseInt(document.getElementById('rm-q10').value);
  
  // Calculate dynamic match
  const roommates = window.mockData.roommates;
  roommates.forEach(person => {
    let penalty = 0;
    penalty += Math.abs(person.traits.sleep - qSleep) * 8;
    penalty += Math.abs(person.traits.pet - qPet) * 10;
    penalty += Math.abs(person.traits.clean - qClean) * 8;
    penalty += Math.abs(person.traits.cook - qCook) * 5;
    penalty += Math.abs(person.traits.rent - qRent) * 5;
    
    let matchScore = 99 - penalty;
    // Introduce slight randomness for realism so it's not identical integers
    matchScore = Math.floor(matchScore - (Math.random() * 3));
    if(matchScore < 40) matchScore = 40 + Math.floor(Math.random() * 10);
    
    person.match = matchScore;
  });
  
  // Sort roommates by match descending and take top 3
  const sortedRoommates = [...roommates].sort((a, b) => b.match - a.match);
  const top3 = sortedRoommates.slice(0, 3);
  
  let html = '';
  top3.forEach(person => {
    html += `
      <div class="glass-card slide-up">
        <div class="flex items-center gap-4 mb-4">
          <img src="${person.img}" style="width:60px; height:60px; border-radius:50%; object-fit:cover;">
          <div>
            <h3 style="margin:0;">${person.name}</h3>
            <p style="font-size:0.8rem; margin:0;">${person.dept}</p>
          </div>
        </div>
        <div class="mb-2">
          <div class="flex justify-between" style="font-size:0.9rem;">
            <span>契合度</span>
            <span style="color:var(--morandi-sage); font-weight:600;">${person.match}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: 0%;" data-target="${person.match}%"></div>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap mt-4 mb-4">
          ${person.tags.map(t => `<span class="badge badge-secondary" style="font-size:0.7rem;">${t}</span>`).join('')}
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary" style="flex:1; padding:0.5rem;" onclick="alert('正在播號給 ${person.name}...')">電話</button>
          <button class="btn btn-outline" style="flex:1; padding:0.5rem;" onclick="alert('已發送 Email 邀請給 ${person.name}！')">Email</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  setTimeout(() => {
    document.querySelectorAll('.progress-bar-fill').forEach(bar => {
      bar.style.width = bar.getAttribute('data-target');
    });
  }, 100);
  
  setTimeout(() => {
    document.getElementById('roommate-results-section').scrollIntoView({ behavior: 'smooth' });
  }, 200);
}

// --- Page 5: Contract ---
function signContract() {
  const cb = document.getElementById('contract-agree');
  if(!cb.checked) {
    alert("請先勾選同意契約條款！");
    return;
  }
  alert("合約簽署成功！正在為您跳轉至「我的租屋生活」...");
  
  // Force update Page 6 DOM
  const rentTopCard = document.getElementById('student-top-rent-amount');
  if(rentTopCard) rentTopCard.innerText = `$${signedPropertyPrice.toLocaleString()}`;
  switchStudentTab('rent');
  
  navigateTo(6);
}

// --- Page 6: Student Dashboard ---
function switchStudentTab(tabName) {
  currentStudentTab = tabName;
  
  // Update pill styles
  const buttons = document.querySelectorAll('#student-tabs button');
  buttons.forEach(btn => btn.classList.remove('active'));
  const btnArray = Array.from(buttons);
  const tabNames = ['rent', 'repairs', 'contract'];
  const activeIndex = tabNames.indexOf(tabName);
  if(activeIndex >= 0) buttons[activeIndex].classList.add('active');
  
  // Render Data
  const container = document.getElementById('student-list-container');
  let html = '';
  
  if (tabName === 'rent') {
    const rentData = [
      { date: '2026-05-03', status: '已繳清', amount: signedPropertyPrice },
      { date: '2026-04-05', status: '已繳清', amount: signedPropertyPrice },
      { date: '2026-03-02', status: '已繳清', amount: signedPropertyPrice },
      { date: '2026-02-05', status: '已繳清', amount: signedPropertyPrice },
      { date: '2026-01-04', status: '已繳清', amount: signedPropertyPrice },
      { date: '2025-12-05', status: '已繳清', amount: signedPropertyPrice }
    ];
    rentData.forEach(item => {
      html += `
        <div class="list-item">
          <div>
            <h4 style="margin:0;">月租金繳款</h4>
            <p style="margin:0; font-size:0.85rem; color:#666;">繳款日期：${item.date}</p>
          </div>
          <div class="flex items-center gap-4">
            <span style="font-weight:bold;">$${item.amount.toLocaleString()}</span>
            <span class="badge">${item.status}</span>
          </div>
        </div>
      `;
    });
  } else if (tabName === 'repairs') {
    const repairData = [
      { date: '2026-05-29', issue: '冷氣不冷 (客廳)', status: '處理中', class: 'badge-warning' },
      { date: '2025-10-12', issue: '熱水器點火不順', status: '已結案', class: 'badge-gray' },
      { date: '2025-08-03', issue: '洗手台水管微漏水', status: '已結案', class: 'badge-gray' }
    ];
    repairData.forEach(item => {
      html += `
        <div class="list-item">
          <div>
            <h4 style="margin:0;">${item.issue}</h4>
            <p style="margin:0; font-size:0.85rem; color:#666;">回報日期：${item.date}</p>
          </div>
          <span class="badge ${item.class}">${item.status}</span>
        </div>
      `;
    });
  } else if (tabName === 'contract') {
    html = `
      <div style="padding: 2rem;">
        <h3 class="mb-4">房屋租賃契約書 (已生效)</h3>
        <div class="scrollable-text-box" style="height: 300px; overflow-y: auto; background: #FAFAF8; padding: 1.5rem; border: 1px solid rgba(0,0,0,0.1); border-radius: var(--border-radius-sm); line-height: 1.8;">
          <p><strong>立契約書人：</strong> 出租人 平台認證房東 (以下簡稱甲方)、承租人 學生 (以下簡稱乙方)</p>
          <p>茲為房屋租賃事宜，雙方同意訂立本契約，條款如下：</p>
          <br>
          <h4>第一條：租賃標的物</h4>
          <p>台北市精華區 平台精選物件</p>
          <br>
          <h4>第二條：租賃期間</h4>
          <p>自民國 115 年 06 月 15 日起，至 116 年 06 月 14 日止，計一年。</p>
          <br>
          <h4>第三條：租金及押金</h4>
          <p>1. 租金依系統頁面顯示金額為準。<br>2. 押金為兩個月租金，於簽約時一次付清。</p>
          <br>
          <h4>第四條：修繕責任</h4>
          <p>房屋因自然損耗產生之修繕由甲方負責。若因乙方人為破壞，則由乙方負擔修繕費用。</p>
          <br>
          <p class="text-center" style="color:var(--morandi-sage); font-weight:bold;">✅ 已於 2026-05-01 簽署生效</p>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// --- Page 7: Landlord Dashboard ---
function switchLandlordTab(tabName) {
  currentLandlordTab = tabName;
  
  // Update pill styles
  const buttons = document.querySelectorAll('#landlord-tabs button');
  buttons.forEach(btn => btn.classList.remove('active'));
  const btnArray = Array.from(buttons);
  const tabNames = ['properties', 'tenants', 'contracts', 'payments', 'repairs', 'taxes'];
  const activeIndex = tabNames.indexOf(tabName);
  if(activeIndex >= 0) buttons[activeIndex].classList.add('active');
  
  // Render Data
  const container = document.getElementById('landlord-list-container');
  const data = window.mockData.landlord[tabName];
  let html = '';
  
  const iconSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--morandi-charcoal)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
  
  data.forEach((item, i) => {
    let mainTitle = '';
    let subTitle = '';
    let statusBadge = '';
    let infoStr = '';
    
    if (tabName === 'properties') {
      mainTitle = `物件 ${String.fromCharCode(65 + i)}： ${item.name}`;
      subTitle = item.address;
      statusBadge = item.status === "出租中" ? `<span class="badge">出租中</span>` : `<span class="badge badge-gray">${item.status}</span>`;
      infoStr = `資訊欄：月租金 $${item.price.toLocaleString()} ` + (item.tenant ? `/ 當前租客 ${item.tenant}` : '') + (item.nextDate ? ` / 下次收租 ${item.nextDate}` : '');
    } else if (tabName === 'tenants') {
      mainTitle = `租客履歷： ${item.name}`;
      subTitle = `申請物件：${item.target}`;
      statusBadge = item.status === '審核通過' ? `<span class="badge">審核通過</span>` : `<span class="badge badge-warning">${item.status}</span>`;
      infoStr = `申請日期：${item.date}`;
    } else if (tabName === 'contracts') {
      mainTitle = `合約： ${item.tenant}`;
      subTitle = `租賃標的：${item.target}`;
      statusBadge = `<span class="badge">生效中</span>`;
      infoStr = `合約到期日：${item.endDate}`;
    } else if (tabName === 'payments') {
      mainTitle = `租金催收： ${item.tenant}`;
      subTitle = `租賃標的：${item.target}`;
      statusBadge = item.status === '已繳清' ? `<span class="badge">已繳清</span>` : `<span class="badge badge-warning">${item.status}</span>`;
      infoStr = `應繳金額：$${item.amount.toLocaleString()} / 繳款期限：${item.dueDate}`;
    } else if (tabName === 'repairs') {
      mainTitle = `修繕請求： ${item.issue}`;
      subTitle = `物件：${item.target}`;
      statusBadge = item.status === '已結案' ? `<span class="badge badge-gray">已結案</span>` : `<span class="badge badge-warning">${item.status}</span>`;
      infoStr = `回報日期：${item.date}`;
    } else if (tabName === 'taxes') {
      mainTitle = `節稅試算： ${item.target}`;
      subTitle = `符合資格`;
      statusBadge = `<span class="badge">符合公益出租</span>`;
      infoStr = `年租金收入：$${item.rentIncome.toLocaleString()} / 預估節稅金額：$${item.savedTax.toLocaleString()}`;
    }

    html += `
      <div class="list-item">
        <div class="flex items-center gap-4" style="flex:1;">
          <div style="background:var(--morandi-grey-taupe); padding:1rem; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            ${iconSvg}
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h4 style="margin:0; font-size:1rem;">${mainTitle} <span style="font-size:0.8rem; font-weight:normal; color:#666;">(${subTitle})</span></h4>
            </div>
            <div class="flex items-center gap-2 mt-2">
              ${statusBadge}
              <span style="font-size:0.85rem; color:#666;">${infoStr}</span>
            </div>
          </div>
        </div>
        <button class="btn btn-outline" style="padding:0.25rem 0.75rem; font-size:0.85rem;">管理 / 查看</button>
      </div>
    `;
  });
  
  container.innerHTML = html;
}
