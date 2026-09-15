export class ContentExtractor {

    static async extractPageContent(tab) {

        if (!tab || !tab.id) {
            throw new Error(
                "Invalid tab provided for content extraction."
            );
        }


        console.log(
            "[A-Eye] Starting content extraction for tab:",
            tab.id
        );


        try {

            /*
             * =====================================================
             * 1. INJECT READABILITY
             * =====================================================
             */

            try {

                console.log(
                    "[A-Eye] Injecting readability.js..."
                );

                await chrome.scripting.executeScript({
                    target: {
                        tabId: tab.id
                    },
                    files: [
                        './lib/readability.js'
                    ]
                });

                console.log(
                    "[A-Eye] Readability injected successfully."
                );

            } catch (injectionError) {

                /*
                 * Readability may already exist.
                 * That is not a fatal error.
                 */

                if (
                    !injectionError.message ||
                    (
                        !injectionError.message.includes(
                            'already been injected'
                        ) &&
                        !injectionError.message.includes(
                            'Cannot create multiple injection'
                        )
                    )
                ) {

                    console.warn(
                        "[A-Eye] Readability injection warning:",
                        injectionError
                    );

                } else {

                    console.log(
                        "[A-Eye] Readability already available."
                    );
                }
            }


            /*
             * =====================================================
             * 2. PAGE EXTRACTION FUNCTION
             * =====================================================
             */

            const executionFunction = () => {

                /*
                 * -------------------------------------------------
                 * Helper: clean extracted text
                 * -------------------------------------------------
                 */

                const cleanText = (text) => {

                    if (!text) {
                        return '';
                    }


                    return text
                        .replace(/\u00A0/g, ' ')
                        .replace(/[ \t]+/g, ' ')
                        .replace(/\n\s*\n\s*\n+/g, '\n\n')
                        .replace(/^\s+|\s+$/g, '')
                        .trim();
                };


                /*
                 * -------------------------------------------------
                 * Helper: get visible text from the page
                 * -------------------------------------------------
                 */

                const getVisiblePageText = () => {

                    if (!document.body) {
                        return '';
                    }


                    const clone =
                        document.body.cloneNode(true);


                    /*
                     * Remove elements that generally do not
                     * represent useful page information.
                     */

                    const unwantedSelectors = [
                        'script',
                        'style',
                        'noscript',
                        'template',
                        'svg',
                        'canvas',
                        'iframe',
                        'object',
                        'embed',
                        'video',
                        'audio',
                        'source',
                        'track',
                        'nav[aria-hidden="true"]',
                        '[aria-hidden="true"]',
                        '[hidden]',
                        'input[type="hidden"]'
                    ];


                    unwantedSelectors.forEach(
                        (selector) => {

                            clone
                                .querySelectorAll(selector)
                                .forEach(
                                    element =>
                                        element.remove()
                                );
                        }
                    );


                    return cleanText(
                        clone.innerText ||
                        clone.textContent ||
                        ''
                    );
                };


                /*
                 * -------------------------------------------------
                 * Helper: collect important structural information
                 * -------------------------------------------------
                 */

                const getPageStructure = () => {

                    const parts = [];


                    /*
                     * Page title
                     */

                    const title =
                        document.title?.trim();

                    if (title) {

                        parts.push(
                            `PAGE TITLE: ${title}`
                        );
                    }


                    /*
                     * Main headings
                     */

                    const headings =
                        Array.from(
                            document.querySelectorAll(
                                'h1, h2, h3'
                            )
                        )
                        .filter(
                            element => {

                                const style =
                                    window.getComputedStyle(
                                        element
                                    );

                                return (
                                    style.display !== 'none' &&
                                    style.visibility !== 'hidden'
                                );
                            }
                        )
                        .map(
                            element =>
                                cleanText(
                                    element.innerText ||
                                    element.textContent ||
                                    ''
                                )
                        )
                        .filter(
                            text => text.length > 0
                        );


                    const uniqueHeadings =
                        [...new Set(headings)]
                            .slice(0, 40);


                    if (
                        uniqueHeadings.length > 0
                    ) {

                        parts.push(
                            `PAGE HEADINGS:\n${uniqueHeadings.join('\n')}`
                        );
                    }


                    return parts.join(
                        '\n\n'
                    );
                };


                /*
                 * -------------------------------------------------
                 * Helper: determine whether this looks like an
                 * article/document page.
                 * -------------------------------------------------
                 */

                const looksLikeArticle =
                    () => {

                        const articleElements =
                            document.querySelectorAll(
                                'article'
                            );


                        const article =
                            articleElements.length > 0;


                        const main =
                            document.querySelector(
                                'main'
                            );


                        const articleText =
                            article
                                ? cleanText(
                                    articleElements[0]
                                        .innerText || ''
                                )
                                : '';


                        /*
                         * Only use Readability when there is
                         * substantial article-like content.
                         *
                         * This prevents Readability from deciding
                         * that a tiny address/footer is the entire
                         * page.
                         */

                        if (
                            article &&
                            articleText.length >= 1000
                        ) {

                            return true;
                        }


                        if (
                            main
                        ) {

                            const mainText =
                                cleanText(
                                    main.innerText || ''
                                );


                            if (
                                mainText.length >= 1500 &&
                                (
                                    document.querySelector(
                                        'article'
                                    ) ||
                                    document.querySelector(
                                        '[itemtype*="Article"]'
                                    ) ||
                                    document.querySelector(
                                        'meta[property="og:type"][content="article"]'
                                    )
                                )
                            ) {

                                return true;
                            }
                        }


                        return false;
                    };


                /*
                 * =================================================
                 * FIRST: GET NORMAL PAGE CONTENT
                 * =================================================
                 */

                const pageText =
                    getVisiblePageText();


                const pageStructure =
                    getPageStructure();


                console.log(
                    "[A-Eye] Visible page text length:",
                    pageText.length
                );


                /*
                 * =================================================
                 * SECOND: TRY READABILITY ONLY FOR ARTICLE PAGES
                 * =================================================
                 */

                if (
                    typeof Readability !== 'undefined' &&
                    looksLikeArticle()
                ) {

                    try {

                        console.log(
                            "[A-Eye] Article-like page detected. Trying Readability."
                        );


                        const documentClone =
                            document.cloneNode(true);


                        const reader =
                            new Readability(
                                documentClone
                            );


                        const article =
                            reader.parse();


                        if (
                            article &&
                            article.textContent &&
                            article.textContent.trim().length >= 500
                        ) {

                            const readabilityText =
                                cleanText(
                                    article.textContent
                                );


                            console.log(
                                "[A-Eye] Readability extraction successful:",
                                readabilityText.length,
                                "characters"
                            );


                            return {

                                success: true,

                                title:
                                    article.title ||
                                    document.title ||
                                    null,

                                content:
                                    `PAGE TITLE: ${
                                        article.title ||
                                        document.title ||
                                        'Untitled page'
                                    }

ARTICLE CONTENT:

${readabilityText}`,

                                method:
                                    'Readability',

                                error:
                                    null
                            };
                        }


                        console.log(
                            "[A-Eye] Readability result was too small. Using normal page extraction."
                        );

                    } catch (readabilityError) {

                        console.warn(
                            "[A-Eye] Readability failed. Using normal page extraction:",
                            readabilityError
                        );
                    }
                }


                /*
                 * =================================================
                 * NORMAL WEBPAGE EXTRACTION
                 * =================================================
                 *
                 * This is the important part for websites such as:
                 *
                 * GeeksforGeeks
                 * YouTube
                 * Amazon
                 * Gmail
                 * LinkedIn
                 * dashboards
                 * shopping sites
                 * course websites
                 * etc.
                 * =================================================
                 */

                if (
                    pageText &&
                    pageText.trim().length > 0
                ) {

                    let finalContent =
                        pageStructure
                            ? `${pageStructure}\n\nPAGE CONTENT:\n${pageText}`
                            : pageText;


                    return {

                        success: true,

                        title:
                            document.title ||
                            null,

                        content:
                            finalContent,

                        method:
                            'VisiblePageText',

                        error:
                            null
                    };
                }


                /*
                 * =================================================
                 * FINAL FALLBACK
                 * =================================================
                 */

                const fallbackContent =
                    document.body
                        ? cleanText(
                            document.body.innerText ||
                            document.body.textContent ||
                            ''
                        )
                        : '';


                if (
                    fallbackContent
                ) {

                    return {

                        success: true,

                        title:
                            document.title ||
                            null,

                        content:
                            fallbackContent,

                        method:
                            'Fallback',

                        error:
                            null
                    };
                }


                return {

                    success: false,

                    title:
                        document.title ||
                        null,

                    content:
                        null,

                    method:
                        'Fallback',

                    error:
                        'No visible page content could be extracted.'
                };
            };


            /*
             * =====================================================
             * 3. EXECUTE EXTRACTION IN ACTIVE TAB
             * =====================================================
             */

            console.log(
                "[A-Eye] Executing content extraction script..."
            );


            const results =
                await chrome.scripting.executeScript({

                    target: {
                        tabId: tab.id
                    },

                    func:
                        executionFunction
                });


            console.log(
                "[A-Eye] Script execution results:",
                results
            );


            /*
             * =====================================================
             * 4. VALIDATE RESULT
             * =====================================================
             */

            if (
                !results ||
                !results[0] ||
                !results[0].result
            ) {

                console.error(
                    "[A-Eye] Content extraction script returned no valid result:",
                    results
                );


                throw new Error(
                    "Content extraction script did not return expected results."
                );
            }


            const extractedData =
                results[0].result;


            console.log(
                "[A-Eye] Extracted data:",
                {
                    success:
                        extractedData.success,

                    method:
                        extractedData.method,

                    title:
                        extractedData.title,

                    length:
                        extractedData.content
                            ? extractedData.content.length
                            : 0
                }
            );


            /*
             * =====================================================
             * 5. VALIDATE EXTRACTED CONTENT
             * =====================================================
             */

            if (
                !extractedData.success ||
                !extractedData.content ||
                !extractedData.content.trim()
            ) {

                const errorMsg =
                    extractedData.error ||
                    'No content extracted.';


                throw new Error(
                    `Content extraction failed: ${errorMsg}`
                );
            }


            /*
             * =====================================================
             * 6. LIMIT EXTREMELY LARGE PAGES
             * =====================================================
             *
             * Some pages can contain enormous amounts of text.
             * Sending all of it to Gemini is inefficient and can
             * reduce answer quality.
             *
             * Keep the first 30,000 characters.
             * =====================================================
             */

            const MAX_CONTENT_LENGTH =
                30000;


            let finalContent =
                extractedData.content;


            if (
                finalContent.length >
                MAX_CONTENT_LENGTH
            ) {

                console.warn(
                    `[A-Eye] Page content is very large (${finalContent.length} chars). Truncating to ${MAX_CONTENT_LENGTH} chars.`
                );


                finalContent =
                    finalContent.substring(
                        0,
                        MAX_CONTENT_LENGTH
                    ) +
                    '\n\n[Remaining page content omitted due to length.]';
            }


            console.log(
                `[A-Eye] Content extraction successful. Method: ${extractedData.method}, Title: ${extractedData.title || 'N/A'}, Length: ${finalContent.length}`
            );


            return {

                content:
                    finalContent,

                title:
                    extractedData.title,

                method:
                    extractedData.method
            };


        } catch (error) {

            console.error(
                '[A-Eye] Content extraction process error:',
                error
            );


            const errorMessage =
                error?.message || String(error);


            const message =
                errorMessage.includes(
                    'Cannot access contents of url'
                ) ||
                errorMessage.includes(
                    'tab URL: "chrome'
                )

                    ? "Cannot access content on this page (e.g., chrome:// pages, file:// URLs, or extension pages)."

                    : errorMessage.includes(
                        'No tab with id'
                    )

                        ? "The tab was closed or could not be accessed."

                        : errorMessage.includes(
                            'Receiving end does not exist'
                        )

                            ? "The connection to the tab was lost, it might have been closed."

                            : errorMessage;


            const finalMessage =
                message === errorMessage
                    ? `Failed to execute content extraction script: ${errorMessage}`
                    : message;


            throw new Error(
                finalMessage
            );
        }
    }
}