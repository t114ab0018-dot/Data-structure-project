const state = {
  selectedPropertyId: mockData.properties[0].id,
  repairStep: mockData.student.currentRepairStep,
  footprintsVisible: false,
  matchRun: 0
};

const knowledgeMap = new Map(Object.entries(mockData.knowledge));

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setView(viewId) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  $$(".top-actions [data-view]").forEach((button) => {
    button.classList.toggle("active-route", button.dataset.view === viewId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatMoney(value) {
  return `$${value.toLocaleString("zh-TW")}`;
}

function getFilteredProperties() {
  const district = $("#districtFilter").value;
  const type = $("#typeFilter").value;
  const subsidyOnly = $("#subsidyFilter").checked;
  const maxPrice = Number($("#priceFilter").value);
  const maxMrt = Number($("#mrtFilter").value);

  return mockData.properties.filter((property) => {
    if (district !== "all" && property.district !== district) return false;
    if (type !== "all" && property.type !== type) return false;
    if (subsidyOnly && !property.subsidy) return false;
    if (property.price > maxPrice) return false;
    return property.mrtDistance <= maxMrt;
  });
}

function renderFilterOptions() {
  const districts = ["all", ...new Set(mockData.properties.map((property) => property.district))];
  const types = ["all", ...new Set(mockData.properties.map((property) => property.type))];
  $("#districtFilter").innerHTML = districts.map((item) => `<option value="${item}">${item === "all" ? "全部區域" : item}</option>`).join("");
  $("#typeFilter").innerHTML = types.map((item) => `<option value="${item}">${item === "all" ? "全部類型" : item}</option>`).join("");
}

function renderMap() {
  const filtered = getFilteredProperties();
  const map = $("#mapCanvas");
  const district = $("#districtFilter").value;
  $("#priceOutput").textContent = $("#priceFilter").value;
  $("#mrtOutput").textContent = $("#mrtFilter").value;

  if (!filtered.some((property) => property.id === state.selectedPropertyId)) {
    state.selectedPropertyId = filtered[0]?.id || null;
  }

  const markers = filtered.map((property) => `
    <button class="marker" style="left:${property.x}%; top:${property.y}%" data-property="${property.id}" aria-label="${property.title}">
      ${(property.price / 1000).toFixed(1)}K
    </button>
  `).join("");

  map.dataset.district = district;
  map.innerHTML = `${renderMapBackdrop(district)}${markers || "<div class='empty-map-label'>沒有符合條件的房源</div>"}`;
  $$("[data-property]").forEach((marker) => marker.addEventListener("click", () => {
    state.selectedPropertyId = Number(marker.dataset.property);
    renderPropertyDetail();
  }));
  renderPropertyDetail();
}

function renderMapBackdrop(district) {
  const configs = {
    all: {
      title: "北科大周邊租屋熱區",
      labels: [
        { text: "北科大", x: 50, y: 52, highlight: true },
        { text: "忠孝新生", x: 44, y: 40 },
        { text: "大安森林公園", x: 36, y: 68 },
        { text: "西門", x: 20, y: 54 },
        { text: "中山", x: 72, y: 36 }
      ]
    },
    "大安區": {
      title: "大安區｜北科大核心生活圈",
      labels: [
        { text: "北科大", x: 52, y: 47, highlight: true },
        { text: "建國南路", x: 58, y: 56 },
        { text: "復興南路", x: 64, y: 45 },
        { text: "大安森林公園", x: 38, y: 70 }
      ]
    },
    "中正區": {
      title: "中正區｜善導寺與華山生活圈",
      labels: [
        { text: "善導寺", x: 38, y: 34, highlight: true },
        { text: "華山文創園區", x: 46, y: 46 },
        { text: "杭州南路", x: 40, y: 55 },
        { text: "臨沂街", x: 53, y: 42 }
      ]
    },
    "中山區": {
      title: "中山區｜捷運與商圈通勤帶",
      labels: [
        { text: "中山站", x: 72, y: 38, highlight: true },
        { text: "吉林路", x: 68, y: 50 },
        { text: "南京復興", x: 78, y: 32 },
        { text: "中山國小", x: 76, y: 60 }
      ]
    },
    "萬華區": {
      title: "萬華區｜低租金通勤生活圈",
      labels: [
        { text: "西門", x: 22, y: 42, highlight: true },
        { text: "龍山寺", x: 16, y: 66 },
        { text: "艋舺", x: 12, y: 52 },
        { text: "青年公園", x: 20, y: 78 }
      ]
    }
  };
  const config = configs[district] || configs.all;
  const labels = config.labels.map((label) => `
    <span class="map-label ${label.highlight ? "highlight" : ""}" style="left:${label.x}%; top:${label.y}%">${label.text}</span>
  `).join("");

  return `
    <div class="map-title">${config.title}</div>
    <span class="map-road horizontal one"></span>
    <span class="map-road horizontal two"></span>
    <span class="map-road vertical one"></span>
    <span class="map-road vertical two"></span>
    <span class="map-green"></span>
    ${labels}
  `;
}

function renderPropertyDetail() {
  const property = mockData.properties.find((item) => item.id === state.selectedPropertyId);
  const detail = $("#propertyDetail");
  if (!property) {
    detail.innerHTML = "<h3>尚未選取房源</h3><p>請調整篩選條件或點選地圖上的價格節點。</p>";
    return;
  }

  const terms = property.terms.map((term) => {
    const tip = knowledgeMap.get(term) || "這是房源條件標籤，可在看房時向房東確認細節。";
    return `<span class="term" data-tip="${tip}">${term}</span>`;
  }).join("");

  detail.innerHTML = `
    <article class="property-card">
      <span class="badge">${property.verified ? "房東已認證" : "待平台核對"}</span>
      <h3>${property.title}</h3>
      <p>${property.description}</p>
      <strong>${formatMoney(property.price)} / 月 · ${property.size} 坪</strong>
      <p>${property.district} · ${property.type} · 捷運步行 ${property.mrtDistance} 分鐘</p>
      <div class="terms">${terms}</div>
    </article>
  `;
}

function renderRepairProgress() {
  $("#repairProgress").innerHTML = mockData.student.repairProgress.map((step, index) => {
    const className = index < state.repairStep ? "done" : index === state.repairStep ? "active" : "";
    return `<div class="progress-step ${className}">${step}</div>`;
  }).join("");
}

function calculateRoommateMatches() {
  state.matchRun += 1;
  const answers = Object.fromEntries($$("[data-question]").map((select) => [select.dataset.question, select.value]));
  const answerLabels = $$("[data-question]").map((select) => select.options[select.selectedIndex].textContent);
  const scores = mockData.roommateCandidates.map((candidate) => {
    const matchedKeys = Object.entries(answers)
      .filter(([key, value]) => candidate[key] === value)
      .map(([key]) => key);
    return {
      ...candidate,
      matchedKeys,
      score: Math.round((matchedKeys.length / Object.keys(answers).length) * 100)
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name, "zh-Hant");
  }).slice(0, 3);

  $("#matchResults").innerHTML = `
    <div class="match-summary">
      第 ${state.matchRun} 次計算 · 依據：${answerLabels.join(" / ")}
    </div>
    ${scores.map((candidate, index) => `
      <div class="match-card">
        <strong>#${index + 1} ${candidate.name} · ${candidate.score}% 契合</strong>
        <p>${candidate.department}</p>
        <p>符合 ${candidate.matchedKeys.length} / ${Object.keys(answers).length} 題生活習慣</p>
        <p>${candidate.note}</p>
        <button class="secondary-btn" data-mail="${candidate.name}">站內信聯繫</button>
      </div>
    `).join("")}
  `;

  $$("[data-mail]").forEach((button) => button.addEventListener("click", () => {
    showToast(`已建立與 ${button.dataset.mail} 的站內信草稿`);
  }));
}

function renderLandlord() {
  $("#todoList").innerHTML = mockData.landlord.todos.map((todo) => `
    <div class="todo ${todo.urgent ? "urgent" : ""}">
      <strong>${todo.urgent ? "需處理" : "提醒"}</strong>
      <p>${todo.text}</p>
    </div>
  `).join("");

  $("#roomTable").innerHTML = mockData.landlord.rooms.map((room) => `
    <div class="table-row">
      <strong>${room.room}</strong>
      <span>${room.tenant}</span>
      <span>${room.rent}</span>
      <span data-repair-room="${room.id}">${room.repair}</span>
      <button class="secondary-btn" data-update-repair="${room.id}">更新修繕</button>
    </div>
  `).join("");

  $$("[data-update-repair]").forEach((button) => button.addEventListener("click", () => {
    const cell = $(`[data-repair-room="${button.dataset.updateRepair}"]`);
    cell.textContent = cell.textContent === "已完修" ? "派工中" : "已完修";
    showToast("修繕狀態已同步到學生端生活面板");
  }));
}

function renderAdmin() {
  $("#reviewCases").innerHTML = mockData.admin.reviewCases.map((item) => `
    <div class="review-case ${item.blacklist ? "blacklist" : ""}">
      <strong>${item.blacklist ? "紅燈警告" : "待核對"} · ${item.landlord}</strong>
      <p>身分證：${item.idCheck} / 權狀：${item.deedCheck}</p>
      <p>狀態：${item.status}</p>
      <button class="secondary-btn" data-approve="${item.id}" ${item.blacklist ? "disabled" : ""}>發放認證標章</button>
    </div>
  `).join("");

  $$("[data-approve]").forEach((button) => button.addEventListener("click", () => {
    const item = mockData.admin.reviewCases.find((review) => review.id === Number(button.dataset.approve));
    item.status = "已發放認證標章";
    renderAdmin();
    showToast(`${item.landlord} 已通過審核`);
  }));

  renderDispute();
}

function renderDispute() {
  const dispute = mockData.admin.disputes[0];
  const footprints = state.footprintsVisible
    ? dispute.footprints.map((item) => `<div class="footprint">${item}</div>`).join("")
    : "<p>點擊按鈕後可展開合約、繳款與報修紀錄。</p>";
  $("#disputePanel").innerHTML = `
    <span class="badge">${dispute.status}</span>
    <h3>${dispute.title}</h3>
    <p>租客：${dispute.tenant} / 房東：${dispute.landlord}</p>
    <div class="match-results">${footprints}</div>
  `;
}

function bindEvents() {
  $$("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  ["districtFilter", "typeFilter", "subsidyFilter", "priceFilter", "mrtFilter"].forEach((id) => {
    $(`#${id}`).addEventListener("input", renderMap);
  });
  $("#portalLogin").addEventListener("click", () => {
    $("#studentStatus").textContent = `${mockData.student.name} 已通過 Portal SSO，系級：${mockData.student.department}`;
    $("#studentStatus").classList.remove("muted");
    showToast("學生身分驗證完成");
  });
  $("#matchRoommates").addEventListener("click", calculateRoommateMatches);
  $("#repairBtn").addEventListener("click", () => {
    state.repairStep = Math.min(state.repairStep + 1, mockData.student.repairProgress.length - 1);
    renderRepairProgress();
    showToast("報修照片已送出，進度已更新");
  });
  $("#landlordVerify").addEventListener("click", () => {
    $("#landlordStatus").textContent = `房東 ${mockData.landlord.name}：${mockData.landlord.reviewStatus}`;
    $("#landlordStatus").classList.remove("muted");
    showToast("已完成黑名單初步比對並送交平台審核");
  });
  $("#sendContract").addEventListener("click", () => showToast("已產生內政部公版合約並送出簽署邀請"));
  $("#toggleFootprints").addEventListener("click", () => {
    state.footprintsVisible = !state.footprintsVisible;
    renderDispute();
  });
}

function init() {
  renderFilterOptions();
  renderMap();
  renderRepairProgress();
  renderLandlord();
  renderAdmin();
  $("#matchResults").innerHTML = "<div class=\"match-summary\">請填寫問卷後按「計算契合度」，系統會用 Array 排序列出前三名室友。</div>";
  bindEvents();
  setView("home");
}

document.addEventListener("DOMContentLoaded", init);
