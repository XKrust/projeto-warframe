# Relic Advisor

**🇧🇷 [Português](#-português) · 🇺🇸 [English](#-english) · 🇪🇸 [Español](#-español)**

Desktop app for **Warframe**: read your relic inventory from screenshots and find out which items are
worth selling on [warframe.market](https://warframe.market), and which relics to open, refine or sell.

---

## 🇧🇷 Português

### O que faz
- **Lê seus prints** do inventário de relíquias (OCR local, no seu PC — nada é enviado pra lugar nenhum):
  nome e quantidade de cada relíquia. Campos que ele não tem certeza ficam em laranja pra você conferir.
- **Itens que valem vender:** todas as peças que podem sair das suas relíquias, com **preço ideal** pra
  anunciar (baseado no que realmente vendeu nas últimas 48h), quantas vendem por dia e de quais relíquias saem.
- **Ranking das suas relíquias:** valor esperado em platina (solo ou duo), se vale **upar pra Radiant** e
  quando é melhor **vender a relíquia inteira**.
- **Void Traces:** diz onde gastar seus traces pra ganhar mais platina no total.
- **Melhores pra farmar:** relíquias que dropam hoje, ordenadas pelo valor.
- Interface em **português, inglês e espanhol**.

### Instalar
Baixe o instalador **[Relic-Advisor-Setup-1.0.0.exe](https://github.com/XKrust/projeto-warframe/raw/main/Relic-Advisor-Setup-1.0.0.exe)**, que está na pasta principal deste
repositório, e execute.
O Windows pode mostrar um aviso do SmartScreen porque o app não é assinado — clique em
“Mais informações” → “Executar assim mesmo”.

Precisa de internet (preços do warframe.market e o leitor de texto, baixado na primeira leitura).

### Como usar
1. No jogo, abra o inventário de relíquias e tire print (PrtSc, ou F12 na Steam).
2. Na aba **Prints**, arraste ou cole (Ctrl+V) um ou vários prints.
3. Confira a lista (campos em laranja) e clique em **Somar ao inventário**.
4. Veja **Ranking → Itens que valem vender**.

---

## 🇺🇸 English

### What it does
- **Reads your screenshots** of the relic inventory (local OCR on your PC — nothing is uploaded): name and
  quantity of each relic. Anything it isn't sure about is highlighted in orange for you to check.
- **Items worth selling:** every part that can drop from your relics, with an **ideal listing price**
  (based on what actually sold in the last 48h), how many sell per day and which relics drop them.
- **Relic ranking:** expected platinum value (solo or duo), whether **refining to Radiant** pays off, and
  when it's better to **sell the whole relic**.
- **Void Traces:** where to spend your traces for the most platinum overall.
- **Best to farm:** relics dropping today, sorted by value.
- UI in **Portuguese, English and Spanish**.

### Install
Download the installer **[Relic-Advisor-Setup-1.0.0.exe](https://github.com/XKrust/projeto-warframe/raw/main/Relic-Advisor-Setup-1.0.0.exe)** from the root of this repository and
run it. Windows SmartScreen may warn because the app is unsigned — click “More info” → “Run anyway”.

Requires an internet connection (warframe.market prices, and the OCR engine downloaded on first use).

### How to use
1. In game, open your relic inventory and take a screenshot (PrtSc, or F12 on Steam).
2. In the **Screenshots** tab, drop or paste (Ctrl+V) one or more screenshots.
3. Check the list (orange fields) and click **Add to inventory**.
4. Open **Ranking → Items worth selling**.

---

## 🇪🇸 Español

### Qué hace
- **Lee tus capturas** del inventario de reliquias (OCR local en tu PC — no se sube nada): nombre y
  cantidad de cada reliquia. Lo que no tiene claro queda en naranja para que lo revises.
- **Ítems que vale la pena vender:** todas las piezas que pueden salir de tus reliquias, con **precio
  ideal** para publicar (según lo que realmente se vendió en las últimas 48h), cuántas se venden por día y de
  qué reliquias salen.
- **Ranking de tus reliquias:** valor esperado en platino (solo o dúo), si conviene **refinar a Radiant** y
  cuándo es mejor **vender la reliquia entera**.
- **Void Traces:** dónde gastar tus traces para ganar más platino en total.
- **Mejores para farmear:** reliquias que caen hoy, ordenadas por valor.
- Interfaz en **portugués, inglés y español**.

### Instalar
Descarga el instalador **[Relic-Advisor-Setup-1.0.0.exe](https://github.com/XKrust/projeto-warframe/raw/main/Relic-Advisor-Setup-1.0.0.exe)**, que está en la carpeta principal de
este repositorio, y ejecútalo. Windows SmartScreen puede avisar porque la app no está firmada — haz clic en
“Más información” → “Ejecutar de todas formas”.

Necesita internet (precios de warframe.market y el motor de OCR, que se descarga la primera vez).

### Cómo usar
1. En el juego, abre tu inventario de reliquias y haz una captura (ImprPant, o F12 en Steam).
2. En la pestaña **Capturas**, arrastra o pega (Ctrl+V) una o varias capturas.
3. Revisa la lista (campos en naranja) y haz clic en **Sumar al inventario**.
4. Abre **Ranking → Ítems que vale la pena vender**.

---

## Development

Requires Node.js 22+.

```bash
npm install
npm run dev        # web version at http://localhost:5173 (API on :3001)
npm run app        # run as a desktop app (Electron)
npm run dist       # build the Windows installer into release/
npm test           # unit tests
npm run test:ocr   # real OCR on the screenshots in tests/fixtures (~5s)
```

| Folder | What's inside |
|---|---|
| `web/` | React UI (Vite). `ocrCore.ts` + `ocrParse.ts` = screenshot reader, `i18n.tsx` = translations |
| `server/` | Local API: warframe.market client (rate limited, cached), drop tables, ideal price (`pricing.ts`) |
| `shared/` | Expected value math, refinement and Void Trace allocation (`calc.ts`) |
| `electron/` | Desktop app entry point |
| `tests/` | Unit tests + real screenshots used to test the OCR |

**Data sources:** relic drop tables from [warframestat.us](https://drops.warframestat.us) (official drop
tables), prices and sales history from the [warframe.market](https://warframe.market) API, links to the
[Warframe Wiki](https://wiki.warframe.com).

## License

[GPL-3.0](LICENSE) © XKrust

Relic Advisor is a fan-made tool, not affiliated with Digital Extremes or warframe.market.
Warframe is a trademark of Digital Extremes Ltd.
