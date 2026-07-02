const screenshotInput = document.getElementById("screenshotInput");
const previewImage = document.getElementById("previewImage");
const uploadPrompt = document.getElementById("uploadPrompt");
const detectBtn = document.getElementById("detectBtn");
const aiStatus = document.getElementById("aiStatus");

const auctionLink = document.getElementById("auctionLink");
const analyzeLinkBtn = document.getElementById("analyzeLinkBtn");

const productTitle = document.getElementById("productTitle");
const condition = document.getElementById("condition");
const quantity = document.getElementById("quantity");
const currentBid = document.getElementById("currentBid");
const resalePrice = document.getElementById("resalePrice");
const buyerPremium = document.getElementById("buyerPremium");
const taxRate = document.getElementById("taxRate");
const sellingCost = document.getElementById("sellingCost");
const pickupCost = document.getElementById("pickupCost");
const riskReserve = document.getElementById("riskReserve");
const desiredProfit = document.getElementById("desiredProfit");

const calculateBtn = document.getElementById("calculateBtn");

const decisionText = document.getElementById("decisionText");
const decisionBadge = document.getElementById("decisionBadge");
const formulaNote = document.getElementById("formulaNote");

const maxHammer = document.getElementById("maxHammer");
const maxAllIn = document.getElementById("maxAllIn");
const currentAllIn = document.getElementById("currentAllIn");
const expectedProfit = document.getElementById("expectedProfit");

const copyBidBtn = document.getElementById("copyBidBtn");
const saveBtn = document.getElementById("saveBtn");

const historyBtn = document.getElementById("historyBtn");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

let latestResult = null;

/* -----------------------------
   Helper functions
----------------------------- */

function getNumber(element) {
  const value = Number.parseFloat(element.value);

  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function showStatus(message) {
  aiStatus.textContent = message;
}

function detectAuctionSource(hostname) {
  const host = hostname.toLowerCase();

  if (host.includes("hibid")) {
    return "HiBid";
  }

  if (host.includes("maxsold")) {
    return "MaxSold";
  }

  if (host.includes("auctionnetwork")) {
    return "Auction Network";
  }

  return "Auction website";
}

function createTitleFromLink(url) {
  const parts = url.pathname
    .split("/")
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  let possibleTitle = parts[parts.length - 1];

  if (/^\d+$/.test(possibleTitle) && parts.length > 1) {
    possibleTitle = parts[parts.length - 2];
  }

  return decodeURIComponent(possibleTitle)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
}

/* -----------------------------
   Analyze auction link
----------------------------- */

analyzeLinkBtn.addEventListener("click", function () {
  const link = auctionLink.value.trim();

  if (!link) {
    alert("Please paste an auction link first.");
    auctionLink.focus();
    return;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(link);
  } catch (error) {
    alert(
      "This link is not valid. Please paste the complete link beginning with https://"
    );

    auctionLink.focus();
    return;
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    alert("Please enter a valid auction website link.");
    return;
  }

  analyzeLinkBtn.disabled = true;
  analyzeLinkBtn.textContent = "Checking...";
  showStatus("Reading link...");

  setTimeout(function () {
    const source = detectAuctionSource(parsedUrl.hostname);
    const titleFromLink = createTitleFromLink(parsedUrl);

    if (titleFromLink) {
      productTitle.value = titleFromLink;
    } else {
      productTitle.value = source + " auction lot";
    }

    condition.value = "brand_new_open_box";
    quantity.value = 1;

    showStatus(source + " link added");

    analyzeLinkBtn.disabled = false;
    analyzeLinkBtn.textContent = "Analyze";

    document
      .getElementById("calculator")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    alert(
      source +
      " link added successfully.\n\n" +
      "Automatic product price and condition reading will work after we connect the backend."
    );
  }, 700);
});

/* Allow Enter key inside link input */

auctionLink.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    analyzeLinkBtn.click();
  }
});

/* -----------------------------
   Screenshot upload
----------------------------- */

screenshotInput.addEventListener("change", function () {
  const file = screenshotInput.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Please upload a valid image.");
    screenshotInput.value = "";
    return;
  }

  const imageUrl = URL.createObjectURL(file);

  previewImage.src = imageUrl;
  previewImage.hidden = false;
  uploadPrompt.hidden = true;

  detectBtn.disabled = false;

  showStatus("Screenshot ready");
});

/* -----------------------------
   Demo screenshot detection
----------------------------- */

detectBtn.addEventListener("click", function () {
  if (!screenshotInput.files[0]) {
    alert("Please upload an auction screenshot first.");
    return;
  }

  detectBtn.disabled = true;
  detectBtn.textContent = "Detecting...";
  showStatus("Detecting...");

  setTimeout(function () {
    productTitle.value = "Detected auction product";
    condition.value = "brand_new_open_box";
    quantity.value = 1;

    showStatus("Details detected");

    detectBtn.disabled = false;
    detectBtn.textContent = "Detect product details";

    document
      .getElementById("calculator")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }, 1000);
});

/* -----------------------------
   Bid calculation
----------------------------- */

function calculateBid() {
  const resale = getNumber(resalePrice);
  const premiumPercent = getNumber(buyerPremium);
  const taxPercent = getNumber(taxRate);

  const sellingExpense = getNumber(sellingCost);
  const pickupExpense = getNumber(pickupCost);
  const riskExpense = getNumber(riskReserve);
  const targetProfit = getNumber(desiredProfit);
  const presentBid = getNumber(currentBid);

  if (resale <= 0) {
    alert("Please enter the expected resale price.");
    resalePrice.focus();
    return null;
  }

  const premiumRate = premiumPercent / 100;
  const taxRateValue = taxPercent / 100;

  const safeAllInBudget =
    resale -
    sellingExpense -
    pickupExpense -
    riskExpense -
    targetProfit;

  const auctionMultiplier =
    (1 + premiumRate) *
    (1 + taxRateValue);

  let safeHammerBid =
    safeAllInBudget / auctionMultiplier;

  if (
    !Number.isFinite(safeHammerBid) ||
    safeHammerBid < 0
  ) {
    safeHammerBid = 0;
  }

  const auctionCostBeforePickup =
    presentBid * auctionMultiplier;

  const presentAllInCost =
    auctionCostBeforePickup +
    pickupExpense;

  const estimatedProfit =
    resale -
    sellingExpense -
    riskExpense -
    presentAllInCost;

  let recommendation = "Pass";
  let badgeText = "Over limit";
  let badgeClass = "bad";

  if (presentBid <= safeHammerBid * 0.85) {
    recommendation = "Good buying range";
    badgeText = "Buy";
    badgeClass = "good";
  } else if (presentBid <= safeHammerBid) {
    recommendation = "Close to your maximum";
    badgeText = "Caution";
    badgeClass = "warning";
  }

  decisionText.textContent = recommendation;
  decisionBadge.textContent = badgeText;
  decisionBadge.className =
    "decision-badge " + badgeClass;

  maxHammer.textContent =
    formatMoney(safeHammerBid);

  maxAllIn.textContent =
    formatMoney(Math.max(0, safeAllInBudget));

  currentAllIn.textContent =
    formatMoney(presentAllInCost);

  expectedProfit.textContent =
    formatMoney(estimatedProfit);

  formulaNote.textContent =
    "Based on resale price, buyer premium, tax, pickup cost, risk reserve and desired profit.";

  latestResult = {
    auctionLink: auctionLink.value.trim(),

    productTitle:
      productTitle.value.trim() ||
      "Untitled auction lot",

    condition: condition.value,
    quantity: getNumber(quantity),

    resalePrice: resale,
    currentBid: presentBid,

    buyerPremium: premiumPercent,
    taxRate: taxPercent,

    sellingCost: sellingExpense,
    pickupCost: pickupExpense,
    riskReserve: riskExpense,
    desiredProfit: targetProfit,

    maxHammer: safeHammerBid,
    maxAllIn: safeAllInBudget,
    currentAllIn: presentAllInCost,
    expectedProfit: estimatedProfit,

    recommendation: recommendation,
    savedAt: new Date().toISOString()
  };

  document
    .getElementById("resultCard")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  return latestResult;
}

calculateBtn.addEventListener("click", calculateBid);

/* -----------------------------
   Copy maximum bid
----------------------------- */

copyBidBtn.addEventListener("click", async function () {
  const result =
    latestResult || calculateBid();

  if (!result) {
    return;
  }

  const amount =
    result.maxHammer.toFixed(2);

  try {
    await navigator.clipboard.writeText(amount);

    copyBidBtn.textContent = "Copied";

    setTimeout(function () {
      copyBidBtn.textContent =
        "Copy maximum bid";
    }, 1200);
  } catch (error) {
    alert("Maximum bid: $" + amount);
  }
});

/* -----------------------------
   Saved history
----------------------------- */

function getHistory() {
  try {
    return JSON.parse(
      localStorage.getItem("bidguard-history") ||
      "[]"
    );
  } catch (error) {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(
    "bidguard-history",
    JSON.stringify(history)
  );
}

function renderHistory() {
  const history = getHistory();

  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML =
      "<p>No saved analyses yet.</p>";

    return;
  }

  history.forEach(function (item) {
    const historyItem =
      document.createElement("article");

    historyItem.className =
      "history-item";

    const leftSide =
      document.createElement("div");

    const title =
      document.createElement("strong");

    title.textContent =
      item.productTitle;

    const date =
      document.createElement("span");

    date.textContent =
      new Date(item.savedAt)
        .toLocaleString("en-CA");

    leftSide.appendChild(title);
    leftSide.appendChild(date);

    const rightSide =
      document.createElement("div");

    rightSide.className =
      "history-price";

    const price =
      document.createElement("strong");

    price.textContent =
      formatMoney(item.maxHammer);

    const label =
      document.createElement("span");

    label.textContent =
      "maximum bid";

    rightSide.appendChild(price);
    rightSide.appendChild(label);

    historyItem.appendChild(leftSide);
    historyItem.appendChild(rightSide);

    historyList.appendChild(historyItem);
  });
}

saveBtn.addEventListener("click", function () {
  const result =
    latestResult || calculateBid();

  if (!result) {
    return;
  }

  const history = getHistory();

  history.unshift(result);

  saveHistory(history.slice(0, 30));
  renderHistory();

  historyPanel.classList.remove("hidden");

  saveBtn.textContent = "Saved";

  setTimeout(function () {
    saveBtn.textContent = "Save analysis";
  }, 1200);
});

historyBtn.addEventListener("click", function () {
  historyPanel.classList.toggle("hidden");

  renderHistory();

  if (
    !historyPanel.classList.contains("hidden")
  ) {
    historyPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
});

clearHistoryBtn.addEventListener("click", function () {
  localStorage.removeItem("bidguard-history");
  renderHistory();
});
