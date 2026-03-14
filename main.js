export const loadResearchData = async () => {
    try {
        // Cache busting per evitare file vecchi
        const v = Date.now();
        const [vocabRes, punctRes] = await Promise.all([
            fetch(new URL(`./vocabulary-PTEU.json?v=${v}`, import.meta.url)),
            fetch(new URL(`./punctuation.json?v=${v}`, import.meta.url))
        ]);

        const vocabulary = await vocabRes.json();
        const punctuation = await punctRes.json();
        
        console.log("✅ Dati caricati correttamente:", punctuation);
        return { vocabulary, punctuation };
    } catch (error) {
        console.error("❌ Errore nel caricamento dei JSON. Controlla che i file non siano vuoti o malformati.", error);
        return null;
    }
};

export const convertToSSML = (text, data) => {
    if (!data || !data.punctuation || !data.punctuation.punctuation_rules) {
        console.warn("⚠ Struttura dati non valida o mancante.");
        return text;
    }

    let processedText = text;
    const rules = data.punctuation.punctuation_rules;

    // Ordiniamo i simboli dal più lungo al più corto (es. '...' prima di '.')
    const sortedRules = [...rules].sort((a, b) => b.symbol.length - a.symbol.length);

    sortedRules.forEach(rule => {
        const escapedSymbol = rule.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Creiamo i tag basandoci sulla struttura PIATTA del tuo JSON
        const prosodyAttrs = [];
        if (rule.pitch) prosodyAttrs.push(`pitch="${rule.pitch}"`);
        if (rule.contour) prosodyAttrs.push(`contour="${rule.contour}"`);
        if (rule.rate) prosodyAttrs.push(`rate="${rule.rate}"`);
        if (rule.volume) prosodyAttrs.push(`volume="${rule.volume}"`);
        if (rule.range) prosodyAttrs.push(`range="${rule.range}"`);

        const breakAttrs = [];
        if (rule.break) breakAttrs.push(`strength="${rule.break}"`);
        if (rule.time) breakAttrs.push(`time="${rule.time}"`);

        const pOpen = prosodyAttrs.length > 0 ? `<prosody ${prosodyAttrs.join(' ')}>` : '';
        const pClose = prosodyAttrs.length > 0 ? `</prosody>` : '';
        const bTag = breakAttrs.length > 0 ? `<break ${breakAttrs.join(' ')}/>` : '';

        // Gestione differenziata per punteggiatura di apertura vs chiusura
        if (["(", "«", "“"].includes(rule.symbol)) {
            // Punteggiatura che precede la parola: (Parola
            const regex = new RegExp(`(${escapedSymbol})\\s*(\\S+)`, 'g');
            processedText = processedText.replace(regex, `${bTag}${rule.symbol}${pOpen}$2${pClose}`);
        } else {
            // Punteggiatura che segue la parola: Parola.
            const regex = new RegExp(`(\\S+)\\s*(${escapedSymbol})`, 'g');
            processedText = processedText.replace(regex, (match, word, symbol) => {
                // Se la parola è già dentro un tag prosody (es. per due simboli vicini), non raddoppiare
                if (word.includes('>')) return match; 
                return `${pOpen}${word}${pClose}${symbol}${bTag}`;
            });
        }
    });

    return `<s xml:lang="pt-PT">${processedText}</s>`;
};
