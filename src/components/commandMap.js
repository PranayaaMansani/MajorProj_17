export class CommandProcessor {

    constructor(actions) {

        if (!actions || typeof actions !== 'object') {
            throw new Error(
                'CommandProcessor requires an actions object.'
            );
        }

        this.actions = actions;

        if (typeof this.actions.handleError !== 'function') {
            console.warn(
                'CommandProcessor initialized without a valid handleError function.'
            );

            this.actions.handleError = (message, error) => {
                console.error(
                    'CommandProcessor Error:',
                    message,
                    error
                );
            };
        }

        console.log(
            'CommandProcessor initialized with actions:',
            Object.keys(this.actions)
        );
    }


    processResponse(responseText) {

        const normalizedText =
            typeof responseText === 'string'
                ? responseText.trim()
                : '';

        console.log(
            'CommandProcessor processing:',
            normalizedText
        );

        let cleanedText = normalizedText;


        /*
         * Remove surrounding quotes
         */

        if (
            (
                cleanedText.startsWith("'") &&
                cleanedText.endsWith("'")
            ) ||
            (
                cleanedText.startsWith('"') &&
                cleanedText.endsWith('"')
            )
        ) {

            cleanedText =
                cleanedText
                    .substring(
                        1,
                        cleanedText.length - 1
                    )
                    .trim();

            console.log(
                'Removed surrounding quotes:',
                cleanedText
            );
        }


        /*
         * Remove markdown code fences
         */

        cleanedText =
            cleanedText
                .replace(
                    /^```(?:json|text)?\s*/i,
                    ''
                )
                .replace(
                    /\s*```$/i,
                    ''
                )
                .trim();


        /*
         * =========================================================
         * ANALYZE CONTENT COMMAND
         * =========================================================
         *
         * Gemini may return:
         *
         * analyzeContent
         *
         * OR:
         *
         * I'll get a summary for you!
         * analyzeContent
         *
         * OR:
         *
         * "analyzeContent"
         *
         * We only need to detect the command.
         * The natural-language part must NOT be displayed.
         * =========================================================
         */

        const analyzeContentMatch =
            cleanedText.match(
                /\banalyzeContent\b/i
            );

        const analyseContentMatch =
            cleanedText.match(
                /\banalyseContent\b/i
            );


        if (
            analyzeContentMatch ||
            analyseContentMatch
        ) {

            console.log(
                '[A-Eye] Command recognized: analyzeContent'
            );


            if (
                typeof this.actions
                    ._executeContentAnalysis === 'function'
            ) {

                try {

                    /*
                     * Execute the existing action.
                     *
                     * DO NOT await this.
                     * We are keeping the existing command
                     * processing architecture unchanged.
                     */

                    this.actions
                        ._executeContentAnalysis();

                    return true;

                } catch (error) {

                    this.actions.handleError(
                        'Failed to execute content analysis command',
                        error
                    );

                    return true;
                }

            } else {

                console.warn(
                    'analyzeContent handler missing.'
                );

                return false;
            }
        }


        /*
         * =========================================================
         * GET ELEMENT
         * =========================================================
         */

        if (
            cleanedText
                .trim()
                .toLowerCase() === 'getelement'
        ) {

            console.log(
                '[A-Eye] Command recognized: getElement'
            );

            return {
                command: 'getElement'
            };
        }


        /*
         * =========================================================
         * SCREENSHOT
         * =========================================================
         */

        if (
            cleanedText
                .trim()
                .toLowerCase() === 'takescreenshot'
        ) {

            console.log(
                '[A-Eye] Command recognized: takeScreenshot'
            );

            if (
                typeof this.actions
                    ._executeScreenshot === 'function'
            ) {

                try {

                    this.actions
                        ._executeScreenshot();

                    return true;

                } catch (error) {

                    this.actions.handleError(
                        'Failed internal screenshot command',
                        error
                    );

                    return true;
                }

            } else {

                console.warn(
                    'takeScreenshot handler missing.'
                );

                return false;
            }
        }


        /*
         * =========================================================
         * SCROLLING SCREENSHOT
         * =========================================================
         */

        if (
            cleanedText
                .trim()
                .toLowerCase() === 'scrollingscreenshot'
        ) {

            console.log(
                '[A-Eye] Command recognized: scrollingScreenshot'
            );

            if (
                typeof this.actions
                    ._executeScrollingScreenshot === 'function'
            ) {

                try {

                    this.actions
                        ._executeScrollingScreenshot();

                    return true;

                } catch (error) {

                    this.actions.handleError(
                        'Failed internal scrolling screenshot command',
                        error
                    );

                    return true;
                }

            } else {

                console.warn(
                    'scrollingScreenshot handler missing.'
                );

                return false;
            }
        }


        /*
         * =========================================================
         * JSON ACTION ARRAY
         * =========================================================
         */

        let potentialJson = null;


        /*
         * Raw JSON
         */

        if (
            cleanedText.startsWith('[') &&
            cleanedText.endsWith(']')
        ) {

            potentialJson = cleanedText;

            console.log(
                '[A-Eye] Potential raw JSON array found.'
            );
        }


        /*
         * Markdown JSON
         */

        if (!potentialJson) {

            const jsonMatch =
                cleanedText.match(
                    /```(?:json)?\s*(\[[\s\S]*?\])\s*```/i
                );

            if (
                jsonMatch &&
                jsonMatch[1]
            ) {

                potentialJson =
                    jsonMatch[1].trim();

                console.log(
                    '[A-Eye] Potential JSON array found in code fence.'
                );
            }
        }


        if (potentialJson !== null) {

            try {

                const parsedJson =
                    JSON.parse(
                        potentialJson
                    );


                if (
                    Array.isArray(parsedJson) &&
                    parsedJson.length > 0 &&
                    typeof parsedJson[0] === 'object' &&
                    parsedJson[0] !== null &&
                    parsedJson[0].action
                ) {

                    console.log(
                        '[A-Eye] Command recognized: JSON Action Array.'
                    );

                    return {
                        command: 'executeActions',
                        actions: parsedJson
                    };
                }

            } catch (error) {

                console.warn(
                    '[A-Eye] Failed to parse JSON action array:',
                    error.message
                );
            }
        }


        /*
         * =========================================================
         * NO COMMAND
         * =========================================================
         */

        console.log(
            '[A-Eye] No specific command recognized.'
        );

        return false;
    }
}