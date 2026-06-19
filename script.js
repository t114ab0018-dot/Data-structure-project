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
    if (pageId === 8) renderProfilePage();
    if (pageId === 3) {
      updateMapDashboardButton();
      filterProperties();
    }
    // Clear pending login targets if they navigate away from Login/Signing flow
    if (pageId !== 1 && pageId !== 5) {
      pendingStudentAction = null;
      studentAfterLoginTarget = null;
    }
    updateNavState();
    window.scrollTo(0, 0);
  }
}

// Global state
let currentLandlordTab = 'properties';
let currentStudentTab = 'rent';
let currentZoom = 0.5; // Start zoomed out slightly
let signedPropertyPrice = 15000; // Track signed property price
let uploadedLandlordDocs = false;
let studentAfterLoginTarget = null;
let pendingStudentAction = null;
let appState = {
  studentLoggedIn: false,
  landlordLoggedIn: false,
  signedContract: false,
  signedProperty: null,
  rentRecords: [],
  repairTickets: [],
  contractNotes: [],
  landlordNotes: {},
  profile: {},
  favoritePropertyIds: new Set(),
  recentPropertyIds: []
};

function createInitialState() {
  return {
    studentLoggedIn: false,
    landlordLoggedIn: false,
    signedContract: false,
    signedProperty: null,
    rentRecords: [
      { date: '2026-05-03', status: '已繳清', amount: signedPropertyPrice, method: '線上轉帳' },
      { date: '2026-04-05', status: '已繳清', amount: signedPropertyPrice, method: '線上轉帳' },
      { date: '2026-03-02', status: '已繳清', amount: signedPropertyPrice, method: 'ATM' },
      { date: '2026-02-05', status: '已繳清', amount: signedPropertyPrice, method: '線上轉帳' },
      { date: '2026-01-04', status: '已繳清', amount: signedPropertyPrice, method: '線上轉帳' },
      { date: '2025-12-05', status: '已繳清', amount: signedPropertyPrice, method: 'ATM' }
    ],
    repairTickets: [
      { date: '2026-05-29', issue: '冷氣不冷 (客廳)', status: '處理中', class: 'badge-warning', note: '房東已派師傅聯繫' },
      { date: '2025-10-12', issue: '熱水器點火不順', status: '已結案', class: 'badge-gray', note: '已更換電池' },
      { date: '2025-08-03', issue: '洗手台水管微漏水', status: '已結案', class: 'badge-gray', note: '已重新鎖緊接頭' }
    ],
    contractNotes: [
      { date: '2026-06-15', text: '已完成電子簽約與閱讀確認。' }
    ],
    landlordNotes: {},
    profile: {
      name: '王小明',
      phone: '0912-345-678',
      email: 'student@ntut.edu.tw',
      dept: '資工系 3 年級',
      avatarColor: 0
    },
    favoritePropertyIds: new Set(),
    recentPropertyIds: []
  };
}

// Initial Data Loading
document.addEventListener('DOMContentLoaded', () => {
  appState = createInitialState();
  
  // Force reset profile inputs to override browser's state restoration
  const nameInput = document.getElementById('profile-name');
  const phoneInput = document.getElementById('profile-phone');
  const emailInput = document.getElementById('profile-email');
  const deptInput = document.getElementById('profile-dept');
  if (nameInput) nameInput.value = appState.profile.name;
  if (phoneInput) phoneInput.value = appState.profile.phone;
  if (emailInput) emailInput.value = appState.profile.email;
  if (deptInput) deptInput.value = appState.profile.dept;
  syncProfileAvatar();

  if (window.mockData && window.mockData.properties) {
    renderHomeCarousel(window.mockData.properties);
    renderMapList(window.mockData.properties);
    renderMapMarkers(window.mockData.properties);
    initDraggableMap();
    handlePriceRangeInput(false);
    switchLandlordTab('properties'); // Init Page 7
    switchStudentTab('rent'); // Init Page 6
    
    // Set initial filter count
    document.getElementById('property-count').innerText = window.mockData.properties.length;
    updateNavState();
  }
});

function updateNavState() {
  const activePageId = document.querySelector('.page.active')?.id || 'page-0';
  const pageNumber = Number(activePageId.replace('page-', ''));
  const homeLink = document.getElementById('nav-home-link');
  const studentLink = document.getElementById('nav-student-link');
  const landlordLink = document.getElementById('nav-landlord-link');
  const profileIcon = document.getElementById('nav-profile-icon');
  const hideHomeAndStudent = [3, 5, 6, 7, 8].includes(pageNumber);
  if (homeLink) {
    homeLink.style.display = hideHomeAndStudent ? 'none' : '';
  }
  if (studentLink) {
    studentLink.style.display = hideHomeAndStudent ? 'none' : '';
  }
  if (landlordLink) {
    landlordLink.style.display = appState.studentLoggedIn || pageNumber === 7 ? 'none' : '';
  }
  if (profileIcon) {
    profileIcon.classList.toggle('visible', appState.studentLoggedIn);
  }
}

function updateMapDashboardButton() {
  const btn = document.getElementById('back-to-dashboard-btn');
  if (btn) btn.style.display = appState.signedContract ? 'inline-flex' : 'none';
}

function goStudentEntry() {
  if (!appState.studentLoggedIn) {
    navigateTo(1);
    return;
  }
  navigateTo(appState.signedContract ? 6 : 3);
}

function goProfileEntry() {
  if (!appState.studentLoggedIn) {
    studentAfterLoginTarget = 8;
    navigateTo(1);
    return;
  }
  navigateTo(8);
}

function goLandlordEntry() {
  navigateTo(appState.landlordLoggedIn ? 7 : 2);
}

function switchAuthPanel(role, mode) {
  const loginPanel = document.getElementById(`${role}-login-panel`);
  const registerPanel = document.getElementById(`${role}-register-panel`);
  const buttons = document.querySelectorAll(`#page-${role === 'student' ? 1 : 2} .segmented-control button`);
  if (!loginPanel || !registerPanel) return;
  loginPanel.style.display = mode === 'login' ? 'block' : 'none';
  registerPanel.style.display = mode === 'register' ? 'block' : 'none';
  buttons.forEach(btn => btn.classList.remove('active'));
  buttons[mode === 'login' ? 0 : 1]?.classList.add('active');
}

function loginStudent(mode = 'login') {
  appState.studentLoggedIn = true;
  appState.landlordLoggedIn = false;
  setupStudentSession(mode);
  syncProfileInputsFromLogin();
  if (pendingStudentAction) {
    const action = pendingStudentAction;
    pendingStudentAction = null;
    if (action.type === 'favorite') {
      toggleFavoriteProperty(action.propertyId);
      navigateTo(8);
      return;
    }
    if (action.type === 'contract') {
      prepareContract(action.price, action.propertyId);
      return;
    }
  }
  if (studentAfterLoginTarget) {
    const target = studentAfterLoginTarget;
    studentAfterLoginTarget = null;
    navigateTo(target);
    return;
  }
  navigateTo(appState.signedContract ? 6 : 3);
}

function setupStudentSession(mode) {
  if (mode === 'register') {
    appState.favoritePropertyIds = new Set();
    appState.recentPropertyIds = [];
    renderHomeCarousel(window.mockData.properties);
    return;
  }
  if (appState.favoritePropertyIds.size === 0 && appState.recentPropertyIds.length === 0 && window.mockData?.properties) {
    appState.favoritePropertyIds = new Set(window.mockData.properties.slice(0, 2).map(prop => prop.id));
    appState.recentPropertyIds = window.mockData.properties.slice(2, 5).map(prop => prop.id);
  }
  renderHomeCarousel(window.mockData.properties);
}

function loginLandlord() {
  appState.landlordLoggedIn = true;
  appState.studentLoggedIn = false;
  updateNavState();
  navigateTo(7);
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function openModal(title, bodyHtml, actionsHtml = '') {
  closeModal();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'app-modal';
  modal.innerHTML = `
    <div class="modal-panel">
      <div class="flex justify-between items-center gap-4">
        <h3 style="margin:0;">${title}</h3>
        <button class="btn btn-outline" style="padding:0.35rem 0.75rem;" onclick="closeModal()">關閉</button>
      </div>
      <div style="margin-top:1rem;">${bodyHtml}</div>
      ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}
    </div>
  `;
  modal.addEventListener('click', (event) => {
    if (event.target.id === 'app-modal') closeModal();
  });
  document.body.appendChild(modal);
  adjustTooltips();
}

function closeModal() {
  const modal = document.getElementById('app-modal');
  if (modal) modal.remove();
}

function adjustTooltips() {
  const tooltips = document.querySelectorAll('.jargon-tooltip');
  tooltips.forEach(el => {
    const textEl = el.querySelector('.tooltip-text');
    if (!textEl) return;
    
    if (el.dataset.tooltipInitialized) return;
    el.dataset.tooltipInitialized = 'true';
    
    el.addEventListener('mouseenter', () => {
      // Temporarily display at scale 1 with opacity 0 to measure accurately
      textEl.style.visibility = 'visible';
      textEl.style.opacity = '0';
      textEl.style.left = '50%';
      textEl.style.transform = 'translateX(-50%) scale(1)';
      
      // Force a reflow
      const tempWidth = textEl.offsetWidth; 
      
      const rect = textEl.getBoundingClientRect();
      
      // Check if inside a modal panel
      const modalPanel = el.closest('.modal-panel');
      let leftBoundary = 15;
      let rightBoundary = window.innerWidth - 15;
      
      if (modalPanel) {
        const containerRect = modalPanel.getBoundingClientRect();
        leftBoundary = containerRect.left + 8;
        rightBoundary = containerRect.right - 24; // account for scrollbar
      }
      
      let shiftX = 0;
      if (rect.left < leftBoundary) {
        shiftX = leftBoundary - rect.left;
      } else if (rect.right > rightBoundary) {
        shiftX = rightBoundary - rect.right;
      }
      
      textEl.style.left = `calc(50% + ${shiftX}px)`;
      textEl.style.setProperty('--arrow-shift', `${-shiftX}px`);
      
      // Restore styles and let CSS transition handle it
      textEl.style.visibility = '';
      textEl.style.opacity = '';
      textEl.style.transform = '';
    });
    
    el.addEventListener('mouseleave', () => {
      textEl.style.left = '';
      textEl.style.removeProperty('--arrow-shift');
    });
  });
}

function getPropertyById(propertyId) {
  return window.mockData.properties.find(prop => prop.id === propertyId);
}

function recordPropertyView(propertyId) {
  appState.recentPropertyIds = [propertyId, ...appState.recentPropertyIds.filter(id => id !== propertyId)].slice(0, 6);
}

function toggleFavoriteProperty(propertyId) {
  if (!appState.studentLoggedIn) {
    pendingStudentAction = { type: 'favorite', propertyId };
    studentAfterLoginTarget = null;
    navigateTo(1);
    return;
  }
  if (appState.favoritePropertyIds.has(propertyId)) {
    appState.favoritePropertyIds.delete(propertyId);
  } else {
    appState.favoritePropertyIds.add(propertyId);
  }
  renderProfilePage();
  filterProperties();
}

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
      <div class="property-card" onclick="viewPropertyDetail(${prop.id})">
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
          <div class="flex gap-2 mt-4">
            <button class="btn btn-outline" style="flex:1; padding:0.45rem; font-size:0.85rem;" onclick="event.stopPropagation(); toggleFavoriteProperty(${prop.id})">${appState.favoritePropertyIds.has(prop.id) ? '已收藏' : '收藏'}</button>
            <button class="btn btn-primary" style="flex:1; padding:0.45rem; font-size:0.85rem;" onclick="event.stopPropagation(); prepareContract(${prop.price}, ${prop.id})">簽約</button>
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
  uploadedLandlordDocs = true;
}

function simulateLandlordApproval() {
  if (!uploadedLandlordDocs) {
    simulateUpload();
  }
  const btn = document.getElementById('btn-landlord-submit');
  btn.innerText = '審核中...';
  btn.style.opacity = '0.7';
  
  setTimeout(() => {
    appState.studentLoggedIn = false;
    appState.landlordLoggedIn = true;
    navigateTo(7);
    btn.innerText = '提交並前往管理後台';
    btn.style.opacity = '1';
  }, 1000);
}

// --- Page 3: Map View & Filters ---
function handlePriceRangeInput(shouldFilter = true) {
  const maxInput = document.getElementById('filter-price-max');
  const maxLabel = document.getElementById('price-max-label');
  if (!maxInput) return;

  const max = Number(maxInput.value);
  maxLabel.innerText = max >= 35000 ? '$35,000+' : `$${max.toLocaleString()}`;
  if (shouldFilter) filterProperties();
}

function filterProperties() {
  const dist = document.getElementById('filter-district').value;
  const priceMax = Number(document.getElementById('filter-price-max').value);
  const type = document.getElementById('filter-type').value;
  const subsidyOnly = document.getElementById('filter-subsidy').checked;

  let filtered = window.mockData.properties;

  if (dist !== '全部') {
    filtered = filtered.filter(p => p.district === dist);
  }
  
  filtered = filtered.filter(p => p.price <= priceMax);
  
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
    const favoriteLabel = appState.favoritePropertyIds.has(prop.id) ? '取消收藏' : '收藏';
    const signButton = appState.signedContract
      ? `<button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.8rem; margin-top:0.5rem; width:100%;" onclick="showAlreadySignedNotice()">已簽約，僅供瀏覽</button>`
      : `<button class="btn btn-primary" style="padding:0.25rem 0.5rem; font-size:0.8rem; margin-top:0.5rem; width:100%;" onclick="prepareContract(${prop.price}, ${prop.id})">立即簽約</button>`;
    listHtml += `
      <div class="glass-card mb-4" style="padding:1rem;">
        <div class="flex gap-4">
          <img src="${prop.images[0]}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;">
          <div style="flex:1;">
            <h4 style="margin:0; font-size:1rem;">${prop.title}</h4>
            <div style="color:var(--morandi-sage); font-weight:700;">$${prop.price.toLocaleString()}</div>
            <p style="font-size:0.8rem; margin:0.25rem 0;">${prop.type} · ${prop.size} 坪</p>
            <div class="flex gap-2 mt-4">
              <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.8rem; flex:1;" onclick="viewPropertyDetail(${prop.id})">查看</button>
              <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.8rem; flex:1;" onclick="toggleFavoriteProperty(${prop.id})">${favoriteLabel}</button>
            </div>
            ${signButton}
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
  recordPropertyView(id);
  const favoriteLabel = appState.favoritePropertyIds.has(prop.id) ? '取消收藏' : '加入收藏';
  const signButton = appState.signedContract
    ? `<button class="btn btn-outline" style="padding:0.5rem; font-size:1rem; margin-top:1rem; width:100%;" onclick="showAlreadySignedNotice()">已簽約，僅供瀏覽</button>`
    : `<button class="btn btn-primary" style="padding:0.5rem; font-size:1rem; margin-top:1rem; width:100%;" onclick="prepareContract(${prop.price}, ${prop.id})">立即簽約</button>`;
  
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
      <div class="flex gap-2 mt-4">
        <button class="btn btn-outline" style="flex:1; padding:0.5rem; font-size:0.9rem;" onclick="viewPropertyDetail(${prop.id})">查看詳情</button>
        <button class="btn btn-outline" style="flex:1; padding:0.5rem; font-size:0.9rem;" onclick="toggleFavoriteProperty(${prop.id}); highlightProperty(${prop.id})">${favoriteLabel}</button>
      </div>
      ${signButton}
    </div>
    <button class="btn btn-outline w-full" onclick="filterProperties()">返回過濾列表</button>
  `;
}

function checkRoommateTrigger(val) {
  if (val === '雅房') {
    if(confirm("尋找雅房？是否進入「AI 室友配對系統」尋找志同道合的室友？")) {
      navigateTo(4);
    }
  }
}

function prepareContract(price, propertyId) {
  if (!appState.studentLoggedIn) {
    pendingStudentAction = { type: 'contract', price, propertyId };
    navigateTo(1);
    return;
  }
  if (appState.signedContract) {
    showAlreadySignedNotice();
    return;
  }
  signedPropertyPrice = price;
  appState.studentLoggedIn = true;
  appState.signedProperty = window.mockData.properties.find(p => p.id === propertyId) || appState.signedProperty;
  recordPropertyView(propertyId);
  navigateTo(5);
}

function showAlreadySignedNotice() {
  openModal('已完成簽約', `
    <p>您目前已有生效租約，仍可繼續看房與尋找室友，但 Demo 模式不會重複建立第二份簽約。</p>
    <p>可回到「我的租屋生活」查看租金、報修與合約狀態。</p>
  `, `<button class="btn btn-primary" onclick="closeModal(); navigateTo(6);">前往我的租屋生活</button>`);
}

function generateHouseDescription(prop) {
  const isSubsidy = prop.subsidy;
  const isSuite = prop.type === '套房' || prop.type === '雅房';
  const isEntire = prop.type === '整層住家';
  const price = prop.price;
  const district = prop.district;
  const id = prop.id;

  // Arrays of sentences for Slot 1 (Introduction & Title/Location)
  const slot1Options = [
    `【精選推薦】這間為您呈獻的「${prop.title}」位於台北市精華路段的${district}。本屋精心裝潢，格局方正，採光極佳，非常適合講究居住品質的北科大師生承租。本案在平台已通過實名審查，保證房源真實可信。`,
    `【黃金地段】位於交通極為便利的${district}，「${prop.title}」是目前非常搶手的優質物件。屋內通風良好，且擁有極佳的視野。合約由平台專業把關，完全符合規範，讓您租得安心、住得放心。`,
    `【優質釋出】搶先為您介紹這間坐落於${district}商圈的「${prop.title}」。室內動線設計流暢，空間寬敞舒適，開窗即可享受自然光線。房東非常友善，且願意提供完整的家具設備，免去您搬家的辛勞。`,
    `【機能好房】鄰近捷運站與生活圈的${district}「${prop.title}」，生活機能成熟且治安良好。屋況維持得非常優良，且產權直對屋主，絕非層層轉包的二手物件，能直接與房東建立良好溝通。`
  ];

  // Arrays of sentences for Slot 2 (Jargon 1: Lease Contract/Agent Rules)
  const slot2Options = [
    `為了徹底保障雙方交易安全，本案合約條款全面遵循內政部最新的住宅<span class="jargon-tooltip">定型化契約<span class="tooltip-text">【定型化契約】：內政部為保障交易公平所制定的標準合約規範，房東提供的合約條款若違反該規範（如限制租客申報租補或遷入戶籍），該約定無效。</span></span>標準，絕不含有任何不合理的單方限制條約。同時，本物件之產權直對屋主，並非由<span class="jargon-tooltip">二房東<span class="tooltip-text">【二房東】：向原屋主承租房屋後，再轉租給他人者。承租前務必確認其是否取得原屋主之書面轉租同意書，以免發生糾紛。</span></span>轉手承辦，避免了合約效力可能中斷的潛在風險。`,
    `本房源在出租時，為了確保居住人口的單純以及出入的安全，合約中特別訂有禁止擅自將房屋進行部分或全部<span class="jargon-tooltip">轉租<span class="tooltip-text">【轉租】：承租人將租賃住宅之全部或一部分轉租於他人居住使用。本契約明文禁止轉租，以維護學生住宿環境之單純與安全。</span></span>的約束條款，請承租人多加配合。若雙方有意達成租屋約定，可先行支付小額<span class="jargon-tooltip">定金<span class="tooltip-text">【定金】：租客為保留房屋，先支付給房東以示承諾承租的款項。本平台設有安全信託，簽約後定金將自動轉為押金的一部分。</span></span>以保留承租權，簽約後該款項將全額轉為押金。`,
    `在您決定承租本房源後，本案合約將在平台進行全數位化存檔。合約中載明提前退租的<span class="jargon-tooltip">違約金上限<span class="tooltip-text">【違約金上限】：若租約未約定可提前終止，租客提前退租且未依約定時間（通常為一個月前）通知，房東可要求違約金，但金額最高不得超過『1個月』租金。</span></span>，保障雙方在意外變更計畫時能有法理依據。同時，本合約鎖定屋主，絕非轉包的<span class="jargon-tooltip">二房東<span class="tooltip-text">【二房東】：向原屋主承租房屋後，再轉租給他人者。承租前務必確認其是否取得原屋主之書面轉租同意書，以免發生糾紛。</span></span>房源，產權清楚。`,
    `為了杜絕消費爭議，本平台上架房源皆保證遵循合法的租賃條款。無論是押金的繳納還是退還，均完全在法律規範下執行。本合約遵循<span class="jargon-tooltip">定型化契約<span class="tooltip-text">【定型化契約】：內政部為保障交易公平所制定的標準合約規範，房東提供的合約條款若違反該規範（如限制租客申報租補或遷入戶籍），該約定無效。</span></span>，不得有「禁止申報租金扣除額」等不平等事項。`
  ];

  // Arrays of sentences for Slot 3 (Jargon 2: Utilities/Bills and Deposit Rules)
  const slot3Options = [
    `在費用繳納方面，本物件裝設有獨立的<span class="jargon-tooltip">獨立電錶<span class="tooltip-text">【獨立電錶】：每個房間獨立設置的電錶。依照租賃新制，房東收取的電費額度不得超過台電公司該期帳單所記載之最高電價。</span></span>，您可以完全掌握自己的用電度數，電費收費標準也嚴格依據台電公告的費率計收。押金方面則收取法定上限的兩個月<span class="jargon-tooltip">押金限制<span class="tooltip-text">【押金限制】：依法規定，押金最高不得超過『2個月』的租金總額。若房東要求超收，租客有權拒絕，超收部分可抵充租金。</span></span>，並由平台進行公正記錄。`,
    `本物件的水電費用計算方式非常簡單透明，完全採用直接寄送的<span class="jargon-tooltip">台水台電<span class="tooltip-text">【台水台電】：直接按照台灣自來水公司與台灣電力公司之帳單面額繳費，無須透過房東加成計費，是最劃算且透明的繳費方式。</span></span>帳單，您可以拿著帳單直接去便利商店或透過行動支付繳款，不會有任何被加成收費的疑慮。承租本房源時，收取的兩個月<span class="jargon-tooltip">押金限制<span class="tooltip-text">【押金限制】：依法規定，押金最高不得超過『2個月』的租金總額。若房東要求超收，租客有權拒絕，超收部分可抵充租金。</span></span>將會於簽約時一次收訖並登載。`,
    `為了讓學生省荷包，本房間的電費是由專屬的<span class="jargon-tooltip">獨立電錶<span class="tooltip-text">【獨立電錶】：每個房間獨立設置的電錶。依照租賃新制，房東收取的電費額度不得超過台電公司該期帳單所記載之最高電價。</span></span>進行度數統計，公共電費則由全體租客公平分攤。在看房滿意後，平台會引導您支付<span class="jargon-tooltip">定金<span class="tooltip-text">【定金】：租客為保留房屋，先支付給房東以示承諾承租的款項。本平台設有安全信託，簽約後定金將自動轉為押金的一部分。</span></span>以鎖定房源，押金部分也是完全符合政府規定的兩個月度。`,
    `我們非常重視費用計收的公平性。本物件所有水電雜費均附有明細，公共水電與私人電費分開計算，私人房間電費配有<span class="jargon-tooltip">獨立電錶<span class="tooltip-text">【獨立電錶】：每個房間獨立設置的電錶。依照租賃新制，房東收取的電費額度不得超過台電公司該期帳單所記載之最高電價。</span></span>。押金的收取絕不超過法律明文規定的兩個月<span class="jargon-tooltip">押金限制<span class="tooltip-text">【押金限制】：依法規定，押金最高不得超過『2個月』的租金總額。若房東要求超收，租客有權拒絕，超收部分可抵充租金。</span></span>，點交退還手續透明。`
  ];

  // Arrays of sentences for Slot 4 (Jargon 3: Subsidies and Tax benefits)
  const slot4Options = [
    `更棒的是，本物件非常樂意配合且主動協助承租學生向政府申請<span class="jargon-tooltip">租金補貼<span class="tooltip-text">【租金補貼】：政府協助租屋族之補貼計畫，符合資格者可線上申請，核准後補助款直接撥入帳戶，且不需經房東同意即可申請。</span></span>，減輕您在台北市租屋的財務壓力。房東也已完成平台身分核實並登載為合格的<span class="jargon-tooltip">公益出租人<span class="tooltip-text">【公益出租人】：將房子租給符合租金補貼資格學生的房東，可享有綜合所得稅每屋每月最高1.5萬元免稅額，以及房屋稅、地價稅優惠。</span></span>，因此雙方均可共享政策帶來的實質利益。`,
    `本物件完全支持學生家庭申報年度綜合所得稅的<span class="jargon-tooltip">租金支出扣除額<span class="tooltip-text">【租金支出扣除額】：納稅義務人租屋供自住且無購屋借款利息支出者，其租金支出可列為所得稅扣除額，每戶申報上限已提高至18萬元。</span></span>，您只需將繳租憑證留存即可申報，能讓您省下一筆可觀的所得稅款。租約期滿時，只要您將房間清理乾淨完成<span class="jargon-tooltip">返還回復原狀<span class="tooltip-text">【返還回復原狀】：租約期滿退租時，租客有義務將房屋清理乾淨並歸還房東。除正常使用產生的折舊外，雙方點交後即退還押金。</span></span>，押金將全數無息退還。`,
    `房東人非常親切，承租本物件的學生均可直接在線上提報政府的<span class="jargon-tooltip">租金補貼<span class="tooltip-text">【租金補貼】：政府協助租屋族之補貼計畫，符合資格者可線上申請，核准後補助款直接撥入帳戶，且不需經房東同意即可申請。</span></span>，通過後每月可扣抵幾千元開銷。因為是實名制認證，房東享有<span class="jargon-tooltip">公益出租人<span class="tooltip-text">【公益出租人】：將房子租給符合租金補貼資格學生的房東，可享有綜合所得稅每屋每月最高1.5萬元免稅額，以及房屋稅、地價稅優惠。</span></span>稅率，因此十分歡迎學生申請。在退約點交時只要確認<span class="jargon-tooltip">返還回復原狀<span class="tooltip-text">【返還回復原狀】：租約期滿退租時，租客有義務將房屋清理乾淨並歸還房東。除正常使用產生的折舊外，雙方點交後即退還押金。</span></span>即可拿回押金。`,
    `我們非常支持居住正義。本房源完全配合學生申報所得稅的<span class="jargon-tooltip">租金支出扣除額<span class="tooltip-text">【租金支出扣除額】：納稅義務人租屋供自住且無購屋借款利息支出者，其租金支出可列為所得稅扣除額，每戶申報上限已提高至18萬元。</span></span>，以實質幫助減輕家庭負擔。同時也歡迎申請<span class="jargon-tooltip">租金補貼<span class="tooltip-text">【租金補貼】：政府協助租屋族之補貼計畫，符合資格者可線上申請，核准後補助款直接撥入帳戶，且不需經房東同意即可申請。</span></span>。合約點交手續公平，雙方清點家具並確認<span class="jargon-tooltip">返還回復原狀<span class="tooltip-text">【返還回復原狀】：租約期滿退租時，租客有義務將房屋清理乾淨並歸還房東。除正常使用產生的折舊外，雙方點交後即退還押金。</span></span>後即可完成點交退租。`
  ];

  // Use modulo to select unique combination
  const s1 = slot1Options[id % slot1Options.length];
  const s2 = slot2Options[(id + 1) % slot2Options.length];
  const s3 = slot3Options[(id + 2) % slot3Options.length];
  const s4 = slot4Options[(id + 3) % slot4Options.length];

  return `
    <p style="margin-bottom:0.75rem;">${s1} ${s2}</p>
    <p style="margin:0;">${s3} ${s4}</p>
  `;
}

function viewPropertyDetail(propertyId) {
  const prop = getPropertyById(propertyId);
  if (!prop) return;
  recordPropertyView(propertyId);
  
  // a3. Define layouts and amenities depending on property type
  let layout = '獨立套房 (1 房 0 廳 1 衛)';
  let amenities = '雙人床、分離式冷氣、儲熱式熱水器、衣櫃、書桌椅、小冰箱、獨立電錶';
  let waterElectricity = '台水台電 (依水電費帳單繳費)';
  let managementFee = '免收管理費';
  
  if (prop.type === '雅房') {
    layout = '雅房格局 (1 房 0 廳 共用衛浴)';
    amenities = '單人床、冷氣、書桌椅、衣櫃、共用冰箱、共用洗衣機、公用熱水器';
    waterElectricity = '租金已含水費/公共電費 (房內冷氣電費按錶另計)';
    managementFee = '免收管理費';
  } else if (prop.type === '整層住家') {
    layout = '整層家庭式 (3 房 2 廳 2 衛 2 陽台)';
    amenities = '冷氣三台、電視、沙發、餐桌椅、瓦斯爐、抽油煙機、雙門冰箱、洗衣機、熱水器、床組、衣櫃';
    waterElectricity = '台水台電 (自行持帳單向超商/銀行繳費)';
    managementFee = `管理費 $${(Math.floor(prop.price * 0.08 / 100) * 100).toLocaleString()} / 月`;
  }

  // Formatting amenities list as dynamic inline chips with checkmark icons
  const amenityChips = amenities.split('、').map(item => `
    <span style="display:inline-flex; align-items:center; gap:3px; background:white; padding:0.2rem 0.55rem; border-radius:6px; border:1px solid rgba(156,175,136,0.25); font-size:0.8rem; margin:2px 1px; color:var(--morandi-charcoal);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--morandi-sage)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"></polyline></svg>${item}
    </span>
  `).join(' ');

  // b3. Get landlord details dynamically
  const landlordNames = ['陳先生', '林小姐', '黃先生', '張太太', '劉先生', '王小姐'];
  const landlordName = landlordNames[prop.id % landlordNames.length];
  const landlordPhone = `09${(prop.id % 90 + 10)} - ${(prop.id % 900 + 100)} - ${(prop.id % 9000 + 1000)}`;
  const landlordLine = `line_id_${prop.id}`;

  // c3. VARY description templates dynamically so they are different for different properties
  const description = generateHouseDescription(prop);

  const favoriteLabel = appState.favoritePropertyIds.has(propertyId) ? '取消收藏' : '加入收藏';
  const signAction = appState.signedContract
    ? `<button class="btn btn-outline" onclick="showAlreadySignedNotice()">已簽約，僅供瀏覽</button>`
    : `<button class="btn btn-primary" onclick="closeModal(); prepareContract(${prop.price}, ${propertyId});">立即簽約</button>`;
  
  openModal('房源快速預覽', `
    <div class="prop-detail-container" style="animation: fadeIn 0.3s ease-in-out;">
      <img src="${prop.images[0]}" style="width:100%; height:240px; object-fit:cover; border-radius:12px; margin-bottom:1.25rem; box-shadow: var(--shadow-card);">
      
      <div class="flex justify-between items-start mb-2">
        <div>
          <h3 style="margin:0; font-size:1.4rem;">${prop.title}</h3>
          <p style="margin:0.25rem 0 0.5rem; font-size:0.95rem; color:#666;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:3px; color:var(--morandi-sage);"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${prop.address}
          </p>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.6rem; font-weight:700; color:var(--morandi-sage);">$${prop.price.toLocaleString()}<span style="font-size:0.9rem; font-weight:normal; color:#666;">/月</span></div>
          <div style="margin-top:0.25rem;">
            <span class="badge ${prop.subsidy ? '' : 'badge-gray'}">${prop.subsidy ? '可申請租補' : '不可租補'}</span>
          </div>
        </div>
      </div>

      <div class="flex gap-4 mb-4" style="font-size:0.9rem; color:#666; border-bottom:1px solid rgba(0,0,0,0.05); padding-bottom:0.75rem;">
        <span><strong>坪數：</strong>${prop.size} 坪</span>
        <span><strong>房型：</strong>${prop.type}</span>
        <span style="color:var(--morandi-sage); font-weight:600;">★ ${prop.landlord.rating} (${prop.reviews.length} 則評價)</span>
        <span style="color:var(--morandi-slate); font-weight:600; margin-left:auto;">AI 契合度: ${prop.aiMatch}%</span>
      </div>

      <!-- a3: 房屋配置 (跟文字描述區隔開來) -->
      <h4 style="font-size:1.05rem; margin-top:1.25rem; display:flex; align-items:center; gap:4px; color:var(--morandi-charcoal);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--morandi-sage)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>
        房屋配置與格局
      </h4>
      <div class="prop-config-grid">
        <div class="prop-config-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          <span><strong>格局：</strong>${layout}</span>
        </div>
        <div class="prop-config-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>
          <span><strong>水電費用：</strong>${waterElectricity}</span>
        </div>
        <div class="prop-config-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          <span><strong>管理費：</strong>${managementFee}</span>
        </div>
        <div class="prop-config-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span><strong>最短租期：</strong>一年</span>
        </div>
        <div class="prop-config-item prop-config-full" style="align-items: flex-start;">
          <!-- Feather package/box icon in front of amenities list -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          <div style="flex:1;">
            <strong>提供設備：</strong>
            <div style="margin-top:0.4rem; display:flex; flex-wrap:wrap; gap:4px;">
              ${amenityChips}
            </div>
          </div>
        </div>
      </div>

      <!-- b3: 房東資訊與評價 -->
      <h4 style="font-size:1.05rem; margin-top:1.25rem; display:flex; align-items:center; gap:6px; color:var(--morandi-charcoal);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--morandi-sage)" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="8" r="4"></circle></svg>
        認證房東資訊與評價
      </h4>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; background:rgba(152, 168, 184, 0.08); border:1px solid rgba(152, 168, 184, 0.2); border-radius:var(--border-radius-md); padding:0.85rem; margin:1rem 0; animation: fadeIn 0.4s ease-in-out;">
        <div>
          <p style="margin:0 0 0.35rem 0;"><strong>聯絡房東：</strong>${landlordName}</p>
          <p style="margin:0 0 0.35rem 0;"><strong>聯絡電話：</strong>${landlordPhone}</p>
          <p style="margin:0;"><strong>LINE ID：</strong>${landlordLine}</p>
        </div>
        <div style="border-left:1px solid rgba(152, 168, 184, 0.25); padding-left:0.85rem; display:flex; flex-direction:column; justify-content:center;">
          <p style="margin:0 0 0.35rem 0; color:#E2B255; font-weight:700; font-size:1.05rem;">
            ★ ${prop.landlord.rating} <span style="font-size:0.8rem; font-weight:normal; color:#666;">/ 5.0</span>
          </p>
          <p style="margin:0; font-size:0.8rem; color:#666;">該物件已通過平台實名認證與產權審查，累積 ${prop.reviews.length} 則學生真實評價。</p>
        </div>
      </div>

      <!-- c3: 文字描述與科普 -->
      <h4 style="font-size:1.05rem; margin-top:1.25rem; display:flex; align-items:center; gap:6px; color:var(--morandi-charcoal);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--morandi-sage)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        屋況描述與租屋科普 (滑鼠懸停底線字詞看註解)
      </h4>
      <div style="background:#FAFAF8; border:1px solid rgba(0,0,0,0.05); border-radius:var(--border-radius-md); padding:1.15rem; line-height:1.8; font-size:0.9rem; color:#555; text-align:justify; margin-top:0.75rem;">
        ${description}
      </div>
    </div>
  `, `
    <button class="btn btn-outline" onclick="toggleFavoriteProperty(${propertyId}); closeModal();">${favoriteLabel}</button>
    ${signAction}
  `);
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
  appState.studentLoggedIn = true;
  appState.signedContract = true;
  if (!appState.signedProperty) {
    appState.signedProperty = {
      title: '平台精選物件',
      address: '台北市精華區',
      price: signedPropertyPrice
    };
  }
  appState.rentRecords.forEach(record => record.amount = signedPropertyPrice);
  appState.contractNotes.unshift({ date: getTodayString(), text: `簽署 ${appState.signedProperty.title}，月租金 $${signedPropertyPrice.toLocaleString()}。` });
  
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
    html += `
      <div class="dashboard-actions">
        <button class="btn btn-primary" onclick="addRentRecord()">新增本月繳租紀錄</button>
        <button class="btn btn-outline" onclick="markLatestRentPaid()">將最新租金標為已繳清</button>
      </div>
    `;
    appState.rentRecords.forEach((item, index) => {
      html += `
        <div class="list-item">
          <div>
            <h4 style="margin:0;">月租金繳款</h4>
            <p style="margin:0; font-size:0.85rem; color:#666;">繳款日期：${item.date} / 方式：${item.method}</p>
          </div>
          <div class="flex items-center gap-4">
            <span style="font-weight:bold;">$${item.amount.toLocaleString()}</span>
            <span class="badge ${item.status === '待繳款' ? 'badge-warning' : ''}">${item.status}</span>
            <button class="btn btn-outline" style="padding:0.25rem 0.75rem; font-size:0.85rem;" onclick="toggleRentStatus(${index})">切換狀態</button>
          </div>
        </div>
      `;
    });
  } else if (tabName === 'repairs') {
    html += `
      <div class="dashboard-actions">
        <button class="btn btn-primary" onclick="focusRepairForm()">新增報修</button>
        <button class="btn btn-outline" onclick="advanceFirstRepair()">推進第一筆處理中報修</button>
      </div>
      <div class="repair-create-form" id="student-repair-form">
        <div class="input-group">
          <label>報修項目</label>
          <input type="text" id="student-repair-issue" placeholder="例如：浴室排水變慢">
        </div>
        <div class="input-group">
          <label>補充說明</label>
          <input type="text" id="student-repair-note" placeholder="例如：晚上洗澡後積水約 10 分鐘">
        </div>
        <button class="btn btn-primary" onclick="addRepairTicketFromForm()">送出報修</button>
      </div>
    `;
    appState.repairTickets.forEach((item, index) => {
      html += `
        <div class="list-item">
          <div>
            <h4 style="margin:0;">${item.issue}</h4>
            <p style="margin:0; font-size:0.85rem; color:#666;">回報日期：${item.date}</p>
            <div class="detail-note">${item.note || ''}</div>
          </div>
          <div class="flex items-center gap-4">
            <span class="badge ${item.class}">${item.status}</span>
            <button class="btn btn-outline" style="padding:0.25rem 0.75rem; font-size:0.85rem;" onclick="updateRepairTicket(${index})">更新</button>
          </div>
        </div>
      `;
    });
  } else if (tabName === 'contract') {
    const propertyName = appState.signedProperty ? appState.signedProperty.title : '尚未簽約物件';
    const propertyAddress = appState.signedProperty ? appState.signedProperty.address : '完成簽約後會顯示完整地址';
    const contractStatus = appState.signedContract ? '已生效' : '尚未簽署';
    html = `
      <div class="dashboard-actions">
        <button class="btn btn-primary" onclick="addContractNote()">新增合約備註</button>
        <button class="btn btn-outline" onclick="showContractSummary()">查看簽約摘要</button>
      </div>
      <div style="padding: 2rem;">
        <h3 class="mb-4">房屋租賃契約書 (${contractStatus})</h3>
        <div class="scrollable-text-box" style="height: 300px; overflow-y: auto; background: #FAFAF8; padding: 1.5rem; border: 1px solid rgba(0,0,0,0.1); border-radius: var(--border-radius-sm); line-height: 1.8;">
          <p class="text-center" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem; color: var(--morandi-charcoal);">中華民國住宅租賃契約書 (正式範本 - ${contractStatus})</p>
          <p><strong>立契約書人：</strong> 出租人 平台認證房東 (以下簡稱甲方)、承租人 北科大學生 (以下簡稱乙方)。</p>
          <p>茲為住宅租賃事宜，雙方同意訂立本契約，約定條款如下以資共同遵守：</p>
          <br>
          <h4>第一條：租賃標的物及範圍</h4>
          <p>1. 標的地址：${propertyAddress} (物件：${propertyName})。<br>
          2. 租賃範圍：住宅全部/獨立套房，包括附屬設備。甲方應擔保本住宅具備適租狀態，無結構性安全危害。</p>
          <br>
          <h4>第二條：租賃期間</h4>
          <p>自民國 115 年 06 月 15 日起至民國 116 年 06 月 14 日止。租期屆滿時，租賃關係即行消滅，乙方應即期返還房屋，不得主張不定期限繼續租用。</p>
          <br>
          <h4>第三條：租金約定及支付</h4>
          <p>1. 租金：本住宅每月租金為新台幣 $${signedPropertyPrice.toLocaleString()} 元整，租金為按月支付，乙方應於每月五日前支付之。<br>
          2. 支付方式：由乙方透過本平台所提供之轉帳通道或線上轉帳至甲方指定帳戶。<br>
          3. 稅費負擔：本契約若因乙方依法申請租金補貼，而使甲方適用「公益出租人」稅賦優惠，其綜合所得稅、房屋稅及地價稅之減免利益歸甲方所有。雙方同意不得因申請補助而增減租金。</p>
          <br>
          <h4>第四條：押金約定及返還</h4>
          <p>1. 押金數額：雙方約定押金為二個月租金之總額（即新台幣 $${(signedPropertyPrice * 2).toLocaleString()} 元整）。乙方應於本契約簽署之同時一次付清之。<br>
          2. 押金返還：租賃期滿或契約終止時，乙方返還房屋並結清相關費用（包括但不限於水電費、損壞賠償金），甲方應於點交完成後返還押金或扣除結清款後之餘額。</p>
          <br>
          <h4>第五條：使用租賃住宅之限制</h4>
          <p>1. 用途：本住宅限乙方作住宅居住使用，乙方不得將本住宅之全部或一部轉租、借用或以其他方式供第三人使用。<br>
          2. 規範：乙方應遵守公寓大廈管理規約，不得於住宅內從事違法行為、存放易燃或危險物品，亦不得影響周鄰安寧。</p>
          <br>
          <h4>第六條：修繕及改裝</h4>
          <p>1. 修繕責任：住宅或附屬設備因自然損耗或不可歸責於乙方之事由損壞時，由甲方負責修繕。乙方發現損壞時，應即時通知甲方，因乙方怠於通知致損害擴大者，乙方應負賠償責任。<br>
          2. 改裝限制：乙方非經甲方同意，不得任意改裝本住宅。若經甲方書面同意改裝，乙方於退租時應負回復原狀之義務。</p>
          <br>
          <h4>第七條：承租人之責任與義務</h4>
          <p>乙方應以善良管理人之注意義務保管並使用本住宅。因乙方之故意或過失致住宅毀損者，乙方應負損害賠償或修繕責任。</p>
          <br>
          <h4>第八條：任意終止租約之約定</h4>
          <p>1. 提前終止：本契約非經雙方書面同意，不得任意提前終止。<br>
          2. 違約處罰：若雙方約定得提前終止，欲提前終止之一方應於一個月前通知他方。未為先期通知而逕行終止者，應賠償他方最高不得超過一個月租金之違約金。</p>
          <br>
          <h4>第九條：住宅之返還與點交</h4>
          <p>租約期滿或契約終止時，乙方應將住宅回復原狀並將個人物品遷出，與甲方共同進行點交。乙方留置之物品視同廢棄物，甲方得逕行處理，處理費用由乙方負擔，並自押金中扣除。</p>
          <br>
          <h4>第十條：契約之效力與爭議解決</h4>
          <p>1. 本契約為電子合約，具有與實體紙本合約同等之法律效力。<br>
          2. 因本契約涉訟時，雙方同意以台灣台北地方法院為第一審管轄法院。</p>
          <br><br>
          <p class="text-center" style="color:var(--morandi-sage); font-weight:bold;">${appState.signedContract ? '已於本平台線上簽署生效' : '尚未簽署，請先完成房源簽約流程'}</p>
        </div>
        <h4 class="mt-6">合約互動備註</h4>
        ${appState.contractNotes.map(note => `<div class="list-item"><span>${note.date}</span><span style="font-size:0.9rem; color:#666;">${note.text}</span></div>`).join('')}
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function addRentRecord() {
  appState.rentRecords.unshift({
    date: getTodayString(),
    status: '待繳款',
    amount: signedPropertyPrice,
    method: '待確認'
  });
  switchStudentTab('rent');
}

function markLatestRentPaid() {
  if (appState.rentRecords.length === 0) addRentRecord();
  appState.rentRecords[0].status = '已繳清';
  appState.rentRecords[0].method = '線上轉帳';
  switchStudentTab('rent');
}

function toggleRentStatus(index) {
  const record = appState.rentRecords[index];
  if (!record) return;
  record.status = record.status === '已繳清' ? '待繳款' : '已繳清';
  record.method = record.status === '已繳清' ? '線上轉帳' : '待確認';
  switchStudentTab('rent');
}

function focusRepairForm() {
  const input = document.getElementById('student-repair-issue');
  if (input) input.focus();
}

function addRepairTicketFromForm() {
  const issueInput = document.getElementById('student-repair-issue');
  const noteInput = document.getElementById('student-repair-note');
  const issue = issueInput ? issueInput.value.trim() : '';
  if (!issue) return;
  
  const today = getTodayString();
  const noteText = noteInput && noteInput.value.trim() ? noteInput.value.trim() : '等待房東確認';
  const target = appState.signedProperty ? appState.signedProperty.title : '大安區 靜巷美套房';
  
  const ticket = {
    date: today,
    issue,
    status: '已送出',
    class: 'badge-warning',
    note: noteText
  };
  appState.repairTickets.unshift(ticket);
  
  // Sync to Landlord repairs
  if (window.mockData && window.mockData.landlord) {
    const landlordRepair = {
      target: target,
      issue: issue,
      date: today,
      status: '待處理',
      note: noteText
    };
    window.mockData.landlord.repairs.unshift(landlordRepair);
    
    // Trigger sync to update landlord note on property
    syncLandlordStatus('repairs', landlordRepair);
  }
  
  if (issueInput) issueInput.value = '';
  if (noteInput) noteInput.value = '';
  switchStudentTab('repairs');
}

function updateRepairTicket(index) {
  const ticket = appState.repairTickets[index];
  if (!ticket) return;
  if (ticket.status === '已送出') {
    ticket.status = '處理中';
    ticket.note = '房東已收到並安排維修';
    ticket.class = 'badge-warning';
  } else if (ticket.status === '處理中') {
    ticket.status = '已結案';
    ticket.note = '租客確認問題已排除';
    ticket.class = 'badge-gray';
  } else {
    ticket.status = '已送出';
    ticket.note = '重新開啟報修單';
    ticket.class = 'badge-warning';
  }
  
  // Sync back to Landlord repairs
  if (window.mockData && window.mockData.landlord) {
    const landlordRepair = window.mockData.landlord.repairs.find(r => r.issue === ticket.issue);
    if (landlordRepair) {
      if (ticket.status === '已結案') {
        landlordRepair.status = '已完成';
      } else if (ticket.status === '處理中') {
        landlordRepair.status = '處理中';
      } else {
        landlordRepair.status = '待處理';
      }
      landlordRepair.note = ticket.note;
      
      // Trigger sync to update landlord note on property
      syncLandlordStatus('repairs', landlordRepair);
    }
  }
  
  switchStudentTab('repairs');
}

function advanceFirstRepair() {
  const index = appState.repairTickets.findIndex(ticket => ticket.status !== '已結案');
  if (index >= 0) updateRepairTicket(index);
}

function addContractNote() {
  const text = prompt('新增合約備註', '已確認押金與租金金額。');
  if (!text) return;
  appState.contractNotes.unshift({ date: getTodayString(), text });
  switchStudentTab('contract');
}

function showContractSummary() {
  const propertyName = appState.signedProperty ? appState.signedProperty.title : '尚未簽約';
  openModal('簽約摘要', `
    <p><strong>簽約狀態：</strong>${appState.signedContract ? '已簽署' : '尚未簽署'}</p>
    <p><strong>房源：</strong>${propertyName}</p>
    <p><strong>月租金：</strong>$${signedPropertyPrice.toLocaleString()}</p>
    <p><strong>租約倒數：</strong>364 天</p>
  `);
}

// --- Page 8: Student Profile ---
const avatarGradients = [
  'linear-gradient(135deg,#9CAF88,#98A8B8)',
  'linear-gradient(135deg,#AFA3B0,#C4B5C7)',
  'linear-gradient(135deg,#98A8B8,#9CAF88)',
  'linear-gradient(135deg,#B8C5AA,#AFA3B0)'
];

function syncProfileInputsFromLogin() {
  const registerName = document.getElementById('student-register-name')?.value.trim();
  const loginId = document.getElementById('student-login-id')?.value.trim();
  if (registerName) appState.profile.name = registerName;
  if (loginId) appState.profile.email = `${loginId}@mail.ntut.edu.tw`;
}

function renderProfilePage() {
  const page = document.getElementById('page-8');
  if (!page) return;
  const profile = appState.profile;
  const nameInput = document.getElementById('profile-name');
  const phoneInput = document.getElementById('profile-phone');
  const emailInput = document.getElementById('profile-email');
  const deptInput = document.getElementById('profile-dept');
  if (nameInput && document.activeElement !== nameInput) nameInput.value = profile.name;
  if (phoneInput && document.activeElement !== phoneInput) phoneInput.value = profile.phone;
  if (emailInput && document.activeElement !== emailInput) emailInput.value = profile.email;
  if (deptInput && document.activeElement !== deptInput) deptInput.value = profile.dept;
  syncProfileAvatar();
  renderPropertyMiniList('profile-favorites', Array.from(appState.favoritePropertyIds), '尚未收藏房源。可在地圖找房或推薦卡片中加入收藏。', true);
  renderPropertyMiniList('profile-recent', appState.recentPropertyIds, '尚未瀏覽房源。點擊房源查看後會出現在這裡。', false);
  renderProfileRecommendations();
}

function syncProfileAvatar() {
  const preview = document.getElementById('profile-avatar-preview');
  const name = document.getElementById('profile-name')?.value || appState.profile.name || '?';
  if (!preview) return;
  preview.innerText = name.trim().charAt(0) || '?';
  preview.style.background = avatarGradients[appState.profile.avatarColor] || avatarGradients[0];
  document.querySelectorAll('.avatar-swatches button').forEach((btn, index) => {
    btn.classList.toggle('active', index === appState.profile.avatarColor);
  });
}

function selectAvatarColor(index) {
  appState.profile.avatarColor = index;
  syncProfileAvatar();
}

function simulateAvatarUpload() {
  openModal('上傳圖片', '<p>Demo 模式已模擬上傳完成。您可以使用色票切換頭像視覺。</p>');
}

function saveProfileChanges() {
  appState.profile.name = document.getElementById('profile-name').value.trim() || appState.profile.name;
  appState.profile.phone = document.getElementById('profile-phone').value.trim();
  appState.profile.email = document.getElementById('profile-email').value.trim();
  appState.profile.dept = document.getElementById('profile-dept').value.trim();

  const saveText = document.getElementById('profile-save-text');
  if (saveText) {
    saveText.innerText = '已儲存！';
    setTimeout(() => saveText.innerText = '儲存變更', 1200);
  }
  syncProfileAvatar();
}

function renderPropertyMiniList(containerId, ids, emptyText, allowRemove) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const props = ids.map(getPropertyById).filter(Boolean);
  if (props.length === 0) {
    container.innerHTML = `<div class="profile-empty">${emptyText}</div>`;
    return;
  }
  container.innerHTML = props.map(prop => `
    <div class="profile-property-mini">
      <img src="${prop.images[0]}" alt="${prop.title}">
      <div>
        <h4>${prop.title}</h4>
        <p>$${prop.price.toLocaleString()} / ${prop.type} / ${prop.size} 坪</p>
        <div class="profile-mini-actions">
          <button class="btn btn-outline" onclick="viewPropertyDetail(${prop.id})">查看</button>
          ${allowRemove
            ? `<button class="btn btn-outline" onclick="toggleFavoriteProperty(${prop.id})">移除收藏</button>`
            : `<button class="btn btn-outline" onclick="toggleFavoriteProperty(${prop.id})">${appState.favoritePropertyIds.has(prop.id) ? '已收藏' : '收藏'}</button>`}
          <button class="btn btn-primary" onclick="prepareContract(${prop.price}, ${prop.id})">簽約</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderProfileRecommendations() {
  const container = document.getElementById('profile-recommendations');
  if (!container || !window.mockData?.properties) return;
  const excluded = new Set([...appState.favoritePropertyIds, ...appState.recentPropertyIds]);
  const recommendations = window.mockData.properties
    .filter(prop => !excluded.has(prop.id))
    .sort((a, b) => b.aiMatch - a.aiMatch)
    .slice(0, 3);
  container.innerHTML = recommendations.map(prop => `
    <div class="profile-recommend-card">
      <img src="${prop.images[0]}" alt="${prop.title}">
      <div class="content">
        <div class="flex justify-between items-center gap-2">
          <h4 style="margin:0;">${prop.title}</h4>
          <span class="badge">${prop.aiMatch}%</span>
        </div>
        <p style="font-size:0.85rem; margin:0.45rem 0;">$${prop.price.toLocaleString()} / ${prop.type} / ${prop.district}</p>
        <div class="profile-mini-actions">
          <button class="btn btn-outline" onclick="viewPropertyDetail(${prop.id})">查看</button>
          <button class="btn btn-primary" onclick="toggleFavoriteProperty(${prop.id})">收藏</button>
        </div>
      </div>
    </div>
  `).join('');
}

// --- Page 7: Landlord Dashboard ---
function switchLandlordTab(tabName) {
  currentLandlordTab = tabName;
  
  // Update pill styles
  const buttons = document.querySelectorAll('#landlord-tabs button');
  buttons.forEach(btn => btn.classList.remove('active'));
  const btnArray = Array.from(buttons);
  const tabNames = ['properties', 'tenants', 'contracts', 'payments', 'repairs'];
  const activeIndex = tabNames.indexOf(tabName);
  if(activeIndex >= 0) buttons[activeIndex].classList.add('active');
  
  // Render Data
  const container = document.getElementById('landlord-list-container');
  const data = window.mockData.landlord[tabName];
  let html = '';
  const tabLabels = {
    properties: '物件',
    tenants: '租客履歷',
    contracts: '合約',
    payments: '租金紀錄',
    repairs: '修繕請求'
  };
  const plusIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>`;
  
  // Removed "查看本頁統計" button (c7)
  html += `
    <div class="dashboard-actions">
      <button class="btn btn-primary" onclick="addLandlordItem('${tabName}')">${plusIcon}<span>新增${tabLabels[tabName]}</span></button>
    </div>
  `;

  // b7. 新增修繕請求比照房客，提供 inline 新增表單
  if (tabName === 'repairs') {
    const propertyOptions = window.mockData.landlord.properties
      .map(p => `<option value="${p.name}">${p.name}</option>`)
      .join('');
      
    html += `
      <div class="repair-create-form" id="landlord-repair-form" style="grid-template-columns: 1fr 1.2fr 1.2fr auto; margin-bottom: 0.5rem; border-radius: var(--border-radius-sm);">
        <div class="input-group">
          <label>選擇物件</label>
          <select id="ll-repair-target">${propertyOptions}</select>
        </div>
        <div class="input-group">
          <label>報修項目</label>
          <input type="text" id="ll-repair-issue" placeholder="例如：水龍頭漏水">
        </div>
        <div class="input-group">
          <label>補充說明</label>
          <input type="text" id="ll-repair-note" placeholder="例如：浴室臉盆下方滴水">
        </div>
        <button class="btn btn-primary" onclick="addLandlordRepairFromForm()">送出報修</button>
      </div>
    `;
  }
  
  updateLandlordStatsDOM();
  
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
      statusBadge = item.status === '生效中' ? `<span class="badge">生效中</span>` : `<span class="badge badge-warning">${item.status}</span>`;
      infoStr = `合約到期日：${item.endDate}`;
    } else if (tabName === 'payments') {
      mainTitle = `租金催收： ${item.tenant}`;
      subTitle = `租賃標的：${item.target}`;
      statusBadge = item.status === '已繳清' ? `<span class="badge">已繳清</span>` : `<span class="badge badge-warning">${item.status}</span>`;
      infoStr = `應繳金額：$${item.amount.toLocaleString()} / 繳款期限：${item.dueDate}`;
    } else if (tabName === 'repairs') {
      mainTitle = `修繕請求： ${item.issue}`;
      subTitle = `物件：${item.target}`;
      statusBadge = item.status === '已完成' || item.status === '已結案' ? `<span class="badge badge-gray">${item.status}</span>` : `<span class="badge badge-warning">${item.status}</span>`;
      infoStr = `回報日期：${item.date}` + (item.note ? ` / 備註：${item.note}` : '');
    }
    const noteKey = `${tabName}-${i}`;
    const note = appState.landlordNotes[noteKey] ? `<div class="detail-note">${appState.landlordNotes[noteKey]}</div>` : '';
    const mediaHtml = item.photo
      ? `<img src="${item.photo}" style="width:56px; height:56px; object-fit:cover; border-radius:50%; box-shadow:0 4px 12px rgba(0,0,0,0.12);">`
      : iconSvg;

    html += `
      <div class="list-item">
        <div class="flex items-center gap-4" style="flex:1;">
          <div style="background:var(--morandi-grey-taupe); padding:1rem; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            ${mediaHtml}
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h4 style="margin:0; font-size:1rem;">${mainTitle} <span style="font-size:0.8rem; font-weight:normal; color:#666;">(${subTitle})</span></h4>
            </div>
            <div class="flex items-center gap-2 mt-2">
              ${statusBadge}
              <span style="font-size:0.85rem; color:#666;">${infoStr}</span>
            </div>
            ${note}
          </div>
        </div>
        <button class="btn btn-outline" style="padding:0.25rem 0.75rem; font-size:0.85rem;" onclick="manageLandlordItem('${tabName}', ${i})">管理 / 查看</button>
      </div>
      ${tabName === 'repairs' ? renderLandlordRepairControls(i, item) : ''}
    `;
  });
  if (data.length === 0) {
    html += `<div class="list-item"><p style="margin:0;">目前沒有資料，可點擊上方新增。</p></div>`;
  }
  
  container.innerHTML = html;
}

function addLandlordItem(tabName) {
  const data = window.mockData.landlord[tabName];
  const today = getTodayString();
  if (tabName === 'properties') {
    openLandlordPropertyForm();
  } else if (tabName === 'tenants') {
    openLandlordTenantForm();
  } else if (tabName === 'contracts') {
    data.unshift({ target: '北科旁機能套房', tenant: '王同學', endDate: '2027-06-15', status: '草稿' });
    switchLandlordTab(tabName);
  } else if (tabName === 'payments') {
    data.unshift({ target: '北科旁機能套房', tenant: '王同學', amount: 16800, dueDate: today, status: '待催收' });
    switchLandlordTab(tabName);
  } else if (tabName === 'repairs') {
    focusLandlordRepairForm();
  }
}

function focusLandlordRepairForm() {
  const input = document.getElementById('ll-repair-issue');
  if (input) input.focus();
}

function addLandlordRepairFromForm() {
  const targetSelect = document.getElementById('ll-repair-target');
  const issueInput = document.getElementById('ll-repair-issue');
  const noteInput = document.getElementById('ll-repair-note');
  
  const target = targetSelect ? targetSelect.value : '';
  const issue = issueInput ? issueInput.value.trim() : '';
  const note = noteInput ? noteInput.value.trim() : '';
  
  if (!issue) {
    alert('請輸入報修項目！');
    return;
  }
  
  const today = getTodayString();
  window.mockData.landlord.repairs.unshift({
    target,
    issue,
    date: today,
    status: '待處理',
    note: note || '房東已建立修繕案'
  });
  
  if (issueInput) issueInput.value = '';
  if (noteInput) noteInput.value = '';
  
  // Link state updates
  syncLandlordStatus('repairs', window.mockData.landlord.repairs[0]);
  switchLandlordTab('repairs');
}

function updateLandlordStatsDOM() {
  const landlord = window.mockData.landlord;
  const tenantsEl = document.getElementById('ll-stat-tenants');
  const contractsEl = document.getElementById('ll-stat-contracts');
  const incomeEl = document.getElementById('ll-stat-income');
  const repairsEl = document.getElementById('ll-stat-repairs');
  
  if (tenantsEl) {
    tenantsEl.innerText = landlord.tenants.length;
  }
  if (contractsEl) {
    contractsEl.innerText = landlord.contracts.length;
  }
  if (incomeEl) {
    const totalIncome = landlord.properties
      .filter(p => p.status === '出租中')
      .reduce((sum, p) => sum + p.price, 0);
    incomeEl.innerText = `$${totalIncome.toLocaleString()}`;
  }
  if (repairsEl) {
    const pendingRepairs = landlord.repairs
      .filter(r => r.status !== '已完成' && r.status !== '已結案')
      .length;
    repairsEl.innerText = pendingRepairs;
  }
}

function openLandlordPropertyForm() {
  openModal('新增出租物件', `
    <div class="modal-form-grid">
      <div class="input-group">
        <label>物件名稱</label>
        <input id="ll-property-name" type="text" value="北科旁機能套房">
      </div>
      <div class="input-group">
        <label>地址</label>
        <input id="ll-property-address" type="text" value="台北市大安區復興南路一段">
      </div>
      <div class="input-group">
        <label>月租金</label>
        <input id="ll-property-price" type="number" value="16800">
      </div>
      <div class="input-group">
        <label>出租狀態</label>
        <select id="ll-property-status">
          <option value="空置中">空置中</option>
          <option value="待簽約">待簽約</option>
          <option value="出租中">出租中</option>
        </select>
      </div>
      <div class="input-group">
        <label>房源照片</label>
        <input id="ll-property-photo" type="file" accept="image/*" onchange="previewLandlordFileName('ll-property-photo', 'll-property-photo-name')">
        <p id="ll-property-photo-name" class="detail-note">尚未選擇照片，送出後會使用 Demo 預設照片。</p>
      </div>
    </div>
  `, `
    <button class="btn btn-primary" onclick="submitLandlordPropertyForm()">新增物件</button>
  `);
}

function submitLandlordPropertyForm() {
  const name = document.getElementById('ll-property-name').value.trim() || '未命名物件';
  const address = document.getElementById('ll-property-address').value.trim() || '未填寫地址';
  const price = Number(document.getElementById('ll-property-price').value) || 0;
  const status = document.getElementById('ll-property-status').value;
  window.mockData.landlord.properties.unshift({
    id: Date.now(),
    name,
    address,
    status,
    price,
    tenant: null,
    nextDate: status === '出租中' ? '2026-07-05' : null,
    photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
  });
  closeModal();
  switchLandlordTab('properties');
}

function openLandlordTenantForm() {
  const propertyOptions = window.mockData.landlord.properties
    .map(property => `<option value="${property.name}">${property.name}</option>`)
    .join('');
  openModal('新增房客履歷', `
    <div class="modal-form-grid">
      <div class="input-group">
        <label>房客姓名</label>
        <input id="ll-tenant-name" type="text" value="王同學">
      </div>
      <div class="input-group">
        <label>申請物件</label>
        <select id="ll-tenant-target">${propertyOptions}</select>
      </div>
      <div class="input-group">
        <label>審核狀態</label>
        <select id="ll-tenant-status">
          <option value="審核中">審核中</option>
          <option value="審核通過">審核通過</option>
        </select>
      </div>
      <div class="input-group">
        <label>房客照片</label>
        <input id="ll-tenant-photo" type="file" accept="image/*" onchange="previewLandlordFileName('ll-tenant-photo', 'll-tenant-photo-name')">
        <p id="ll-tenant-photo-name" class="detail-note">尚未選擇照片，送出後會使用 Demo 預設頭像。</p>
      </div>
    </div>
  `, `
    <button class="btn btn-primary" onclick="submitLandlordTenantForm()">新增房客</button>
  `);
}

function submitLandlordTenantForm() {
  const name = document.getElementById('ll-tenant-name').value.trim() || '未命名房客';
  const target = document.getElementById('ll-tenant-target').value;
  const status = document.getElementById('ll-tenant-status').value;
  const item = {
    name,
    target,
    status,
    date: getTodayString(),
    photo: 'https://i.pravatar.cc/150?img=32'
  };
  window.mockData.landlord.tenants.unshift(item);
  syncLandlordStatus('tenants', item);
  closeModal();
  switchLandlordTab('tenants');
}

function previewLandlordFileName(inputId, targetId) {
  const input = document.getElementById(inputId);
  const target = document.getElementById(targetId);
  if (input && target && input.files && input.files[0]) {
    target.innerText = `已選擇：${input.files[0].name}`;
  }
}

function renderLandlordRepairControls(index, item) {
  const statuses = ['待處理', '已聯絡', '處理中', '已完成'];
  return `
    <div class="repair-note-box">
      <div class="repair-status-actions">
        ${statuses.map(status => `
          <button class="btn ${item.status === status ? 'btn-primary' : 'btn-outline'}" onclick="setLandlordRepairStatus(${index}, '${status}')">${status}</button>
        `).join('')}
      </div>
      <div class="input-group">
        <label>房東修繕備註</label>
        <textarea id="landlord-repair-note-${index}" placeholder="例如：已聯絡水電師傅，預計週五下午到場。">${item.note || ''}</textarea>
      </div>
      <div>
        <button class="btn btn-outline" onclick="saveLandlordRepairNote(${index})">儲存備註</button>
      </div>
    </div>
  `;
}

function setLandlordRepairStatus(index, status) {
  const item = window.mockData.landlord.repairs[index];
  if (!item) return;
  item.status = status;
  syncLandlordStatus('repairs', item);
  switchLandlordTab('repairs');
}

function saveLandlordRepairNote(index) {
  const item = window.mockData.landlord.repairs[index];
  const input = document.getElementById(`landlord-repair-note-${index}`);
  if (!item || !input) return;
  item.note = input.value.trim();
  syncLandlordStatus('repairs', item);
  switchLandlordTab('repairs');
}

// showLandlordTabSummary removed

function manageLandlordItem(tabName, index) {
  const item = window.mockData.landlord[tabName][index];
  if (!item) return;
  const noteKey = `${tabName}-${index}`;
  const detailHtml = Object.entries(item).map(([key, value]) => {
    const shownValue = value === null ? '無' : value;
    return `<p><strong>${key}：</strong>${shownValue}</p>`;
  }).join('') + (appState.landlordNotes[noteKey] ? `<p><strong>管理備註：</strong>${appState.landlordNotes[noteKey]}</p>` : '');
  openModal('管理 / 查看', detailHtml, `
    <button class="btn btn-primary" onclick="updateLandlordItemStatus('${tabName}', ${index})">推進狀態</button>
    <button class="btn btn-outline" onclick="addLandlordItemNote('${tabName}', ${index})">新增備註</button>
  `);
}

function updateLandlordItemStatus(tabName, index) {
  const item = window.mockData.landlord[tabName][index];
  if (!item) return;
  if (tabName === 'properties') {
    item.status = item.status === '出租中' ? '空置中' : '出租中';
    item.nextDate = item.status === '出租中' ? '2026-07-05' : null;
  } else if (tabName === 'tenants') {
    item.status = item.status === '審核通過' ? '審核中' : '審核通過';
  } else if (tabName === 'contracts') {
    item.status = item.status === '生效中' ? '待簽署' : '生效中';
  } else if (tabName === 'payments') {
    item.status = item.status === '已繳清' ? '逾期未繳' : '已繳清';
  } else if (tabName === 'repairs') {
    const statuses = ['待處理', '已聯絡', '處理中', '已完成'];
    const currentIndex = statuses.indexOf(item.status);
    item.status = statuses[(currentIndex + 1) % statuses.length];
  } else if (tabName === 'taxes') {
    item.status = item.status && item.status.includes('符合') ? '審核中' : '符合公益出租';
    item.savedTax = item.status.includes('符合') ? 14400 : 0;
  }
  syncLandlordStatus(tabName, item);
  closeModal();
  switchLandlordTab(tabName);
}

function syncLandlordStatus(tabName, item) {
  const landlord = window.mockData.landlord;
  const propName = item.name || item.target;
  if (!propName) return;

  const property = landlord.properties.find(p => p.name === propName);
  if (!property) return;

  // Sync Repair requests separately since they don't directly control occupancy
  if (tabName === 'repairs') {
    const propertyIndex = landlord.properties.indexOf(property);
    if (propertyIndex >= 0) {
      appState.landlordNotes[`properties-${propertyIndex}`] = `最新修繕：${item.issue} / ${item.status}${item.note ? ` / ${item.note}` : ''}`;
    }

    // Bidirectional sync with Student Repair Ticket
    if (appState.signedProperty && appState.signedProperty.title === item.target) {
      let studentRepair = appState.repairTickets.find(r => r.issue === item.issue);
      if (!studentRepair) {
        studentRepair = {
          date: item.date,
          issue: item.issue,
          status: '已送出',
          class: 'badge-warning',
          note: item.note || '等待房東確認'
        };
        appState.repairTickets.unshift(studentRepair);
      }
      
      if (item.status === '已完成') {
        studentRepair.status = '已結案';
        studentRepair.class = 'badge-gray';
      } else if (item.status === '處理中') {
        studentRepair.status = '處理中';
        studentRepair.class = 'badge-warning';
      } else {
        studentRepair.status = '已送出';
        studentRepair.class = 'badge-warning';
      }
      studentRepair.note = item.note || `進度更新：${item.status}`;
      
      const page6 = document.getElementById('page-6');
      if (page6 && page6.classList.contains('active') && currentStudentTab === 'repairs') {
        switchStudentTab('repairs');
      }
    }
    updateLandlordStatsDOM();
    return;
  }

  // Define status modes for rental flow mapping
  let mode = null;

  if (tabName === 'properties') {
    if (item.status === '出租中') mode = 'active';
    else if (item.status === '待簽約') mode = 'pending';
    else if (item.status === '空置中') mode = 'vacant';
  } else if (tabName === 'tenants') {
    if (item.status === '審核通過') mode = 'active';
    else if (item.status === '審核中') mode = 'pending';
  } else if (tabName === 'contracts') {
    if (item.status === '生效中') mode = 'active';
    else if (item.status === '待簽署') mode = 'pending';
    else if (item.status === '草稿') mode = 'vacant';
  } else if (tabName === 'payments') {
    if (item.status === '已繳清' || item.status === '逾期未繳') mode = 'active';
    else if (item.status === '待催收') mode = 'pending';
  }

  if (mode === 'active') {
    // 1. Property
    property.status = '出租中';
    if (!property.tenant || property.tenant === '無') {
      property.tenant = item.tenant || item.name || '張同學';
    }
    
    // Check if overdue
    const paymentItem = landlord.payments.find(p => p.target === propName);
    if (paymentItem && paymentItem.status === '逾期未繳') {
      property.nextDate = '逾期提醒中';
    } else {
      property.nextDate = '2026-07-05';
    }

    // 2. Tenant
    let tenantItem = landlord.tenants.find(t => t.target === propName);
    if (tenantItem) {
      tenantItem.status = '審核通過';
      if (property.tenant && property.tenant !== '無') {
        tenantItem.name = property.tenant;
      }
    } else {
      landlord.tenants.unshift({
        name: property.tenant,
        target: propName,
        status: '審核通過',
        date: getTodayString(),
        photo: 'https://i.pravatar.cc/150?img=32'
      });
    }

    // 3. Contract
    let contractItem = landlord.contracts.find(c => c.target === propName);
    if (contractItem) {
      contractItem.status = '生效中';
      contractItem.tenant = property.tenant;
    } else {
      landlord.contracts.unshift({
        target: propName,
        tenant: property.tenant,
        endDate: '2027-06-15',
        status: '生效中'
      });
    }

    // 4. Payment
    let paymentItemObj = landlord.payments.find(p => p.target === propName);
    if (paymentItemObj) {
      paymentItemObj.tenant = property.tenant;
      if (tabName !== 'payments') {
        paymentItemObj.status = '已繳清';
      } else {
        paymentItemObj.status = item.status;
      }
    } else {
      landlord.payments.unshift({
        target: propName,
        tenant: property.tenant,
        amount: property.price,
        dueDate: '2026-06-05',
        status: '已繳清'
      });
    }
    
    // 5. Taxes
    let taxItem = landlord.taxes.find(t => t.target === propName);
    if (taxItem) {
      taxItem.status = '符合公益出租';
      taxItem.savedTax = 14400;
    } else {
      landlord.taxes.unshift({
        target: propName,
        rentIncome: property.price * 12,
        savedTax: 14400,
        status: '符合公益出租'
      });
    }
  } else if (mode === 'pending') {
    // 1. Property
    property.status = '待簽約';
    property.nextDate = null;

    // 2. Tenant
    let tenantItem = landlord.tenants.find(t => t.target === propName);
    if (tenantItem) {
      tenantItem.status = '審核中';
    } else {
      landlord.tenants.unshift({
        name: '待定租客',
        target: propName,
        status: '審核中',
        date: getTodayString(),
        photo: 'https://i.pravatar.cc/150?img=32'
      });
    }

    // 3. Contract
    let contractItem = landlord.contracts.find(c => c.target === propName);
    if (contractItem) {
      contractItem.status = '待簽署';
      contractItem.tenant = tenantItem ? tenantItem.name : '待定租客';
    } else {
      landlord.contracts.unshift({
        target: propName,
        tenant: tenantItem ? tenantItem.name : '待定租客',
        endDate: '2027-06-15',
        status: '待簽署'
      });
    }

    // 4. Payment
    let paymentItemObj = landlord.payments.find(p => p.target === propName);
    if (paymentItemObj) {
      paymentItemObj.status = '待催收';
      paymentItemObj.tenant = tenantItem ? tenantItem.name : '待定租客';
    } else {
      landlord.payments.unshift({
        target: propName,
        tenant: tenantItem ? tenantItem.name : '待定租客',
        amount: property.price,
        dueDate: '2026-06-05',
        status: '待催收'
      });
    }
  } else if (mode === 'vacant') {
    // 1. Property
    property.status = '空置中';
    property.tenant = '無';
    property.nextDate = null;

    // 2. Tenant
    let tenantItem = landlord.tenants.find(t => t.target === propName);
    if (tenantItem) {
      tenantItem.status = '審核中';
      tenantItem.name = '無';
    }

    // 3. Contract
    let contractItem = landlord.contracts.find(c => c.target === propName);
    if (contractItem) {
      contractItem.status = '草稿';
      contractItem.tenant = '無';
    }

    // 4. Payment
    let paymentItemObj = landlord.payments.find(p => p.target === propName);
    if (paymentItemObj) {
      paymentItemObj.status = '待催收';
      paymentItemObj.tenant = '無';
    }
  }

  updateLandlordStatsDOM();
}

function addLandlordItemNote(tabName, index) {
  const note = prompt('請輸入管理備註', '已電話聯繫確認。');
  if (!note) return;
  appState.landlordNotes[`${tabName}-${index}`] = note;
  closeModal();
  switchLandlordTab(tabName);
}
