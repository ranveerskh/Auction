export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Only POST requests are allowed."
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is missing."
      );
    }

    const body = await request.json();

    const imageBase64 = body.imageBase64;
    const mimeType = body.mimeType;

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({
          error: "Image data is missing."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const imageDataUrl =
      `data:${mimeType};base64,${imageBase64}`;

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
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
Analyze this auction listing screenshot.

Extract only information clearly visible in the image.

Rules:
- Do not guess missing prices or fees.
- Keep the exact product model number when visible.
- Return an empty string for an unknown condition.
- Return null for prices or percentages that are not visible.
- Quantity should refer to the number of products included in the lot.
- Buyer premium must be a percentage number, not a decimal.
- Current bid must be the hammer bid before premium and tax.

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
                  "condition",
                  "quantity",
                  "currentBid",
                  "buyerPremium",
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
        "OpenAI error:",
        responseData
      );

      throw new Error(
        responseData?.error?.message ||
        "OpenAI analysis failed."
      );
    }

    const outputText =
      responseData.output
        ?.flatMap(function (item) {
          return item.content || [];
        })
        ?.find(function (content) {
          return content.type === "output_text";
        })
        ?.text;

    if (!outputText) {
      throw new Error(
        "No analysis result was returned."
      );
    }

    const analysis =
      JSON.parse(outputText);

    return new Response(
      JSON.stringify(analysis),
      {
        status: 200,

        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error.message ||
          "Unable to analyze screenshot."
      }),
      {
        status: 500,

        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
