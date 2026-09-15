import { ContentExtractor } from './contentExtractor.js';

export class ContentAnalysisAction {

    constructor(dependencies) {

        this.uiManager =
            dependencies.uiManager;

        this.voiceController =
            dependencies.voiceController;

        this.apiService =
            dependencies.apiService;

        this.stateManager =
            dependencies.stateManager;

        this.getApiConfig =
            dependencies.getApiConfig;

        this.getHistoryToSend =
            dependencies.getHistoryToSend;

        this.handleResponse =
            dependencies.handleResponse;

        this.handleError =
            dependencies.handleError;

        this.setProcessing =
            dependencies.setProcessing;

        this.appendMessage =
            dependencies.appendMessage;


        if (
            !this.uiManager ||
            !this.voiceController ||
            !this.apiService ||
            !this.stateManager ||
            !this.getApiConfig ||
            !this.getHistoryToSend ||
            !this.handleResponse ||
            !this.handleError ||
            !this.setProcessing ||
            !this.appendMessage
        ) {

            console.error(
                "ContentAnalysisAction missing dependencies:",
                dependencies
            );

            throw new Error(
                "ContentAnalysisAction initialized with missing dependencies."
            );
        }


        console.log(
            "ContentAnalysisAction initialized successfully."
        );
    }


    async execute() {

        console.log(
            "ContentAnalysisAction execute called"
        );

        this.setProcessing(true);


        try {

            /*
             * =====================================================
             * 1. GET ACTIVE TAB
             * =====================================================
             */

            const [tab] =
                await chrome.tabs.query({
                    active: true,
                    currentWindow: true
                });


            if (
                !tab ||
                !tab.id
            ) {

                throw new Error(
                    "No active tab found or tab ID missing for content analysis."
                );
            }


            console.log(
                "[A-Eye] Analyzing tab:",
                {
                    id: tab.id,
                    title: tab.title,
                    url: tab.url
                }
            );


            /*
             * =====================================================
             * 2. EXTRACT PAGE CONTENT
             * =====================================================
             */

            const extractedResult =
                await ContentExtractor.extractPageContent(tab);


            if (
                !extractedResult ||
                !extractedResult.content
            ) {

                console.error(
                    "Content extraction returned unexpected result:",
                    extractedResult
                );

                throw new Error(
                    "Content extraction failed to return valid content."
                );
            }


            const extractedText =
                extractedResult.content;

            const extractionMethod =
                extractedResult.method;


            console.log(
                "[A-Eye] Content extraction successful.",
                {
                    method: extractionMethod,
                    characters: extractedText.length
                }
            );


            /*
             * =====================================================
             * 3. SHOW EXTRACTED CONTENT
             * =====================================================
             */

            if (
                extractionMethod === 'Fallback'
            ) {

                this.appendMessage(
                    'system',
                    'Used basic text extraction (Readability failed or not applicable).'
                );
            }


            const formattedText =
                this.uiManager.escapeHTML(
                    extractedText
                );


            await this.uiManager
                .appendPreviewMessage(
                    'text',
                    formattedText
                );


            /*
             * =====================================================
             * 4. TELL USER WE ARE ANALYZING
             * =====================================================
             */

            this.uiManager
                .showThinkingIndicator();


            await this.voiceController
                .speakText(
                    "Analyzing the page..."
                );


            /*
             * =====================================================
             * 5. GET DEDICATED ANALYSIS PROMPT
             * =====================================================
             */

            const allPrompts =
                this.stateManager
                    .getPrompts();


            const analyzeContentPromptText =
                allPrompts.analyzeContent_prompt ||
                'Analyze the provided webpage content and explain the important information clearly.';


            console.log(
                "[A-Eye] Using content analysis prompt:",
                analyzeContentPromptText
            );


            /*
             * =====================================================
             * 6. BUILD FINAL ANALYSIS REQUEST
             * =====================================================
             *
             * IMPORTANT:
             *
             * We intentionally DO NOT use the general
             * web_assistant system prompt here.
             *
             * Otherwise Gemini may see commands such as:
             *
             * analyzeContent
             * getElement
             * takeScreenshot
             * etc.
             *
             * and return another command instead of answering.
             * =====================================================
             */

            const fullPrompt =
                `${analyzeContentPromptText}

--------------------------------------------------

WEBPAGE CONTENT:

${extractedText}

--------------------------------------------------

IMPORTANT:
Answer the user's request based ONLY on the webpage content above.

Do NOT return:
- analyzeContent
- getElement
- takeScreenshot
- scrollingScreenshot
- JSON actions
- tool commands

Return a normal natural-language answer.`;



            const payload = {
                prompt: fullPrompt
            };


            const apiConfig =
                this.getApiConfig();


            const historyToSend =
                this.getHistoryToSend(
                    'analyzeContent'
                );


            console.log(
                "[A-Eye] Sending extracted webpage content for analysis..."
            );


            /*
             * =====================================================
             * 7. ASK GEMINI FOR THE ACTUAL ANSWER
             * =====================================================
             *
             * systemPrompt = null
             *
             * The dedicated analysis prompt above is enough.
             * =====================================================
             */

            const responseContent =
                await this.apiService.sendRequest(
                    apiConfig,
                    historyToSend,
                    payload,
                    null,
                    null
                );


            console.log(
                "[A-Eye] Final page analysis response:",
                responseContent
            );


            /*
             * =====================================================
             * 8. DISPLAY FINAL ANSWER DIRECTLY
             * =====================================================
             *
             * DO NOT call:
             *
             * this.handleResponse(responseContent)
             *
             * because handleResponse() sends the answer through
             * CommandProcessor again.
             *
             * This is the final answer, not a browser command.
             * =====================================================
             */

            this.uiManager
                .hideThinkingIndicator();


            this.voiceController
                .stopThinkingSoundLoop();


            const finalResponseText =
                typeof responseContent === 'string'
                    ? responseContent
                    : JSON.stringify(
                        responseContent
                    );


            if (
                finalResponseText &&
                finalResponseText.trim()
            ) {

                this.appendMessage(
                    'assistant',
                    finalResponseText
                );


                try {

                    await this.voiceController
                        .speakResponse(
                            finalResponseText
                        );

                } catch (speechError) {

                    console.error(
                        "Error speaking page analysis:",
                        speechError
                    );
                }

            } else {

                this.appendMessage(
                    'assistant',
                    "I couldn't generate an analysis of the page."
                );


                this.voiceController
                    .speakText(
                        "I couldn't generate an analysis of the page."
                    );
            }


        } catch (error) {

            console.error(
                "[A-Eye] Content analysis error:",
                error
            );


            this.handleError(
                'Content analysis failed',
                error
            );


        } finally {

            if (
                this.stateManager.isProcessing()
            ) {

                this.setProcessing(false);
            }


            console.log(
                "ContentAnalysisAction execute finished"
            );
        }
    }
}