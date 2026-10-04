# 03 • Econometria, Cinismo & Modelli di Rischio

Il modulo analitico `src/analytics/` (`econometrics.ts`, `tailRisk.ts`, `archetypes.ts`, esposto tramite `index.ts`) opera sui dati aggregati di carriera presenti in `public/data.json`. Si articola in tre pilastri analitici.

---

## 1. Pilastro I: Silverware Prestige Index & Macro-Parità

### 1.1 Silverware Prestige Index (SPI)

Per evitare che una Supercoppa vinta in gara secca abbia lo stesso peso di uno Scudetto conquistato su 38 giornate, ogni titolo è ponderato per difficoltà strutturale:

| Competizione | Parametro | Peso ($w$) | Ratio Analitica |
| :--- | :--- | :---: | :--- |
| **Scudetto** | `gold` | **3.00** | Maratona a girone unico su 38 giornate. |
| **Coppa di Lega** | `cup_gold` | **1.50** | Torneo a eliminazione diretta su più turni. |
| **Supercoppa** | `supercup` | **0.75** | Finale secca tra campioni in carica. |
| **Mundialito** | `mundialito` | **0.50** | Competizione preliminare / mini-torneo. |

$$\text{Prestige Points}_i = 3.0 \cdot \text{Gold}_i + 1.5 \cdot \text{CupGold}_i + 0.75 \cdot \text{Supercup}_i + 0.50 \cdot \text{Mundialito}_i$$

$$\text{Prestige Share } s_i = \left( \frac{\text{Prestige Points}_i}{\sum_{j=1}^n \text{Prestige Points}_j} \right) \times 100$$

---

### 1.2 Coefficiente di Gini Bivariato ($G_{\text{prestige}}$ vs $G_{\text{rating}}$)

- **Gini Prestigio ($G_{\text{prestige}}$)**: Misura la disuguaglianza nella conquista dei trofei pesanti ordinati in modo non decrescente ($P_{(1)} \le P_{(2)} \le \dots \le P_{(n)}$):
  $$G_{\text{prestige}} = \frac{2 \sum_{i=1}^{n} i \cdot P_{(i)}}{n \sum_{i=1}^{n} P_{(i)}} - \frac{n + 1}{n}$$
- **Gini Rating ($G_{\text{rating}}$)**: Calcolato sul punteggio storico complessivo traslato nel dominio non negativo ($R'_i = R_i - \min(0, \min R)$), misura l'equilibrio complessivo includendo piazzamenti e penalità playout.

---

### 1.3 Top-3 Concentration ($CR_3$), Indice HHI & Entropia ($H_{\text{rel}}$)

- **Top-3 Concentration Ratio**:
  $$CR_3^{\text{prestige}} = \left( \frac{\sum_{k=1}^3 P_{(\text{top } k)}}{\sum_{j=1}^n P_j} \right) \times 100$$
- **Herfindahl-Hirschman Index (HHI)**:
  $$\text{HHI} = \sum_{i=1}^n s_i^2 = \sum_{i=1}^n \left(\frac{P_i}{\sum P} \times 100\right)^2$$
- **Normalized Relative Entropy**:
  $$H_{\text{rel}} = \frac{-\sum_{i=1, P_i > 0}^n p_i \ln(p_i)}{\ln(n)}$$
  Un valore di $H_{\text{rel}} = 1.0$ indica perfetta parità distributiva; valori tendenti a $0.0$ segnalano monopolio assoluto.

---

### 1.4 Calibrazione per Piccoli Gruppi & Diagnosi Narrativa

Nei campionati di Fantacalcio ($N = 8 \dots 14$), il solo indice di Gini teorico tende a sovrastimare la disuguaglianza per la presenza naturale di squadre a quota zero titoli. Per questo, l'algoritmo di diagnosi qualitativa di lega valuta congiuntamente **$G_{\text{prestige}}$**, **$CR_3^{\text{prestige}}$** e **$\text{HHI}_{\text{prestige}}$** secondo una sequenza decisionale rigorosa:

| Priorità | Stato / Diagnosi di Lega | Icona | Colore UI | Condizione Logica Multi-Indice | Diagnosi Narrativa & Dinamica di Lega |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **#1** | **Far West (Parità Assoluta)** | 🤠 | 🟢 Verde (`#10b981`) | $(G_{\text{prestige}} \le 0.40)$ **AND** $(CR_3 \le 45\%)$ **AND** $(\text{HHI} < 1400)$ | Campionato anarchico ed imprevedibile: il potere è frammentato, elevata alternanza annuale al vertice e rotazione continua dei campioni. |
| **#2** | **Feudalesimo Assoluto** | 🏰 | 🔴 Rosso (`#ef4444`) | $((G_{\text{prestige}} > 0.75)$ **AND** $(CR_3 \ge 72\%))$ **OR** $(\text{HHI} \ge 2500)$ | Monopolio dinastico stile Bayern/PSG: 1 o 2 squadre accentrano quasi tutti i titoli pesanti, soffocando ogni ricambio al vertice. |
| **#3** | **Lega a Tre Velocità** | ⚖️ | 🟡 Ambra (`#f59e0b`) | $(G_{\text{prestige}} > 0.55)$ **OR** $(CR_3 \ge 58\%)$ **OR** $(\text{HHI} \ge 1800)$ | Oligarchia storica consolidata: una cerchia ristretta di 3 o 4 potenze storiche domina la bacheca, lasciando alle altre squadre solo le briciole. |
| **#4** | **Competizione Aperta** | ⚽ | 🔵 Blu (`#3b82f6`) | *Fallback predefinito (nessun estremo soddisfatto)* | Alternanza equilibrata e fisiologica: classe media viva e competitiva, rotazione sana tra i vincitori e contesa aperta su ogni fronte. |

> [!NOTE]
>
> - **$G_{\text{prestige}}$**: Coefficiente di Gini ponderato per la difficoltà dei titoli conquistati ($[0.0, 1.0]$).
> - **$CR_3^{\text{prestige}}$**: Quota percentuale di prestigio detenuta dai primi 3 manager della lega ($[0\%, 100\%]$).
> - **$\text{HHI}_{\text{prestige}}$**: Herfindahl-Hirschman Index sommato sulle quote percentuali di prestigio ($\sum s_i^2$, $[0, 10000]$).

---

## 2. Pilastro II: Dinamiche di Podio & Cinismo

### 2.1 Presenza a Podio ($PR$) & Killer Instinct ($KI$)

- **Podium Rate ($PR_i$)**: Frequenza di posizionamento sul podio campionato (1°, 2°, 3° posto):
  $$PR_i = \left(\frac{\text{Gold}_i + \text{Silver}_i + \text{Bronze}_i}{\text{Years}_i}\right) \times 100$$
- **Killer Instinct ($KI_i$)**: Capacità di convertire una presenza sul podio nella conquista dello Scudetto:
  $$KI_i = \left(\frac{\text{Gold}_i}{\text{Gold}_i + \text{Silver}_i + \text{Bronze}_i}\right) \times 100$$

### 2.2 Finals Conversion Rate (Clutch vs. Bottler nelle Coppe)

Misura la percentuale di successo nelle **finali secche a eliminazione diretta** (Coppa di Lega e Supercoppa):
$$\text{Conversion Rate}_i = \left(\frac{\text{CupGold}_i + \text{Supercup}_i}{\text{CupGold}_i + \text{Supercup}_i + \text{CupSilver}_i + \text{SupercupSilver}_i}\right) \times 100$$

> [!NOTE]
>
> - **Separazione Ortogonale tra Campionato e Coppe**: Lo Scudetto è governato dal **Killer Instinct ($KI\%$)**, che misura la maratona a tappe del campionato (capacità di convertire i podi in trionfi). Il **Conversion Rate ($CR\%$)** è invece strettamente riservato alle **finali secche da dentro o fuori**: misura la freddezza nei 90 minuti quando c'è una coppa in palio.
> - **Accesso alla Supercoppa**: Si qualificano alla finale annuale il vincitore dello Scudetto ($\text{Gold}$) e il vincitore della Coppa di Lega ($\text{CupGold}$) di ciascuna stagione (competizione introdotta a partire dalla 4ª edizione della lega). Chi vince conquista la Supercoppa ($\text{Supercup}$), chi viene sconfitto registra una finale persa ($\text{SupercupSilver}$).
> - **Mundialito**: Verrà integrato nel computo del cinismo non appena sarà formalizzato lo storico completo dei 3 sconfitti in finale delle rispettive edizioni.

---

## 3. Pilastro III: Tail-Risk Modeling & Archetipi Comportamentali

### 3.1 Pesi di Coda Asimmetrici & Masse Estreme

La volatilità di rendimento viene modellata separando i trionfi dalle catastrofi sportive:
$$\text{FeastMass}_i = 1.0 \cdot \text{Gold}_i + 0.5 \cdot \text{CupGold}_i$$
$$\text{DisasterMass}_i = 1.0 \cdot \text{Spoon}_i + 0.75 \cdot \text{Cartonato}_i$$
$$\text{TotalTailMass}_i = \text{FeastMass}_i + \text{DisasterMass}_i$$

### 3.2 Feast-or-Famine con Shrinkage Bayesiano ($\widetilde{FF}$)

Per evitare distorsioni da piccolo campione su manager con poche stagioni all'attivo, il rapporto include un prior empirico di lega ($K = 2.0$, $\bar{FF} = 0.30$):
$$\widetilde{FF}_i = \frac{\text{TotalTailMass}_i + (K \cdot \bar{FF})}{\text{Years}_i + K}$$

### 3.3 Net Tail Skew ($NTS$) Regolarizzato

Determina se la volatilità pende verso il trionfo o verso la disfatta con fattore di regolarizzazione ($M = 1.5$):
$$NTS_i = \begin{cases} 0 & \text{se } \text{TotalTailMass}_i = 0 \\ \frac{\text{FeastMass}_i - \text{DisasterMass}_i}{\text{TotalTailMass}_i + M} & \text{altrimenti} \end{cases} \quad \in [-1.0, +1.0]$$

### 3.4 Net Tail Index ($NTI$)

Sintetizza magnitudo e polarità direzionale in un unico scalare:
$$NTI_i = \widetilde{FF}_i \times NTS_i \in [-1.0, +1.0]$$

| Range NTI | Polarità Comportamentale | Icona | Colore UI |
| :---: | :--- | :---: | :---: |
| **$\ge +0.30$** | **Cannibale Assoluto**: Rischio mirato costantemente alla vittoria finale. | ⚡ | 🟢 Smeraldo (`#10b981`) |
| **$+0.08 \dots +0.29$** | **Attaccante Efficace**: Raccoglie stabilmente più trionfi che disastri. | 🎯 | 🟢 Verde Menta (`#34d399`) |
| **$-0.07 \dots +0.07$** | **Neutro / Bilanciato**: Profilo bilanciato a centro classifica. | ⚖️ | ⚪ Ardesia Neutro (`#94a3b8`) |
| **$-0.29 \dots -0.08$** | **Vulnerabile**: Frequenti difficoltà e presenze nelle zone basse. | 🛡️ | 🟡 Ambra (`#f59e0b`) |
| **$\le -0.30$** | **Bersaglio Mobile**: Elevata instabilità con crolli sistematici ai playout. | 🎯 | 🔴 Rosso Fuoco (`#ef4444`) |

---

## 4. Waterfall degli Archetipi Primari

A ogni manager viene assegnato un solo archetipo comportamentale primario. La classificazione segue un algoritmo **waterfall a priorità deterministica**: la prima condizione soddisfatta dall'alto verso il basso assegna in via esclusiva il badge e la descrizione del profilo.

| Priorità | Archetipo & Badge | Icona | Colore UI | Condizione Logica di Assegnazione | Profilo Narrativo & Banter |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **#1** | **Dominatore Dinastico** | 👑 | 🟡 Oro Ambra (`#eab308`) | $(P \ge 10.0$ **AND** $(P_{\text{eff}} \ge 0.50$ **OR** $\text{Eff} \ge 0.40))$ **OR** $(\text{Gold} \ge 2$ **AND** $P \ge 7.00)$ | Egemonia storica consolidata; bacheca ricca di trofei pesanti con eccellente continuità e pedigree vincente. |
| **#2** | **Vittima Sacrificale** | ☠️ | 🔴 Rosso (`#ef4444`) | $\text{Disonori} \ge 3$ **OR** $(\text{Disonori} \ge 2$ **AND** $\text{Trofei} = 0)$ | Bersaglio designato delle rivali; colleziona cucchiai e cartonati ai playout con bacheca trofei deserta. |
| **#3** | **Cannibale del Podio** | 🏆 | 🟠 Oro Intenso (`#f59e0b`) | $PR \ge 50\%$ **AND** $KI \ge 60\%$ **AND** $\text{Podi} \ge 2$ | Quando arriva in zona medaglie difficilmente si accontenta: converte sistematicamente il podio in trionfo. |
| **#4** | **Cinico Chirurgico** | 🎯 | 🟢 Smeraldo (`#10b981`) | $\text{Finali} \ge 2$ **AND** $\text{Conversion Rate} \ge 70\%$ | Letale nelle finali secche; straordinaria freddezza sotto pressione negli atti conclusivi di coppa e campionato. |
| **#5** | **Il Grande Piazzato** | ⭐ | 🟠 Ambra Scuro (`#d97706`) | $\text{Podi} \ge 3$ **AND** $KI \le 25\%$ | Sempre presente nelle zone nobili della classifica, ma soffre di un cronico blocco psicologico all'ultimo chilometro. |
| **#6** | **Eterno Secondo** | 🥈 | 🟣 Indaco (`#6366f1`) | $(\text{Silver} + \text{CupSilver}) \ge 2$ **AND** $\text{Conversion Rate} \le 35\%$ | Specialista degli argenti; collezione di finali amare e campionati persi al fotofinish per un soffio. |
| **#7** | **All-or-Nothing** | 🎲 | 🟠 Arancione (`#f97316`) | $\widetilde{FF} \ge 0.45$ **AND** $(\text{Gold} \ge 1$ **OR** $\text{CupGold} \ge 1)$ **AND** $\text{Disonori} \ge 1$ | Montagne russe emotive: oscilla costantemente tra la gloria del trionfo e il baratro della retrocessione. |
| **#8** | **Grinder Metodico** | 🛡️ | 🔵 Ciano (`#06b6d4`) | $PR \ge 30\%$ **AND** $\text{Disonori} = 0$ **AND** $\text{Years} \ge 3$ | Pragmatico, solido e immune ai crolli nei bassifondi; garantisce costanza di rendimento senza mai sbandare. |
| **#9** | **Partecipante** | 👔 | ⚪ Grigio Ardesia (`#94a3b8`) | *Fallback predefinito (nessun criterio sopra)* | Profilo neutro di transizione a metà classifica; in attesa di definire la propria traiettoria storica. |

> [!NOTE]
>
> - **$P$**: Silverware Prestige Points ($3.0 \cdot \text{Gold} + 1.5 \cdot \text{CupGold} + 0.75 \cdot \text{Supercup} + 0.50 \cdot \text{Mundialito}$).
> - **$P_{\text{eff}}$**: Prestigio annualizzato ($P / \text{Years}$).
> - **$\text{Disonori}$**: Somma totale di Cucchiai di Legno (`spoon`) e Cartonati Playout (`cartonato`).
> - **$\text{Finali}$**: Somma di vittorie e secondi posti nelle finali di coppa $(\text{CupGold} + \text{Supercup} + \text{CupSilver} + \text{SupercupSilver})$.

---

## 5. Roadmap & Evoluzioni Future (TODO)

### 5.1 Global Clutch Index ($GCI$)

Per unificare in un unico indicatore sintetico sia la capacità di convertire la maratona di campionato sia la letalità nelle finali secche a eliminazione diretta, è pianificata l'introduzione del **Global Clutch Index ($GCI$)**:

$$GCI_i = w_{\text{league}} \cdot KI_i + w_{\text{cups}} \cdot CR_i$$

- **Pesi del GCI da calibrare in futuro** (es. 50% Campionato e 50% Coppe, oppure sbilanciato a favore del Campionato), con gestione neutra per chi non ha ancora disputato finali di coppa.
- **Integrazione Storico Mundialito**: Formalizzazione dello storico finale Mundialito (vinti e persi) per completare il set di dati delle coppe della lega.
