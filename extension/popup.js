"use strict";

/*
  Apni deployed Netlify website da URL ethe paste karna.
  Example:
  https://bidguard.netlify.app/
*/

const BIDGUARD_WEB_URL =
  "https://auctionprofit.netlify.app/";


const analyzePageBtn =
  document.getElementById("analyzePageBtn");

const sendToBidGuardBtn =
  document.getElementById("sendToBidGuardBtn");

const copyDetailsBtn =
  document.getElementById("copyDetailsBtn");

const statusBox =
  document.getElementById("statusBox");

const siteBadge =
  document.getElementById("siteBadge");

const resultSection =
  document.getElementById("resultSection");

const productTitle =
  document.getElementById("productTitle");

const modelNumber =
  document.getElementById("modelNumber");

const conditionValue =
  document.getElementById("conditionValue");

const quantityValue =
  document.getElementById("quantityValue");

const currentBidValue =
  document.getElementById("currentBidValue");

const buyerPremiumValue =
  document.getElementById("buyerPremiumValue");

const auctionRetailValue =
  document.getElementById("auctionRetailValue");

const packagingValue =
  document.getElementById("packagingValue");

const functionalValue =
  document.getElementById("functionalValue");

const missingPartsValue =
  document.getElementById("missingPartsValue");

const damagedValue =
  document.getElementById("damagedValue");


let currentAnalysis = null;


/* =========================================================
   POPUP HELPERS
========================================================= */

function showStatus(message, type = "normal") {
  statusBox.textContent = message;

  statusBox.className = "status-box";

  if (type === "success") {
    statusBox.classList.add("success");
  }

  if (type === "error") {
    statusBox.classList.add("error");
  }
}


function setLoading(isLoading) {
  analyzePageBtn.disabled = isLoading;

  analyzePageBtn.textContent =
    isLoading
      ? "Reading auction page..."
      : "Analyze this page";
}


function formatMoney(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}


function displayText(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return String(value);
}


function displayYesNo(value) {
  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  return "—";
}


/* =========================================================
   DISPLAY EXTRACTED RESULT
========================================================= */

function displayAnalysis(data) {
  currentAnalysis = data;

  siteBadge.textContent =
    data.source || "Auction";

  productTitle.textContent =
    data.productTitle ||
    "Auction product";

  modelNumber.textContent =
    displayText(data.modelNumber);

  conditionValue.textContent =
    displayText(data.condition);

  quantityValue.textContent =
    displayText(data.quantity);

  currentBidValue.textContent =
    formatMoney(data.currentBid);

  buyerPremiumValue.textContent =
    typeof data.buyerPremium === "number"
      ? `${data.buyerPremium}%`
      : "—";

  auctionRetailValue.textContent =
    formatMoney(data.auctionRetailPrice);

  packagingValue.textContent =
    displayYesNo(data.inPackaging);

  functionalValue.textContent =
    displayYesNo(data.isFunctional);

  missingPartsValue.textContent =
    displayYesNo(data.missingMajorParts);

  damagedValue.textContent =
    displayYesNo(data.isDamaged);

  resultSection.classList.remove("hidden");

  chrome.storage.local.set({
    lastAuctionAnalysis: data
  });
}


/* =========================================================
   CODE EXECUTED INSIDE THE AUCTION PAGE
========================================================= */

async function extractAuctionDataFromPage() {
  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }


  function textFromSelector(selectors) {
    for (const selector of selectors) {
      const element =
        document.querySelector(selector);

      if (element) {
        const text =
          cleanText(
            element.innerText ||
            element.textContent
          );

        if (text) {
          return text;
        }
      }
    }

    return "";
  }


  function metaContent(selector) {
    const element =
      document.querySelector(selector);

    return cleanText(
      element?.getAttribute("content")
    );
  }


  function numberFromText(value) {
    if (!value) {
      return null;
    }

    const match =
      String(value).match(
        /-?\$?\s*([\d,]+(?:\.\d{1,2})?)/
      );

    if (!match) {
      return null;
    }

    const number =
      Number.parseFloat(
        match[1].replace(/,/g, "")
      );

    return Number.isFinite(number)
      ? number
      : null;
  }


  function findValueAfterLabel(
    text,
    labels
  ) {
    const lines =
      String(text)
        .split(/\r?\n/)
        .map(cleanText)
        .filter(Boolean);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      for (const label of labels) {
        const escapedLabel =
          label.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const sameLinePattern =
          new RegExp(
            `^${escapedLabel}\\s*[:?\\-]?\\s*(.+)$`,
            "i"
          );

        const sameLineMatch =
          line.match(sameLinePattern);

        if (
          sameLineMatch &&
          cleanText(sameLineMatch[1])
        ) {
          return cleanText(
            sameLineMatch[1]
          );
        }

        const labelOnlyPattern =
          new RegExp(
            `^${escapedLabel}\\s*[:?\\-]?$`,
            "i"
          );

        if (
          labelOnlyPattern.test(line) &&
          lines[index + 1]
        ) {
          return cleanText(
            lines[index + 1]
          );
        }
      }
    }

    return "";
  }


  function findNumberByPatterns(
    text,
    patterns
  ) {
    for (const pattern of patterns) {
      const match =
        String(text).match(pattern);

      if (match) {
        const value =
          Number.parseFloat(
            String(match[1]).replace(
              /,/g,
              ""
            )
          );

        if (Number.isFinite(value)) {
          return value;
        }
      }
    }

    return null;
  }


  function yesNoValue(value) {
    const normalized =
      cleanText(value).toLowerCase();

    if (
      normalized === "yes" ||
      normalized.startsWith("yes ")
    ) {
      return "yes";
    }

    if (
      normalized === "no" ||
      normalized.startsWith("no ")
    ) {
      return "no";
    }

    return "unknown";
  }


  function cleanProductTitle(value) {
    let title = cleanText(value);

    title = title
      .replace(
        /\s*[|–—-]\s*(HiBid|Encore Auctions|MaxSold).*$/i,
        ""
      )
      .replace(
        /^Lot\s*#?\s*\d+\s*[:\-–—]?\s*/i,
        ""
      )
      .trim();

    return title;
  }


  function detectSource() {
    const host =
      window.location.hostname.toLowerCase();

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

    return window.location.hostname;
  }


  async function readTermsText() {
    const pageText =
      document.body?.innerText || "";

    /*
      Premium may already be present in the
      current page's text.
    */

    if (
      /buyer'?s?\s+premium/i.test(
        pageText
      )
    ) {
      return pageText;
    }

    const links =
      Array.from(
        document.querySelectorAll("a[href]")
      );

    const termsLink =
      links.find(function (link) {
        const linkText =
          cleanText(
            link.innerText ||
            link.textContent
          ).toLowerCase();

        const href =
          String(
            link.getAttribute("href") || ""
          ).toLowerCase();

        return (
          linkText.includes(
            "terms and conditions"
          ) ||
          linkText.includes(
            "auction terms"
          ) ||
          href.includes(
            "terms-and-conditions"
          ) ||
          href.includes(
            "/terms"
          )
        );
      });

    if (!termsLink) {
      return pageText;
    }

    try {
      const termsUrl =
        new URL(
          termsLink.href,
          window.location.href
        );

      /*
        Only fetch same-origin terms pages.
      */

      if (
        termsUrl.origin !==
        window.location.origin
      ) {
        return pageText;
      }

      const response =
        await fetch(termsUrl.href, {
          credentials: "include"
        });

      if (!response.ok) {
        return pageText;
      }

      const html =
        await response.text();

      const documentParser =
        new DOMParser();

      const termsDocument =
        documentParser.parseFromString(
          html,
          "text/html"
        );

      return [
        pageText,
        termsDocument.body?.innerText || ""
      ].join("\n");

    } catch (error) {
      console.warn(
        "Unable to read auction terms:",
        error
      );

      return pageText;
    }
  }


  const pageText =
    document.body?.innerText || "";

  const termsText =
    await readTermsText();

  const combinedText =
    `${pageText}\n${termsText}`;


  /* Product title */

  const headingTitle =
    textFromSelector([
      "h1",
      "[itemprop='name']",
      ".lot-title",
      ".lotTitle",
      "[class*='lot-title']",
      "[class*='lotTitle']"
    ]);

  const metaTitle =
    metaContent(
      "meta[property='og:title']"
    );

  const productTitle =
    cleanProductTitle(
      headingTitle ||
      metaTitle ||
      document.title
    );


  /* Model */

  const modelNumber =
    findValueAfterLabel(
      pageText,
      [
        "Model",
        "Model Number",
        "Manufacturer Model",
        "Mfr Model"
      ]
    );


  /* Condition */

  const condition =
    findValueAfterLabel(
      pageText,
      [
        "Condition",
        "Item Condition"
      ]
    );


  /* Quantity */

  const quantityText =
    findValueAfterLabel(
      pageText,
      [
        "Quantity",
        "Qty"
      ]
    );

  let quantity =
    numberFromText(quantityText);

  if (
    quantity !== null
  ) {
    quantity =
      Math.max(
        1,
        Math.round(quantity)
      );
  }


  /* Current bid */

  const currentBidSelectorText =
    textFromSelector([
      "[aria-label*='Current Bid' i]",
      "[data-testid*='current-bid' i]",
      ".current-bid",
      ".currentBid",
      "[class*='current-bid']",
      "[class*='currentBid']"
    ]);

  const currentBid =
    numberFromText(
      currentBidSelectorText
    ) ??
    findNumberByPatterns(
      pageText,
      [
        /Current\s+Bid\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /High\s+Bid\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i
      ]
    );


  /* Buyer premium */

  const buyerPremium =
    findNumberByPatterns(
      combinedText,
      [
        /Buyer'?s?\s+Premium\s*(?:is|of|:|-)?\s*(\d+(?:\.\d+)?)\s*%/i,

        /Buyer\s+Premium\s*(?:is|of|:|-)?\s*(\d+(?:\.\d+)?)\s*%/i,

        /(\d+(?:\.\d+)?)\s*%\s*Buyer'?s?\s+Premium/i,

        /Premium\s*(?:is|of|:|-)?\s*(\d+(?:\.\d+)?)\s*%/i
      ]
    );


  /* Auction retail estimate */

  const auctionRetailText =
    findValueAfterLabel(
      pageText,
      [
        "Est. Retail Price",
        "Estimated Retail Price",
        "Retail Price",
        "MSRP"
      ]
    );

  const auctionRetailPrice =
    numberFromText(
      auctionRetailText
    );


  /* Description details */

  const inPackaging =
    yesNoValue(
      findValueAfterLabel(
        pageText,
        [
          "In packaging",
          "In packaging?"
        ]
      )
    );

  const requiresAssembly =
    yesNoValue(
      findValueAfterLabel(
        pageText,
        [
          "Requires Assembly",
          "Requires Assembly?"
        ]
      )
    );

  const isFunctional =
    yesNoValue(
      findValueAfterLabel(
        pageText,
        [
          "Is Item Functional",
          "Is Item Functional?",
          "Functional"
        ]
      )
    );

  const missingMajorParts =
    yesNoValue(
      findValueAfterLabel(
        pageText,
        [
          "Missing Major Parts",
          "Missing Major Parts?"
        ]
      )
    );

  const isDamaged =
    yesNoValue(
      findValueAfterLabel(
        pageText,
        [
          "Is Item Damaged",
          "Is Item Damaged?",
          "Damaged"
        ]
      )
    );


  return {
    source: detectSource(),

    pageUrl:
      window.location.href,

    productTitle:
      productTitle,

    modelNumber:
      modelNumber,

    condition:
      condition,

    quantity:
      quantity,

    currentBid:
      currentBid,

    buyerPremium:
      buyerPremium,

    auctionRetailPrice:
      auctionRetailPrice,

    inPackaging:
      inPackaging,

    requiresAssembly:
      requiresAssembly,

    isFunctional:
      isFunctional,

    missingMajorParts:
      missingMajorParts,

    isDamaged:
      isDamaged
  };
}


/* =========================================================
   ANALYZE OPEN PAGE
========================================================= */

analyzePageBtn.addEventListener(
  "click",
  async function () {
    setLoading(true);

    showStatus(
      "Reading the open auction page..."
    );

    resultSection.classList.add(
      "hidden"
    );

    try {
      const tabs =
        await chrome.tabs.query({
          active: true,
          currentWindow: true
        });

      const activeTab =
        tabs[0];

      if (
        !activeTab ||
        !activeTab.id
      ) {
        throw new Error(
          "Unable to find the open browser tab."
        );
      }

      if (
        !activeTab.url ||
        !activeTab.url.startsWith("http")
      ) {
        throw new Error(
          "Please open an auction lot page first."
        );
      }

      const executionResults =
        await chrome.scripting.executeScript({
          target: {
            tabId: activeTab.id
          },

          world: "MAIN",

          func:
            extractAuctionDataFromPage
        });

      const analysis =
        executionResults?.[0]?.result;

      if (!analysis) {
        throw new Error(
          "No auction information was found."
        );
      }

      displayAnalysis(analysis);

      const detectedFields = [
        analysis.productTitle,
        analysis.modelNumber,
        analysis.condition,
        analysis.currentBid,
        analysis.buyerPremium,
        analysis.auctionRetailPrice
      ].filter(function (value) {
        return (
          value !== null &&
          value !== undefined &&
          value !== ""
        );
      }).length;

      showStatus(
        `${detectedFields}/6 main fields extracted. Confirm before bidding.`,
        "success"
      );

    } catch (error) {
      console.error(error);

      showStatus(
        error.message ||
        "Unable to analyze this auction page.",
        "error"
      );

    } finally {
      setLoading(false);
    }
  }
);


/* =========================================================
   COPY DETAILS
========================================================= */

copyDetailsBtn.addEventListener(
  "click",
  async function () {
    if (!currentAnalysis) {
      return;
    }

    const lines = [
      `Product: ${currentAnalysis.productTitle || "Unknown"}`,
      `Model: ${currentAnalysis.modelNumber || "Unknown"}`,
      `Condition: ${currentAnalysis.condition || "Unknown"}`,
      `Quantity: ${currentAnalysis.quantity || "Unknown"}`,
      `Current bid: ${formatMoney(currentAnalysis.currentBid)}`,
      `Buyer premium: ${
        typeof currentAnalysis.buyerPremium === "number"
          ? `${currentAnalysis.buyerPremium}%`
          : "Unknown"
      }`,
      `Auction retail estimate: ${formatMoney(currentAnalysis.auctionRetailPrice)}`,
      `Packaging: ${displayYesNo(currentAnalysis.inPackaging)}`,
      `Functional: ${displayYesNo(currentAnalysis.isFunctional)}`,
      `Missing parts: ${displayYesNo(currentAnalysis.missingMajorParts)}`,
      `Damaged: ${displayYesNo(currentAnalysis.isDamaged)}`,
      `Link: ${currentAnalysis.pageUrl || ""}`
    ];

    try {
      await navigator.clipboard.writeText(
        lines.join("\n")
      );

      copyDetailsBtn.textContent =
        "Copied";

      window.setTimeout(
        function () {
          copyDetailsBtn.textContent =
            "Copy details";
        },
        1200
      );

    } catch (error) {
      showStatus(
        "Unable to copy details.",
        "error"
      );
    }
  }
);


/* =========================================================
   OPEN BIDGUARD WEBSITE
========================================================= */

sendToBidGuardBtn.addEventListener(
  "click",
  function () {
    if (!currentAnalysis) {
      return;
    }

    if (
      BIDGUARD_WEB_URL.includes(
        "YOUR-SITE"
      )
    ) {
      showStatus(
        "Add your Netlify website URL at the top of popup.js first.",
        "error"
      );

      return;
    }

    const parameters =
      new URLSearchParams();

    parameters.set(
      "source",
      "extension"
    );

    parameters.set(
      "auctionLink",
      currentAnalysis.pageUrl || ""
    );

    parameters.set(
      "productTitle",
      currentAnalysis.productTitle || ""
    );

    parameters.set(
      "modelNumber",
      currentAnalysis.modelNumber || ""
    );

    parameters.set(
      "condition",
      currentAnalysis.condition || ""
    );

    if (
      currentAnalysis.quantity !== null
    ) {
      parameters.set(
        "quantity",
        currentAnalysis.quantity
      );
    }

    if (
      currentAnalysis.currentBid !== null
    ) {
      parameters.set(
        "currentBid",
        currentAnalysis.currentBid
      );
    }

    if (
      currentAnalysis.buyerPremium !== null
    ) {
      parameters.set(
        "buyerPremium",
        currentAnalysis.buyerPremium
      );
    }

    if (
      currentAnalysis.auctionRetailPrice !== null
    ) {
      parameters.set(
        "auctionRetailPrice",
        currentAnalysis.auctionRetailPrice
      );
    }

    chrome.tabs.create({
      url:
        `${BIDGUARD_WEB_URL}?${parameters.toString()}#calculator`
    });
  }
);


/* Initial state */

showStatus(
  "Open an auction lot and click Analyze this page."
);
