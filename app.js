"use strict";

/* =========================================================
   BIDGUARD — FRONT-END APPLICATION
========================================================= */


/* =========================================================
   ELEMENTS
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

  if (Number.isFinite(value)) {
    return value;
  }

  return 0;
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
  loading,
  loadingText,
  normalText
) {
  button.disabled = loading;

  button.textContent =
    loading
      ? loadingText
      : normalText;
}


/* =========================================================
   AUCTION LINK HELPERS
========================================================= */

function detectAuctionSource(hostname) {
  const host =
    hostname.toLowerCase();

  if (host.includes("hibid")) {
    return "HiBid";
  }

  if (host.includes("maxsold")) {
    return "MaxSold";
  }

  if (host.includes("auctionnetwork")) {
    return "Auction Network";
  }

  if (host.includes("encoreauctions")) {
    return "Encore Auctions";
  }

  return "Auction website";
}


function formatTitleWord(word) {
  /*
    Keep model numbers uppercase.

    Examples:
    pb040c → PB040C
    cfp301 → CFP301
    4k → 4K
  */

  const containsLetter =
    /[a-zA-Z]/.test(word);

  const containsNumber =
    /\d/.test(word);

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

  /*
    Usually the final URL section contains
    the auction product slug.
  */

  let slug =
    pathParts[pathParts.length - 1];

  /*
    If final section is only a lot number,
    use the previous section.
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
      "Unable to decode URL title:",
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

  const formattedWords =
    words.map(function (word, index) {
      const formatted =
        formatTitleWord(word);

      /*
        Capitalize first word even if it
        is normally considered a small word.
      */

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
    });

  return formattedWords.join(" ");
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
      "Checking...",
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
          Only the product title is derived
          from the URL.

          We do not pretend that condition,
          bid, premium or resale price were
          genuinely detected.
        */

        productTitle.value =
          titleFromLink ||
          source + " auction lot";

        condition.value = "";
        quantity.value = 1;

        currentBid.value = "";
        resalePrice.value = "";
        buyerPremium.value = "";

        latestResult = null;

        showStatus(
          source + " link added"
        );

        setButtonLoading(
          analyzeLinkBtn,
          false,
          "Checking...",
          "Analyze"
        );

        scrollToSection("calculator");
      },
      500
    );
  }
);


/*
  Press Enter while auction-link
  input is selected.
*/

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

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select a valid image."
      );

      screenshotInput.value = "";
      return;
    }

    /*
      Revoke previous temporary preview URL.
    */

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

    showStatus("Screenshot ready");
  }
);


/* =========================================================
   CONVERT IMAGE TO BASE64
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

          const base64Data =
            result.slice(
              commaPosition + 1
            );

          resolve(base64Data);
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
   SAFE RESPONSE READER
========================================================= */

async function readApiResponse(response) {
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
      "Non-JSON server response:",
      responseText
    );

    throw new Error(
      "The server returned an invalid response."
    );
  }
}


/* =========================================================
   REAL AI SCREENSHOT ANALYSIS
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

    if (!file.type.startsWith("image/")) {
      alert(
        "Please upload a valid screenshot image."
      );

      return;
    }

    /*
      Netlify request bodies have limits,
      and Base64 increases image size.

      Keep raw screenshot below 4 MB.
    */

    const maximumFileSize =
      4 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      alert(
        "Screenshot is too large. Please upload an image under 4 MB."
      );

      return;
    }

    if (
      window.location.protocol === "file:"
    ) {
      alert(
        "AI analysis will work after the website is deployed on Netlify. It cannot call the Netlify function from a locally opened index.html file."
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

      const confidence =
        typeof result.confidence ===
        "string"
          ? result.confidence
          : "unknown";

      latestResult = null;

      showStatus(
        "Detected — " +
        confidence +
        " confidence"
      );

      scrollToSection("calculator");

    } catch (error) {
      console.error(
        "Screenshot analysis error:",
        error
      );

      showStatus(
        "Analysis failed"
      );

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
   BID CALCULATION
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


  if (resale <= 0) {
    alert(
      "Please enter the expected resale price."
    );

    resalePrice.focus();
    return null;
  }


  if (currentBid.value.trim() === "") {
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
      "Please enter the buyer premium. Enter 0 if there is no buyer premium."
    );

    buyerPremium.focus();
    return null;
  }


  const premiumRate =
    premiumPercent / 100;

  const taxRateValue =
    taxPercent / 100;


  /*
    Auction multiplier:

    Hammer bid
    + buyer premium
    + tax on the auction subtotal
  */

  const auctionMultiplier =
    (1 + premiumRate) *
    (1 + taxRateValue);


  /*
    Maximum total purchase cost:

    This includes auction checkout
    plus pickup cost.
  */

  const maximumTotalPurchaseCost =
    resale -
    sellingExpense -
    riskExpense -
    targetProfit;


  /*
    Maximum amount available for the
    auction invoice after removing pickup.
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


  /*
    Current auction invoice:
    hammer + premium + tax
  */

  const currentAuctionCheckout =
    presentBid *
    auctionMultiplier;


  /*
    Current total purchase cost:
    auction invoice + pickup
  */

  const presentAllInCost =
    currentAuctionCheckout +
    pickupExpense;


  /*
    Expected profit after all entered costs.
  */

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
    "Maximum bid includes buyer premium, tax, pickup cost, selling cost, condition risk and your desired profit.";


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
   LOCAL SAVED HISTORY
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
    console.error(
      "Unable to read history:",
      error
    );

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

    emptyMessage.style.fontSize =
      "0.85rem";

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
        document.createElement(
          "div"
        );

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

      const savedDate =
        new Date(item.savedAt);

      date.textContent =
        Number.isNaN(
          savedDate.getTime()
        )
          ? ""
          : savedDate.toLocaleString(
              "en-CA"
            );


      leftSide.appendChild(title);
      leftSide.appendChild(date);


      const rightSide =
        document.createElement(
          "div"
        );

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
   SAVE CURRENT ANALYSIS
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

    /*
      Keep the latest 30 saved analyses.
    */

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
   SHOW / HIDE HISTORY
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
   INITIAL PAGE STATE
========================================================= */

/*
  Do not automatically calculate when the
  page opens because auction fields are blank.
*/

showStatus("Ready");
