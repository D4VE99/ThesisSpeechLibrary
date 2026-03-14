/**
 * EP-Speech-Processor Loader
 * -------------------------------------------------------------------------
 * Carica i dati del vocabolario PTEU e le regole di punteggiatura
 * -------------------------------------------------------------------------
 */

export const loadResearchData = async () => {
    try {
        // Caricamento in parallelo per ottimizzare i tempi
        const [vocabRes, punctRes] = await Promise.all([
            fetch(new URL('./vocabulary-PTEU.json', import.meta.url)),
            fetch(new URL('./punctuation.json', import.meta.url))
        ]);

        if (!vocabRes.ok || !punctRes.ok) {
            throw new Error("Impossibile recuperare uno dei file JSON.");
        }

        const vocabulary = await vocabRes.json();
        const punctuation = await punctRes.json();

        return {
            vocabulary,
            punctuation
        };
    } catch (error) {
        console.error("Errore durante il caricamento della libreria:", error);
        return null;
    }
};
