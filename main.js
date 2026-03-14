// ============================================================
//  ThesisSpeechLibrary — main.js
//  Standard: W3C SSML 1.1  |  Language target: pt-PT
// ============================================================

/**
 * Loads vocabulary and punctuation JSON data files
 * located next to this module on the same CDN/server.
 *
 * @returns {Promise<{vocabulary: object, punctuation: object} | null>}
 */
export const loadResearchData = async () => {
    try {
        // Cache-busting param to avoid stale CDN responses
        const v = Date.now();
        const [vocabRes, punctRes] = await Promise.all([
            fetch(new URL(`./vocabulary-PTEU.json?v=${v}`, import.meta.url)),
            fetch(new URL(`./punctuation.json?v=${v}`, import.meta.url))
        ]);

        if (!vocabRes.ok) throw new Error(`vocabulary-PTEU.json: HTTP ${vocabRes.status}`);
        if (!punctRes.ok) throw new Error(`punctuation.json: HTTP ${punctRes.status}`);

        const vocabulary  = await vocabRes.json();
        const punctuation = await punctRes.json();

        console.log("✅ Dati caricati correttamente:", { vocabulary, punctuation });
        return { vocabulary, punctuation };

    } catch (error) {
        console.error(
            "❌ Errore nel caricamento dei JSON. " +
            "Controlla che i file non siano vuoti o malformati.",
            error
        );
        return null;
    }
};


/**
 * Converts plain Portuguese text into a W3C SSML 1.1 string
 * by applying prosody, break, and emphasis rules defined in
 * the punctuation.json data file.
 *
 * @param {string} text        - Raw input text (pt-PT)
 * @param {{vocabulary: object, punctuation: object}} data - Loaded research data
 * @returns {string}           - Full SSML document string
 */
export const convertToSSML = (text, data) => {
    if (!data?.punctuation?.punctuation_rules) {
        console.warn("⚠ Struttura dati non valida o mancante.");
        return text;
    }

    let processedText = text;
    const rules = data.punctuation.punctuation_rules;

    // Process longest symbols first so '...' is matched before '.'
    const sortedRules = [...rules].sort((a, b) => b.symbol.length - a.symbol.length);

    sortedRules.forEach(rule => {
        // Escape the symbol for safe use inside a RegExp
        const escapedSymbol = rule.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // ── <prosody> tag ──────────────────────────────────────────
        // Valid SSML prosody attributes: pitch, contour, rate, volume, range
        const prosodyAttrs = [];
        if (rule.pitch)   prosodyAttrs.push(`pitch="${rule.pitch}"`);
        if (rule.contour) prosodyAttrs.push(`contour="${rule.contour}"`);
        if (rule.rate)    prosodyAttrs.push(`rate="${rule.rate}"`);
        if (rule.volume)  prosodyAttrs.push(`volume="${rule.volume}"`);
        if (rule.range)   prosodyAttrs.push(`range="${rule.range}"`);

        const pOpen  = prosodyAttrs.length > 0 ? `<prosody ${prosodyAttrs.join(' ')}>` : '';
        const pClose = prosodyAttrs.length > 0 ? `</prosody>` : '';

        // ── <break> tag ────────────────────────────────────────────
        // Skip when break is absent or explicitly "none"
        const bTag = (rule.break && rule.break !== 'none')
            ? `<break strength="${rule.break}"${rule.time ? ` time="${rule.time}"` : ''}/>` 
            : '';

        // ── <emphasis> tag ─────────────────────────────────────────
        // Valid SSML emphasis levels: strong | moderate | reduced | none
        const eOpen  = rule.emphasis ? `<emphasis level="${rule.emphasis}">` : '';
        const eClose = rule.emphasis ? `</emphasis>` : '';

        // Symbols that open a span and precede their content
        const OPENING_SYMBOLS = ['(', '«', '\u201c'];  // ( « "

        if (OPENING_SYMBOLS.includes(rule.symbol)) {
            // Pattern:  (Word  →  <break/>(  <prosody><emphasis>Word</emphasis></prosody>
            // [^<>\s]+ avoids matching across existing SSML tags
            const regex = new RegExp(`(${escapedSymbol})\\s*([^<>\\s]+)`, 'g');
            processedText = processedText.replace(
                regex,
                `${bTag}${rule.symbol}${pOpen}${eOpen}$2${eClose}${pClose}`
            );
        } else {
            // Pattern:  Word.  →  <prosody><emphasis>Word</emphasis></prosody>.<break/>
            const regex = new RegExp(`([^<>\\s]+)\\s*(${escapedSymbol})`, 'g');
            processedText = processedText.replace(regex, (_match, word, symbol) => {
                return `${pOpen}${eOpen}${word}${eClose}${pClose}${symbol}${bTag}`;
            });
        }
    });

    // Wrap in an SSML <s> fragment (no <speak> root needed for inline use)
    return `<s xml:lang="pt-PT">${processedText}</s>`;
};
