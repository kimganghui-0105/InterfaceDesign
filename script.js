const SUPABASE_URL = "https://lhdbnvnfoecdymdtjcfc.supabase.co";

const SUPABASE_KEY = "sb_publishable_D62Ck0ECTPcWZVhk5sQ3yw_CCExJ13h";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PUBLIC_SITE_URL = "https://incandescent-stardust-afd3f3.netlify.app";

let uploadItems = [];
let bulkMode = false;
let selectedArtworkIds = new Set();
let removeCurrentEditMedia = false;

const defaultTypes = [
  "일러스트",
  "캐릭터 디자인",
  "팬아트",
  "배경",
  "애니메이션",
  "연습작"
];

const defaultStyles = [
  "컬러",
  "흑백",
  "SD",
  "반실사",
  "만화풍"
];

function isPublicPage() {
  return document.body.classList.contains("public-page");
}

function getStorageBucketName() {
  return "Artwork-images";
}

async function uploadFileToSupabase(file, prefix = "file") {
  const ext = (file.name && file.name.includes(".")) ? file.name.split(".").pop() : (file.type && file.type.includes("/")) ? file.type.split("/").pop().replace("jpeg", "jpg") : "png";
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(getStorageBucketName())
    .upload(fileName, file);

  if (uploadError) {
    console.error(uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabaseClient.storage
    .from(getStorageBucketName())
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function uploadDataUrlToSupabase(dataUrl, prefix = "artwork") {
  const imageBlob = await fetch(dataUrl).then(res => res.blob());
  return uploadFileToSupabase(imageBlob, prefix);
}

function handleMultipleImages(event) {
  const files = Array.from(event.target.files);
  readImageFiles(files);
}

function readImageFiles(files) {
  const imageFiles = files.filter(file => {
    const name = file.name.toLowerCase();

    return (
      file.type.startsWith("image/") ||
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".webp") ||
      name.endsWith(".gif")
    );
  });

  if (imageFiles.length === 0) {
    alert("이미지 파일을 선택해주세요.");
    return;
  }

  const uploadListSection = document.getElementById("uploadListSection");
  if (uploadListSection) uploadListSection.style.display = "block";

  imageFiles.forEach(file => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const item = {
        image: e.target.result,
        fileName: file.name
      };

      uploadItems.push(item);
      renderUploadItem(item, uploadItems.length - 1);
    };

    reader.readAsDataURL(file);
  });
}

function renderUploadItem(item, index) {
  const uploadList = document.getElementById("uploadList");
  if (!uploadList) return;

  const uniqueId = Date.now() + "-" + index;

  const card = document.createElement("div");
  card.className = "upload-artwork-card";
card.dataset.filename = item.fileName;

  card.innerHTML = `
    <button class="upload-remove-btn" onclick="removeUploadItem(this)">×</button>

    <div class="upload-preview">
      <img src="${item.image}" alt="${item.fileName}">
    </div>

    <div>
      <div class="upload-form-grid">
        <div class="form-group">
          <label>작품명 입력 (선택)</label>
          <input type="text" class="title-input" placeholder="작품명을 입력하세요 (선택)">
        </div>

        <div class="form-group">
          <label>제작 시기 입력 방식 (선택)</label>
          <select class="date-mode-input" onchange="handleCardDateMode(this)">
            <option value="선택 안 함">선택 안 함</option>
            <option value="정확한 날짜">정확한 날짜</option>
            <option value="대략적인 기간">대략적인 기간</option>
          </select>
        </div>

        <div class="form-group exact-date-box" style="display:none;">
          <label>정확한 날짜 입력</label>
          <input type="date" class="exact-date-input" placeholder="예: 2026-06-18">
        </div>

        <div class="form-group period-date-box" style="display:none;">
          <label>대략적인 기간 입력</label>
          <div class="period-row">
            <input
              type="number"
              class="period-year-input"
              placeholder="예: 2014"
              min="1900"
              max="2100"
              oninput="moveToPeriodSelect(this)"
            >

            <select class="period-quarter-input">
              <option value="선택 안 함">선택 안 함</option>
              <option value="1분기">1분기</option>
              <option value="2분기">2분기</option>
              <option value="3분기">3분기</option>
              <option value="4분기">4분기</option>
              <option value="상반기">상반기</option>
              <option value="하반기">하반기</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>작품 유형 선택 또는 추가</label>
          <select class="type-input">
            ${makeOptionHTML(getTypeOptions())}
          </select>

          <div class="add-option-row always-show">
            <input type="text" class="other-type-input" placeholder="새 작품 유형 입력 예: 콘셉트아트, 웹툰, 배경원화" onkeydown="handleOptionEnter(event, this, 'type')">
            <button type="button" class="add-small-btn visible-btn" onclick="addCustomOptionFromCard(this, 'type')">추가</button>
          </div>
        </div>

        <div class="form-group">
          <label>장르 선택 또는 추가</label>
          <select class="genre-input">
            ${makeOptionHTML(getGenreOptions(), false)}
          </select>

          <div class="add-option-row always-show">
            <input type="text" class="other-genre-input" placeholder="새 장르 또는 원작명을 입력하세요" onkeydown="handleOptionEnter(event, this, 'genre')">
            <button type="button" class="add-small-btn visible-btn" onclick="addGenreOption(this)">추가</button>
          </div>
        </div>

        <div class="form-group">
          <label>스타일 선택 또는 추가</label>
          <select class="style-input">
            ${makeOptionHTML(getStyleOptions())}
          </select>

          <div class="add-option-row always-show">
            <input type="text" class="other-style-input" placeholder="새 스타일 입력 예: 셀채색, 러프, 두꺼운 선화" onkeydown="handleOptionEnter(event, this, 'style')">
            <button type="button" class="add-small-btn visible-btn" onclick="addCustomOptionFromCard(this, 'style')">추가</button>
          </div>
        </div>

        <div class="form-group full-field">
          <label>작품 설명 (선택)</label>
          <textarea class="desc-input" placeholder="작품에 대한 설명, 제작 의도, 사용한 도구 등을 적어주세요."></textarea>
        </div>

        <div class="form-group full-field">
          <label>외부 링크 (선택)</label>
          <input type="url" class="link-input" placeholder="예: https://twitter.com/...">
        </div>

        <div class="form-group full-field">
  <label>상세 설명용 이미지/동영상 (선택)</label>
  <input type="file" class="media-input" accept="image/*,video/*" onchange="previewUploadMedia(this)">
  <p class="help-text">타임랩스 영상이나 작업 과정 이미지를 추가할 수 있습니다.</p>

  <div class="media-remove-row">
    <button type="button" class="main-btn danger-btn" onclick="removeUploadMedia(this)">
      상세 미디어 제거
    </button>
  </div>

  <div class="upload-media-preview"></div>
</div>
      </div>

      <div class="checkbox-row">
        <input type="checkbox" class="pick-input" id="pick-${uniqueId}">
        <label for="pick-${uniqueId}">Artist’s Pick으로 설정하기</label>
      </div>
    </div>
  `;

  uploadList.appendChild(card);
}

function makeOptionHTML(options, includeOther = true) {
  let html = `<option value="선택 안 함">선택 안 함</option>`;

  options.forEach(option => {
    html += `<option value="${option}">${option}</option>`;
  });

  if (includeOther) html += `<option value="기타">기타</option>`;
  return html;
}

function getTypeOptions() {
  const saved = localStorage.getItem("typeOptions");

  if (saved) return JSON.parse(saved);

  localStorage.setItem("typeOptions", JSON.stringify(defaultTypes));
  return defaultTypes;
}

function getStyleOptions() {
  const saved = localStorage.getItem("styleOptions");

  if (saved) return JSON.parse(saved);

  localStorage.setItem("styleOptions", JSON.stringify(defaultStyles));
  return defaultStyles;
}

function getGenreOptions() {
  return JSON.parse(localStorage.getItem("genreOptions")) || [];
}

function handleCardDateMode(select) {
  const card = select.closest(".upload-artwork-card");

  card.querySelector(".exact-date-box").style.display = "none";
  card.querySelector(".period-date-box").style.display = "none";

  if (select.value === "정확한 날짜") {
    card.querySelector(".exact-date-box").style.display = "block";
  }

  if (select.value === "대략적인 기간") {
    card.querySelector(".period-date-box").style.display = "block";
  }
}

function removeUploadItem(button) {
  button.closest(".upload-artwork-card").remove();

  const remainingCards = document.querySelectorAll(".upload-artwork-card");

  if (remainingCards.length === 0) {
    document.getElementById("uploadListSection").style.display = "none";
  }
}

function getCardDate(card) {
  const mode = card.querySelector(".date-mode-input").value;

  if (mode === "정확한 날짜") {
    return card.querySelector(".exact-date-input").value.trim() || "";
  }

  if (mode === "대략적인 기간") {
    const year = card.querySelector(".period-year-input")?.value.trim();
    const quarter = card.querySelector(".period-quarter-input")?.value;

    if (!year && (!quarter || quarter === "선택 안 함")) return "";
    if (year && quarter && quarter !== "선택 안 함") return `${year}년 ${quarter}`;
    if (year) return `${year}년`;

    return quarter;
  }

  return "";
}

function saveNewOption(kind, value) {
  if (!value) return;

  let key;
  let defaults;

  if (kind === "type") {
    key = "typeOptions";
    defaults = defaultTypes;
  }

  if (kind === "style") {
    key = "styleOptions";
    defaults = defaultStyles;
  }

  const current = JSON.parse(localStorage.getItem(key)) || defaults;

  if (!current.includes(value)) {
    if (confirm(`'${value}'을 앞으로도 선택지에 고정하시겠습니까?`)) {
      current.push(value);
      localStorage.setItem(key, JSON.stringify(current));
    }
  }
}

function handleOptionEnter(event, input, kind) {
  if (event.key !== "Enter") return;

  event.preventDefault();

  const row = input.closest(".add-option-row");
  const button = row?.querySelector("button");
  if (!button) return;

  if (kind === "genre") {
    addGenreOption(button);
  } else {
    addCustomOptionFromCard(button, kind);
  }
}

function addCustomOptionFromCard(button, kind) {
  const card = button.closest(".upload-artwork-card");

  let input;
  let storageKey;
  let defaultList;
  let selectClass;
  let labelName;

  if (kind === "type") {
    input = card.querySelector(".other-type-input");
    storageKey = "typeOptions";
    defaultList = defaultTypes;
    selectClass = ".type-input";
    labelName = "작품 유형";
  }

  if (kind === "style") {
    input = card.querySelector(".other-style-input");
    storageKey = "styleOptions";
    defaultList = defaultStyles;
    selectClass = ".style-input";
    labelName = "스타일";
  }

  const value = input.value.trim();

  if (!value) {
    alert(`추가할 ${labelName}을 입력해주세요.`);
    return;
  }

  const options = JSON.parse(localStorage.getItem(storageKey)) || defaultList;

  if (!options.includes(value)) {
    if (confirm(`'${value}'을 앞으로도 ${labelName} 선택지에 고정하시겠습니까?`)) {
      options.push(value);
      localStorage.setItem(storageKey, JSON.stringify(options));
    }
  }

  const select = card.querySelector(selectClass);
  const exists = [...select.options].some(option => option.value === value);

  if (!exists) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;

    const otherOption = [...select.options].find(option => option.value === "기타");

    if (otherOption) {
      select.insertBefore(option, otherOption);
    } else {
      select.appendChild(option);
    }
  }

  select.value = value;
  input.value = "";
}

function addGenreOption(button) {
  const card = button.closest(".upload-artwork-card");
  const input = card.querySelector(".other-genre-input");
  const select = card.querySelector(".genre-input");

  const value = input.value.trim();

  if (!value) {
    alert("추가할 장르를 입력해주세요.");
    return;
  }

  let genreOptions = JSON.parse(localStorage.getItem("genreOptions")) || [];

  if (!genreOptions.includes(value)) {
    if (confirm(`'${value}'을 앞으로도 장르 선택지에 고정하시겠습니까?`)) {
      genreOptions.push(value);
      localStorage.setItem("genreOptions", JSON.stringify(genreOptions));
    }
  }

  const exists = [...select.options].some(option => option.value === value);

  if (!exists) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  select.value = value;
  input.value = "";
}

async function saveAllArtworks() {
  const cards = document.querySelectorAll(".upload-artwork-card");

  if (cards.length === 0) {
    alert("저장할 작품이 없습니다.");
    return;
  }

  for (const card of cards) {
    const imgElement = card.querySelector(".upload-preview img");
    const imageDataUrl = imgElement.src;

    const rawTitle = card.querySelector(".title-input").value.trim();

const title =
  rawTitle ||
  (card.dataset.filename || "제목 없음")
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]/g, " ");
    const date = getCardDate(card);
    const description = card.querySelector(".desc-input").value.trim();
    const link = card.querySelector(".link-input").value.trim();

    let genre = card.querySelector(".genre-input").value;
    if (genre === "선택 안 함") genre = "";

    let type = card.querySelector(".type-input").value;
    let style = card.querySelector(".style-input").value;

    if (type === "기타") {
      type = card.querySelector(".other-type-input").value.trim();
      saveNewOption("type", type);
    }

    if (style === "기타") {
      style = card.querySelector(".other-style-input").value.trim();
      saveNewOption("style", style);
    }

    if (type === "선택 안 함") type = "";
    if (style === "선택 안 함") style = "";

    try {
      const imageUrl = await uploadDataUrlToSupabase(imageDataUrl, "artwork");

      const mediaFile = card.querySelector(".media-input")?.files[0];
      let mediaUrl = "";
      let mediaType = "";

      if (mediaFile) {
        mediaUrl = await uploadFileToSupabase(mediaFile, "detail-media");
        mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";
      }

      const { error: insertError } = await supabaseClient
        .from("artworks")
        .insert([
          {
            title,
            image_url: imageUrl,
            date,
            type,
            genre,
            style,
            description,
            link,
            media_url: mediaUrl,
            media_type: mediaType,
            pick: card.querySelector(".pick-input").checked
          }
        ]);

      if (insertError) {
        console.error(insertError);
        alert("작품 정보 저장 중 오류가 발생했습니다. Supabase Table 정책과 컬럼을 확인해주세요.");
        return;
      }
    } catch (error) {
      console.error(error);
      alert("업로드 중 오류가 발생했습니다. Supabase Storage 정책을 확인해주세요.");
      return;
    }
  }

  alert("작품이 Supabase에 저장되었습니다.");

  document.getElementById("uploadList").innerHTML = "";
  document.getElementById("uploadListSection").style.display = "none";
  document.getElementById("multiImageInput").value = "";
  uploadItems = [];
}

async function loadGallery() {
  const galleryList = document.getElementById("galleryList");
  if (!galleryList) return;

  galleryList.innerHTML = `
    <div class="empty-message">
      작품을 불러오는 중입니다...
    </div>
  `;

  const { data, error } = await supabaseClient
    .from("artworks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    galleryList.innerHTML = `
      <div class="empty-message">
        작품을 불러오는 중 오류가 발생했습니다. Supabase 정책을 확인해주세요.
      </div>
    `;
    return;
  }

  window.currentArtworks = data || [];

  setupGalleryFiltersFromData(window.currentArtworks);
  applyGalleryFilters();

  if (isPublicPage()) {
    setupPublicPage();
  }
}

function setupGalleryFiltersFromData(artworks) {
  const typeFilter = document.getElementById("typeFilter");
  const styleFilter = document.getElementById("styleFilter");
  const genreFilter = document.getElementById("genreFilter");

  if (!typeFilter || !styleFilter || !genreFilter) return;

  const typeCounts = {};
  const styleCounts = {};
  const genreCounts = {};

  artworks.forEach(artwork => {
    if (artwork.type) {
      typeCounts[artwork.type] = (typeCounts[artwork.type] || 0) + 1;
    }

    if (artwork.style) {
      styleCounts[artwork.style] = (styleCounts[artwork.style] || 0) + 1;
    }

    if (artwork.genre) {
      genreCounts[artwork.genre] = (genreCounts[artwork.genre] || 0) + 1;
    }
  });

  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1]);

  const sortedStyles = Object.entries(styleCounts)
    .sort((a, b) => b[1] - a[1]);

  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1]);

  typeFilter.innerHTML = `<option value="all">전체</option>`;
  styleFilter.innerHTML = `<option value="all">전체</option>`;
  genreFilter.innerHTML = `<option value="all">전체</option>`;

  sortedTypes.forEach(([type, count]) => {
    typeFilter.innerHTML += `<option value="${type}">${type} (${count})</option>`;
  });

  sortedStyles.forEach(([style, count]) => {
    styleFilter.innerHTML += `<option value="${style}">${style} (${count})</option>`;
  });

  sortedGenres.forEach(([genre, count]) => {
    genreFilter.innerHTML += `<option value="${genre}">${genre} (${count})</option>`;
  });
}

function getArtworkDateValue(dateText) {
  if (!dateText) return 0;

  const text = String(dateText).trim();
  const yearMatch = text.match(/(\d{4})/);
  if (!yearMatch) return 0;

  const year = Number(yearMatch[1]);
  let month = 1;

  if (text.includes("1분기")) month = 1;
  else if (text.includes("2분기")) month = 4;
  else if (text.includes("3분기")) month = 7;
  else if (text.includes("4분기")) month = 10;
  else if (text.includes("상반기")) month = 1;
  else if (text.includes("하반기")) month = 7;
  else {
    const monthMatch = text.match(/-(\d{1,2})-/);
    if (monthMatch) month = Number(monthMatch[1]);
  }

  return year * 100 + month;
}

function getDateFilterValue(yearId, monthId, isEnd = false) {
  const year = document.getElementById(yearId)?.value;
  const month = document.getElementById(monthId)?.value;

  if (!year) return null;

  return Number(year) * 100 + (month ? Number(month) : isEnd ? 12 : 1);
}

function handleSortFilterChange() {
  const sortValue = document.getElementById("sortFilter")?.value;
  const dateRangeBox = document.getElementById("dateRangeFilterBox");

  if (dateRangeBox) {
    dateRangeBox.style.display = sortValue === "date-range" ? "block" : "none";
  }

  if (sortValue !== "date-range") {
    const startYear = document.getElementById("startYearFilter");
    const startMonth = document.getElementById("startMonthFilter");
    const endYear = document.getElementById("endYearFilter");
    const endMonth = document.getElementById("endMonthFilter");

    if (startYear) startYear.value = "";
    if (startMonth) startMonth.value = "";
    if (endYear) endYear.value = "";
    if (endMonth) endMonth.value = "";
  }

  applyGalleryFilters();
}

function applyGalleryFilters() {
  const galleryList = document.getElementById("galleryList");
  if (!galleryList) return;

  const sortValue = document.getElementById("sortFilter")?.value || "date-newest";
  const typeValue = document.getElementById("typeFilter")?.value || "all";
  const styleValue = document.getElementById("styleFilter")?.value || "all";
  const genreValue = document.getElementById("genreFilter")?.value || "all";
  const pickOnly = document.getElementById("pickOnlyFilter")?.checked || false;

const useDateRange = sortValue === "date-range";

const startDateValue = useDateRange
  ? getDateFilterValue("startYearFilter", "startMonthFilter", false)
  : null;

const endDateValue = useDateRange
  ? getDateFilterValue("endYearFilter", "endMonthFilter", true)
  : null;
  let artworks = window.currentArtworks || [];

  artworks = artworks.filter(artwork => {
    const typeMatch = typeValue === "all" || artwork.type === typeValue;
    const styleMatch = styleValue === "all" || artwork.style === styleValue;
    const genreMatch = genreValue === "all" || artwork.genre === genreValue;
    const pickMatch = !pickOnly || artwork.pick;

    const artworkDateValue = getArtworkDateValue(artwork.date);
    const noDateRangeSelected = startDateValue === null && endDateValue === null;

    const dateRangeMatch =
      noDateRangeSelected ||
      (
        artworkDateValue !== 0 &&
        (startDateValue === null || artworkDateValue >= startDateValue) &&
        (endDateValue === null || artworkDateValue <= endDateValue)
      );

    return typeMatch && styleMatch && genreMatch && pickMatch && dateRangeMatch;
  });

  artworks.sort((a, b) => {
    const aDateValue = getArtworkDateValue(a.date);
    const bDateValue = getArtworkDateValue(b.date);

    const aUploadTime = new Date(a.created_at).getTime();
    const bUploadTime = new Date(b.created_at).getTime();

    if (sortValue === "date-oldest") {
      if (aDateValue !== bDateValue) return aDateValue - bDateValue;
      return aUploadTime - bUploadTime;
    }

    if (aDateValue !== bDateValue) return bDateValue - aDateValue;
    return aUploadTime - bUploadTime;
  });

  artworks.sort((a, b) => {
    if (a.pick === b.pick) return 0;
    return a.pick ? -1 : 1;
  });

  galleryList.innerHTML = "";

  if (artworks.length === 0) {
    galleryList.innerHTML = `
      <div class="empty-message">
        표시할 작품이 없습니다. Upload 페이지에서 작품을 업로드하거나 필터를 변경해주세요.
      </div>
    `;
  } else {
    artworks.forEach(artwork => renderArtwork(artwork));
  }

  renderGalleryStats(artworks);
  updateBulkButtons();
}

function renderGalleryStats(artworks) {
  const stats = document.getElementById("galleryStats");
  if (!stats) return;

  const total = artworks.length;
  const pickCount = artworks.filter(artwork => artwork.pick).length;

  stats.innerHTML = `
    <div><strong>${total}</strong><span>Total Works</span></div>
    <div><strong>${pickCount}</strong><span>Artist’s Pick</span></div>
  `;
}

function renderArtwork(artwork) {
  const galleryList = document.getElementById("galleryList");
  if (!galleryList) return;

  const card = document.createElement("div");
  card.className = "art-card";
  if (selectedArtworkIds.has(artwork.id)) card.classList.add("selected");

  card.innerHTML = `
    ${!isPublicPage() && bulkMode ? `
      <label class="bulk-check" onclick="event.stopPropagation()">
        <input type="checkbox" ${selectedArtworkIds.has(artwork.id) ? "checked" : ""} onchange="toggleArtworkSelection('${artwork.id}', this.checked)">
      </label>
    ` : ""}
    <div class="thumbnail">
      ${artwork.image_url ? `<img src="${artwork.image_url}" alt="${artwork.title}" draggable="false">` : "Image Space"}
    </div>
    ${!isPublicPage() ? `
      <div class="art-card-info">
        <h3>${artwork.title || "제목 없음"}</h3>
        <p>${[artwork.date, artwork.type, artwork.genre, artwork.style].filter(Boolean).join(" · ") || "정보 없음"}</p>
        ${artwork.pick ? `<span class="pick-label">Artist’s Pick</span>` : ""}
      </div>
    ` : ""}
  `;

  card.onclick = () => {
    if (bulkMode && !isPublicPage()) {
      const next = !selectedArtworkIds.has(artwork.id);
      toggleArtworkSelection(artwork.id, next);
      applyGalleryFilters();
      return;
    }

    openArtworkModal(artwork);
  };

  galleryList.appendChild(card);
}

function renderDetailMedia(artwork) {
  if (!artwork.media_url) return "";

  if (artwork.media_type === "video") {
    return `
      <div class="detail-media-box">
        <strong>작업 과정 영상</strong>
        <video controls controlsList="nodownload" oncontextmenu="return false;">
          <source src="${artwork.media_url}">
        </video>
      </div>
    `;
  }

  return `
    <div class="detail-media-box">
      <strong>작업 과정 이미지</strong>
      <img src="${artwork.media_url}" alt="작업 과정 이미지" draggable="false" oncontextmenu="return false;">
    </div>
  `;
}

function openArtworkModal(artwork) {
  const modal = document.getElementById("artworkModal");
  const imageArea = document.getElementById("modalImageArea");
  const infoArea = document.getElementById("modalInfoArea");

  if (!modal || !imageArea || !infoArea) return;

  imageArea.innerHTML = `<img src="${artwork.image_url}" alt="${artwork.title}" draggable="false" oncontextmenu="return false;">`;

  infoArea.innerHTML = `
    <p class="modal-label">Artwork Detail</p>
    <h2>${artwork.title}</h2>

    <div class="detail-list">
      <p><strong>제작 시기</strong><span>${artwork.date || "정보 없음"}</span></p>
      <p><strong>작품 유형</strong><span>${artwork.type || "정보 없음"}</span></p>
      <p><strong>장르</strong><span>${artwork.genre || "정보 없음"}</span></p>
      <p><strong>스타일</strong><span>${artwork.style || "정보 없음"}</span></p>
      <p><strong>Artist’s Pick</strong><span>${artwork.pick ? "Yes" : "No"}</span></p>
    </div>

    <div class="modal-description">
      <strong>작품 설명</strong>
      <p>${artwork.description || "입력된 설명이 없습니다."}</p>
    </div>

    ${renderDetailMedia(artwork)}

    ${
      artwork.link
        ? `<a class="main-btn modal-link" href="${artwork.link}" target="_blank">외부 링크 보기</a>`
        : ""
    }

    ${!isPublicPage() ? `
      <button class="main-btn modal-link" onclick='openEditArtworkModalById("${artwork.id}")'>수정하기</button>
      <button class="main-btn danger-btn modal-link" onclick="deleteArtwork('${artwork.id}')">이 작품 삭제하기</button>
    ` : ""}
  `;

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeArtworkModal() {
  const modal = document.getElementById("artworkModal");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "";
}

function closeModalByBackground(event) {
  if (event.target.id === "artworkModal") {
    closeArtworkModal();
  }
}

function openEditArtworkModalById(id) {
  const artwork = (window.currentArtworks || []).find(item => item.id === id);
  if (!artwork) return;

  closeArtworkModal();
  openEditArtworkModal(artwork);
}

function openEditArtworkModal(artwork) {
  const modal = document.getElementById("editArtworkModal");
  if (!modal) return;

  document.getElementById("editArtworkId").value = artwork.id;
  document.getElementById("editPreviewImage").src = artwork.image_url || "";
  document.getElementById("editTitleInput").value = artwork.title || "";
  document.getElementById("editDateInput").value = artwork.date || "";
  document.getElementById("editTypeInput").value = artwork.type || "";
  document.getElementById("editGenreInput").value = artwork.genre || "";
  document.getElementById("editStyleInput").value = artwork.style || "";
  document.getElementById("editDescInput").value = artwork.description || "";
  document.getElementById("editLinkInput").value = artwork.link || "";
  document.getElementById("editPickInput").checked = !!artwork.pick;
  document.getElementById("editImageInput").value = "";
  document.getElementById("editMediaInput").value = "";
removeCurrentEditMedia = false;

const editMediaPreview = document.getElementById("editMediaPreview");
if (editMediaPreview) {
  editMediaPreview.innerHTML = renderDetailMedia(artwork);
}

modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeEditArtworkModal() {
  const modal = document.getElementById("editArtworkModal");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "";
}

function closeEditModalByBackground(event) {
  if (event.target.id === "editArtworkModal") {
    closeEditArtworkModal();
  }
}

function previewEditImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = document.getElementById("editPreviewImage");
  preview.src = URL.createObjectURL(file);
}

function previewEditMedia(event) {
  const file = event.target.files[0];
  const previewBox = document.getElementById("editMediaPreview");

  if (!previewBox) return;

  previewBox.innerHTML = "";

  if (!file) return;

  const previewUrl = URL.createObjectURL(file);

  if (file.type.startsWith("video/")) {
    previewBox.innerHTML = `
      <video controls>
        <source src="${previewUrl}" type="${file.type}">
        브라우저가 영상을 지원하지 않습니다.
      </video>
    `;
  } else if (file.type.startsWith("image/")) {
    previewBox.innerHTML = `
      <img src="${previewUrl}" alt="상세 설명용 이미지 미리보기">
    `;
  }
}

async function saveArtworkEdits() {
  const id = document.getElementById("editArtworkId").value;
  const imageFile = document.getElementById("editImageInput").files[0];
  const mediaFile = document.getElementById("editMediaInput").files[0];

  const updateData = {
    title: document.getElementById("editTitleInput").value.trim() || "제목 없음",
    date: document.getElementById("editDateInput").value.trim(),
    type: document.getElementById("editTypeInput").value.trim(),
    genre: document.getElementById("editGenreInput").value.trim(),
    style: document.getElementById("editStyleInput").value.trim(),
    description: document.getElementById("editDescInput").value.trim(),
    link: document.getElementById("editLinkInput").value.trim(),
    pick: document.getElementById("editPickInput").checked
  };

  try {
    if (imageFile) {
      updateData.image_url = await uploadFileToSupabase(imageFile, "artwork-replace");
    }

    if (removeCurrentEditMedia) {
  updateData.media_url = "";
  updateData.media_type = "";
} else if (mediaFile) {
  updateData.media_url = await uploadFileToSupabase(mediaFile, "detail-media");
  updateData.media_type = mediaFile.type.startsWith("video/") ? "video" : "image";
}

    const { data: updatedArtwork, error } = await supabaseClient
      .from("artworks")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      alert("작품 수정 중 오류가 발생했습니다. Supabase 컬럼과 정책을 확인해주세요.");
      return;
    }

    if (updatedArtwork) {
      window.currentArtworks = (window.currentArtworks || []).map(artwork =>
        artwork.id === id ? updatedArtwork : artwork
      );
    }

    alert("작품 정보가 수정되었습니다.");
    closeEditArtworkModal();
    applyGalleryFilters();

    if (updatedArtwork) {
      openArtworkModal(updatedArtwork);
    } else {
      await loadGallery();
    }
  } catch (error) {
    console.error(error);
    alert("파일 업로드 중 오류가 발생했습니다.");
  }
}

function toggleBulkMode() {
  bulkMode = !bulkMode;
  selectedArtworkIds.clear();
  applyGalleryFilters();
}

function toggleArtworkSelection(id, checked) {
  if (checked) {
    selectedArtworkIds.add(id);
  } else {
    selectedArtworkIds.delete(id);
  }

  updateBulkButtons();
}

function updateBulkButtons() {
  const bulkModeBtn = document.getElementById("bulkModeBtn");
  const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");

  if (!bulkModeBtn || !bulkDeleteBtn) return;

  bulkModeBtn.textContent = bulkMode ? "선택 종료" : "일괄 선택";
  bulkDeleteBtn.style.display = bulkMode ? "inline-block" : "none";
  bulkDeleteBtn.textContent = `선택 삭제 (${selectedArtworkIds.size})`;
}

async function deleteSelectedArtworks() {
  const ids = [...selectedArtworkIds];

  if (ids.length === 0) {
    alert("삭제할 작품을 선택해주세요.");
    return;
  }

  if (!confirm(`선택한 ${ids.length}개의 작품을 삭제하시겠습니까?`)) return;

  const { error } = await supabaseClient
    .from("artworks")
    .delete()
    .in("id", ids);

  if (error) {
    console.error(error);
    alert("선택 삭제 중 오류가 발생했습니다.");
    return;
  }

  selectedArtworkIds.clear();
  bulkMode = false;
  loadGallery();
}

async function clearGallery() {
  if (!confirm("Supabase에 저장된 작품 정보를 모두 삭제하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("artworks")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error(error);
    alert("전체 삭제 중 오류가 발생했습니다. Supabase 정책을 확인해주세요.");
    return;
  }

  window.currentArtworks = [];
  loadGallery();
}

async function deleteArtwork(id) {
  if (!confirm("이 작품을 삭제하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("artworks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("작품 삭제 중 오류가 발생했습니다.");
    return;
  }

  closeArtworkModal();
  loadGallery();
}

function setupPublicPage() {
  const params = new URLSearchParams(window.location.search);
  const title = params.get("title") || localStorage.getItem("publicPortfolioTitle") || "Kim Ganghui Portfolio";
  const desc = params.get("desc") || localStorage.getItem("publicPortfolioDesc") || "업로드된 작품을 모아 감상할 수 있는 공개 포트폴리오 페이지입니다.";

  const titleEl = document.getElementById("publicPortfolioTitle");
  const descEl = document.getElementById("publicPortfolioDesc");

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;

  document.addEventListener("contextmenu", function (event) {
    if (event.target.tagName === "IMG" || event.target.tagName === "VIDEO") {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", function (event) {
    if (event.target.tagName === "IMG") {
      event.preventDefault();
    }
  });
}

function setupDropZone() {
  const dropZone = document.getElementById("dropZone");
  if (!dropZone) return;

  dropZone.addEventListener("dragover", function (event) {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const files = Array.from(event.dataTransfer.files);
    readImageFiles(files);
  });

  document.addEventListener("paste", function (event) {
    const items = Array.from(event.clipboardData.items);

    const imageFiles = items
      .filter(item => item.type.startsWith("image/"))
      .map(item => item.getAsFile())
      .filter(Boolean);

    if (imageFiles.length === 0) return;

    event.preventDefault();
    readImageFiles(imageFiles);
  });
}

function moveToPeriodSelect(input) {
  if (input.value.length >= 4) {
    const card = input.closest(".upload-artwork-card");
    const select = card.querySelector(".period-quarter-input");

    if (select) select.focus();
  }
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeArtworkModal();
    closeEditArtworkModal();
  }
});

window.onload = function () {
  setupDropZone();
  loadGallery();
};
function openOptionManager() {
  const modal = document.getElementById("optionManagerModal");
  if (!modal) return;

  renderOptionManager();
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeOptionManager() {
  const modal = document.getElementById("optionManagerModal");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "";
}

function closeOptionManagerByBackground(event) {
  if (event.target.id === "optionManagerModal") {
    closeOptionManager();
  }
}

function renderOptionManager() {
  renderOptionChipList("type", "typeOptionList", getTypeOptions());
  renderOptionChipList("genre", "genreOptionList", getGenreOptions());
  renderOptionChipList("style", "styleOptionList", getStyleOptions());
}

function renderOptionChipList(kind, containerId, options) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!options || options.length === 0) {
    container.innerHTML = `<p class="empty-option-text">등록된 선택지가 없습니다.</p>`;
    return;
  }

  container.innerHTML = "";

  options.forEach(option => {
    const chip = document.createElement("div");
    chip.className = "option-chip";

    chip.innerHTML = `
      <span>${option}</span>
      <button type="button" onclick="removeSavedOption('${kind}', '${option}')">×</button>
    `;

    container.appendChild(chip);
  });
}

function removeSavedOption(kind, value) {
  if (!confirm(`'${value}'을 선택지에서 제거하시겠습니까?`)) return;

  let storageKey = "";

  if (kind === "type") storageKey = "typeOptions";
  if (kind === "genre") storageKey = "genreOptions";
  if (kind === "style") storageKey = "styleOptions";

  let options = JSON.parse(localStorage.getItem(storageKey)) || [];
  options = options.filter(option => option !== value);

  localStorage.setItem(storageKey, JSON.stringify(options));

  renderOptionManager();
  refreshAllUploadSelects();
}

function refreshAllUploadSelects() {
  document.querySelectorAll(".upload-artwork-card").forEach(card => {
    const typeSelect = card.querySelector(".type-input");
    const genreSelect = card.querySelector(".genre-input");
    const styleSelect = card.querySelector(".style-input");

    if (typeSelect) typeSelect.innerHTML = makeOptionHTML(getTypeOptions());
    if (genreSelect) genreSelect.innerHTML = makeOptionHTML(getGenreOptions());
    if (styleSelect) styleSelect.innerHTML = makeOptionHTML(getStyleOptions());
  });
}
function previewUploadMedia(input) {
  const file = input.files[0];
  const previewBox = input.closest(".form-group").querySelector(".upload-media-preview");

  if (!previewBox) return;

  previewBox.innerHTML = "";

  if (!file) return;

  const previewUrl = URL.createObjectURL(file);

  if (file.type.startsWith("video/")) {
    previewBox.innerHTML = `
      <video controls>
        <source src="${previewUrl}" type="${file.type}">
        브라우저가 영상을 지원하지 않습니다.
      </video>
    `;
  } else if (file.type.startsWith("image/")) {
    previewBox.innerHTML = `
      <img src="${previewUrl}" alt="상세 설명용 이미지 미리보기">
    `;
  }
}function handleOptionManagerEnter(event, type) {
  if (event.key === "Enter") {
    addOptionFromManager(type);
  }
}

function addOptionFromManager(type) {

  let inputId = "";
  let storageKey = "";

  if (type === "type") {
    inputId = "newTypeOptionInput";
    storageKey = "typeOptions";
  }

  if (type === "genre") {
    inputId = "newGenreOptionInput";
    storageKey = "genreOptions";
  }

  if (type === "style") {
    inputId = "newStyleOptionInput";
    storageKey = "styleOptions";
  }

  const input = document.getElementById(inputId);

  if (!input) return;

  const value = input.value.trim();

  if (!value) return;

  let options =
    JSON.parse(localStorage.getItem(storageKey)) || [];

  if (!options.includes(value)) {
    options.push(value);

    localStorage.setItem(
      storageKey,
      JSON.stringify(options)
    );
  }

  input.value = "";

  renderOptionManager();
  refreshAllUploadSelects();
}
function removeEditMedia() {
  if (!confirm("상세 이미지/동영상을 제거하시겠습니까?")) return;

  removeCurrentEditMedia = true;

  const input = document.getElementById("editMediaInput");
  const previewBox = document.getElementById("editMediaPreview");

  if (input) input.value = "";
  if (previewBox) {
    previewBox.innerHTML = `
      <p class="empty-option-text">상세 이미지/동영상이 제거됩니다. 수정 저장을 눌러 반영해주세요.</p>
    `;
  }
}
function removeUploadMedia(button) {
  if (!confirm("상세 이미지/동영상을 제거하시겠습니까?")) return;

  const formGroup = button.closest(".form-group");
  const input = formGroup.querySelector(".media-input");
  const previewBox = formGroup.querySelector(".upload-media-preview");

  if (input) input.value = "";
  if (previewBox) {
    previewBox.innerHTML = `
      <p class="empty-option-text">상세 이미지/동영상이 제거되었습니다.</p>
    `;
  }
}
// =========================
// Public Portfolio Page
// =========================

// =========================
// Public Portfolio Page
// =========================

async function loadPublicGallery() {
  const gallery = document.getElementById("publicGallery");
  if (!gallery) return;

  gallery.innerHTML = `
    <div class="empty-message">작품을 불러오는 중입니다...</div>
  `;

  const { data, error } = await supabaseClient
    .from("artworks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    gallery.innerHTML = `
      <div class="empty-message">작품을 불러오지 못했습니다.</div>
    `;
    return;
  }

  gallery.innerHTML = "";

  if (!data || data.length === 0) {
    gallery.innerHTML = `
      <div class="empty-message">아직 공개할 작품이 없습니다.</div>
    `;
    return;
  }

  data.forEach(artwork => {
    gallery.innerHTML += `
      <div class="public-art-card">
        <img
          src="${artwork.image_url}"
          alt="${artwork.title || "Artwork"}"
          draggable="false"
          oncontextmenu="return false;"
        >
      </div>
    `;
  });

  document.addEventListener("contextmenu", function (event) {
    if (event.target.tagName === "IMG") {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", function (event) {
    if (event.target.tagName === "IMG") {
      event.preventDefault();
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("publicGallery")) {
    loadPublicGallery();
  }
});
function openPublishPortfolio() {
  window.open(
    "publish.html",
    "ARTPOLIO_PUBLISH_WINDOW",
    "width=1400,height=900,left=120,top=80"
  );
}
function slugifyPortfolio(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPortfolioSettings() {
  return {
    title: localStorage.getItem("publicPortfolioTitle") || "",
    desc: localStorage.getItem("publicPortfolioDesc") || "",
    slug: localStorage.getItem("publicPortfolioSlug") || ""
  };
}

function makePortfolioUrl() {
  const settings = getPortfolioSettings();
  const params = new URLSearchParams();

  params.set("title", settings.title);
  params.set("desc", settings.desc);
  params.set("slug", settings.slug);

  return `${PUBLIC_SITE_URL}/publish.html?${params.toString()}`;
}

function updatePortfolioPreviewLink() {
  const linkInput = document.getElementById("portfolioPreviewLink");
  const slugInput = document.getElementById("portfolioSlugInput");

  if (!linkInput) return;

  const currentPath = window.location.pathname.replace(/[^/]*$/, "");
  const slug = slugifyPortfolio(slugInput?.value) || "kimganghui";

linkInput.value = `${PUBLIC_SITE_URL}/publish.html?slug=${encodeURIComponent(slug)}`;}

function loadPortfolioSettingsForm() {
  const titleInput = document.getElementById("portfolioTitleInput");
  const descInput = document.getElementById("portfolioDescInput");
  const slugInput = document.getElementById("portfolioSlugInput");

  if (!titleInput || !descInput || !slugInput) return;

  const settings = getPortfolioSettings();

  titleInput.value = settings.title;
  descInput.value = settings.desc;
  slugInput.value = settings.slug;

  [titleInput, descInput, slugInput].forEach(input => {
    input.addEventListener("input", updatePortfolioPreviewLink);
  });

  updatePortfolioPreviewLink();
}

function savePortfolioSettings() {
  const title = document.getElementById("portfolioTitleInput")?.value.trim() || "Kim Ganghui Portfolio";
  const desc = document.getElementById("portfolioDescInput")?.value.trim() || "업로드된 작품을 모아 감상할 수 있는 공개 포트폴리오 페이지입니다.";
  const rawSlug = document.getElementById("portfolioSlugInput")?.value.trim() || "kimganghui";
  const slug = slugifyPortfolio(rawSlug) || "kimganghui";

  localStorage.setItem("publicPortfolioTitle", title);
  localStorage.setItem("publicPortfolioDesc", desc);
  localStorage.setItem("publicPortfolioSlug", slug);

  const slugInput = document.getElementById("portfolioSlugInput");
  if (slugInput) slugInput.value = slug;

  updatePortfolioPreviewLink();
  alert("공개 포트폴리오 설정이 저장되었습니다.");
}

function resetPortfolioSettings() {
  if (!confirm("공개 포트폴리오 설정을 기본값으로 되돌리시겠습니까?")) return;

  localStorage.removeItem("publicPortfolioTitle");
  localStorage.removeItem("publicPortfolioDesc");
  localStorage.removeItem("publicPortfolioSlug");

  loadPortfolioSettingsForm();
}

function copyPortfolioLink() {
  savePortfolioSettings();

  const fullUrl = makePortfolioUrl();

  navigator.clipboard.writeText(fullUrl)
    .then(() => alert("공개 링크가 복사되었습니다."))
    .catch(() => {
      const linkInput = document.getElementById("portfolioPreviewLink");

      if (linkInput) {
        linkInput.value = fullUrl;
        linkInput.select();
        document.execCommand("copy");
        alert("공개 링크가 복사되었습니다.");
      }
    });
}

function openPublishPortfolio() {
  window.open(
    makePortfolioUrl(),
    "ARTPOLIO_PUBLISH_WINDOW",
    "width=1400,height=900,left=120,top=80"
  );
}

document.addEventListener("DOMContentLoaded", loadPortfolioSettingsForm);