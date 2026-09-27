// Idiomas da interface: português (Brasil), inglês e espanhol. Termos do jogo (Intact, Radiant,
// Void Traces, Vaulted, Ducats, plat) ficam como no jogo em todos os idiomas.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setNumberLocale } from './model';

export type Lang = 'pt' | 'en' | 'es';

export const LANGS: { id: Lang; label: string; locale: string }[] = [
  { id: 'pt', label: 'Português', locale: 'pt-BR' },
  { id: 'en', label: 'English', locale: 'en-US' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
];

const pt = {
  'app.subtitle': 'Quais relíquias abrir, upar ou vender — preços ao vivo do warframe.market',
  'app.loading': 'Carregando tabela de relíquias…',
  'app.loadError': 'Não consegui carregar os dados: {msg}',
  'app.saveError': 'Erro ao salvar: {msg}',
  'app.pricesError': 'Erro buscando preços no warframe.market: {msg}',
  'app.closeHint': '(clique pra fechar)',
  'app.language': 'Idioma',
  'tab.prints': 'Prints',
  'tab.inventory': 'Inventário',
  'tab.ranking': 'Ranking',
  'tab.traces': 'Void Traces',
  'footer.drops': 'Drops: tabela oficial via warframestat.us',
  'footer.prices': 'Preços: warframe.market (preço ideal = o que vendeu nas últimas 48h)',
  'footer.info': 'Info:',

  'settings.mode': 'Modo',
  'settings.solo': 'Solo',
  'settings.duo': 'Duo (mesma relíquia)',
  'settings.price': 'Preço',
  'settings.ideal': 'Preço ideal',
  'settings.idealTip':
    'Preço ideal pra anunciar: o que o item vendeu nas últimas 48h, ajustado por quem anuncia mais barato hoje',
  'settings.quick': 'Venda rápida',
  'settings.quickTip': 'Maior oferta de compra — vender na hora pra quem já está pedindo',
  'settings.traceTip': 'Quanto 1 Void Trace vale pra você. Upgrade só é recomendado se o ganho passar disso.',
  'settings.traceWorth': '1 trace vale',
  'settings.progress': 'Preços {done}/{total}',
  'settings.pricesAt': 'Preços de {time} ({ago})',
  'settings.pricesAtTip': 'Preços ao vivo do warframe.market, guardados por até 15 min',
  'settings.now': 'agora',
  'settings.minAgo': 'há {n} min',
  'settings.refresh': '↻ Atualizar preços',

  'prints.title': '1. Mande os prints das suas relíquias',
  'prints.help1':
    'Abra o inventário de relíquias no jogo, tire print (PrtSc ou F12 na Steam) e arraste aqui ou cole com',
  'prints.help2':
    'Pode mandar vários. A leitura é feita no seu PC, então confira a lista antes de salvar — os campos em laranja principalmente.',
  'prints.drop': 'Arraste os prints, clique pra escolher (pode selecionar vários) ou cole com Ctrl+V',
  'prints.pasted': 'print colado',
  'prints.wait': 'Na fila',
  'prints.run': 'Lendo… {pct}%',
  'prints.ok': '{n} relíquia(s)',
  'prints.fail': 'Falhou',
  'prints.checkTitle': '2. Confira o que foi lido',
  'prints.addManual': '+ Adicionar na mão',
  'prints.reading': 'Lendo os prints…',
  'prints.nothing': 'Nada lido ainda.',
  'prints.uncertainTip': 'Nome corrigido por aproximação — confira',
  'prints.qtyGuessTip': 'Não consegui ler a quantidade — confira',
  'prints.placeholder': 'ex: Axi A1',
  'prints.addToInv': 'Somar ao inventário',
  'prints.replaceInv': 'Substituir inventário',
  'prints.raw': 'Ver texto bruto da leitura',

  'col.relic': 'Relíquia',
  'col.refinement': 'Refinamento',
  'col.qty': 'Qtd',
  'col.readText': 'Texto lido',
  'col.item': 'Item',
  'col.rarity': 'Raridade',
  'col.chance': 'Chance {ref}',
  'col.ideal': 'Preço ideal',
  'col.quick': 'Venda rápida',
  'col.ducats': 'Ducats',
  'col.have': 'Tenho',
  'col.evIntact': 'EV Intact',
  'col.evRadiant': 'EV Radiant',
  'col.bestItem': 'Melhor item',
  'col.recommendation': 'Recomendação',
  'col.unitValue': 'Valor/un.',
  'col.total': 'Total',
  'col.gainUpgrading': 'Ganho upando',
  'col.bestDrop': 'Melhor drop',
  'col.sources': 'Sai de (suas relíquias)',
  'col.pAny': 'Chance de tirar',
  'col.tip': 'Dica',
  'col.upgrade': 'Upgrade',
  'col.copies': 'Cópias',
  'col.traces': 'Traces',
  'col.gain': 'Ganho',
  'col.per100': 'p / 100 traces',
  'common.remove': 'Remover',

  'inv.title': 'Seu inventário',
  'inv.clearAll': 'Limpar tudo',
  'inv.clearConfirm': 'Apagar todo o inventário salvo?',
  'inv.saved': 'Salvo automaticamente no seu computador.',
  'inv.farmable': 'farmável',
  'inv.placeholder': 'Relíquia (ex: Neo S5)',
  'inv.add': 'Adicionar',
  'inv.empty': 'Inventário vazio. Mande prints na aba “Prints” ou adicione acima.',

  'rarity.rare': 'Rara',
  'rarity.uncommon': 'Incomum',
  'rarity.common': 'Comum',
  'action.sellTip': 'A relíquia inteira vende por mais do que o valor esperado de abrir',
  'action.sell': 'Vender a relíquia · ~{p} p',
  'action.upgrade': 'Upar p/ {ref} · +{gain} p',
  'action.perTrace': '({v} p/100 traces)',
  'action.open': 'Abrir {ref}',
  'reward.untradeable': '(não negociável)',
  'relic.wikiTip': 'Abrir na Warframe Wiki',
  'badge.vaulted': 'Vaulted',
  'badge.farmable': 'Farmável',

  'view.items': 'Itens que valem vender',
  'view.mine': 'Minhas relíquias',
  'view.farm': 'Melhores pra farmar agora',
  'mine.empty': 'Nenhuma relíquia no inventário ainda.',
  'mine.sendPrints': 'Mandar prints',
  'stat.invValue': 'Valor estimado do inventário',
  'stat.analyzed': 'Relíquias analisadas',
  'stat.toUpgrade': 'Pra upar',
  'stat.toSell': 'Pra vender inteira',
  'mine.fetching': 'Buscando preços de {n} relíquia(s)…',
  'mine.noPrice': '{n} relíquia(s) sem preço ainda.',
  'mine.relicMarket': 'Relíquia {ref} no mercado: ~{p} p',
  'mine.evNote':
    'EV = platina esperada por abertura ({mode}). Valor/un. já desconta os traces pelo valor que você configurou. Clique numa linha pra ver os drops.',
  'mode.duo': 'duo: melhor de 2 drops da mesma relíquia',
  'mode.solo': 'solo',

  'farm.title': 'Relíquias que dropam hoje (não-vaulted)',
  'farm.desc':
    '{n} relíquias farmáveis. Ordenadas pelo valor esperado em Radiant — as do topo são as que mais valem a pena farmar e abrir.',
  'farm.fetching': 'Buscando…',
  'farm.fetch': 'Buscar preços ({n} relíquias)',
  'farm.hint':
    'Clique em “Buscar preços”. A primeira vez demora uns minutos (o warframe.market limita 3 pedidos por segundo); depois fica guardado.',

  'items.title': 'Itens das suas relíquias que valem vender',
  'items.desc':
    'Todas as peças que podem sair das relíquias que você tem, da mais cara pra mais barata. “Chance de tirar” = chance de sair pelo menos uma abrindo todas as relíquias que você tem.',
  'items.onlyGood': 'Só as de {n}p ou mais',
  'items.loading': 'Carregando preço de {n} item(ns)…',
  'items.emptyInv': 'Adicione relíquias no inventário primeiro.',
  'items.chanceTip': '{relic} {ref} — {pct}% por abertura',
  'items.note':
    '“Preço ideal” = o preço pelo qual o item realmente vendeu nas últimas 48h, acompanhando quem anuncia mais barato hoje (menos quem está torrando 30% abaixo). “Venda rápida” = maior oferta de compra (vende na hora).',
  'tip.noOrders': 'Sem anúncios',
  'tip.sell': 'Vender no market',
  'tip.ducats': 'Trocar por ducats',
  'tip.low': 'Valor baixo',
  'market.open': 'Abrir no warframe.market',

  'ideal.basedOn': 'Baseado no que o item vendeu nas últimas 48h (ou 7 dias)',
  'ideal.noHistory': 'Sem histórico de vendas: preço dos anúncios atuais',
  'ideal.cheapest': 'Anúncio mais barato agora: {p} p',
  'sales.none': 'quase não vende',
  'sales.week': 'vende ~{n} por semana',
  'sales.day': 'vende ~{n} por dia',

  'traces.title': 'Onde gastar seus Void Traces',
  'traces.desc':
    'Diz quais relíquias upar com os traces que você tem pra ganhar o máximo de platina no total (modo {mode}). Custos: Exceptional 25, Flawless 50, Radiant 100.',
  'traces.modeDuo': 'duo com a mesma relíquia',
  'traces.have': 'Tenho',
  'traces.none': 'Nenhum upgrade vale a pena com esse orçamento (ou os preços ainda estão carregando).',
  'stat.gain': 'Ganho esperado',
  'stat.used': 'Traces usados',
  'stat.per100': 'Plat por 100 traces',
};

export type Key = keyof typeof pt;
type Dict = Record<Key, string>;

const en: Dict = {
  'app.subtitle': 'Which relics to open, refine or sell — live prices from warframe.market',
  'app.loading': 'Loading relic tables…',
  'app.loadError': "Couldn't load data: {msg}",
  'app.saveError': 'Error saving: {msg}',
  'app.pricesError': 'Error fetching prices from warframe.market: {msg}',
  'app.closeHint': '(click to close)',
  'app.language': 'Language',
  'tab.prints': 'Screenshots',
  'tab.inventory': 'Inventory',
  'tab.ranking': 'Ranking',
  'tab.traces': 'Void Traces',
  'footer.drops': 'Drops: official tables via warframestat.us',
  'footer.prices': 'Prices: warframe.market (ideal price = what sold in the last 48h)',
  'footer.info': 'Info:',

  'settings.mode': 'Mode',
  'settings.solo': 'Solo',
  'settings.duo': 'Duo (same relic)',
  'settings.price': 'Price',
  'settings.ideal': 'Ideal price',
  'settings.idealTip':
    "Ideal listing price: what the item sold for in the last 48h, adjusted to today's cheapest listing",
  'settings.quick': 'Quick sale',
  'settings.quickTip': 'Highest buy order — sell right now to someone already asking',
  'settings.traceTip': 'How much 1 Void Trace is worth to you. Refining is only suggested if the gain beats that.',
  'settings.traceWorth': '1 trace is worth',
  'settings.progress': 'Prices {done}/{total}',
  'settings.pricesAt': 'Prices from {time} ({ago})',
  'settings.pricesAtTip': 'Live prices from warframe.market, kept for up to 15 min',
  'settings.now': 'just now',
  'settings.minAgo': '{n} min ago',
  'settings.refresh': '↻ Refresh prices',

  'prints.title': '1. Send screenshots of your relics',
  'prints.help1':
    'Open your relic inventory in game, take a screenshot (PrtSc or F12 on Steam) and drop it here or paste with',
  'prints.help2':
    'You can send several. Reading happens on your PC, so check the list before saving — especially the orange fields.',
  'prints.drop': 'Drop screenshots here, click to choose (multiple allowed) or paste with Ctrl+V',
  'prints.pasted': 'pasted screenshot',
  'prints.wait': 'Queued',
  'prints.run': 'Reading… {pct}%',
  'prints.ok': '{n} relic(s)',
  'prints.fail': 'Failed',
  'prints.checkTitle': '2. Check what was read',
  'prints.addManual': '+ Add manually',
  'prints.reading': 'Reading screenshots…',
  'prints.nothing': 'Nothing read yet.',
  'prints.uncertainTip': 'Name corrected by best guess — please check',
  'prints.qtyGuessTip': "Couldn't read the quantity — please check",
  'prints.placeholder': 'e.g. Axi A1',
  'prints.addToInv': 'Add to inventory',
  'prints.replaceInv': 'Replace inventory',
  'prints.raw': 'Show raw text read',

  'col.relic': 'Relic',
  'col.refinement': 'Refinement',
  'col.qty': 'Qty',
  'col.readText': 'Text read',
  'col.item': 'Item',
  'col.rarity': 'Rarity',
  'col.chance': '{ref} chance',
  'col.ideal': 'Ideal price',
  'col.quick': 'Quick sale',
  'col.ducats': 'Ducats',
  'col.have': 'Owned',
  'col.evIntact': 'EV Intact',
  'col.evRadiant': 'EV Radiant',
  'col.bestItem': 'Best item',
  'col.recommendation': 'Recommendation',
  'col.unitValue': 'Value/ea',
  'col.total': 'Total',
  'col.gainUpgrading': 'Refining gain',
  'col.bestDrop': 'Best drop',
  'col.sources': 'Drops from (your relics)',
  'col.pAny': 'Chance to get',
  'col.tip': 'Tip',
  'col.upgrade': 'Refine',
  'col.copies': 'Copies',
  'col.traces': 'Traces',
  'col.gain': 'Gain',
  'col.per100': 'p / 100 traces',
  'common.remove': 'Remove',

  'inv.title': 'Your inventory',
  'inv.clearAll': 'Clear all',
  'inv.clearConfirm': 'Delete the whole saved inventory?',
  'inv.saved': 'Saved automatically on your computer.',
  'inv.farmable': 'farmable',
  'inv.placeholder': 'Relic (e.g. Neo S5)',
  'inv.add': 'Add',
  'inv.empty': 'Inventory is empty. Send screenshots in the “Screenshots” tab or add above.',

  'rarity.rare': 'Rare',
  'rarity.uncommon': 'Uncommon',
  'rarity.common': 'Common',
  'action.sellTip': 'The whole relic sells for more than the expected value of opening it',
  'action.sell': 'Sell the relic · ~{p} p',
  'action.upgrade': 'Refine to {ref} · +{gain} p',
  'action.perTrace': '({v} p/100 traces)',
  'action.open': 'Open {ref}',
  'reward.untradeable': '(untradeable)',
  'relic.wikiTip': 'Open on the Warframe Wiki',
  'badge.vaulted': 'Vaulted',
  'badge.farmable': 'Farmable',

  'view.items': 'Items worth selling',
  'view.mine': 'My relics',
  'view.farm': 'Best to farm now',
  'mine.empty': 'No relics in your inventory yet.',
  'mine.sendPrints': 'Send screenshots',
  'stat.invValue': 'Estimated inventory value',
  'stat.analyzed': 'Relics analyzed',
  'stat.toUpgrade': 'To refine',
  'stat.toSell': 'To sell whole',
  'mine.fetching': 'Fetching prices for {n} relic(s)…',
  'mine.noPrice': '{n} relic(s) without prices yet.',
  'mine.relicMarket': '{ref} relic on the market: ~{p} p',
  'mine.evNote':
    'EV = expected platinum per opening ({mode}). Value/ea already subtracts traces at the value you set. Click a row to see the drops.',
  'mode.duo': 'duo: best of 2 drops from the same relic',
  'mode.solo': 'solo',

  'farm.title': 'Relics dropping today (unvaulted)',
  'farm.desc':
    '{n} farmable relics. Sorted by expected value at Radiant — the ones at the top are the most worth farming and opening.',
  'farm.fetching': 'Fetching…',
  'farm.fetch': 'Fetch prices ({n} relics)',
  'farm.hint':
    'Click “Fetch prices”. The first time takes a few minutes (warframe.market allows 3 requests per second); after that it is cached.',

  'items.title': 'Items from your relics worth selling',
  'items.desc':
    'Every part that can drop from the relics you own, from most to least valuable. “Chance to get” = chance of getting at least one by opening all the relics you own.',
  'items.onlyGood': 'Only {n}p or more',
  'items.loading': 'Loading prices for {n} item(s)…',
  'items.emptyInv': 'Add relics to your inventory first.',
  'items.chanceTip': '{relic} {ref} — {pct}% per opening',
  'items.note':
    '“Ideal price” = what the item actually sold for in the last 48h, following today’s cheapest listing (ignoring dumps more than 30% below). “Quick sale” = highest buy order (sells right away).',
  'tip.noOrders': 'No listings',
  'tip.sell': 'Sell on market',
  'tip.ducats': 'Trade for ducats',
  'tip.low': 'Low value',
  'market.open': 'Open on warframe.market',

  'ideal.basedOn': 'Based on what the item sold for in the last 48h (or 7 days)',
  'ideal.noHistory': 'No sales history: current listing price',
  'ideal.cheapest': 'Cheapest listing now: {p} p',
  'sales.none': 'barely sells',
  'sales.week': 'sells ~{n} per week',
  'sales.day': 'sells ~{n} per day',

  'traces.title': 'Where to spend your Void Traces',
  'traces.desc':
    'Shows which relics to refine with the traces you have to get the most platinum overall ({mode} mode). Costs: Exceptional 25, Flawless 50, Radiant 100.',
  'traces.modeDuo': 'duo with the same relic',
  'traces.have': 'I have',
  'traces.none': 'No refinement is worth it with this budget (or prices are still loading).',
  'stat.gain': 'Expected gain',
  'stat.used': 'Traces used',
  'stat.per100': 'Plat per 100 traces',
};

const es: Dict = {
  'app.subtitle': 'Qué reliquias abrir, refinar o vender — precios en vivo de warframe.market',
  'app.loading': 'Cargando tablas de reliquias…',
  'app.loadError': 'No se pudieron cargar los datos: {msg}',
  'app.saveError': 'Error al guardar: {msg}',
  'app.pricesError': 'Error al obtener precios de warframe.market: {msg}',
  'app.closeHint': '(clic para cerrar)',
  'app.language': 'Idioma',
  'tab.prints': 'Capturas',
  'tab.inventory': 'Inventario',
  'tab.ranking': 'Ranking',
  'tab.traces': 'Void Traces',
  'footer.drops': 'Drops: tablas oficiales vía warframestat.us',
  'footer.prices': 'Precios: warframe.market (precio ideal = lo que se vendió en las últimas 48h)',
  'footer.info': 'Info:',

  'settings.mode': 'Modo',
  'settings.solo': 'Solo',
  'settings.duo': 'Dúo (misma reliquia)',
  'settings.price': 'Precio',
  'settings.ideal': 'Precio ideal',
  'settings.idealTip':
    'Precio ideal para publicar: lo que se vendió el ítem en las últimas 48h, ajustado al anuncio más barato de hoy',
  'settings.quick': 'Venta rápida',
  'settings.quickTip': 'Mejor oferta de compra — vende ya a quien lo está pidiendo',
  'settings.traceTip': 'Cuánto vale para ti 1 Void Trace. Solo se sugiere refinar si la ganancia lo supera.',
  'settings.traceWorth': '1 trace vale',
  'settings.progress': 'Precios {done}/{total}',
  'settings.pricesAt': 'Precios de las {time} ({ago})',
  'settings.pricesAtTip': 'Precios en vivo de warframe.market, guardados hasta 15 min',
  'settings.now': 'ahora',
  'settings.minAgo': 'hace {n} min',
  'settings.refresh': '↻ Actualizar precios',

  'prints.title': '1. Envía capturas de tus reliquias',
  'prints.help1':
    'Abre tu inventario de reliquias en el juego, haz una captura (ImprPant o F12 en Steam) y arrástrala aquí o pégala con',
  'prints.help2':
    'Puedes enviar varias. La lectura se hace en tu PC, así que revisa la lista antes de guardar — sobre todo los campos en naranja.',
  'prints.drop': 'Arrastra las capturas, haz clic para elegir (puedes seleccionar varias) o pega con Ctrl+V',
  'prints.pasted': 'captura pegada',
  'prints.wait': 'En cola',
  'prints.run': 'Leyendo… {pct}%',
  'prints.ok': '{n} reliquia(s)',
  'prints.fail': 'Falló',
  'prints.checkTitle': '2. Revisa lo que se leyó',
  'prints.addManual': '+ Añadir a mano',
  'prints.reading': 'Leyendo capturas…',
  'prints.nothing': 'Nada leído todavía.',
  'prints.uncertainTip': 'Nombre corregido por aproximación — revísalo',
  'prints.qtyGuessTip': 'No se pudo leer la cantidad — revísala',
  'prints.placeholder': 'ej.: Axi A1',
  'prints.addToInv': 'Sumar al inventario',
  'prints.replaceInv': 'Reemplazar inventario',
  'prints.raw': 'Ver texto leído sin procesar',

  'col.relic': 'Reliquia',
  'col.refinement': 'Refinamiento',
  'col.qty': 'Cant.',
  'col.readText': 'Texto leído',
  'col.item': 'Ítem',
  'col.rarity': 'Rareza',
  'col.chance': 'Prob. {ref}',
  'col.ideal': 'Precio ideal',
  'col.quick': 'Venta rápida',
  'col.ducats': 'Ducats',
  'col.have': 'Tengo',
  'col.evIntact': 'EV Intact',
  'col.evRadiant': 'EV Radiant',
  'col.bestItem': 'Mejor ítem',
  'col.recommendation': 'Recomendación',
  'col.unitValue': 'Valor/u.',
  'col.total': 'Total',
  'col.gainUpgrading': 'Ganancia al refinar',
  'col.bestDrop': 'Mejor drop',
  'col.sources': 'Sale de (tus reliquias)',
  'col.pAny': 'Prob. de conseguir',
  'col.tip': 'Consejo',
  'col.upgrade': 'Refinar',
  'col.copies': 'Copias',
  'col.traces': 'Traces',
  'col.gain': 'Ganancia',
  'col.per100': 'p / 100 traces',
  'common.remove': 'Quitar',

  'inv.title': 'Tu inventario',
  'inv.clearAll': 'Borrar todo',
  'inv.clearConfirm': '¿Borrar todo el inventario guardado?',
  'inv.saved': 'Se guarda automáticamente en tu computadora.',
  'inv.farmable': 'farmeable',
  'inv.placeholder': 'Reliquia (ej.: Neo S5)',
  'inv.add': 'Añadir',
  'inv.empty': 'Inventario vacío. Envía capturas en la pestaña “Capturas” o añade arriba.',

  'rarity.rare': 'Rara',
  'rarity.uncommon': 'Poco común',
  'rarity.common': 'Común',
  'action.sellTip': 'La reliquia entera se vende por más que el valor esperado de abrirla',
  'action.sell': 'Vender la reliquia · ~{p} p',
  'action.upgrade': 'Refinar a {ref} · +{gain} p',
  'action.perTrace': '({v} p/100 traces)',
  'action.open': 'Abrir {ref}',
  'reward.untradeable': '(no comerciable)',
  'relic.wikiTip': 'Abrir en la Warframe Wiki',
  'badge.vaulted': 'Vaulted',
  'badge.farmable': 'Farmeable',

  'view.items': 'Ítems que vale la pena vender',
  'view.mine': 'Mis reliquias',
  'view.farm': 'Mejores para farmear ahora',
  'mine.empty': 'Todavía no hay reliquias en el inventario.',
  'mine.sendPrints': 'Enviar capturas',
  'stat.invValue': 'Valor estimado del inventario',
  'stat.analyzed': 'Reliquias analizadas',
  'stat.toUpgrade': 'Para refinar',
  'stat.toSell': 'Para vender enteras',
  'mine.fetching': 'Buscando precios de {n} reliquia(s)…',
  'mine.noPrice': '{n} reliquia(s) sin precio todavía.',
  'mine.relicMarket': 'Reliquia {ref} en el mercado: ~{p} p',
  'mine.evNote':
    'EV = platino esperado por apertura ({mode}). Valor/u. ya descuenta los traces al valor que configuraste. Haz clic en una fila para ver los drops.',
  'mode.duo': 'dúo: el mejor de 2 drops de la misma reliquia',
  'mode.solo': 'solo',

  'farm.title': 'Reliquias que caen hoy (no vaulted)',
  'farm.desc':
    '{n} reliquias farmeables. Ordenadas por valor esperado en Radiant — las de arriba son las que más vale la pena farmear y abrir.',
  'farm.fetching': 'Buscando…',
  'farm.fetch': 'Buscar precios ({n} reliquias)',
  'farm.hint':
    'Haz clic en “Buscar precios”. La primera vez tarda unos minutos (warframe.market permite 3 peticiones por segundo); después queda guardado.',

  'items.title': 'Ítems de tus reliquias que vale la pena vender',
  'items.desc':
    'Todas las piezas que pueden salir de tus reliquias, de la más cara a la más barata. “Prob. de conseguir” = probabilidad de sacar al menos una abriendo todas las reliquias que tienes.',
  'items.onlyGood': 'Solo de {n}p o más',
  'items.loading': 'Cargando precio de {n} ítem(s)…',
  'items.emptyInv': 'Primero añade reliquias al inventario.',
  'items.chanceTip': '{relic} {ref} — {pct}% por apertura',
  'items.note':
    '“Precio ideal” = el precio al que el ítem realmente se vendió en las últimas 48h, siguiendo el anuncio más barato de hoy (ignorando a quien malvende más de 30% abajo). “Venta rápida” = mejor oferta de compra (se vende al instante).',
  'tip.noOrders': 'Sin anuncios',
  'tip.sell': 'Vender en el market',
  'tip.ducats': 'Cambiar por ducats',
  'tip.low': 'Valor bajo',
  'market.open': 'Abrir en warframe.market',

  'ideal.basedOn': 'Basado en lo que se vendió el ítem en las últimas 48h (o 7 días)',
  'ideal.noHistory': 'Sin historial de ventas: precio de los anuncios actuales',
  'ideal.cheapest': 'Anuncio más barato ahora: {p} p',
  'sales.none': 'casi no se vende',
  'sales.week': 'se venden ~{n} por semana',
  'sales.day': 'se venden ~{n} por día',

  'traces.title': 'Dónde gastar tus Void Traces',
  'traces.desc':
    'Indica qué reliquias refinar con los traces que tienes para ganar el máximo de platino en total (modo {mode}). Costos: Exceptional 25, Flawless 50, Radiant 100.',
  'traces.modeDuo': 'dúo con la misma reliquia',
  'traces.have': 'Tengo',
  'traces.none': 'Ningún refinamiento vale la pena con este presupuesto (o los precios aún se están cargando).',
  'stat.gain': 'Ganancia esperada',
  'stat.used': 'Traces usados',
  'stat.per100': 'Plat por 100 traces',
};

const DICTS: Record<Lang, Dict> = { pt, en, es };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const text = DICTS[lang][key] ?? pt[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text;
}

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('lang');
    if (saved === 'pt' || saved === 'en' || saved === 'es') return saved;
  } catch {
    /* sem storage */
  }
  const nav = (navigator.language || 'pt').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return 'pt';
}

interface I18n {
  lang: Lang;
  locale: string;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const locale = LANGS.find((l) => l.id === lang)!.locale;
  setNumberLocale(locale); // antes de renderizar os filhos, pra números saírem no formato certo

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('lang', l);
    } catch {
      /* sem storage */
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({ lang, locale, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, locale, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n fora do I18nProvider');
  return ctx;
}
