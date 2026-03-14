/**
 * ThesisSpeechLibrary - SSML Punctuation Preprocessor
 * Focus: Mapping prosodico W3C SSML 1.1 con wrapper strutturale <s>
 */

/**
 * Carica i file JSON della ricerca (Vocabolario e Punteggiatura)
 */
export const loadResearchData = async () => {
    try {
        const [vocabRes, punctRes] = await Promise.all([
            fetch(new URL('./vocabulary-PTEU.json', import.meta.url)),
            fetch(new URL('./punctuation.json', import.meta.url))
        ]);

        if (!vocabRes.ok || !punctRes.ok) throw new Error("Errore nel caricamento dei file JSON.");

        return {
            vocabulary: await vocabRes.json(),
            punctuation: await punctRes.json()
        };
    } catch (error) {
        console.error("Errore critico caricamento dati:", error);
        return null;
    }
};

/**
 * Converte il testo in un frammento prosodico avvolto nel tag <s>
 * Applica esclusivamente le regole definite in punctuation.json
 */
export const convertToSSML = (text, data) => {
    if (!data || !data.punctuation || !data.punctuation.punctuation_rules) return text;

    let processedText = text;
    const rules = data.punctuation.punctuation_rules;

    // Ordine decrescente per lunghezza simbolo per evitare conflitti (es. '...' vs '.')
    const sortedRules = [...rules].sort((a, b) => b.symbol.length - a.symbol.length);

    sortedRules.forEach(rule => {
        const escapedSymbol = rule.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Cattura la parola (inclusi accenti PT-PT) e il simbolo di punteggiatura
        const regex = new RegExp(`([a-zA-ZÀ-ÿ]+)\\s*(${escapedSymbol})`, 'g');

        processedText = processedText.replace(regex, (match, word, symbol) => {
            
            // 1. Estrazione attributi Prosody dal JSON
            const prosodyAttrs = [];
            const p = rule.prosody || {};
            
            const attributes = {
                pitch: rule.pitch || p.pitch,
                contour: rule.contour || p.contour,
                range: rule.range || p.range,
                rate: rule.rate || p.rate,
                duration: rule.duration || p.duration,
                volume: rule.volume || p.volume
            };

            for (const [key, value] of Object.entries(attributes)) {
                if (value) prosodyAttrs.push(`${key}="${value}"`);
            }

            // 2. Estrazione attributi Break dal JSON
            const breakAttrs = [];
            const b = rule.break || {};
            const strength = typeof b === 'object' ? b.strength : (rule.break || null);
            const time = typeof b === 'object' ? b.time : (rule.time || null);

            if (strength) breakAttrs.push(`strength="${strength}"`);
            if (time) breakAttrs.push(`time="${time}"`);

            // 3. Generazione dei tag SSML
            const prosodyOpen = prosodyAttrs.length > 0 ? `<prosody ${prosodyAttrs.join(' ')}>` : '';
            const prosodyClose = prosodyAttrs.length > 0 ? `</prosody>` : '';
            const breakTag = breakAttrs.length > 0 ? `<break ${breakAttrs.join(' ')}/>` : '';

            // Restituisce la parola processata seguita dal simbolo e dalla pausa
            return `${prosodyOpen}${word}${prosodyClose}${symbol}${breakTag}`;
        });
    });

    // Wrapper finale conforme: tag <s> con specifica della lingua
    return `<s xml:lang="pt-PT">${processedText}</s>`;
};
