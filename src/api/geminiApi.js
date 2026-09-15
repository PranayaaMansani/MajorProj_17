export async function sendGeminiRequest(apiConfig, standardMessages, mimeType) {
  const connectionMethod = apiConfig.cloudApiMethod || "direct";

  if (!apiConfig.cloudModelName) {
    throw new Error("Cloud Gemini model name not set.");
  }

  // ---------------------------------------------------------
  // VALIDATE API CONFIGURATION
  // ---------------------------------------------------------

  if (connectionMethod === "proxy") {
    if (!apiConfig.cloudProxyUrl) {
      throw new Error(
        "API Gateway Endpoint not configured for Vertex AI (GCP) method."
      );
    }

    if (!apiConfig.gcpApiKey) {
      throw new Error(
        "GCP API Key not configured for Vertex AI (GCP) method."
      );
    }
  } else {
    if (!apiConfig.cloudApiKey) {
      throw new Error("Cloud Gemini API Key not configured.");
    }
  }

  // ---------------------------------------------------------
  // MODEL FALLBACK ORDER
  // ---------------------------------------------------------
  // The selected model is always tried first.
  // Fallback models are used only for quota/rate-limit errors.
  // ---------------------------------------------------------

  const preferredModel = apiConfig.cloudModelName;

  const fallbackModels = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
  ];

  const modelsToTry = [
    preferredModel,
    ...fallbackModels.filter((model) => model !== preferredModel),
  ];

  // ---------------------------------------------------------
  // PREPARE GEMINI CONTENT
  // ---------------------------------------------------------

  let systemInstruction = null;

  const geminiContents = [];

  const messagesToProcess = [...standardMessages];

  // ---------------------------------------------------------
  // EXTRACT SYSTEM MESSAGE
  // ---------------------------------------------------------

  if (
    messagesToProcess.length > 0 &&
    messagesToProcess[0].role === "system"
  ) {
    const systemMsg = messagesToProcess.shift();

    if (systemMsg.content) {
      systemInstruction = {
        parts: [
          {
            text: systemMsg.content,
          },
        ],
      };
    }
  }

  // ---------------------------------------------------------
  // CONVERT MESSAGES TO GEMINI FORMAT
  // ---------------------------------------------------------

  for (const message of messagesToProcess) {
    const role = message.role === "assistant" ? "model" : "user";

    const parts = [];

    // Text content
    if (message.content) {
      parts.push({
        text: message.content,
      });
    }

    // Image content
    if (
      message.images &&
      message.images.length > 0 &&
      role === "user"
    ) {
      for (const imgData of message.images) {
        parts.push({
          inline_data: {
            mime_type: mimeType || "image/png",
            data: imgData,
          },
        });
      }
    }

    if (parts.length > 0) {
      geminiContents.push({
        role,
        parts,
      });
    }
  }

  // ---------------------------------------------------------
  // GEMINI REQUIRES THE FIRST MESSAGE TO BE FROM USER
  // ---------------------------------------------------------

  if (
    geminiContents.length > 0 &&
    geminiContents[0].role === "model"
  ) {
    geminiContents.shift();
  }

  if (geminiContents.length === 0) {
    throw new Error(
      `Cannot send empty request to Gemini via ${connectionMethod} method.`
    );
  }

  // ---------------------------------------------------------
  // TRY MODELS
  // ---------------------------------------------------------

  let lastError = null;

  for (
    let modelIndex = 0;
    modelIndex < modelsToTry.length;
    modelIndex++
  ) {
    const modelToUse = modelsToTry[modelIndex];

    let endpoint;

    // -------------------------------------------------------
    // IMPORTANT:
    // Gemini API key is now sent through x-goog-api-key
    // instead of ?key=... in the URL.
    // -------------------------------------------------------

    let headers = {
      "Content-Type": "application/json",
    };

    // -------------------------------------------------------
    // CREATE ENDPOINT
    // -------------------------------------------------------

    if (connectionMethod === "proxy") {
      endpoint = apiConfig.cloudProxyUrl;

      headers["x-api-key"] = apiConfig.gcpApiKey;
      headers["X-Model-Name"] = modelToUse;
    } else {
      const cloudBaseUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/";

      endpoint = `${cloudBaseUrl}${modelToUse}:generateContent`;

      // IMPORTANT:
      // Do NOT put the Gemini API key in the URL.
      headers["x-goog-api-key"] = apiConfig.cloudApiKey;
    }

    // -------------------------------------------------------
    // CREATE REQUEST PAYLOAD
    // -------------------------------------------------------

    const geminiPayload = {
      contents: geminiContents,

      ...(systemInstruction && {
        systemInstruction: systemInstruction,
      }),
    };

    // -------------------------------------------------------
    // REQUEST BODY
    // -------------------------------------------------------

    const body = JSON.stringify(geminiPayload);

    try {
      console.log(
        `[Gemini] Trying model ${
          modelIndex + 1
        }/${modelsToTry.length}: ${modelToUse}`
      );

      console.log(
        `[Gemini] Connection method: ${connectionMethod}`
      );

      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: body,
      });

      // -----------------------------------------------------
      // READ RESPONSE
      // -----------------------------------------------------

      let data = null;
      let responseTextBody = "";

      try {
        responseTextBody = await response.text();

        if (responseTextBody) {
          data = JSON.parse(responseTextBody);
        }
      } catch (parseError) {
        data = null;
      }

      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      if (response.ok) {
        let responseText =
          "Error: Could not parse Gemini response.";

        try {
          // Normal Gemini response
          if (data?.candidates?.[0]?.content?.parts) {
            const textParts =
              data.candidates[0].content.parts.filter(
                (part) => part.text
              );

            if (textParts.length > 0) {
              responseText = textParts
                .map((part) => part.text)
                .join("");
            }
          }

          // Safety blocked response
          else if (data?.promptFeedback?.blockReason) {
            responseText =
              `Request blocked by API: ${data.promptFeedback.blockReason}`;

            if (data.promptFeedback.safetyRatings) {
              responseText +=
                " - Details: " +
                data.promptFeedback.safetyRatings
                  .map(
                    (rating) =>
                      `${rating.category}: ${rating.probability}`
                  )
                  .join(", ");
            }
          }

          // Unexpected finish reason
          else if (
            data?.candidates?.[0]?.finishReason &&
            data.candidates[0].finishReason !== "STOP"
          ) {
            responseText =
              `Request finished unexpectedly. Reason: ${data.candidates[0].finishReason}`;

            const safetyRatingsInfo =
              data.candidates[0].safetyRatings
                ?.map(
                  (rating) =>
                    `${rating.category}: ${rating.probability}`
                )
                .join(", ");

            if (safetyRatingsInfo) {
              responseText +=
                ` (Safety Ratings: ${safetyRatingsInfo})`;
            }

            if (
              data.candidates[0].content?.parts?.some(
                (part) => part.text
              )
            ) {
              const partialText =
                data.candidates[0].content.parts
                  .filter((part) => part.text)
                  .map((part) => part.text)
                  .join("");

              responseText +=
                `\nPartial content: ${partialText}`;
            }
          }

          // API returned an error inside a successful HTTP response
          else if (data?.error) {
            responseText =
              `Gemini API Error: ${
                data.error.message || "Unknown error"
              }`;
          }
        } catch (parseError) {
          responseText =
            "Error: Failed to process Gemini response content.";
        }

        console.log(
          `[Gemini] Success using ${modelToUse}`
        );

        return responseText;
      }

      // -----------------------------------------------------
      // ERROR INFORMATION
      // -----------------------------------------------------

      const errorStatus =
        data?.error?.status || "";

      const errorMessage =
        data?.error?.message ||
        responseTextBody ||
        "";

      // -----------------------------------------------------
      // QUOTA / RATE LIMIT
      // -----------------------------------------------------

      const isQuotaError =
        response.status === 429 ||
        errorStatus === "RESOURCE_EXHAUSTED" ||
        /quota|rate.?limit|resource.?exhausted|too many requests/i.test(
          errorMessage
        );

      // -----------------------------------------------------
      // QUOTA ERROR → TRY NEXT MODEL
      // -----------------------------------------------------

      if (isQuotaError) {
        console.warn(
          `[Gemini] ${modelToUse} quota/rate limit reached.`
        );

        lastError = new Error(
          `Gemini model ${modelToUse} quota/rate limit reached.`
        );

        if (modelIndex < modelsToTry.length - 1) {
          console.log(
            `[Gemini] Switching from ${modelToUse} to ${
              modelsToTry[modelIndex + 1]
            }`
          );

          continue;
        }

        throw new Error(
          "All available Gemini models have reached their quota or rate limit."
        );
      }

      // -----------------------------------------------------
      // OTHER API ERROR
      // -----------------------------------------------------

      let detailedError =
        `API Error via ${connectionMethod} ` +
        `(${response.status} ${response.statusText})`;

      if (data?.error) {
        if (typeof data.error === "string") {
          detailedError += `: ${data.error}`;
        } else if (data.error.message) {
          detailedError += `: ${data.error.message}`;
        } else {
          detailedError +=
            `. Response: ${JSON.stringify(
              data.error
            ).substring(0, 500)}`;
        }
      } else if (responseTextBody) {
        detailedError +=
          `. Response: ${responseTextBody.substring(
            0,
            500
          )}`;
      }

      throw new Error(detailedError);
    } catch (error) {
      // -----------------------------------------------------
      // QUOTA ERROR → FALLBACK
      // -----------------------------------------------------

      const message = error?.message || "";

      const isQuotaError =
        /quota|rate.?limit|resource.?exhausted|too many requests/i.test(
          message
        );

      if (isQuotaError) {
        lastError = error;

        if (modelIndex < modelsToTry.length - 1) {
          console.warn(
            `[Gemini] Falling back from ${modelToUse} to ${
              modelsToTry[modelIndex + 1]
            }`
          );

          continue;
        }
      }

      // -----------------------------------------------------
      // NON-QUOTA ERROR
      // -----------------------------------------------------

      if (
        error instanceof Error &&
        error.message.startsWith("API Error")
      ) {
        throw error;
      }

      throw new Error(
        `Failed to communicate with ${connectionMethod} endpoint or process response: ${error.message}`
      );
    }
  }

  // ---------------------------------------------------------
  // SAFETY NET
  // ---------------------------------------------------------

  throw (
    lastError ||
    new Error(
      "Failed to communicate with all available Gemini models."
    )
  );
}