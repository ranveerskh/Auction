"use strict";

/* =========================================================
   BIDGUARD — ELEMENTS
========================================================= */

const screenshotInput =
  document.getElementById("screenshotInput");

const previewImage =
  document.getElementById("previewImage");

const uploadPrompt =
  document.getElementById("uploadPrompt");

const detectBtn =
  document.getElementById("detectBtn");

const aiStatus =
  document.getElementById("aiStatus");

const auctionLink =
  document.getElementById("auctionLink");

const analyzeLinkBtn =
  document.getElementById("analyzeLinkBtn");

const productTitle =
  document.getElementById("productTitle");

const condition =
  document.getElementById("condition");

const quantity =
  document.getElementById("quantity");

const currentBid =
  document.getElementById("currentBid");

const resalePrice =
  document.getElementById("resalePrice");

const buyerPremium =
  document.getElementById("buyerPremium");

const taxRate =
  document.getElementById("taxRate");

const sellingCost =
  document.getElementById("sellingCost");

const pickupCost =
  document.getElementById("pickupCost");

const riskReserve =
  document.getElementById("riskReserve");

const desiredProfit =
  document.getElementById("desiredProfit");

const calculateBtn =
  document.getElementById("calculateBtn");

const decisionText =
  document.getElementById("decisionText");

const decisionBadge =
  document.getElementById("decisionBadge");

const formulaNote =
  document.getElementById("formulaNote");

const maxHammer =
  document.getElementById("maxHammer");

const maxAllIn =
  document.getElementById("maxAllIn");

const currentAllIn =
  document.getElementById("currentAllIn");

const expectedProfit =
  document.getElementById("expectedProfit");

const copyBidBtn =
  document.getElementById("copyBidBtn");

const saveBtn =
  document.getElementById("saveBtn");

const historyBtn =
  document.getElementById("historyBtn");

const historyPanel =
  document.getElementById("historyPanel");

const historyList =
  document.getElementById("historyList");

const clearHistoryBtn =
  document.getElementById("clearHistoryBtn");


let latestResult = null;
let currentPreviewUrl = null;


/* =========================================================
   BASIC HELPERS
========================================================= */

function getNumber(element) {
  const value =
    Number.parseFloat(element.value);

  return Number.isFinite(value)
    ? value
    : 0;
}


function formatMoney(value) {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeValue);
}


function showStatus(message) {
  aiStatus.textContent = message;
}


function scrollToSection(sectionId) {
  const section =
    document.getElementById(sectionId);

  if (!section) {
    return;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function setButtonLoading(
  button,
  isLoading,
  loadingText,
  normalText
) {
  button.disabled = isLoading;

  button.textContent =
    isLoading
      ? loadingText
      : normalText;
}


/* =========================================================
   RESET RESULT CARD
========================================================= */

function resetResults() {
  latestResult = null;

  decisionText.textContent =
    "Ready to analyze";

  decisionBadge.textContent =
    "Waiting";

  decisionBadge.className =
    "decision-badge neutral";

  maxHammer.textContent =
    "$0.00";

  maxAllIn.textContent =
    "$0.00";

  currentAllIn.textContent =
    "$0.00";

  expectedProfit.textContent =
    "$0.00";

  formulaNote.textContent =
    "Enter the missing auction details to calculate your safe bid.";
}


/* =========================================================
   AUCTION LINK HELPERS
========================================================= */

function detectAuctionSource(hostname) {
  const host =
    hostname.toLowerCase();

  if (
    host.includes("encoreauctions")
  ) {
    return "Encore Auctions";
  }

  if (host.includes("hibid")) {
    return "HiBid";
  }

  if (host.includes("maxsold")) {
    return "MaxSold";
  }

  if (
    host.includes("auctionnetwork")
  ) {
    return "Auction Network";
  }

  return "Auction website";
}


function formatTitleWord(word) {
  const containsLetter =
    /[a-zA-Z]/.test(word);

  const containsNumber =
    /\d/.test(word);

  /*
    Model numbers:
    pb040c → PB040C
    cfp301 → CFP301
  */

  if (
    containsLetter &&
    containsNumber
  ) {
    return word.toUpperCase();
  }

  const smallWords = [
    "and",
    "or",
    "the",
    "with",
    "for",
    "of",
    "to",
    "in"
  ];

  if (
    smallWords.includes(
      word.toLowerCase()
    )
  ) {
    return word.toLowerCase();
  }

  return (
    word.charAt(0).toUpperCase() +
    word.slice(1).toLowerCase()
  );
}


function createTitleFromLink(url) {
  const pathParts =
    url.pathname
      .split("/")
      .filter(Boolean);

  if (pathParts.length === 0) {
    return "";
  }

  let slug =
    pathParts[pathParts.length - 1];

  /*
    HiBid URLs often contain:

    /lot/309570451/product-name
  */

  if (
    /^\d+$/.test(slug) &&
    pathParts.length > 1
  ) {
    slug =
      pathParts[pathParts.length - 2];
  }

  try {
    slug =
      decodeURIComponent(slug);
  } catch (error) {
    console.warn(
      "Unable to decode URL:",
      error
    );
  }

  const words =
    slug
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  return words
    .map(function (word, index) {
      const formatted =
        formatTitleWord(word);

      if (
        index === 0 &&
        formatted.length > 0
      ) {
        return (
          formatted.charAt(0).toUpperCase() +
          formatted.slice(1)
        );
      }

      return formatted;
    })
    .join(" ");
}


/* =========================================================
   ANALYZE AUCTION LINK
========================================================= */

analyzeLinkBtn.addEventListener(
  "click",
  function () {
    const link =
      auctionLink.value.trim();

    if (!link) {
      alert(
        "Please paste an auction link first."
      );

      auctionLink.focus();
      return;
    }

    let parsedUrl;

    try {
      parsedUrl =
        new URL(link);
    } catch (error) {
      alert(
        "Please paste the complete link beginning with https://"
      );

      auctionLink.focus();
      return;
    }

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.protocol !== "http:"
    ) {
      alert(
        "Please enter a valid auction website link."
      );

      return;
    }

    setButtonLoading(
      analyzeLinkBtn,
      true,
      "Reading...",
      "Analyze"
    );

    showStatus("Reading link...");

    window.setTimeout(
      function () {
        const source =
          detectAuctionSource(
            parsedUrl.hostname
          );

        const titleFromLink =
          createTitleFromLink(
            parsedUrl
          );

        /*
          Link analysis currently extracts
          the product title from the URL only.

          It does not fake condition,
          bid or buyer premium.
        */

        productTitle.value =
          titleFromLink ||
          source + " auction lot";

        condition.value = "";
        quantity.value = 1;

        currentBid.value = "";
        resalePrice.value = "";
        buyerPremium.value = "";

        resetResults();

        showStatus(
          "Title extracted — screenshot needed for details"
        );

        setButtonLoading(
          analyzeLinkBtn,
          false,
          "Reading...",
          "Analyze"
        );

        scrollToSection("calculator");
      },
      500
    );
  }
);


auctionLink.addEventListener(
  "keydown",
  function (event) {
    if (event.key === "Enter") {
      event.preventDefault();

      analyzeLinkBtn.click();
    }
  }
);


/* =========================================================
   SCREENSHOT PREVIEW
========================================================= */

screenshotInput.addEventListener(
  "change",
  function () {
    const file =
      screenshotInput.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      alert(
        "Please select a valid image."
      );

      screenshotInput.value = "";
      return;
    }

    if (currentPreviewUrl) {
      URL.revokeObjectURL(
        currentPreviewUrl
      );
    }

    currentPreviewUrl =
      URL.createObjectURL(file);

    previewImage.src =
      currentPreviewUrl;

    previewImage.hidden = false;
    uploadPrompt.hidden = true;

    detectBtn.disabled = false;

    resetResults();

    showStatus("Screenshot ready");
  }
);


/* =========================================================
   FILE TO BASE64
========================================================= */

function fileToBase64(file) {
  return new Promise(
    function (resolve, reject) {
      const reader =
        new FileReader();

      reader.onload =
        function () {
          const result =
            String(reader.result);

          const commaPosition =
            result.indexOf(",");

          if (commaPosition === -1) {
            reject(
              new Error(
                "Unable to prepare screenshot."
              )
            );

            return;
          }

          resolve(
            result.slice(
              commaPosition + 1
            )
          );
        };

      reader.onerror =
        function () {
          reject(
            new Error(
              "Unable to read screenshot."
            )
          );
        };

      reader.readAsDataURL(file);
    }
  );
}


/* =========================================================
   READ BACKEND RESPONSE
========================================================= */

async function readApiResponse(
  response
) {
  const responseText =
    await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(
      responseText
    );
  } catch (error) {
    console.error(
      "Server response:",
      responseText
    );

    throw new Error(
      "The server returned an invalid response."
    );
  }
}


/* =========================================================
   SCREENSHOT AI ANALYSIS
========================================================= */

detectBtn.addEventListener(
  "click",
  async function () {
    const file =
      screenshotInput.files?.[0];

    if (!file) {
      alert(
        "Please upload an auction screenshot first."
      );

      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      alert(
        "Please upload a valid screenshot image."
      );

      return;
    }

    const maximumFileSize =
      4 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      alert(
        "Screenshot is too large. Please upload an image under 4 MB."
      );

      return;
    }

    if (
      window.location.protocol ===
      "file:"
    ) {
      alert(
        "AI analysis only works on the deployed Netlify website."
      );

      return;
    }

    setButtonLoading(
      detectBtn,
      true,
      "Analyzing screenshot...",
      "Detect product details"
    );

    showStatus("AI analyzing...");

    try {
      const imageBase64 =
        await fileToBase64(file);

      const response =
        await fetch(
          "/.netlify/functions/analyze-auction",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              imageBase64: imageBase64,
              mimeType: file.type
            })
          }
        );

      const result =
        await readApiResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Screenshot analysis failed."
        );
      }

      productTitle.value =
        typeof result.productTitle ===
          "string"
          ? result.productTitle
          : "";

      condition.value =
        typeof result.condition ===
          "string"
          ? result.condition
          : "";

      quantity.value =
        Number.isInteger(
          result.quantity
        ) &&
        result.quantity > 0
          ? result.quantity
          : 1;

      currentBid.value =
        typeof result.currentBid ===
          "number" &&
        Number.isFinite(
          result.currentBid
        )
          ? result.currentBid
          : "";

      buyerPremium.value =
        typeof result.buyerPremium ===
          "number" &&
        Number.isFinite(
          result.buyerPremium
        )
          ? result.buyerPremium
          : "";

      resetResults();

      /*
        Count genuinely detected fields.
      */

      const detectedFields = [
        typeof result.productTitle ===
          "string" &&
          result.productTitle.trim() !== "",

        typeof result.condition ===
          "string" &&
          result.condition !== "",

        Number.isInteger(
          result.quantity
        ) &&
          result.quantity > 0,

        typeof result.currentBid ===
          "number" &&
          Number.isFinite(
            result.currentBid
          ),

        typeof result.buyerPremium ===
          "number" &&
          Number.isFinite(
            result.buyerPremium
          )
      ];

      const detectedCount =
        detectedFields.filter(
          Boolean
        ).length;

      showStatus(
        detectedCount +
        "/5 fields detected"
      );

      scrollToSection("calculator");

    } catch (error) {
      console.error(
        "Screenshot analysis error:",
        error
      );

      showStatus("Analysis failed");

      alert(
        error.message ||
        "Unable to analyze screenshot."
      );

    } finally {
      setButtonLoading(
        detectBtn,
        false,
        "Analyzing screenshot...",
        "Detect product details"
      );
    }
  }
);


/* =========================================================
   BID CALCULATOR
========================================================= */

function calculateBid() {
  const resale =
    getNumber(resalePrice);

  const presentBid =
    getNumber(currentBid);

  const premiumPercent =
    getNumber(buyerPremium);

  const taxPercent =
    getNumber(taxRate);

  const sellingExpense =
    getNumber(sellingCost);

  const pickupExpense =
    getNumber(pickupCost);

  const riskExpense =
    getNumber(riskReserve);

  const targetProfit =
    getNumber(desiredProfit);


  if (resalePrice.value.trim() === "") {
    alert(
      "Please enter the expected resale price."
    );

    resalePrice.focus();
    return null;
  }


  if (resale <= 0) {
    alert(
      "Expected resale price must be greater than zero."
    );

    resalePrice.focus();
    return null;
  }


  if (
    currentBid.value.trim() === ""
  ) {
    alert(
      "Please enter the current hammer bid."
    );

    currentBid.focus();
    return null;
  }


  if (
    buyerPremium.value.trim() === ""
  ) {
    alert(
      "Please enter the buyer premium. Enter 0 if there is no premium."
    );

    buyerPremium.focus();
    return null;
  }


  const premiumRate =
    premiumPercent / 100;

  const taxRateValue =
    taxPercent / 100;


  /*
    Hammer + premium + tax
  */

  const auctionMultiplier =
    (1 + premiumRate) *
    (1 + taxRateValue);


  /*
    Maximum complete purchase budget.
  */

  const maximumTotalPurchaseCost =
    resale -
    sellingExpense -
    riskExpense -
    targetProfit;


  /*
    Pickup is outside the auction invoice.
  */

  const maximumAuctionCheckout =
    maximumTotalPurchaseCost -
    pickupExpense;


  let safeHammerBid = 0;

  if (
    auctionMultiplier > 0 &&
    maximumAuctionCheckout > 0
  ) {
    safeHammerBid =
      maximumAuctionCheckout /
      auctionMultiplier;
  }


  if (
    !Number.isFinite(
      safeHammerBid
    ) ||
    safeHammerBid < 0
  ) {
    safeHammerBid = 0;
  }


  const currentAuctionCheckout =
    presentBid *
    auctionMultiplier;


  const presentAllInCost =
    currentAuctionCheckout +
    pickupExpense;


  const estimatedProfit =
    resale -
    sellingExpense -
    riskExpense -
    presentAllInCost;


  let recommendation =
    "Pass";

  let badgeText =
    "Over limit";

  let badgeClass =
    "bad";


  if (
    safeHammerBid > 0 &&
    presentBid <=
      safeHammerBid * 0.85
  ) {
    recommendation =
      "Good buying range";

    badgeText =
      "Buy";

    badgeClass =
      "good";

  } else if (
    safeHammerBid > 0 &&
    presentBid <= safeHammerBid
  ) {
    recommendation =
      "Close to your maximum";

    badgeText =
      "Caution";

    badgeClass =
      "warning";
  }


  decisionText.textContent =
    recommendation;

  decisionBadge.textContent =
    badgeText;

  decisionBadge.className =
    "decision-badge " +
    badgeClass;


  maxHammer.textContent =
    formatMoney(
      safeHammerBid
    );

  maxAllIn.textContent =
    formatMoney(
      Math.max(
        0,
        maximumTotalPurchaseCost
      )
    );

  currentAllIn.textContent =
    formatMoney(
      presentAllInCost
    );

  expectedProfit.textContent =
    formatMoney(
      estimatedProfit
    );


  formulaNote.textContent =
    "Maximum bid includes buyer premium, tax, pickup cost, selling cost, condition risk and desired profit.";


  latestResult = {
    auctionLink:
      auctionLink.value.trim(),

    productTitle:
      productTitle.value.trim() ||
      "Untitled auction lot",

    condition:
      condition.value,

    quantity:
      Math.max(
        1,
        getNumber(quantity)
      ),

    resalePrice:
      resale,

    currentBid:
      presentBid,

    buyerPremium:
      premiumPercent,

    taxRate:
      taxPercent,

    sellingCost:
      sellingExpense,

    pickupCost:
      pickupExpense,

    riskReserve:
      riskExpense,

    desiredProfit:
      targetProfit,

    maxHammer:
      safeHammerBid,

    maxAllIn:
      Math.max(
        0,
        maximumTotalPurchaseCost
      ),

    currentAllIn:
      presentAllInCost,

    expectedProfit:
      estimatedProfit,

    recommendation:
      recommendation,

    savedAt:
      new Date().toISOString()
  };


  scrollToSection("resultCard");

  return latestResult;
}


calculateBtn.addEventListener(
  "click",
  calculateBid
);


/* =========================================================
   RESET STALE RESULT WHEN INPUT CHANGES
========================================================= */

const calculatorInputs = [
  productTitle,
  condition,
  quantity,
  currentBid,
  resalePrice,
  buyerPremium,
  taxRate,
  sellingCost,
  pickupCost,
  riskReserve,
  desiredProfit
];

calculatorInputs.forEach(
  function (input) {
    input.addEventListener(
      "input",
      function () {
        latestResult = null;
      }
    );

    input.addEventListener(
      "change",
      function () {
        latestResult = null;
      }
    );
  }
);


/* =========================================================
   COPY MAXIMUM BID
========================================================= */

copyBidBtn.addEventListener(
  "click",
  async function () {
    const result =
      latestResult ||
      calculateBid();

    if (!result) {
      return;
    }

    const amount =
      result.maxHammer.toFixed(2);

    try {
      await navigator.clipboard.writeText(
        amount
      );

      copyBidBtn.textContent =
        "Copied";

      window.setTimeout(
        function () {
          copyBidBtn.textContent =
            "Copy maximum bid";
        },
        1200
      );

    } catch (error) {
      alert(
        "Maximum bid: $" +
        amount
      );
    }
  }
);


/* =========================================================
   HISTORY
========================================================= */

function getHistory() {
  try {
    const savedHistory =
      localStorage.getItem(
        "bidguard-history"
      );

    if (!savedHistory) {
      return [];
    }

    const parsedHistory =
      JSON.parse(savedHistory);

    return Array.isArray(
      parsedHistory
    )
      ? parsedHistory
      : [];

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
  const history =
    getHistory();

  historyList.innerHTML = "";

  if (history.length === 0) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.textContent =
      "No saved analyses yet.";

    emptyMessage.style.color =
      "#687086";

    historyList.appendChild(
      emptyMessage
    );

    return;
  }


  history.forEach(
    function (item) {
      const historyItem =
        document.createElement(
          "article"
        );

      historyItem.className =
        "history-item";


      const leftSide =
        document.createElement("div");

      const title =
        document.createElement(
          "strong"
        );

      title.textContent =
        item.productTitle ||
        "Untitled auction lot";


      const date =
        document.createElement(
          "span"
        );

      date.textContent =
        new Date(
          item.savedAt
        ).toLocaleString("en-CA");


      leftSide.appendChild(title);
      leftSide.appendChild(date);


      const rightSide =
        document.createElement("div");

      rightSide.className =
        "history-price";


      const price =
        document.createElement(
          "strong"
        );

      price.textContent =
        formatMoney(
          Number(item.maxHammer)
        );


      const label =
        document.createElement(
          "span"
        );

      label.textContent =
        "maximum bid";


      rightSide.appendChild(price);
      rightSide.appendChild(label);

      historyItem.appendChild(
        leftSide
      );

      historyItem.appendChild(
        rightSide
      );

      historyList.appendChild(
        historyItem
      );
    }
  );
}


/* =========================================================
   SAVE ANALYSIS
========================================================= */

saveBtn.addEventListener(
  "click",
  function () {
    const result =
      latestResult ||
      calculateBid();

    if (!result) {
      return;
    }

    const history =
      getHistory();

    history.unshift(result);

    saveHistory(
      history.slice(0, 30)
    );

    renderHistory();

    historyPanel.classList.remove(
      "hidden"
    );

    saveBtn.textContent =
      "Saved";

    window.setTimeout(
      function () {
        saveBtn.textContent =
          "Save analysis";
      },
      1200
    );
  }
);


/* =========================================================
   SHOW HISTORY
========================================================= */

historyBtn.addEventListener(
  "click",
  function () {
    historyPanel.classList.toggle(
      "hidden"
    );

    renderHistory();

    if (
      !historyPanel.classList.contains(
        "hidden"
      )
    ) {
      historyPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }
);


/* =========================================================
   CLEAR HISTORY
========================================================= */

clearHistoryBtn.addEventListener(
  "click",
  function () {
    localStorage.removeItem(
      "bidguard-history"
    );

    renderHistory();
  }
);


/* =========================================================
   INITIAL STATE
========================================================= */

resetResults();
showStatus("Ready");
