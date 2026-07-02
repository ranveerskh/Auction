export default async function handler(request) {
  const jsonHeaders = {
    "Content-Type": "application/json"
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Only POST requests are allowed."
      }),
      {
        status: 405,
        headers: jsonHeaders
      }
    );
  }

  try {
    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is missing."
      );
    }

    const requestBody =
      await request.json();

    const imageBase64 =
      requestBody.imageBase64;

    const mimeType =
      requestBody.mimeType;

    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length === 0 ||
      typeof mimeType !== "string" ||
      mimeType.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "Screenshot image data is missing."
        }),
        {
          status: 400,
          headers: jsonHeaders
        }
      );
    }

    const supportedImageTypes = [
      "image/png",
      "image/jpeg",
      "image/webp"
    ];

    if (
      !supportedImageTypes.includes(mimeType)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Only PNG, JPG and WEBP screenshots are supported."
        }),
        {
          status: 400,
          headers: jsonHeaders
        }
      );
    }

    const imageDataUrl =
      `data:${mimeType};base64,${imageBase64}`;

    const openAIResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            model: "gpt-5-mini",

            input: [
              {
                role: "user",

                content: [
                  {
                    type: "input_text",

                    text: `
Analyze this auction listing screenshot carefully.

Extract only information that is clearly visible in the screenshot.

Important rules:

1. Do not guess missing information.
2. Keep product model numbers exact.
3. Current bid means the hammer bid before premium and tax.
4. Buyer premium must be returned as a percentage number.
5. Quantity means the number of products included in the lot.
6. Auction estimated retail price is only the auction house's reference price.
7. Auction estimated retail price is NOT the expected resale price.
8. Do not calculate or guess a resale price.
9. For yes/no description fields, use "unknown" when the answer is not visible.
10. Return an empty string for unknown product title, model number or condition.
11. Return null for unknown numbers.

Allowed condition values:

- brand_new_sealed
- brand_new_open_box
- new_adjusted_quantity
- new_with_defects
- excellent
- best_before_grocery
- good
- fair
- heavily_used
- for_parts_only
- empty string when unknown

Description fields may appear in formats such as:

Est. Retail Price: 170.00
Condition: EXCELLENT
In packaging? Yes
Requires Assembly? No
Is Item Functional? Yes
Model: PB040C
Missing Major Parts? No
Is Item Damaged? No

Read those fields when visible.
                    `.trim()
                  },

                  {
                    type: "input_image",
                    image_url: imageDataUrl,
                    detail: "high"
                  }
                ]
              }
            ],

            text: {
              format: {
                type: "json_schema",
                name: "auction_lot_analysis",
                strict: true,

                schema: {
                  type: "object",

                  properties: {
                    productTitle: {
                      type: "string"
                    },

                    modelNumber: {
                      type: "string"
                    },

                    condition: {
                      type: "string",

                      enum: [
                        "",
                        "brand_new_sealed",
                        "brand_new_open_box",
                        "new_adjusted_quantity",
                        "new_with_defects",
                        "excellent",
                        "best_before_grocery",
                        "good",
                        "fair",
                        "heavily_used",
                        "for_parts_only"
                      ]
                    },

                    quantity: {
                      anyOf: [
                        {
                          type: "integer"
                        },
                        {
                          type: "null"
                        }
                      ]
                    },

                    currentBid: {
                      anyOf: [
                        {
                          type: "number"
                        },
                        {
                          type: "null"
                        }
                      ]
                    },

                    buyerPremium: {
                      anyOf: [
                        {
                          type: "number"
                        },
                        {
                          type: "null"
                        }
                      ]
                    },

                    auctionRetailPrice: {
                      anyOf: [
                        {
                          type: "number"
                        },
                        {
                          type: "null"
                        }
                      ]
                    },

                    inPackaging: {
                      type: "string",

                      enum: [
                        "yes",
                        "no",
                        "unknown"
                      ]
                    },

                    requiresAssembly: {
                      type: "string",

                      enum: [
                        "yes",
                        "no",
                        "unknown"
                      ]
                    },

                    isFunctional: {
                      type: "string",

                      enum: [
                        "yes",
                        "no",
                        "unknown"
                      ]
                    },

                    missingMajorParts: {
                      type: "string",

                      enum: [
                        "yes",
                        "no",
                        "unknown"
                      ]
                    },

                    isDamaged: {
                      type: "string",

                      enum: [
                        "yes",
                        "no",
                        "unknown"
                      ]
                    },

                    confidence: {
                      type: "string",

                      enum: [
                        "high",
                        "medium",
                        "low"
                      ]
                    }
                  },

                  required: [
                    "productTitle",
                    "modelNumber",
                    "condition",
                    "quantity",
                    "currentBid",
                    "buyerPremium",
                    "auctionRetailPrice",
                    "inPackaging",
                    "requiresAssembly",
                    "isFunctional",
                    "missingMajorParts",
                    "isDamaged",
                    "confidence"
                  ],

                  additionalProperties: false
                }
              }
            }
          })
        }
      );

    const responseData =
      await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI API error:",
        responseData
      );

      throw new Error(
        responseData?.error?.message ||
        "OpenAI screenshot analysis failed."
      );
    }

    let outputText = "";

    if (
      Array.isArray(responseData.output)
    ) {
      for (
        const outputItem
        of responseData.output
      ) {
        if (
          !Array.isArray(
            outputItem.content
          )
        ) {
          continue;
        }

        for (
          const contentItem
          of outputItem.content
        ) {
          if (
            contentItem.type ===
              "output_text" &&
            typeof contentItem.text ===
              "string"
          ) {
            outputText =
              contentItem.text;

            break;
          }
        }

        if (outputText) {
          break;
        }
      }
    }

    if (!outputText) {
      throw new Error(
        "The AI did not return an analysis result."
      );
    }

    let analysis;

    try {
      analysis =
        JSON.parse(outputText);
    } catch (error) {
      console.error(
        "Invalid AI JSON:",
        outputText
      );

      throw new Error(
        "The AI returned an invalid result."
      );
    }

    return new Response(
      JSON.stringify(analysis),
      {
        status: 200,
        headers: jsonHeaders
      }
    );

  } catch (error) {
    console.error(
      "Auction analysis error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze screenshot."
      }),
      {
        status: 500,
        headers: jsonHeaders
      }
    );
  }
}
