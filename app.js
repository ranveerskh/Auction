const screenshotInput = document.getElementById("screenshotInput");
const previewImage = document.getElementById("previewImage");
const uploadPrompt = document.getElementById("uploadPrompt");
const detectBtn = document.getElementById("detectBtn");
const aiStatus = document.getElementById("aiStatus");

const productTitle = document.getElementById("productTitle");
const condition = document.getElementById("condition");
const quantity = document.getElementById("quantity");
const resalePrice = document.getElementById("resalePrice");
const buyerPremium = document.getElementById("buyerPremium");
const taxRate = document.getElementById("taxRate");
const sellingCost = document.getElementById("sellingCost");
const pickupCost = document.getElementById("pickupCost");
const riskReserve = document.getElementById("riskReserve");
const desiredProfit = document.getElementById("desiredProfit");
const currentBid = document.getElementById("currentBid");

const calculateBtn = document.getElementById("calculateBtn");
const decisionText = document.getElementById("decisionText");
const decisionBadge = document.getElementById("decisionBadge");

const maxHammer = document.getElementById("maxHammer");
const maxAllIn = document.getElementById("maxAllIn");
const currentAllIn = document.getElementById("currentAllIn");
const expectedProfit = document.getElementById("expectedProfit");

const formulaNote = document.getElementById("formulaNote");
const copyBidBtn = document.getElementById("copyBidBtn");
const saveBtn = document.getElementById("saveBtn");

const historyBtn = document.getElementById("historyBtn");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

let latestResult = null;

function getNumber(element) {
  const value = Number.parseFloat(element.value);

  if (Number.isFinite(value)) {
    return value;
  }

  return 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/*
Screenshot preview
*/

screenshotInput.addEventListener("change", function () {
  const file = screenshotInput.files[0];

  if (!file) {
    return;
  }

  const imageUrl = URL.createObjectURL(file);

  previewImage.src = imageUrl;
  previewImage.hidden = false;

  uploadPrompt.hidden = true;
  detectBtn.disabled = false;

  aiStatus.textContent = "Image loaded";
});

/*
Demo AI detection

Real AI will be connected later.
For now, this button fills demo product details.
*/

detectBtn.addEventListener("click", function () {
  aiStatus.textContent = "Detecting...";
  detectBtn.disabled = true;

  setTimeout(function () {
    productTitle.value = "Ninja Coffee Maker";
    condition.value = "open_box";
    quantity.value = 1;
    currentBid.value = 65;
    buyerPremium.value = 15;

    aiStatus.textContent = "Detected - confirm below";
    detectBtn.disabled = false;
  }, 1200);
});

/*
Maximum safe bid calculation
*/

function calculateBid() {
  const resale = getNumber(resalePrice);
  const premiumPercent = getNumber(buyerPremium);
  const taxPercent = getNumber(taxRate);

  const sellingExpense = getNumber(sellingCost);
  const pickupExpense = getNumber(pickupCost);
  const riskExpense = getNumber(riskReserve);
  const profitWanted = getNumber(desiredProfit);

  const presentBid = getNumber(currentBid);

  const premiumRate = premiumPercent / 100;
  const taxRateValue = taxPercent / 100;

  /*
  Maximum amount we can spend after all expenses
  */

  const safeAllInCost =
    resale -
    sellingExpense -
    pickupExpense -
    riskExpense -
    profitWanted;

  /*
  Auction multiplier:

  Hammer bid
  + buyer premium
  + tax
  */

  const auctionMultiplier =
    (1 + premiumRate) *
    (1 + taxRateValue);

  let safeHammerBid = 0;

  if (auctionMultiplier > 0) {
    safeHammerBid =
      safeAllInCost /
      auctionMultiplier;
  }

  if (safeHammerBid < 0) {
    safeHammerBid = 0;
  }

  /*
  Current all-in auction cost
  */

  const presentAllInCost =
    presentBid *
    auctionMultiplier +
    pickupExpense;

  /*
  Estimated profit at current bid
  */

  const estimatedProfit =
    resale -
    sellingExpense -
    riskExpense -
    presentAllInCost;

  let recommendation = "PASS";
  let badgeText = "OVER LIMIT";
  let badgeClass = "bad";

  if (presentBid <= safeHammerBid * 0.85) {
    recommendation = "BUY RANGE";
    badgeText = "GOOD";
    badgeClass = "good";
  } else if (presentBid <= safeHammerBid) {
    recommendation = "RISKY - NEAR LIMIT";
    badgeText = "CAUTION";
    badgeClass = "warning";
  }

  decisionText.textContent = recommendation;
  decisionBadge.textContent = badgeText;

  decisionBadge.className =
    "decision-badge " + badgeClass;

  maxHammer.textContent =
    formatMoney(safeHammerBid);

  maxAllIn.textContent =
    formatMoney(Math.max(0, safeAllInCost));

  currentAllIn.textContent =
    formatMoney(presentAllInCost);

  expectedProfit.textContent =
    formatMoney(estimatedProfit);

  formulaNote.textContent =
    "Maximum bid is based on resale price minus selling cost, pickup cost, risk reserve and desired profit.";

  latestResult = {
    productTitle:
      productTitle.value.trim() ||
      "Untitled auction lot",

    condition: condition.value,
    quantity: getNumber(quantity),

    resalePrice: resale,
    buyerPremium: premiumPercent,
    taxRate: taxPercent,

    sellingCost: sellingExpense,
    pickupCost: pickupExpense,
    riskReserve: riskExpense,
    desiredProfit: profitWanted,

    currentBid: presentBid,
    maxHammer: safeHammerBid,
    maxAllIn: safeAllInCost,
    currentAllIn: presentAllInCost,
    expectedProfit: estimatedProfit,

    recommendation: recommendation,
    savedAt: new Date().toISOString()
  };

  return latestResult;
}

calculateBtn.addEventListener("click", calculateBid);

/*
Copy maximum bid
*/

copyBidBtn.addEventListener("click", async function () {
  const result =
    latestResult || calculateBid();

  try {
    await navigator.clipboard.writeText(
      result.maxHammer.toFixed(2)
    );

    copyBidBtn.textContent = "Copied";

    setTimeout(function () {
      copyBidBtn.textContent = "Copy max bid";
    }, 1200);
  } catch (error) {
    alert(
      "Maximum bid: $" +
      result.maxHammer.toFixed(2)
    );
  }
});

/*
Save analysis history
*/

function getHistory() {
  const savedHistory =
    localStorage.getItem("bidguard-history");

  if (!savedHistory) {
    return [];
  }

  try {
    return JSON.parse(savedHistory);
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
      '<p class="helper-text">No saved analyses yet.</p>';

    return;
  }

  history.forEach(function (item) {
    const historyItem =
      document.createElement("article");

    historyItem.className = "history-item";

    const productDetails =
      document.createElement("div");

    const productName =
      document.createElement("strong");

    productName.textContent =
      item.productTitle;

    const savedDate =
      document.createElement("span");

    savedDate.textContent =
      new Date(item.savedAt).toLocaleString();

    productDetails.appendChild(productName);
    productDetails.appendChild(savedDate);

    const priceDetails =
      document.createElement("div");

    priceDetails.className =
      "history-price";

    const maximumBid =
      document.createElement("strong");

    maximumBid.textContent =
      formatMoney(item.maxHammer);

    const bidLabel =
      document.createElement("span");

    bidLabel.textContent =
      "maximum bid";

    priceDetails.appendChild(maximumBid);
    priceDetails.appendChild(bidLabel);

    historyItem.appendChild(productDetails);
    historyItem.appendChild(priceDetails);

    historyList.appendChild(historyItem);
  });
}

saveBtn.addEventListener("click", function () {
  const result =
    latestResult || calculateBid();

  const history = getHistory();

  history.unshift(result);

  const limitedHistory =
    history.slice(0, 30);

  saveHistory(limitedHistory);
  renderHistory();

  historyPanel.classList.remove("hidden");

  saveBtn.textContent = "Saved";

  setTimeout(function () {
    saveBtn.textContent = "Save analysis";
  }, 1200);
});

/*
Show or hide history
*/

historyBtn.addEventListener("click", function () {
  historyPanel.classList.toggle("hidden");

  renderHistory();
});

/*
Clear history
*/

clearHistoryBtn.addEventListener("click", function () {
  localStorage.removeItem("bidguard-history");

  renderHistory();
});

/*
Run one calculation when page opens
*/

calculateBid();
