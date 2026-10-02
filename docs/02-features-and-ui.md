# 02 • Funzionalità & Interfaccia Utente

## 1. Tabella Palmarès Interattiva

La vista principale offre una bacheca dinamica ad alta leggibilità sportiva:

- **Ordinamento Dinamico Multi-Criterio**:
  - `trophies_desc` (🏆 Più Titolati): Trofei maggiori totali $\rightarrow$ Scudetti $\rightarrow$ Anzianità.
  - `rating_desc` (⭐ Rating Storico): Punteggio ponderato totale $\rightarrow$ Scudetti $\rightarrow$ Anzianità.
  - `scudetti_desc` (🥇 Più Scudetti): 1° posto campionato $\rightarrow$ 2° posti $\rightarrow$ Anzianità.
  - `years_desc` (📅 Anzianità): Stagioni disputate $\rightarrow$ Scudetti.
  - `mundialito_desc` (🌍 Mundialito): Titoli Mundialito vinti.
  - `spoons_desc` (🥄 Cucchiai di Legno): Ultimi posti collezionati.
  - `cartonato_desc` (🏷️ Banner Playout): Sconfitte ai playout accumulati.

- **Formula Ufficiale di Rating Storico**:

| Icona | Tipologia Trofeo / Riconoscimento  | Punti Assegnati | Descrizione                                   |
| :-----:| :-----------------------------------| :---------------:| :----------------------------------------------|
| 🥇　　| **1° Posto Campionato (Scudetto)** | **+3.00 pt**    | Campione d'Italia di Lega                     |
| 🏆　　| **Coppa di Lega (Oro)**            | **+2.00 pt**    | Vincitore della coppa a eliminazione diretta  |
| ⭐　　 | **Supercoppa di Lega**             | **+1.00 pt**    | Vincitore della sfida di apertura stagione    |
| 🌍　　| **Trofeo Mundialito**              | **+1.00 pt**    | Torneo speciale o competizione internazionale |
| 🥈　　| **2° Posto Campionato**            | **+0.50 pt**    | Vice-Campione della regular season            |
| 🥈　　| **Coppa di Lega (Argento)**        | **+0.25 pt**    | Finalista sconfitto in Coppa di Lega          |
| 🥉　　| **3° Posto Campionato**            | **+0.25 pt**    | Medaglia di bronzo della regular season       |
| 🥄　　| **Cucchiaio di Legno**             | **-1.00 pt**    | Ultimo classificato della regular season      |
| 🏷️　　| **Banner Cartonato (Playout)**     | **-2.00 pt**    | Retrocessione o sconfitta ai playout          |

---

## 2. Scheda Manager & Pipeline di Esportazione HD

Dalla modale di profilo di ogni fantallenatore è possibile consultare i dettagli di carriera, il tasso di conversione, i badge onorari e la bacheca completa, oltre ad esportare la scheda grafica:

### Pipeline di Rendering Off-Screen

Per garantire un rendering perfetto senza flickering visivo o troncamenti dovuti allo scroll:

1. Il template della scheda viene clonato in un nodo isolato `#manager-profile-card-export-clone` posizionato fuori dal viewport (`fixed top-0 left-0 z-[-9999]`).
2. Vengono rimossi i controlli interattivi (pulsanti di chiusura, menu a tendina) e viene iniettato il footer editoriale ufficiale *InsalAtlas • Palmarès Ufficiale*.
3. `html2canvas` rasterizza la scheda a risoluzione 2.2× per una nitidezza broadcast.
4. L'immagine generata viene convertita in Blob PNG e gestita tramite:
   - **Download Diretto**: Salvataggio automatico del file `.png` sul dispositivo.
   - **Copia negli Appunti**: Utilizzo della Clipboard API nativa (`navigator.clipboard.write([new ClipboardItem(...)])`) per incollare istantaneamente l'immagine su WhatsApp Desktop, Telegram o Discord con `Cmd+V` / `Ctrl+V`.

---

## 3. Condivisione Social & Banter WhatsApp

L'applicazione integra un generatore di messaggi di condivisione (`src/export/share.ts`):

- **Messaggio Formattato**: Genera un testo arricchito con emoji, statistiche di carriera, bacheca trofei e l'archetipo comportamentale assegnato.
- **Deep Linking con Preview**: Include il link diretto `?manager=<id>` che apre automaticamente la modale del manager all'atterraggio grazie al modulo `src/router.ts`.

---

## 4. Modalità Modifica & Inline Editing

- Accesso protetto da password verificata via **SHA-256 Web Crypto API** (`src/config.ts`).
- Modifica contestuale in-place di tutti i titoli e intestazioni di colonna (`data-title-key`).
- Modale per l'aggiornamento dei record dei singoli manager, presenze, trofei e banner dei mister cartonati.
- Esportazione ed importazione di backup completi in formato JSON.

---

## 5. Progressive Web App (PWA) & Offline Layer

L'applicazione include il supporto PWA per l'installazione nativa su desktop e dispositivi mobili Android e iOS:

- **Manifest Web App** (`public/manifest.json`):
  - Configurazione standalone (`display: "standalone"`) per un'esperienza a tutto schermo priva di barre del browser.
  - Colori di sistema coerenti (`background_color: "#0f172a"`, `theme_color: "#0f172a"`).
  - Icone ad alta risoluzione con padding circolare safe-zone (`purpose: "any maskable"` a 512×512 e 192×192) per evitare ritagli antiestetici nei launcher di sistema.
- **Service Worker** (`public/sw.js` & `src/pwa.ts`):
  - Versione cache: con auto-pulizia atomica delle cache obsolete al cambio di release.
  - **Cache-First**: Asset statici essenziali (shell HTML, Tailwind, FontAwesome, icone e bundle Vite).
  - **Stale-While-Revalidate**: Database `public/data.json`, servito istantaneamente offline o dalla cache e rivalidato asincronamente in background alla presenza di connettività.
  - **Banner di Installazione**: Riconoscimento dell'evento `beforeinstallprompt` con guida visuale per dispositivi iOS/Android ed engagement toast personalizzato.
