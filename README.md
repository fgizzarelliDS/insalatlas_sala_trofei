# 🏆 InsalAtlas • Sala Trofei & Palmarès Ufficiale

Applicazione web broadcast-grade e autonoma per la visualizzazione, la gestione storica, la consultazione del palmarès e l'esportazione ad alta definizione (HD) dell'Albo d'Oro della lega Fantacalcio.

Ispirata al visual design di Sky Sport e Serie A, l'applicazione supporta il cambio runtime di quattro palette cromatiche, il tracciamento dinamico dei trofei ufficiali e dei riconoscimenti goliardici (*Cucchiaio di Legno* e *Banner Playout Cartonato*), un sistema integrato di backup JSON e l'esportazione grafica ad alta risoluzione (scala 2.2×) ottimizzata per la condivisione su WhatsApp e Telegram.

---

## 🏛️ Architettura Tecnica (Zero-Build ES6 Modular)

L'applicazione segue un'architettura **Native ES6 Modules** pura, progettata per essere servita direttamente da **GitHub Pages** e da qualsiasi server HTTP statico senza alcun passaggio di compilazione o bundler (nessuna dipendenza da Node.js, Webpack, Vite o Rollup).

### Struttura del Repository

```text
insalatlas_sala_trofei/
├── index.html              # Scheletro semantico HTML, CDN esterne, link fogli stile e modulo app.js
├── preview.png             # Immagine di anteprima social OpenGraph (1200x630)
├── README.md               # Documentazione tecnica, formula di punteggio e guida operativa
├── assets/                 # Favicon (PNG 32x32, 64x64, 512x512) e icone dell'applicazione
├── css/
│   ├── themes.css          # Variabili custom CSS per le 4 palette cromatiche
│   └── layout.css          # Dynamic CSS Grid, mensola trofei, vettori SVG e stili edit mode
├── data/
│   ├── data.json           # Record ufficiali della lega (Single Source of Truth)
│   └── InsalAtlas_...json  # Backup storici archiviati
└── js/
    ├── config.js           # Costanti globali (DEFAULT_TITLES, ADMIN_TOKEN)
    ├── state.js            # Runtime state reattivo condiviso
    ├── trophies.js         # Coordinate e percorsi vettoriali TROPHY_SVGS e generatori SVG/Banner
    ├── score.js            # Rating storico ponderato, decimal formatter e algoritmi di ordinamento
    ├── ui.js               # Gestione temi, notifiche toast, toggle edit mode e binding titoli
    ├── storage.js          # Fetching remoto di data.json, cache localStorage e import/export JSON
    ├── modals.js           # Scheda profilo read-only con shelf trofei e modal editor amministrativo
    ├── export.js           # Pipeline di cattura canvas HD ad alta fedeltà (html2canvas)
    └── app.js              # Bootstrap DOM, renderBoard(), contatori e bridge su window globale
```

---

## 🎨 Caratteristiche Principali

- **Visualizzazione ad Albo d'Oro (Table Shelf)**: Allineamento millimetrico dei trofei su mensole orizzontali ad alto contrasto.
- **Vettorializzazione Nativa**: Tutte le coppe, i cucchiai, i mundialito e i badge sono renderizzati in puro SVG nativo, scalabile all'infinito senza perdita di qualità.
- **4 Temi Grafici Switchabili**:
  - 🌙 **Gala Dark Gold (`theme-gala`)**: Gradiente radiale blu notte/nero con accenti dorati (#f59e0b) e superfici semitrasparenti in stile cerimonia di gala.
  - ⚡ **Serie A Cyan Night (`theme-seriea`)**: Tonalità blu navy profondo con dettagli ciano brillante (#06b6d4) ispirati ai riflettori degli stadi di Serie A.
  - 📰 **Gazzetta Rosa Vintage (`theme-gazzetta`)**: Sfondo rosa cartaceo editoriale (#fce7ec), testata cremisi (#be123c) e schede bianche ad alto contrasto.
  - 📋 **Clean Studio White (`theme-studio`)**: Minimalismo contemporaneo in ardesia chiara (#f1f5f9) con accenti blu royal (#2563eb).

- **Tracciamento Completo dei Trofei**:
  - 🥇 Podio Campionato (1° Scudetto, 2° Posto, 3° Posto)
  - 🥄 Cucchiaio di Legno
  - 🏆 Coppa di Lega (Oro e Argento)
  - ⭐ Supercoppa di Lega
  - 🌍 Mundialito
  - 🏷️ Banner Cartonato (Sconfitto ai Playout con badge mister: *Juric, Mazzarri, Allegri, ???*)
- **Esportazione HD (1-Click PNG)**: Generatore canvas a scala 2.2× ottimizzato per la condivisione nelle chat di gruppo.
- **Protezione con Password**: Blocco crittografico per impedire a chi visualizza il link pubblico di alterare i dati ufficiali.

---

## ⭐ Formula Ufficiale di Punteggio & Ranking Storico

Per calcolare il prestigio storico complessivo di ogni fantallenatore, l'applicazione applica un algoritmo di punteggio ponderato (`calculateManagerScore(m)`), attribuendo un peso specifico a ogni titolo conquistato o penalità rimediata:

| Icona | Tipologia Trofeo / Riconoscimento | Punti Assegnati | Descrizione |
| :---: | :--- | :---: | :--- |
| 🥇 | **1° Posto Campionato (Scudetto)** | **+3.00 pt** | Campione d'Italia di Lega |
| 🏆 | **Coppa di Lega (Oro)** | **+2.00 pt** | Vincitore della coppa a eliminazione diretta |
| ⭐ | **Supercoppa di Lega** | **+1.00 pt** | Vincitore della sfida di apertura stagione |
| 🌍 | **Trofeo Mundialito** | **+1.00 pt** | Torneo speciale o competizione internazionale |
| 🥈 | **2° Posto Campionato** | **+0.50 pt** | Vice-Campione della regular season |
| 🥈 | **Coppa di Lega (Argento)** | **+0.25 pt** | Finalista sconfitto in Coppa di Lega |
| 🥉 | **3° Posto Campionato** | **+0.25 pt** | Medaglia di bronzo della regular season |
| 🥄 | **Cucchiaio di Legno** | **0.00 pt** | Quarto classificato della regular season |
| 🏷️ | **Banner Cartonato (Playout)** | **-2.00 pt** | Retrocessione o sconfitta ai playout |

### Algoritmi di Ordinamento Disponibili

- **Più Titolati (`trophies_desc`)**: Somma dei titoli maggiori (Scudetto, Coppe Oro, Supercoppa, Mundialito) $\rightarrow$ Scudetti $\rightarrow$ Anni di militanza.
- **Rating Storico (`rating_desc`)**: Punteggio ponderato totale $\rightarrow$ Scudetti $\rightarrow$ Anni di militanza.
- **Scudetti Vinti (`scudetti_desc`)**: Scudetti $\rightarrow$ Secondi posti $\rightarrow$ Anni di militanza.
- **Anzianità di Lega (`years_desc`)**: Stagioni disputate $\rightarrow$ Scudetti.
- **Mundialito (`mundialito_desc`)**: Titoli Mundialito conquistati.
- **Cucchiai di Legno (`spoons_desc`)**: Ultimi posti collezionati.
- **Playout Cartonato (`cartonato_desc`)**: Maggior numero di banner cartonato accumulati.

---

## 🎨 Palette Cromatiche Supportate

L'interfaccia permette di cambiare istantaneamente lo stile visivo tra 4 temi dedicati:

1. 🌙 **Gala Dark Gold (`theme-gala`)**: Gradiente radiale blu notte/nero con accenti dorati (#f59e0b) e superfici semitrasparenti in stile cerimonia di gala.
2. ⚡ **Serie A Cyan Night (`theme-seriea`)**: Tonalità blu navy profondo con dettagli ciano brillante (#06b6d4) ispirati ai riflettori degli stadi di Serie A.
3. 📰 **Gazzetta Rosa Vintage (`theme-gazzetta`)**: Sfondo rosa cartaceo editoriale (#fce7ec), testata cremisi (#be123c) e schede bianche ad alto contrasto.
4. 📋 **Clean Studio White (`theme-studio`)**: Minimalismo contemporaneo in ardesia chiara (#f1f5f9) con accenti blu royal (#2563eb).

---

## 🔄 Guida Operativa all'Aggiornamento Annuale

Poiché il sito è distribuito su **GitHub Pages** (hosting statico), le modifiche apportate dall'interfaccia web vengono salvate nel `localStorage` del browser locale. Per renderle definitive e visibili pubblicamente a tutti i membri della lega:

### Metodo 1: Aggiornamento via Interfaccia & GitHub (Consigliato)

1. **Abilita la Modalità Modifica**:
   - Apri il sito nel browser e clicca su **`Modifica Dati & Titoli`**.
   - Inserisci la password amministratore.
2. **Aggiorna i Record della Stagione Conclusa**:
   - Clicca sulla riga del fantallenatore da aggiornare per aprire il modal.
   - Incrementa le stagioni disputate (`+1`) e assegna i trofei vinti.
   - Se applicabile, aggiungi o aggiorna i banner cartonato assegnati (es. `JURIC`, `MAZZARRI`, `ALLEGRI`, `???`).
   - Clicca su **`Salva Modifiche`** (verranno attivati coriandoli celebrativi in caso di vittoria).
3. **Esporta il File di Backup**:
   - Nel banner arancione in alto, clicca su **`Salva Backup JSON`**.
   - Verrà scaricato un file denominato `data_backup_YYYY.json` contenente i dati e i titoli aggiornati.
4. **Applica i Dati Definitivi su GitHub**:
   - Apri il file scaricato e copia l'array `leagueData`.
   - Vai sul repository GitHub, apri [`data/data.json`](data/data.json) e incolla i nuovi record nel blocco `"leagueData"`.
   - Esegui il commit sul branch principale (`main`).
   - GitHub Pages pubblicherà automaticamente l'Albo d'Oro aggiornato entro 60 secondi.

### Metodo 2: Modifica Diretta del File `data/data.json`

Se preferisci lavorare direttamente sul codice sorgente:

1. Apri [`data/data.json`](data/data.json) nel tuo editor di testo preferito.
2. Aggiorna i campi numerici e l'array `cartonato_coaches` dell'allenatore interessato:

   ```json
   {
     "id": "m_alfo",
     "name": "Alfo",
     "years": 11,
     "gold": 2,
     "silver": 3,
     "bronze": 2,
     "spoon": 0,
     "cup_gold": 3,
     "cup_silver": 0,
     "supercup": 3,
     "mundialito": 2,
     "cartonato": 0,
     "cartonato_coaches": []
   }
   ```

3. Salva ed esegui il commit delle modifiche su GitHub.

---
