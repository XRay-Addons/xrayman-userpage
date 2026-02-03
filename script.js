// ==== constants ====
const LINKS = {
  API_URL: "API_URL_PLACEHOLDER",
  HAPP_INTENT: "happ://add/",
};

const GIF_URLS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3dueWw2eGdyaWt6MnVkMm4yemdvOXdrYzk4cDJrYjJwMmVqdTZtbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/eCwAEs05phtK/giphy.gif",
];

const PLATFORMS = {
  IOS: "ios",
  ANDROID: "android",
  MAC: "mac",
  WINDOWS: "windows",
  UNKNOWN: "unknown",
};

const RAW_APP_LINKS = {
  [PLATFORMS.IOS]: [
    [
      "appbtn-ios-ru",
      "App Store [RU]",
      "https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6744287213",
    ],
    [
      "appbtn-ios-global",
      "App Store [Global]",
      "https://apps.apple.com/us/app/happ-proxy-utility/id6504287215",
    ],
  ],
  [PLATFORMS.ANDROID]: [
    [
      "appbtn-android",
      "Google Play",
      "https://play.google.com/store/apps/details?id=com.happproxy",
    ],
  ],
  [PLATFORMS.MAC]: [
    [
      "appbtn-osx-ru",
      "App Store [RU]",
      "https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6744287213",
    ],
    [
      "appbtn-osx-global",
      "App Store [Global]",
      "https://apps.apple.com/us/app/happ-proxy-utility/id6504287215",
    ],
  ],
  [PLATFORMS.WINDOWS]: [
    [
      "appbtn-win",
      ".exe",
      "https://github.com/Happ-proxy/happ-desktop/releases/latest/download/setup-Happ.x86.exe",
    ],
  ],
};

const APP_LINKS = Object.fromEntries(
  Object.entries(RAW_APP_LINKS).map(([platform, links]) => [
    platform,
    links.map(([id, text, url]) => ({ ID: id, Text: text, URL: url })),
  ])
);

const DOM = {
  appBtnsContainer: document.getElementById("app-buttons"),
  appBtnTemplate: document
    .getElementById("app-btn-template")
    .content.querySelector(".app-btn"),
  openhappBtn: document.getElementById("openhapp-btn"),

  forLoggedPage: document.getElementById("for-logged"),
  forNonLoggedPage: document.getElementById("for-non-logged"),

  userName: document.getElementById("visible-name"),
  userNameInput: document.getElementById("name-input"),
  userNameInputBtn: document.getElementById("name-button"),

  bgGifContainer: document.getElementById("background-gif-container"),
  bgGifTemplate: document
    .getElementById("bg-gif-template")
    .content.querySelector(".gif-item"),
};

// ==== helpers ====

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${
    60 * 60 * 24 * 365 * 10
  }`;
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

function getUserFromPath() {
  const match = window.location.pathname.match(/^\/(\d+)-([^/]+)$/);
  return match ? { id: match[1], name: match[2] } : null;
}

// ==== API ====

async function fetchUser(id, name) {
  const resp = await fetch(`${LINKS.API_URL}/user/${id}-${name}`);
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error("Server error");
  return resp.json();
}

async function createUser(visibleName) {
  const resp = await fetch(`${LINKS.API_URL}/user/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ VisibleName: visibleName }),
  });
  if (!resp.ok) throw new Error("Create user failed");
  return resp.json();
}

// ==== Handlers ====

async function handleCreateUser() {
  const visibleName = DOM.userNameInput.value.trim();
  if (!visibleName) return;

  try {
    const user = await createUser(visibleName);
    if (user?.Profile) {
      setCookie("UserID", user.Profile.ID);
      setCookie("Name", user.Profile.Name);
      showUser(user);
    }
  } catch (e) {
    console.error("Create user failed", e);
  }
}

// ==== Platform ====

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return PLATFORMS.ANDROID;
  if (/iPad|iPhone|iPod/.test(ua)) return PLATFORMS.IOS;
  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) return PLATFORMS.MAC;
  if (/Win32|Win64|Windows|WOW64/.test(ua)) return PLATFORMS.WINDOWS;
  return PLATFORMS.UNKNOWN;
}

function initPlatformButtons(platform) {
  const appLinkBtns = APP_LINKS[platform] || [];
  DOM.appBtnsContainer.innerHTML = ""; // очищаем старые кнопки
  appLinkBtns.forEach((appLinkBtn) => {
    const clone = DOM.appBtnTemplate.cloneNode(true);
    const btn = clone.querySelector("button");
    btn.id = appLinkBtn.ID;
    btn.textContent = appLinkBtn.Text;
    btn.onclick = () => window.open(appLinkBtn.URL, "_blank");
    DOM.appBtnsContainer.appendChild(clone);
  });
}

// ==== UI ====

function showForm() {
  // Убираем все слушатели, чтобы не дублировались
  DOM.userNameInputBtn.onclick = handleCreateUser;
  DOM.userNameInput.onkeydown = (e) => {
    if (e.key === "Enter") handleCreateUser();
  };

  history.replaceState({}, "", "/");
  DOM.forNonLoggedPage.classList.remove("d-none");
  DOM.forLoggedPage.classList.add("d-none");
}

function showUser(user) {
  const p = user.Profile;
  DOM.userName.textContent = p.VisibleName;

  const subscriptionURL = `${LINKS.API_URL}/sub/${p.ID}-${p.Name}`;
  const happLink = `${LINKS.HAPP_INTENT}${subscriptionURL}`;
  DOM.openhappBtn.onclick = () => (window.location.href = happLink);

  history.replaceState({}, "", `/${p.ID}-${p.Name}`);
  DOM.forNonLoggedPage.classList.add("d-none");
  DOM.forLoggedPage.classList.remove("d-none");
}

function initBackground() {
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const sizeRange = [5, 20];
  const nGifs = 20;

  for (var i = 0; i < nGifs; i++) {
    const gif = DOM.bgGifTemplate.cloneNode(true);
    // image
    gif.src = getRandomItem(GIF_URLS);
    // size
    const size = randomInt(sizeRange[0], sizeRange[1]);
    const left = randomInt(0, 100 - size);
    const top = randomInt(0, 100 - size);

    gif.style.aspectRatio = "1";
    gif.style.width = `${size}%`;
    // position
    gif.style.position = "absolute";
    gif.style.left = `${left}%`;
    gif.style.top = `${top}%`;
    // add
    DOM.bgGifContainer.appendChild(gif);
  }
}

// ==== main ====

(async function init() {
  initBackground();

  const platform = detectPlatform();
  initPlatformButtons(platform);

  const user = getUserFromPath();
  let id = user?.id || getCookie("UserID");
  let name = user?.name || getCookie("Name");

  if (id && name) {
    try {
      const user = await fetchUser(id, name);
      if (user) {
        setCookie("UserID", user.Profile.ID);
        setCookie("Name", user.Profile.Name);
        showUser(user);
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }

  showForm();
})();
