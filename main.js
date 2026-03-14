// caricamento dati dal vocabulary, dato che sono in json quando si richiama la libreria dovremo usare await però permette di creare vocabolari per ogni lingua senza il bisogno di modificare la libreria ma solo il json

export const getVocabulary = async () => {
    try {
        // Recupera il JSON dalla stessa cartella su GitHub/jsDelivr
        const response = await fetch(new URL('./vocabulary.json', import.meta.url));
        return await response.json();
    } catch (error) {
        console.error("Errore nel caricamento del vocabolario:", error);
        return null;
    }
};
