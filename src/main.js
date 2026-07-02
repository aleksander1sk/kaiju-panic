// Kaiju Panic — v0.1.0: meta-progression (SCRAP, shop, unlocks, skins),
// STOMP/ROAR challenges, MEGA-COPTER boss, combo multiplier, records.
// One escalating run of shuffled reflex challenges: SMASH / DODGE / THROW (+unlocks).
// Buildings are stacks of Matter.js blocks that collapse when punched.
// All graphics procedural (no assets); sound is a WebAudio synth (no audio files).
// Portrait 480x800 like the rest of the pack.

const W = 480;
const H = 800;
const GROUND_Y = H - 160;

const COLORS = {
  skyTop: 0x0a0a1e,
  skyBottom: 0x252550,
  skylineFar: 0x161632,
  skylineNear: 0x1e1e40,
  ground: 0x14142e,
  building: [0x4a5a7a, 0x5a6a8a, 0x3a4a6a, 0x6a5a7a],
  blockOutline: 0x14142e,
  window: 0xffe08a,
  kaiju: 0x7cfc00,
  kaijuDark: 0x4caf00,
  kaijuBelly: 0xb8ff66,
  missile: 0xff5544,
  car: 0xffaa00,
  heli: 0x9a9ab8,
  dust: 0x8a8aa0,
  spark: 0xffaa00,
  timer: 0x7cfc00,
  text: '#ffffff',
  accent: '#7cfc00',
  danger: '#ff5544',
};

const BLOCK_W = 20;
const BLOCK_H = 18;
const BUILDING_COLS = 3;
const LANES = [120, 240, 360];

// Палітри кайдзю (скіни — просто інші кольори, все процедурне).
const SKINS = {
  classic: { kaiju: 0x7cfc00, dark: 0x4caf00, belly: 0xb8ff66 },
  magma:   { kaiju: 0xff6644, dark: 0xcc3311, belly: 0xffb499 },
  frost:   { kaiju: 0x66ccff, dark: 0x3388cc, belly: 0xcceeff },
  gold:    { kaiju: 0xffd744, dark: 0xcc9911, belly: 0xffefaa },
};
const CHALLENGES = ['smash', 'dodge', 'throw'];

// --- Збереження (localStorage + CrazyGames Data Module на їхньому білді) ---

const SAVE_KEY = 'kp-save-v1';
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const DEFAULT_SAVE = {
  best: 0, bestRound: 0, scrap: 0,
  unlocks: { stomp: false, roar: false, shield: false, heart: false },
  skin: 'classic', skins: { magma: false, frost: false, gold: false },
};
const save = { ...DEFAULT_SAVE, ...JSON.parse(storage.get(SAVE_KEY) || '{}') };
save.unlocks = { ...DEFAULT_SAVE.unlocks, ...save.unlocks };
save.skins = { ...DEFAULT_SAVE.skins, ...save.skins };
function mergeSave(raw) {
  const s = JSON.parse(raw);
  Object.assign(save, s);
  save.unlocks = { ...DEFAULT_SAVE.unlocks, ...s.unlocks };
  save.skins = { ...DEFAULT_SAVE.skins, ...s.skins };
}
function persistSave() {
  const json = JSON.stringify(save);
  storage.set(SAVE_KEY, json);
  // Data Module привʼязує збереження до акаунта гравця CrazyGames.
  try { if (portal.adapter === 'crazygames') window.CrazyGames.SDK.data.setItem(SAVE_KEY, json); } catch { /* необовʼязково */ }
}
window.save = save; // для E2E

// --- Локалізація ---
// Мова визначається з navigator.languages; en — дефолт і фолбек для відсутніх ключів.

const I18N = {
  en: {
    hintSmash: 'TAP buildings to SMASH them all!',
    hintDodge: 'TAP left / right to DODGE the rockets!',
    hintThrow: 'TAP to THROW the car at the copter!',
    nameSmash: 'SMASH!', nameDodge: 'DODGE!', nameThrow: 'THROW!',
    tooSlow: 'TOO SLOW!', flattened: 'FLATTENED!', survived: 'SURVIVED!',
    gotAway: 'IT GOT AWAY!', outOfCars: 'OUT OF CARS!', miss: 'MISS!',
    directHit: 'DIRECT HIT!', nice: 'NICE!', failed: 'FAILED!',
    round: 'ROUND', score: 'SCORE', kaijuDown: 'KAIJU DOWN',
    overStats: (s, r) => `SCORE ${s}  ·  ROUND ${r}`,
    tapAgain: 'TAP TO RAMPAGE AGAIN', btnContinue: '▶ CONTINUE (AD)',
    play: 'PLAY', best: 'BEST', scrap: 'SCRAP', owned: 'OWNED', equipped: 'EQUIPPED',
    stompName: 'CHALLENGE: STOMP', stompDesc: 'tanks roll in — stomp them all',
    roarName: 'CHALLENGE: ROAR', roarDesc: 'charge a roar, release in the zone',
    shieldName: 'SHIELD', shieldDesc: 'first mistake of a run is forgiven',
    heartName: '4TH HEART', heartDesc: 'one more heart every run',
    skinMagma: 'MAGMA SKIN', skinFrost: 'FROST SKIN', skinGold: 'GOLD SKIN',
    skinDesc: 'a fresh coat for your kaiju',
    hintStomp: 'TAP the tanks to STOMP them!',
    hintRoar: 'HOLD to charge, release in the green zone!',
    hintBoss: 'Dodge the volley, then THROW cars at it!',
    nameStomp: 'STOMP!', nameRoar: 'ROAR!',
    tanksThrough: 'TANKS GOT THROUGH!', overcharged: 'ROAR FIZZLED!', droned: 'DRONED!',
    stomped: 'CRUSHED!', blasted: 'BLASTED AWAY!',
    shieldSaved: 'SHIELD SAVED YOU!', shieldChip: 'SHIELD ●',
    combo: (n) => `COMBO ×${n}`, newBest: 'NEW BEST!', btnMenu: 'MENU',
    bossIncoming: 'MEGA-COPTER!', bossDown: 'BOSS DOWN!', bossEscaped: 'IT FLED!',
    scrapEarned: (n) => `+${n} SCRAP`,
  },
  uk: {
    hintSmash: 'ТАПАЙ по будівлях — РОЗТРОЩИ всі!',
    hintDodge: 'ТАПАЙ вліво/вправо — УХИЛЯЙСЯ від ракет!',
    hintThrow: 'ТАПНИ, щоб КИНУТИ авто у вертоліт!',
    nameSmash: 'ТРОЩИ!', nameDodge: 'УХИЛЯЙСЯ!', nameThrow: 'КИДАЙ!',
    tooSlow: 'ЗАПОВІЛЬНО!', flattened: 'ЗРІВНЯНО!', survived: 'ВИЖИВ!',
    gotAway: 'ВТІК!', outOfCars: 'АВТО СКІНЧИЛИСЬ!', miss: 'ПОВЗ!',
    directHit: 'ПРЯМЕ ВЛУЧАННЯ!', nice: 'КЛАС!', failed: 'ПРОВАЛ!',
    round: 'РАУНД', score: 'РАХУНОК', kaijuDown: 'КАЙДЗЮ ПОВАЛЕНО',
    overStats: (s, r) => `РАХУНОК ${s}  ·  РАУНД ${r}`,
    tapAgain: 'ТАПНИ ДЛЯ НОВОГО ПОГРОМУ', btnContinue: '▶ ПРОДОВЖИТИ (РЕКЛАМА)',
    play: 'ГРАТИ', best: 'РЕКОРД', scrap: 'БРУХТ', owned: 'КУПЛЕНО', equipped: 'ОДЯГНЕНО',
    stompName: 'ВИКЛИК: РОЗЧАВ', stompDesc: 'повзуть танки — розчави всі',
    roarName: 'ВИКЛИК: РЕВ', roarDesc: 'заряди рев і відпусти в зоні',
    shieldName: 'ЩИТ', shieldDesc: 'перша помилка забігу прощається',
    heartName: '4-ТЕ СЕРЦЕ', heartDesc: 'на одне серце більше щозабігу',
    skinMagma: 'СКІН МАГМА', skinFrost: 'СКІН МОРОЗ', skinGold: 'СКІН ЗОЛОТО',
    skinDesc: 'свіже забарвлення кайдзю',
    hintStomp: 'ТАПАЙ по танках — РОЗЧАВИ їх!',
    hintRoar: 'ЗАТИСНИ і відпусти в зеленій зоні!',
    hintBoss: 'Ухилися від залпу і КИДАЙ авто!',
    nameStomp: 'ЧАВИ!', nameRoar: 'РЕВИ!',
    tanksThrough: 'ТАНКИ ПРОРВАЛИСЬ!', overcharged: 'РЕВ ЗІРВАВСЯ!', droned: 'ДРОНИ ДІСТАЛИ!',
    stomped: 'РОЗЧАВЛЕНО!', blasted: 'ЗДУТО!',
    shieldSaved: 'ЩИТ ВРЯТУВАВ!', shieldChip: 'ЩИТ ●',
    combo: (n) => `КОМБО ×${n}`, newBest: 'НОВИЙ РЕКОРД!', btnMenu: 'МЕНЮ',
    bossIncoming: 'МЕГА-ВЕРТОЛІТ!', bossDown: 'БОСА ПОВАЛЕНО!', bossEscaped: 'ВІН УТІК!',
    scrapEarned: (n) => `+${n} БРУХТУ`,
  },
  es: {
    hintSmash: '¡TOCA los edificios y DESTRÚYELOS todos!',
    hintDodge: '¡TOCA izquierda/derecha para ESQUIVAR cohetes!',
    hintThrow: '¡TOCA para LANZAR el coche al helicóptero!',
    nameSmash: '¡APLASTA!', nameDodge: '¡ESQUIVA!', nameThrow: '¡LANZA!',
    tooSlow: '¡MUY LENTO!', flattened: '¡ARRASADO!', survived: '¡SOBREVIVISTE!',
    gotAway: '¡SE ESCAPÓ!', outOfCars: '¡SIN COCHES!', miss: '¡FALLO!',
    directHit: '¡IMPACTO DIRECTO!', nice: '¡BIEN!', failed: '¡FALLASTE!',
    round: 'RONDA', score: 'PUNTOS', kaijuDown: 'KAIJU DERRIBADO',
    overStats: (s, r) => `PUNTOS ${s}  ·  RONDA ${r}`,
    tapAgain: 'TOCA PARA ARRASAR DE NUEVO', btnContinue: '▶ CONTINUAR (ANUNCIO)',
    play: 'JUGAR', best: 'RÉCORD', scrap: 'CHATARRA', owned: 'COMPRADO', equipped: 'EQUIPADO',
    stompName: 'DESAFÍO: PISOTÓN', stompDesc: 'llegan tanques — aplástalos todos',
    roarName: 'DESAFÍO: RUGIDO', roarDesc: 'carga el rugido y suelta en la zona',
    shieldName: 'ESCUDO', shieldDesc: 'se perdona el primer error',
    heartName: '4º CORAZÓN', heartDesc: 'un corazón más por partida',
    skinMagma: 'SKIN MAGMA', skinFrost: 'SKIN HIELO', skinGold: 'SKIN ORO',
    skinDesc: 'pintura nueva para tu kaiju',
    hintStomp: '¡TOCA los tanques y APLÁSTALOS!',
    hintRoar: '¡MANTÉN y suelta en la zona verde!',
    hintBoss: '¡Esquiva la ráfaga y LANZA coches!',
    nameStomp: '¡PISA!', nameRoar: '¡RUGE!',
    tanksThrough: '¡PASARON LOS TANQUES!', overcharged: '¡RUGIDO FALLIDO!', droned: '¡TE ALCANZARON!',
    stomped: '¡APLASTADOS!', blasted: '¡BARRIDOS!',
    shieldSaved: '¡EL ESCUDO TE SALVÓ!', shieldChip: 'ESCUDO ●',
    combo: (n) => `COMBO ×${n}`, newBest: '¡NUEVO RÉCORD!', btnMenu: 'MENÚ',
    bossIncoming: '¡MEGA-HELI!', bossDown: '¡JEFE DERRIBADO!', bossEscaped: '¡HUYÓ!',
    scrapEarned: (n) => `+${n} CHATARRA`,
  },
  pt: {
    hintSmash: 'TOQUE nos prédios e ESMAGUE todos!',
    hintDodge: 'TOQUE esquerda/direita para DESVIAR dos foguetes!',
    hintThrow: 'TOQUE para ARREMESSAR o carro no helicóptero!',
    nameSmash: 'ESMAGUE!', nameDodge: 'DESVIE!', nameThrow: 'ARREMESSE!',
    tooSlow: 'MUITO LENTO!', flattened: 'ARRASADO!', survived: 'SOBREVIVEU!',
    gotAway: 'ESCAPOU!', outOfCars: 'SEM CARROS!', miss: 'ERROU!',
    directHit: 'ACERTO DIRETO!', nice: 'BOA!', failed: 'FALHOU!',
    round: 'RODADA', score: 'PONTOS', kaijuDown: 'KAIJU CAIU',
    overStats: (s, r) => `PONTOS ${s}  ·  RODADA ${r}`,
    tapAgain: 'TOQUE PARA DESTRUIR DE NOVO', btnContinue: '▶ CONTINUAR (ANÚNCIO)',
    play: 'JOGAR', best: 'RECORDE', scrap: 'SUCATA', owned: 'COMPRADO', equipped: 'EQUIPADO',
    stompName: 'DESAFIO: PISÃO', stompDesc: 'tanques chegando — esmague todos',
    roarName: 'DESAFIO: RUGIDO', roarDesc: 'carregue o rugido e solte na zona',
    shieldName: 'ESCUDO', shieldDesc: 'o primeiro erro é perdoado',
    heartName: '4º CORAÇÃO', heartDesc: 'um coração a mais por corrida',
    skinMagma: 'SKIN MAGMA', skinFrost: 'SKIN GELO', skinGold: 'SKIN OURO',
    skinDesc: 'pintura nova para seu kaiju',
    hintStomp: 'TOQUE nos tanques e PISE neles!',
    hintRoar: 'SEGURE e solte na zona verde!',
    hintBoss: 'Desvie da rajada e ARREMESSE carros!',
    nameStomp: 'PISE!', nameRoar: 'RUJA!',
    tanksThrough: 'OS TANQUES PASSARAM!', overcharged: 'RUGIDO FALHOU!', droned: 'DRONES TE PEGARAM!',
    stomped: 'ESMAGADOS!', blasted: 'VARRIDOS!',
    shieldSaved: 'O ESCUDO TE SALVOU!', shieldChip: 'ESCUDO ●',
    combo: (n) => `COMBO ×${n}`, newBest: 'NOVO RECORDE!', btnMenu: 'MENU',
    bossIncoming: 'MEGA-HELI!', bossDown: 'CHEFE DERRUBADO!', bossEscaped: 'ELE FUGIU!',
    scrapEarned: (n) => `+${n} SUCATA`,
  },
  de: {
    hintSmash: 'TIPP auf Gebäude — ZERSCHMETTERE alle!',
    hintDodge: 'TIPP links/rechts — WEICH den Raketen aus!',
    hintThrow: 'TIPP, um das Auto auf den Heli zu WERFEN!',
    nameSmash: 'ZERSCHMETTERN!', nameDodge: 'AUSWEICHEN!', nameThrow: 'WERFEN!',
    tooSlow: 'ZU LANGSAM!', flattened: 'PLATTGEMACHT!', survived: 'ÜBERLEBT!',
    gotAway: 'ENTKOMMEN!', outOfCars: 'KEINE AUTOS MEHR!', miss: 'DANEBEN!',
    directHit: 'VOLLTREFFER!', nice: 'STARK!', failed: 'VERSAGT!',
    round: 'RUNDE', score: 'PUNKTE', kaijuDown: 'KAIJU BESIEGT',
    overStats: (s, r) => `PUNKTE ${s}  ·  RUNDE ${r}`,
    tapAgain: 'TIPP FÜR NEUE RANDALE', btnContinue: '▶ WEITER (WERBUNG)',
    play: 'SPIELEN', best: 'REKORD', scrap: 'SCHROTT', owned: 'GEKAUFT', equipped: 'ANGELEGT',
    stompName: 'PRÜFUNG: STAMPFEN', stompDesc: 'Panzer rollen an — zerstampfe alle',
    roarName: 'PRÜFUNG: BRÜLLEN', roarDesc: 'Brüller aufladen, in der Zone loslassen',
    shieldName: 'SCHILD', shieldDesc: 'der erste Fehler wird verziehen',
    heartName: '4. HERZ', heartDesc: 'ein Herz mehr pro Lauf',
    skinMagma: 'MAGMA-SKIN', skinFrost: 'FROST-SKIN', skinGold: 'GOLD-SKIN',
    skinDesc: 'neuer Anstrich für deinen Kaiju',
    hintStomp: 'TIPP auf Panzer — ZERSTAMPFE sie!',
    hintRoar: 'HALTEN und in der grünen Zone loslassen!',
    hintBoss: 'Weich der Salve aus, dann Autos WERFEN!',
    nameStomp: 'STAMPF!', nameRoar: 'BRÜLL!',
    tanksThrough: 'PANZER DURCHGEBROCHEN!', overcharged: 'BRÜLLER VERPUFFT!', droned: 'DROHNEN ERWISCHT!',
    stomped: 'ZERSTAMPFT!', blasted: 'WEGGEFEGT!',
    shieldSaved: 'SCHILD HAT DICH GERETTET!', shieldChip: 'SCHILD ●',
    combo: (n) => `COMBO ×${n}`, newBest: 'NEUER REKORD!', btnMenu: 'MENÜ',
    bossIncoming: 'MEGA-HELI!', bossDown: 'BOSS BESIEGT!', bossEscaped: 'ER IST WEG!',
    scrapEarned: (n) => `+${n} SCHROTT`,
  },
  fr: {
    hintSmash: 'TAPE les immeubles — DÉMOLIS-les tous !',
    hintDodge: 'TAPE gauche/droite pour ESQUIVER les roquettes !',
    hintThrow: "TAPE pour LANCER la voiture sur l'hélico !",
    nameSmash: 'DÉMOLIS !', nameDodge: 'ESQUIVE !', nameThrow: 'LANCE !',
    tooSlow: 'TROP LENT !', flattened: 'RASÉ !', survived: 'SURVÉCU !',
    gotAway: "IL S'EST ENFUI !", outOfCars: 'PLUS DE VOITURES !', miss: 'RATÉ !',
    directHit: 'COUP DIRECT !', nice: 'BIEN !', failed: 'ÉCHEC !',
    round: 'MANCHE', score: 'SCORE', kaijuDown: 'KAIJU À TERRE',
    overStats: (s, r) => `SCORE ${s}  ·  MANCHE ${r}`,
    tapAgain: 'TAPE POUR TOUT RECASSER', btnContinue: '▶ CONTINUER (PUB)',
    play: 'JOUER', best: 'RECORD', scrap: 'FERRAILLE', owned: 'ACHETÉ', equipped: 'ÉQUIPÉ',
    stompName: 'DÉFI : PIÉTINE', stompDesc: 'des tanks arrivent — écrase-les tous',
    roarName: 'DÉFI : RUGISSEMENT', roarDesc: 'charge le rugissement, relâche dans la zone',
    shieldName: 'BOUCLIER', shieldDesc: 'la première erreur est pardonnée',
    heartName: '4E CŒUR', heartDesc: 'un cœur de plus par run',
    skinMagma: 'SKIN MAGMA', skinFrost: 'SKIN GIVRE', skinGold: 'SKIN OR',
    skinDesc: 'nouvelle couleur pour ton kaiju',
    hintStomp: 'TAPE les tanks — ÉCRASE-les !',
    hintRoar: 'MAINTIENS et relâche dans la zone verte !',
    hintBoss: 'Esquive la salve puis LANCE des voitures !',
    nameStomp: 'ÉCRASE !', nameRoar: 'RUGIS !',
    tanksThrough: 'LES TANKS SONT PASSÉS !', overcharged: 'RUGISSEMENT RATÉ !', droned: "LES DRONES T'ONT EU !",
    stomped: 'ÉCRASÉS !', blasted: 'BALAYÉS !',
    shieldSaved: "LE BOUCLIER T'A SAUVÉ !", shieldChip: 'BOUCLIER ●',
    combo: (n) => `COMBO ×${n}`, newBest: 'NOUVEAU RECORD !', btnMenu: 'MENU',
    bossIncoming: 'MÉGA-HÉLICO !', bossDown: 'BOSS À TERRE !', bossEscaped: 'IL A FUI !',
    scrapEarned: (n) => `+${n} FERRAILLE`,
  },
  pl: {
    hintSmash: 'TAPNIJ w budynki — ZBURZ wszystkie!',
    hintDodge: 'TAPNIJ lewo/prawo — UNIKAJ rakiet!',
    hintThrow: 'TAPNIJ, by RZUCIĆ autem w helikopter!',
    nameSmash: 'BURZ!', nameDodge: 'UNIKAJ!', nameThrow: 'RZUCAJ!',
    tooSlow: 'ZA WOLNO!', flattened: 'ZRÓWNANE!', survived: 'PRZEŻYŁEŚ!',
    gotAway: 'UCIEKŁ!', outOfCars: 'BRAK AUT!', miss: 'PUDŁO!',
    directHit: 'TRAFIENIE!', nice: 'NIEŹLE!', failed: 'PORAŻKA!',
    round: 'RUNDA', score: 'WYNIK', kaijuDown: 'KAIJU POKONANY',
    overStats: (s, r) => `WYNIK ${s}  ·  RUNDA ${r}`,
    tapAgain: 'TAPNIJ, BY ZNÓW SZALEĆ', btnContinue: '▶ KONTYNUUJ (REKLAMA)',
    play: 'GRAJ', best: 'REKORD', scrap: 'ZŁOM', owned: 'KUPIONE', equipped: 'ZAŁOŻONE',
    stompName: 'WYZWANIE: DEPTANIE', stompDesc: 'nadjeżdżają czołgi — rozdepcz wszystkie',
    roarName: 'WYZWANIE: RYK', roarDesc: 'naładuj ryk i puść w strefie',
    shieldName: 'TARCZA', shieldDesc: 'pierwszy błąd jest wybaczany',
    heartName: '4. SERCE', heartDesc: 'jedno serce więcej na bieg',
    skinMagma: 'SKIN MAGMA', skinFrost: 'SKIN MRÓZ', skinGold: 'SKIN ZŁOTO',
    skinDesc: 'nowa barwa dla twojego kaiju',
    hintStomp: 'TAPNIJ w czołgi — ROZDEPCZ je!',
    hintRoar: 'PRZYTRZYMAJ i puść w zielonej strefie!',
    hintBoss: 'Unikaj salwy i RZUCAJ autami!',
    nameStomp: 'DEPCZ!', nameRoar: 'RYCZ!',
    tanksThrough: 'CZOŁGI SIĘ PRZEBIŁY!', overcharged: 'RYK SIĘ NIE UDAŁ!', droned: 'DRONY CIĘ DOPADŁY!',
    stomped: 'ROZDEPTANE!', blasted: 'ZDMUCHNIĘTE!',
    shieldSaved: 'TARCZA CIĘ URATOWAŁA!', shieldChip: 'TARCZA ●',
    combo: (n) => `KOMBO ×${n}`, newBest: 'NOWY REKORD!', btnMenu: 'MENU',
    bossIncoming: 'MEGA-HELIKOPTER!', bossDown: 'BOSS POKONANY!', bossEscaped: 'UCIEKŁ!',
    scrapEarned: (n) => `+${n} ZŁOMU`,
  },
  tr: {
    hintSmash: 'Binalara DOKUN — hepsini EZ!',
    hintDodge: 'Sola/sağa DOKUN — roketlerden KAÇ!',
    hintThrow: 'Arabayı helikoptere FIRLATMAK için dokun!',
    nameSmash: 'EZ!', nameDodge: 'KAÇ!', nameThrow: 'FIRLAT!',
    tooSlow: 'ÇOK YAVAŞ!', flattened: 'DÜMDÜZ!', survived: 'HAYATTA KALDIN!',
    gotAway: 'KAÇTI!', outOfCars: 'ARABA BİTTİ!', miss: 'ISKA!',
    directHit: 'TAM İSABET!', nice: 'GÜZEL!', failed: 'BAŞARISIZ!',
    round: 'TUR', score: 'SKOR', kaijuDown: 'KAIJU DEVRİLDİ',
    overStats: (s, r) => `SKOR ${s}  ·  TUR ${r}`,
    tapAgain: 'YENİDEN YIKMAK İÇİN DOKUN', btnContinue: '▶ DEVAM ET (REKLAM)',
    play: 'OYNA', best: 'REKOR', scrap: 'HURDA', owned: 'ALINDI', equipped: 'TAKILDI',
    stompName: 'GÖREV: EZME', stompDesc: 'tanklar geliyor — hepsini ez',
    roarName: 'GÖREV: KÜKREME', roarDesc: 'kükremeyi doldur, bölgede bırak',
    shieldName: 'KALKAN', shieldDesc: 'ilk hata affedilir',
    heartName: '4. KALP', heartDesc: 'her koşuda bir kalp fazla',
    skinMagma: 'MAGMA GÖRÜNÜM', skinFrost: 'BUZ GÖRÜNÜM', skinGold: 'ALTIN GÖRÜNÜM',
    skinDesc: 'kaiju için yeni boya',
    hintStomp: 'Tanklara DOKUN — hepsini EZ!',
    hintRoar: 'BASILI TUT, yeşil bölgede bırak!',
    hintBoss: 'Salvodan kaç, sonra araba FIRLAT!',
    nameStomp: 'EZ!', nameRoar: 'KÜKRE!',
    tanksThrough: 'TANKLAR GEÇTİ!', overcharged: 'KÜKREME BOŞA GİTTİ!', droned: 'DRONLAR YAKALADI!',
    stomped: 'EZİLDİ!', blasted: 'SAVRULDU!',
    shieldSaved: 'KALKAN SENİ KURTARDI!', shieldChip: 'KALKAN ●',
    combo: (n) => `KOMBO ×${n}`, newBest: 'YENİ REKOR!', btnMenu: 'MENÜ',
    bossIncoming: 'MEGA-HELİKOPTER!', bossDown: 'BOSS DEVRİLDİ!', bossEscaped: 'KAÇTI!',
    scrapEarned: (n) => `+${n} HURDA`,
  },
};

function detectLang() {
  const candidates = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || 'en'];
  for (const c of candidates) {
    const code = String(c).slice(0, 2).toLowerCase();
    if (I18N[code]) return code;
  }
  return 'en';
}

const LANG = detectLang();
const T = { ...I18N.en, ...I18N[LANG] };
window.i18n = { lang: LANG, T };

const HINTS = {
  smash: T.hintSmash, dodge: T.hintDodge, throw: T.hintThrow,
  stomp: T.hintStomp, roar: T.hintRoar, boss: T.hintBoss,
};
const NAMES = {
  smash: T.nameSmash, dodge: T.nameDodge, throw: T.nameThrow,
  stomp: T.nameStomp, roar: T.nameRoar, boss: T.bossIncoming,
};

// --- Процедурний звук (WebAudio, без аудіофайлів) ---
// Контекст створюється ліниво з першого інпуту — обходить autoplay-політику браузерів.

const sfx = {
  ctx: null,
  muted: false,
  ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone({ freq = 440, end = freq, type = 'square', dur = 0.1, vol = 0.15, when = 0 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  noise({ dur = 0.2, vol = 0.2, when = 0 }) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(gain).connect(ctx.destination);
    src.start(t);
  },
  press() { this.tone({ freq: 880, end: 660, dur: 0.05, vol: 0.05 }); },
  punch() {
    this.tone({ freq: 120, end: 38, type: 'square', dur: 0.14, vol: 0.2 });
    this.noise({ dur: 0.28, vol: 0.22 });
  },
  boom() {
    this.noise({ dur: 0.25, vol: 0.16 });
    this.tone({ freq: 180, end: 45, type: 'sawtooth', dur: 0.25, vol: 0.12 });
  },
  bigBoom() {
    this.noise({ dur: 0.5, vol: 0.3 });
    this.tone({ freq: 160, end: 28, type: 'sawtooth', dur: 0.5, vol: 0.24 });
    this.tone({ freq: 90, end: 22, type: 'square', dur: 0.4, vol: 0.18, when: 0.1 });
  },
  whoosh() { this.tone({ freq: 520, end: 140, type: 'triangle', dur: 0.13, vol: 0.07 }); },
  step() { this.tone({ freq: 95, end: 60, type: 'square', dur: 0.06, vol: 0.12 }); },
  hurt() {
    this.tone({ freq: 320, end: 80, type: 'sawtooth', dur: 0.3, vol: 0.18 });
    this.noise({ dur: 0.18, vol: 0.1 });
  },
  success() {
    this.tone({ freq: 520, end: 1040, dur: 0.12, vol: 0.12 });
    this.tone({ freq: 780, end: 1560, dur: 0.1, vol: 0.08, when: 0.06 });
  },
  fail() {
    this.tone({ freq: 300, end: 60, type: 'sawtooth', dur: 0.45, vol: 0.18 });
    this.noise({ dur: 0.3, vol: 0.12 });
  },
  over() {
    this.tone({ freq: 330, end: 220, dur: 0.2, vol: 0.15 });
    this.tone({ freq: 220, end: 147, dur: 0.2, vol: 0.15, when: 0.2 });
    this.tone({ freq: 147, end: 55, type: 'sawtooth', dur: 0.5, vol: 0.18, when: 0.4 });
  },
};
// Доступ ззовні — для тестів і mute через SDK порталів.
window.sfx = sfx;

// --- Інтеграція порталу (Poki / CrazyGames SDK з фолбеком-заглушкою) ---
// Вимога обох порталів: гра мусить повністю працювати і без SDK (adblock, локальний
// запуск). Тому всі виклики йдуть через цю обгортку. Який SDK підключати — вирішує
// index.html конкретного білда (poki-sdk.js або crazygames-sdk-v3.js), обгортка
// сама визначає, що є в window. portal.log — журнал подій для E2E-тестів.

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const portal = {
  adapter: 'none',
  log: [],
  mark(e) { this.log.push(e); },
  async init() {
    this.mark('init');
    if (window.CrazyGames && window.CrazyGames.SDK) {
      try {
        await withTimeout(window.CrazyGames.SDK.init(), 5000);
        this.adapter = 'crazygames';
        this.mark('initialized-crazygames');
        return;
      } catch {
        this.mark('init-failed');
        return;
      }
    }
    if (window.PokiSDK) {
      try {
        await withTimeout(PokiSDK.init(), 5000);
        this.adapter = 'poki';
        PokiSDK.gameLoadingFinished();
        this.mark('initialized');
      } catch {
        this.mark('init-failed');
      }
      return;
    }
    this.mark('no-sdk');
  },
  gameplayStart() {
    this.mark('gameplayStart');
    if (this.adapter === 'poki') PokiSDK.gameplayStart();
    if (this.adapter === 'crazygames') window.CrazyGames.SDK.game.gameplayStart();
  },
  gameplayStop() {
    this.mark('gameplayStop');
    if (this.adapter === 'poki') PokiSDK.gameplayStop();
    if (this.adapter === 'crazygames') window.CrazyGames.SDK.game.gameplayStop();
  },
  // CrazyGames v3: requestAd(type, callbacks). adError = no-fill або реклама недоступна
  // (напр. Basic Launch) — rewarded у цьому разі все одно дає нагороду: гравця не караємо
  // за відсутність реклами. Таймаути щедрі: реальна реклама йде 30-60с, це лише анти-завис.
  cgAd(type) {
    return new Promise((resolve) => {
      // Якщо реклама не почалась за 3с (немає філу / Basic Launch / localhost —
      // колбеки можуть взагалі не викликатись) — не тримаємо гравця.
      let started = false;
      const startGuard = setTimeout(() => {
        if (!started) resolve(type === 'rewarded');
      }, 3000);
      window.CrazyGames.SDK.ad.requestAd(type, {
        adStarted: () => { started = true; clearTimeout(startGuard); sfx.muted = true; },
        adFinished: () => { clearTimeout(startGuard); resolve(true); },
        adError: () => { clearTimeout(startGuard); resolve(type === 'rewarded'); },
      });
    });
  },
  async commercialBreak() {
    this.mark('commercialBreak');
    if (this.adapter === 'none') return;
    sfx.muted = true;
    try {
      if (this.adapter === 'poki') await withTimeout(PokiSDK.commercialBreak(() => {}), 90000);
      if (this.adapter === 'crazygames') await withTimeout(this.cgAd('midgame'), 90000, false);
    } catch { /* реклами може не бути — це ок */ }
    sfx.muted = false;
  },
  // true = нагороду отримано. Без SDK — завжди true, щоб continue працював у dev-режимі.
  async rewardedBreak() {
    this.mark('rewardedBreak');
    if (this.adapter === 'none') return true;
    sfx.muted = true;
    let ok = false;
    try {
      if (this.adapter === 'poki') ok = !!(await withTimeout(PokiSDK.rewardedBreak(() => {}), 90000, false));
      if (this.adapter === 'crazygames') ok = !!(await withTimeout(this.cgAd('rewarded'), 90000, false));
    } catch {
      ok = false;
    }
    sfx.muted = false;
    return ok;
  },
};
window.portal = portal;

// --- Спільний арт (використовують обидві сцени) ---

function drawSky(scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
  g.fillRect(0, 0, W, GROUND_Y);
  g.fillStyle(COLORS.ground, 1);
  g.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Stars: deterministic scatter so every boot looks the same.
  g.fillStyle(0xffffff, 1);
  for (let i = 0; i < 42; i++) {
    const x = (i * 173 + 37) % W;
    const y = ((i * 311 + 91) % (GROUND_Y - 260)) + 20;
    g.fillCircle(x, y, i % 5 === 0 ? 1.6 : 0.9);
  }

  // Moon with a bite of shadow.
  g.fillStyle(0xf0eedc, 1);
  g.fillCircle(398, 108, 30);
  g.fillStyle(COLORS.skyTop, 1);
  g.fillCircle(410, 98, 24);
}

function drawSkyline(scene) {
  const g = scene.add.graphics();
  // Far layer: taller, darker.
  g.fillStyle(COLORS.skylineFar, 1);
  for (let x = -10; x < W; x += 56) {
    const h = 110 + ((x * 6271) % 120);
    g.fillRect(x, GROUND_Y - h, 46, h);
  }
  // Near layer: shorter, lighter, with lit windows.
  g.fillStyle(COLORS.skylineNear, 1);
  for (let x = 14; x < W; x += 48) {
    const h = 55 + ((x * 7919) % 80);
    g.fillRect(x, GROUND_Y - h, 38, h);
  }
  g.fillStyle(COLORS.window, 0.25);
  for (let i = 0; i < 26; i++) {
    const x = (i * 137 + 30) % (W - 20);
    const y = GROUND_Y - 18 - ((i * 61) % 90);
    g.fillRect(x, y, 5, 7);
  }
}

// Малює кайдзю в заданій палітрі; очі кладе в scene.kaijuEyes (для blink).
function drawKaiju(scene, x, y, pal) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  // Tail curls out to the left.
  g.fillStyle(pal.dark, 1);
  g.fillTriangle(-40, 30, -90, 48, -42, 56);
  // Legs.
  g.fillRoundedRect(-38, 44, 30, 22, 8);
  g.fillRoundedRect(8, 44, 30, 22, 8);
  // Body: chunky cartoon silhouette.
  g.fillStyle(pal.kaiju, 1);
  g.fillRoundedRect(-45, -70, 90, 130, 18);
  g.fillTriangle(-45, -40, -70, -10, -45, 0);   // left arm
  g.fillTriangle(45, -40, 70, -10, 45, 0);      // right arm
  // Belly patch.
  g.fillStyle(pal.belly, 1);
  g.fillRoundedRect(-26, -18, 52, 66, 14);
  // Back spikes.
  g.fillStyle(pal.dark, 1);
  g.fillTriangle(-30, -70, -20, -96, -10, -70);
  g.fillTriangle(-8, -70, 2, -100, 12, -70);
  g.fillTriangle(14, -70, 24, -92, 34, -70);
  // Teeth.
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(-16, -24, -11, -16, -6, -24);
  g.fillTriangle(-2, -24, 3, -16, 8, -24);
  c.add(g);

  // Eyes as separate objects so they can blink.
  scene.kaijuEyes = [];
  for (const ex of [-18, 18]) {
    const white = scene.add.circle(ex, -45, 9, 0xffffff);
    const pupil = scene.add.circle(ex + 2, -44, 4, 0x101020);
    c.add(white);
    c.add(pupil);
    scene.kaijuEyes.push(white, pupil);
  }

  c.setDepth(5);
  return c;
}

// --- Меню: рекорди, скрап, магазин розблокувань і скінів ---

const SHOP_ITEMS = [
  { key: 'stomp', cost: 25, nameKey: 'stompName', descKey: 'stompDesc' },
  { key: 'shield', cost: 40, nameKey: 'shieldName', descKey: 'shieldDesc' },
  { key: 'roar', cost: 50, nameKey: 'roarName', descKey: 'roarDesc' },
  { key: 'heart', cost: 80, nameKey: 'heartName', descKey: 'heartDesc' },
  { key: 'magma', cost: 15, skin: true, nameKey: 'skinMagma', descKey: 'skinDesc' },
  { key: 'frost', cost: 20, skin: true, nameKey: 'skinFrost', descKey: 'skinDesc' },
  { key: 'gold', cost: 30, skin: true, nameKey: 'skinGold', descKey: 'skinDesc' },
];

class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    drawSky(this);
    drawSkyline(this);

    this.add.text(W / 2, 78, 'KAIJU', {
      fontFamily: 'Courier New', fontSize: '64px', fontStyle: 'bold', color: COLORS.accent,
    }).setOrigin(0.5);
    this.add.text(W / 2, 138, 'PANIC', {
      fontFamily: 'Courier New', fontSize: '64px', fontStyle: 'bold', color: COLORS.danger,
    }).setOrigin(0.5);

    this.bestText = this.add.text(W / 2, 192, '', {
      fontFamily: 'Courier New', fontSize: '18px', color: COLORS.text,
    }).setOrigin(0.5);
    this.scrapText = this.add.text(W / 2, 220, '', {
      fontFamily: 'Courier New', fontSize: '20px', fontStyle: 'bold', color: '#ffe08a',
    }).setOrigin(0.5);

    this.kaijuPreview = null;

    const play = this.add.text(W / 2, 434, `▶ ${T.play}`, {
      fontFamily: 'Courier New', fontSize: '26px', fontStyle: 'bold', color: '#101020',
      backgroundColor: COLORS.accent, padding: { x: 26, y: 10 },
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    play.on('pointerdown', () => {
      sfx.press();
      this.scene.start('game');
    });

    // Магазин: рядок = назва+ціна/стан і descr під ним; тап купує або одягає скін.
    this.rows = [];
    SHOP_ITEMS.forEach((item, i) => {
      const y = 496 + i * 40;
      const name = this.add.text(24, y, '', {
        fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold', color: COLORS.text,
      });
      const state = this.add.text(W - 24, y, '', {
        fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold', color: '#ffe08a',
      }).setOrigin(1, 0);
      const desc = this.add.text(24, y + 18, T[item.descKey], {
        fontFamily: 'Courier New', fontSize: '11px', color: '#8888aa',
      });
      const zone = this.add.zone(W / 2, y + 16, W - 32, 38).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.buy(item.key));
      this.rows.push({ item, name, state, desc });
    });

    this.time.addEvent({
      delay: Phaser.Math.Between(2200, 3600), loop: true,
      callback: () => {
        if (!this.kaijuEyes) return;
        this.tweens.add({ targets: this.kaijuEyes, scaleY: 0.08, duration: 70, yoyo: true, ease: 'Quad.easeIn' });
      },
    });

    this.refresh();
  }

  // Купівля або (для купленого скіна) одягання; повертає true якщо стан змінився.
  buy(key) {
    const item = SHOP_ITEMS.find((i) => i.key === key);
    if (!item) return false;
    const isOwned = item.skin ? save.skins[key] : save.unlocks[key];
    if (isOwned) {
      if (!item.skin) return false;
      // Тап по одягненому скіну повертає класику, по купленому — одягає.
      save.skin = save.skin === key ? 'classic' : key;
      persistSave();
      sfx.press();
      this.refresh();
      return true;
    }
    if (save.scrap < item.cost) {
      sfx.fail();
      return false;
    }
    save.scrap -= item.cost;
    if (item.skin) {
      save.skins[key] = true;
      save.skin = key;
    } else {
      save.unlocks[key] = true;
    }
    persistSave();
    sfx.success();
    this.refresh();
    return true;
  }

  refresh() {
    this.bestText.setText(`${T.best} ${save.best}  ·  ${T.round} ${save.bestRound}`);
    this.scrapText.setText(`${T.scrap} ${save.scrap}`);
    if (this.kaijuPreview) this.kaijuPreview.destroy();
    this.kaijuPreview = drawKaiju(this, W / 2, 330, SKINS[save.skin]);
    for (const row of this.rows) {
      row.name.setText(T[row.item.nameKey]);
      const owned = row.item.skin ? save.skins[row.item.key] : save.unlocks[row.item.key];
      let state;
      if (!owned) state = `${row.item.cost} ⚙`;
      else if (row.item.skin && save.skin === row.item.key) state = T.equipped;
      else state = T.owned;
      row.state.setText(state);
      row.state.setColor(owned ? COLORS.accent : '#ffe08a');
    }
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    this.score = 0;
    this.maxHp = save.unlocks.heart ? 4 : 3;
    this.hp = this.maxHp;
    this.round = 0;
    this.challenge = null;
    this.gameOver = false;
    this.usedContinue = false;
    this.overUi = [];
    this.runScrap = 0;
    this.streak = 0;
    this.shieldUp = save.unlocks.shield;

    // Пул викликів: база + розблоковані з магазину; цикл = перестановка пулу.
    this.pool = [...CHALLENGES];
    if (save.unlocks.stomp) this.pool.push('stomp');
    if (save.unlocks.roar) this.pool.push('roar');
    this.cycleOrder = [];
    this.completedCycles = 0;
    this.bossJustDone = false;
    this.boss = null;
    this.bossPips = null;
    this.bossPhase = null;
    this.bossHp = 0;

    drawSky(this);
    drawSkyline(this);
    this.makeParticleTexture();

    // Static ground the debris lands on; walls keep blocks on screen.
    this.matter.add.rectangle(W / 2, GROUND_Y + 30, W * 2, 60, { isStatic: true });
    this.matter.add.rectangle(-10, H / 2, 20, H * 2, { isStatic: true });
    this.matter.add.rectangle(W + 10, H / 2, 20, H * 2, { isStatic: true });

    this.kaiju = drawKaiju(this, W / 2, H - 90, SKINS[save.skin] || SKINS.classic);
    this.kaijuLane = 1;
    this.tweens.add({
      targets: this.kaiju, y: this.kaiju.y - 6, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.time.addEvent({
      delay: Phaser.Math.Between(2200, 3600), loop: true,
      callback: () => this.blink(),
    });

    this.buildings = [];
    this.dodgeMissiles = [];
    this.tanks = [];
    this.tanksToSpawn = 0;
    this.drones = [];
    this.roaring = false;
    this.roarT = 0;
    this.roarGfx = null;
    this.heli = null;
    this.projectile = null;
    this.aimGfx = this.add.graphics().setDepth(6);
    this.challengeTimer = null;
    this.challengeEvents = [];

    this.scoreText = this.add.text(16, 14, `${T.score} 0`, {
      fontFamily: 'Courier New', fontSize: '22px', color: COLORS.text, fontStyle: 'bold',
    }).setDepth(20);
    this.hpText = this.add.text(W - 16, 14, '♥'.repeat(this.hp), {
      fontFamily: 'Courier New', fontSize: '22px', color: COLORS.danger,
    }).setOrigin(1, 0).setDepth(20);
    this.comboText = this.add.text(16, 42, '', {
      fontFamily: 'Courier New', fontSize: '15px', fontStyle: 'bold', color: '#ffe08a',
    }).setDepth(20);
    this.shieldText = this.add.text(W - 16, 42, this.shieldUp ? T.shieldChip : '', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#66ccff',
    }).setOrigin(1, 0).setDepth(20);
    this.roundText = this.add.text(W / 2, 14, '', {
      fontFamily: 'Courier New', fontSize: '16px', color: COLORS.accent,
    }).setOrigin(0.5, 0).setDepth(20);
    this.timerBar = this.add.rectangle(W / 2, 48, 200, 8, COLORS.timer).setDepth(20).setVisible(false);
    this.hintText = this.add.text(W / 2, H - 20, '', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#8888aa',
    }).setOrigin(0.5, 1).setDepth(20);

    this.input.on('pointerdown', (p) => this.onTap(p));
    this.input.on('pointerup', () => this.releaseRoar());

    portal.gameplayStart();
    this.time.delayedCall(400, () => this.startNextChallenge());
  }

  get cycle() {
    return Math.floor((this.round - 1) / this.pool.length) + 1;
  }

  // ---------- background art ----------

  makeParticleTexture() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('p-dot', 8, 8);
    g.destroy();
  }

  dustBurst(x, y, count, tint) {
    const e = this.add.particles(x, y, 'p-dot', {
      speed: { min: 40, max: 150 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 500,
      gravityY: -40,
      tint: tint || COLORS.dust,
      emitting: false,
    }).setDepth(8);
    e.explode(count);
    this.time.delayedCall(700, () => e.destroy());
  }

  sparkBurst(x, y, count) {
    const e = this.add.particles(x, y, 'p-dot', {
      speed: { min: 80, max: 220 },
      scale: { start: 1, end: 0 },
      lifespan: 380,
      tint: [COLORS.spark, COLORS.missile, 0xffe08a],
      emitting: false,
    }).setDepth(8);
    e.explode(count);
    this.time.delayedCall(500, () => e.destroy());
  }

  // ---------- run structure ----------

  startNextChallenge() {
    if (this.gameOver) return;
    if (this.cycleOrder.length === 0) {
      // Межа циклу. Кожен 3-й завершений цикл — бос замість чергового виклику.
      if (this.round > 0 && !this.bossJustDone) {
        this.completedCycles += 1;
        if (this.completedCycles % 3 === 0) {
          this.bossJustDone = true;
          this.startBossRound();
          return;
        }
      }
      this.bossJustDone = false;
      // Перший цикл — канонічний порядок (онбордінг), далі — перемішування.
      this.cycleOrder = this.round === 0 ? [...this.pool] : Phaser.Utils.Array.Shuffle([...this.pool]);
    }
    this.round += 1;
    const type = this.cycleOrder.shift();
    this.challenge = type;
    this.roundText.setText(`${T.round} ${this.round}`);
    this.hintText.setText(HINTS[type]);
    this.showBanner(NAMES[type], COLORS.accent);

    if (type === 'smash') this.startSmash();
    else if (type === 'dodge') this.startDodge();
    else if (type === 'stomp') this.startStomp();
    else if (type === 'roar') this.startRoar();
    else this.startThrow();
  }

  endChallenge(success, label) {
    if (this.gameOver || !this.challenge) return;
    const type = this.challenge;
    this.challenge = null;
    if (this.challengeTimer) { this.challengeTimer.remove(); this.challengeTimer = null; }
    for (const ev of this.challengeEvents) ev.remove();
    this.challengeEvents = [];
    this.timerBar.setVisible(false);

    if (success) {
      sfx.success();
      this.streak += 1;
      this.updateComboChip();
      this.addScore(20 + this.cycle * 5);
      this.runScrap += 2;
      // Бонус за закритий цикл: останній виклик циклу лишає cycleOrder порожнім.
      if (this.cycleOrder.length === 0 && type !== 'boss') this.runScrap += 5;
      this.showBanner(label || T.nice, COLORS.accent);
    } else {
      sfx.fail();
      this.streak = 0;
      this.updateComboChip();
      this.showBanner(label || T.failed, COLORS.danger);
      this.loseHp();
      if (this.gameOver) return;
    }

    this.time.delayedCall(1100, () => {
      this.clearChallengeObjects();
      this.time.delayedCall(200, () => this.startNextChallenge());
    });
  }

  clearChallengeObjects() {
    for (const b of this.buildings) {
      if (b.zone.active) b.zone.destroy();
      for (const block of b.blocks) if (block.active) block.destroy();
    }
    this.buildings = [];
    for (const m of this.dodgeMissiles) if (m.active) m.destroy();
    this.dodgeMissiles = [];
    for (const t of this.tanks) if (t.active) t.destroy();
    this.tanks = [];
    this.tanksToSpawn = 0;
    for (const d of this.drones) if (d.active) d.destroy();
    this.drones = [];
    this.roaring = false;
    if (this.roarGfx) { this.roarGfx.destroy(); this.roarGfx = null; }
    if (this.heli) { this.heli.destroy(); this.heli = null; }
    if (this.boss) { this.boss.destroy(); this.boss = null; }
    if (this.bossPips) { this.bossPips.destroy(); this.bossPips = null; }
    this.bossPhase = null;
    if (this.projectile && this.projectile.active) this.projectile.destroy();
    this.projectile = null;
    this.aimGfx.clear();
    if (this.kaijuLane !== 1) this.moveKaiju(1);
  }

  onTap(p) {
    if (this.gameOver) return;
    const bossVolley = this.challenge === 'boss' && this.bossPhase === 'volley';
    const bossWindow = this.challenge === 'boss' && this.bossPhase === 'window';
    if (this.challenge === 'dodge' || bossVolley) {
      if (p.x < this.kaiju.x - 30 && this.kaijuLane > 0) this.moveKaiju(this.kaijuLane - 1);
      else if (p.x > this.kaiju.x + 30 && this.kaijuLane < LANES.length - 1) this.moveKaiju(this.kaijuLane + 1);
    } else if ((this.challenge === 'throw' && this.heli) || (bossWindow && this.boss)) {
      if (!this.projectile) this.throwCar();
    } else if (this.challenge === 'roar' && !this.roaring) {
      this.roaring = true;
      sfx.press();
    }
  }

  // Множник комбо: +10% за одиницю стріку бездоганних викликів, кап ×2.
  get comboMult() {
    return 1 + Math.min(1, this.streak * 0.1);
  }

  addScore(n) {
    this.score += Math.round(n * this.comboMult);
    this.scoreText.setText(`${T.score} ${this.score}`);
  }

  updateComboChip() {
    this.comboText.setText(this.streak > 0 ? T.combo(this.comboMult.toFixed(1)) : '');
  }

  loseHp() {
    // Щит: перша помилка забігу прощається (серце ціле, але стрік згорає).
    if (this.shieldUp) {
      this.shieldUp = false;
      this.shieldText.setText('');
      this.streak = 0;
      this.updateComboChip();
      this.showBanner(T.shieldSaved, '#66ccff');
      this.cameras.main.flash(150, 102, 204, 255);
      return;
    }
    sfx.hurt();
    this.streak = 0;
    this.updateComboChip();
    this.hp -= 1;
    this.hpText.setText('♥'.repeat(Math.max(0, this.hp)));
    this.cameras.main.shake(200, 0.015);
    this.cameras.main.flash(150, 255, 60, 60);
    if (this.hp <= 0) this.endRun();
  }

  showBanner(text, color) {
    const t = this.add.text(W / 2, 300, text, {
      fontFamily: 'Courier New', fontSize: '44px', fontStyle: 'bold',
      color: typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : (color || COLORS.text),
    }).setOrigin(0.5).setDepth(21).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, alpha: 0, y: 260, delay: 800, duration: 300,
      onComplete: () => t.destroy(),
    });
  }

  startChallengeClock(ms, onExpire) {
    this.challengeTimer = this.time.delayedCall(ms, onExpire);
    this.timerBar.setVisible(true);
  }

  // ---------- SMASH ----------

  startSmash() {
    const count = Math.min(LANES.length + 2, 2 + this.cycle);
    const slots = Phaser.Utils.Array.Shuffle([55, 145, 240, 335, 425]).slice(0, count);
    for (const x of slots) this.spawnBuilding(x);
    const timeLimit = Math.max(3000, 6000 - (this.cycle - 1) * 600);
    this.startChallengeClock(timeLimit, () => this.endChallenge(false, T.tooSlow));
  }

  spawnBuilding(x) {
    const rows = Phaser.Math.Between(5, 9);
    const color = Phaser.Utils.Array.GetRandom(COLORS.building);
    const blocks = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < BUILDING_COLS; col++) {
        const bx = x + (col - (BUILDING_COLS - 1) / 2) * BLOCK_W;
        const by = GROUND_Y - BLOCK_H / 2 - row * BLOCK_H;
        const isWindow = Math.random() < 0.35;
        const rect = this.add.rectangle(bx, by, BLOCK_W - 1, BLOCK_H - 1, isWindow ? COLORS.window : color);
        rect.setStrokeStyle(1, COLORS.blockOutline, 0.7);
        // Create dynamic first so Matter computes real mass, THEN freeze:
        // a body born with isStatic:true keeps mass=Infinity after setStatic(false)
        // (no saved original), which NaNs the collision solver on release.
        this.matter.add.gameObject(rect, {
          friction: 0.6,
          restitution: 0.15,
          density: 0.002,
        });
        rect.setStatic(true);
        blocks.push(rect);
      }
    }

    const height = rows * BLOCK_H;
    const zone = this.add.zone(x, GROUND_Y - height / 2, BUILDING_COLS * BLOCK_W + 10, height)
      .setInteractive({ useHandCursor: true });
    const building = { x, height, blocks, zone, smashed: false };
    zone.once('pointerdown', () => this.smashBuilding(building));
    this.buildings.push(building);
  }

  smashBuilding(b) {
    if (this.gameOver || this.challenge !== 'smash' || b.smashed) return;
    b.smashed = true;
    b.zone.destroy();

    sfx.punch();
    this.addScore(10);
    this.cameras.main.shake(150, 0.01);
    this.dustBurst(b.x, GROUND_Y - 20, 12);

    // Kaiju lunges toward the building it punches.
    const lungeX = this.kaiju.x + (b.x - this.kaiju.x) * 0.25;
    this.tweens.add({ targets: this.kaiju, x: lungeX, scaleX: 1.15, scaleY: 0.9, duration: 90, yoyo: true });

    // The punch: release every block and hurl it away from the impact point.
    const impactY = GROUND_Y - b.height * 0.45;
    for (const block of b.blocks) {
      block.setStatic(false);
      const dx = block.x - b.x;
      const dy = block.y - impactY;
      block.setVelocity(
        dx * 0.35 + Phaser.Math.FloatBetween(-2.5, 2.5),
        Math.min(0, dy * 0.06) - Phaser.Math.FloatBetween(2, 7),
      );
      block.setAngularVelocity(Phaser.Math.FloatBetween(-0.25, 0.25));
    }

    // Let debris tumble, then fade it out and free the bodies.
    this.time.delayedCall(1700, () => {
      for (const block of b.blocks) {
        if (!block.active) continue;
        this.tweens.add({
          targets: block, alpha: 0, duration: 450,
          onComplete: () => block.destroy(),
        });
      }
    });

    if (this.buildings.every((x) => x.smashed)) {
      this.endChallenge(true, T.flattened);
    }
  }

  // ---------- DODGE ----------

  startDodge() {
    const duration = Math.min(10000, 5500 + this.cycle * 500);
    const interval = Math.max(450, 1100 - (this.cycle - 1) * 120);
    this.challengeEvents.push(this.time.addEvent({
      delay: interval,
      loop: true,
      callback: () => this.spawnDodgeMissile(),
    }));
    this.startChallengeClock(duration, () => this.endChallenge(true, T.survived));
  }

  spawnDodgeMissile() {
    if (this.gameOver || (this.challenge !== 'dodge' && this.challenge !== 'boss')) return;
    const lane = Phaser.Utils.Array.GetRandom(LANES);

    const m = this.add.container(lane, -30);
    const g = this.add.graphics();
    g.fillStyle(COLORS.missile, 1);
    g.fillRoundedRect(-7, -18, 14, 36, 6);
    g.fillStyle(0xffaa00, 1);
    g.fillTriangle(-7, -18, 0, -30, 7, -18);
    m.add(g);
    m.setDepth(7);
    this.dodgeMissiles.push(m);

    // Smoke trail follows the rocket and dies with it.
    const trail = this.add.particles(0, 0, 'p-dot', {
      follow: m, followOffset: { x: 0, y: -26 },
      frequency: 40,
      speed: { min: 5, max: 25 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 350,
      tint: 0xbbbbcc,
    }).setDepth(6);
    m.once('destroy', () => trail.destroy());

    const fall = Math.max(750, 1400 - (this.cycle - 1) * 150);
    this.tweens.add({
      targets: m,
      y: GROUND_Y + 20,
      duration: fall,
      ease: 'Linear',
      onComplete: () => {
        if (!m.active) return;
        sfx.boom();
        this.sparkBurst(m.x, GROUND_Y - 6, 8);
        m.destroy();
      },
    });
  }

  moveKaiju(lane) {
    sfx.step();
    this.kaijuLane = lane;
    this.tweens.add({
      targets: this.kaiju,
      x: LANES[lane],
      duration: 130,
      ease: 'Quad.easeOut',
      onStart: () => this.tweens.add({ targets: this.kaiju, scaleY: 0.92, duration: 65, yoyo: true }),
      onComplete: () => this.dustBurst(this.kaiju.x, GROUND_Y + 4, 4),
    });
  }

  // ---------- STOMP ----------

  startStomp() {
    this.tanks = [];
    this.tanksToSpawn = Math.min(7, 2 + this.cycle);
    this.challengeEvents.push(this.time.addEvent({
      delay: 700, startAt: 650, loop: true,
      callback: () => {
        if (this.challenge !== 'stomp' || this.tanksToSpawn <= 0) return;
        this.tanksToSpawn -= 1;
        this.spawnTank();
      },
    }));
    this.startChallengeClock(10000, () => this.endChallenge(false, T.tooSlow));
  }

  spawnTank() {
    const fromLeft = Math.random() < 0.5;
    const c = this.add.container(fromLeft ? -40 : W + 40, GROUND_Y - 12);
    const g = this.add.graphics();
    g.fillStyle(0x8a8a66, 1);
    g.fillRoundedRect(-24, -10, 48, 18, 5);        // корпус
    g.fillRoundedRect(-12, -20, 24, 12, 4);        // башта
    g.fillRect(fromLeft ? 10 : -26, -17, 16, 4);   // дуло вперед по ходу
    g.fillStyle(0x5a5a44, 1);
    g.fillRoundedRect(-26, 2, 52, 10, 5);          // гусениці
    c.add(g);
    c.setDepth(6);
    c.setSize(60, 34);
    c.setInteractive({ useHandCursor: true });
    c.once('pointerdown', () => this.stompTank(c));
    const speed = 0.085 + 0.014 * (this.cycle - 1); // px/ms
    this.tweens.add({
      targets: c, x: this.kaiju.x,
      duration: Math.abs(this.kaiju.x - c.x) / speed,
      ease: 'Linear',
    });
    this.tanks.push(c);
  }

  stompTank(t) {
    if (this.gameOver || this.challenge !== 'stomp' || !t.active) return;
    sfx.punch();
    this.addScore(8);
    this.dustBurst(t.x, GROUND_Y - 6, 10);
    this.cameras.main.shake(120, 0.008);
    this.tweens.add({ targets: this.kaiju, scaleY: 0.85, scaleX: 1.12, duration: 90, yoyo: true });
    this.tanks = this.tanks.filter((x) => x !== t);
    this.tweens.killTweensOf(t);
    this.tweens.add({
      targets: t, scaleY: 0.12, alpha: 0.6, duration: 130, ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
    if (this.tanksToSpawn <= 0 && this.tanks.length === 0) this.endChallenge(true, T.stomped);
  }

  // ---------- ROAR ----------

  startRoar() {
    this.roaring = false;
    this.roarT = 0;
    this.drones = [];
    const zoneW = Math.max(0.1, 0.2 - 0.02 * (this.cycle - 1));
    this.roarZone = { from: 0.62, to: 0.62 + zoneW };
    this.roarGfx = this.add.graphics().setDepth(9);

    const count = Math.min(9, 3 + this.cycle);
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * (0.15 + 0.7 * (i / Math.max(1, count - 1))); // дуга зверху
      const x = this.kaiju.x + Math.cos(angle) * 420;
      const y = this.kaiju.y - 90 - Math.sin(angle) * 420;
      const d = this.add.container(x, y);
      const dg = this.add.graphics();
      dg.fillStyle(0x9a9ab8, 1);
      dg.fillEllipse(0, 0, 22, 10);
      dg.fillStyle(COLORS.missile, 1);
      dg.fillCircle(0, -4, 3);
      dg.fillStyle(0x666680, 1);
      dg.fillRect(-14, -8, 28, 2);
      d.add(dg);
      d.setDepth(7);
      this.tweens.add({
        targets: d, x: this.kaiju.x, y: this.kaiju.y - 80,
        duration: 4500 + i * 250, ease: 'Sine.easeIn',
        onComplete: () => {
          if (this.challenge === 'roar' && d.active) {
            this.sparkBurst(d.x, d.y, 8);
            this.endChallenge(false, T.droned);
          }
        },
      });
      this.drones.push(d);
    }
  }

  inRoarZone() {
    return this.roarT >= this.roarZone.from && this.roarT <= this.roarZone.to;
  }

  drawRoarBar() {
    const g = this.roarGfx;
    if (!g) return;
    g.clear();
    const bw = 220;
    const bh = 14;
    const x0 = W / 2 - bw / 2;
    const y0 = this.kaiju.y - 175;
    g.fillStyle(0x14142e, 0.85);
    g.fillRect(x0 - 3, y0 - 3, bw + 6, bh + 6);
    g.fillStyle(0x2a2a55, 1);
    g.fillRect(x0, y0, bw, bh);
    g.fillStyle(COLORS.timer, 0.45);
    g.fillRect(x0 + bw * this.roarZone.from, y0, bw * (this.roarZone.to - this.roarZone.from), bh);
    g.fillStyle(this.inRoarZone() ? COLORS.timer : 0xffaa00, 1);
    g.fillRect(x0, y0, bw * Math.min(1, this.roarT), bh);
  }

  releaseRoar() {
    if (this.gameOver || this.challenge !== 'roar' || !this.roaring) return;
    this.roaring = false;
    if (this.inRoarZone()) {
      // РЕВ: кільцева ударна хвиля здуває всі дрони.
      sfx.bigBoom();
      const ring = this.add.circle(this.kaiju.x, this.kaiju.y - 70, 40, 0x000000, 0)
        .setStrokeStyle(6, COLORS.kaiju, 0.9).setDepth(8);
      this.tweens.add({ targets: ring, scale: 12, alpha: 0, duration: 550, onComplete: () => ring.destroy() });
      this.cameras.main.shake(250, 0.012);
      for (const d of this.drones) {
        if (!d.active) continue;
        this.tweens.killTweensOf(d);
        const ang = Math.atan2(d.y - (this.kaiju.y - 80), d.x - this.kaiju.x);
        this.tweens.add({
          targets: d, x: d.x + Math.cos(ang) * 700, y: d.y + Math.sin(ang) * 700,
          angle: 360, alpha: 0, duration: 600,
          onComplete: () => d.destroy(),
        });
      }
      this.addScore(25);
      this.endChallenge(true, T.blasted);
    } else {
      this.endChallenge(false, T.overcharged);
    }
  }

  // ---------- THROW ----------

  startThrow() {
    this.throwAttempts = 2;
    this.aimT = 0;
    this.spawnHeli();
    const timeLimit = Math.max(5000, 8000 - (this.cycle - 1) * 500);
    this.startChallengeClock(timeLimit, () => this.endChallenge(false, T.gotAway));
  }

  spawnHeli() {
    const c = this.add.container(Phaser.Math.Between(120, 360), Phaser.Math.Between(150, 220));
    const g = this.add.graphics();
    g.fillStyle(COLORS.heli, 1);
    g.fillEllipse(0, 0, 56, 26);
    g.fillRect(22, -4, 26, 8);
    g.fillStyle(0x666680, 1);
    g.fillRect(-30, -16, 60, 4);   // rotor
    g.fillStyle(0x101020, 1);
    g.fillCircle(-8, -2, 6);       // window
    c.add(g);
    c.setDepth(7);
    this.heli = c;
    const speed = Math.max(900, 1800 - (this.cycle - 1) * 200);
    this.tweens.add({
      targets: c,
      x: c.x < W / 2 ? W - 90 : 90,
      duration: speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({ targets: c, y: c.y + 14, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  throwCar() {
    sfx.whoosh();
    const angle = this.currentAimAngle();
    const car = this.add.rectangle(this.kaiju.x, this.kaiju.y - 90, 34, 16, COLORS.car);
    car.setStrokeStyle(1, COLORS.blockOutline, 0.7);
    this.matter.add.gameObject(car, { friction: 0.4, restitution: 0.3, density: 0.004 });
    const speed = 27;
    car.setVelocity(speed * Math.cos(angle), speed * Math.sin(angle));
    car.setAngularVelocity(0.3);
    this.projectile = car;
    this.tweens.add({ targets: this.kaiju, scaleX: 1.18, scaleY: 0.88, duration: 90, yoyo: true });
  }

  currentAimAngle() {
    // Sweeps across the sky above the kaiju, ping-pong.
    return Phaser.Math.DegToRad(-90 + 62 * Math.sin(this.aimT));
  }

  projectileMissed() {
    if (this.projectile && this.projectile.active) this.projectile.destroy();
    this.projectile = null;
    this.throwAttempts -= 1;
    if (this.throwAttempts <= 0) this.endChallenge(false, T.outOfCars);
    else {
      sfx.fail();
      this.showBanner(T.miss, COLORS.danger);
    }
  }

  // ---------- BOSS: MEGA-COPTER ----------

  startBossRound() {
    this.round += 1;
    this.challenge = 'boss';
    this.roundText.setText(`${T.round} ${this.round}`);
    this.hintText.setText(HINTS.boss);
    this.showBanner(NAMES.boss, COLORS.danger);
    this.startBoss();
  }

  startBoss() {
    this.bossHp = 3;
    const c = this.add.container(W / 2, 170);
    const g = this.add.graphics();
    g.fillStyle(0x777788, 1);
    g.fillEllipse(0, 0, 92, 42);
    g.fillRect(36, -8, 44, 16);            // хвіст
    g.fillStyle(0x44445c, 1);
    g.fillRoundedRect(-36, 10, 72, 14, 6); // бронеплита
    g.fillStyle(0x666680, 1);
    g.fillRect(-50, -28, 100, 6);          // ротор
    g.fillStyle(0x101020, 1);
    g.fillCircle(-14, -4, 9);              // кабіна
    g.fillStyle(COLORS.missile, 1);
    g.fillCircle(32, 8, 4);                // вогник
    c.add(g);
    c.setDepth(7);
    this.boss = c;
    this.tweens.add({ targets: c, y: 190, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.updateBossPips();
    this.startChallengeClock(20000, () => this.bossEscape());
    this.bossVolley();
  }

  updateBossPips() {
    if (!this.bossPips) {
      this.bossPips = this.add.text(W / 2, 64, '', {
        fontFamily: 'Courier New', fontSize: '16px', fontStyle: 'bold', color: COLORS.danger,
      }).setOrigin(0.5, 0).setDepth(20);
    }
    this.bossPips.setText('▓ '.repeat(Math.max(0, this.bossHp)).trim());
  }

  // Фаза 1: залп ракет (механіка dodge), потім вікно для кидків.
  bossVolley() {
    if (this.challenge !== 'boss') return;
    this.bossPhase = 'volley';
    this.aimGfx.clear();
    if (this.projectile && this.projectile.active) this.projectile.destroy();
    this.projectile = null;
    let shots = 5;
    this.challengeEvents.push(this.time.addEvent({
      delay: 550, repeat: shots - 1,
      callback: () => {
        if (this.challenge !== 'boss') return;
        this.spawnDodgeMissile();
        shots -= 1;
        if (shots <= 0) this.time.delayedCall(1000, () => this.bossWindow());
      },
    }));
  }

  // Фаза 2: босс відкритий ~4с — кидай авто, влучання = -1 HP боса.
  bossWindow() {
    if (this.challenge !== 'boss') return;
    this.bossPhase = 'window';
    this.aimT = 0;
    this.time.delayedCall(4000, () => {
      if (this.challenge === 'boss' && this.bossPhase === 'window') this.bossVolley();
    });
  }

  hitBoss() {
    if (this.challenge !== 'boss' || !this.boss) return;
    sfx.boom();
    this.sparkBurst(this.boss.x, this.boss.y, 16);
    if (this.projectile && this.projectile.active) this.projectile.destroy();
    this.projectile = null;
    this.bossHp -= 1;
    this.updateBossPips();
    this.cameras.main.shake(150, 0.01);
    if (this.bossHp <= 0) this.killBoss();
  }

  killBoss() {
    sfx.bigBoom();
    const b = this.boss;
    this.boss = null;
    this.sparkBurst(b.x, b.y, 24);
    this.dustBurst(b.x, b.y, 10, 0x666680);
    this.tweens.killTweensOf(b);
    this.tweens.add({
      targets: b, y: GROUND_Y - 26, angle: 160, duration: 900, ease: 'Quad.easeIn',
      onComplete: () => { this.sparkBurst(b.x, b.y, 18); b.destroy(); },
    });
    this.addScore(60);
    this.runScrap += 10;
    this.endChallenge(true, T.bossDown);
  }

  bossEscape() {
    if (this.challenge !== 'boss') return;
    const b = this.boss;
    this.boss = null;
    if (b) {
      this.tweens.killTweensOf(b);
      this.tweens.add({ targets: b, x: W + 160, y: 60, duration: 900, onComplete: () => b.destroy() });
    }
    this.endChallenge(false, T.bossEscaped);
  }

  // ---------- kaiju ----------

  blink() {
    if (this.gameOver || !this.kaijuEyes) return;
    this.tweens.add({
      targets: this.kaijuEyes, scaleY: 0.08, duration: 70, yoyo: true, ease: 'Quad.easeIn',
    });
  }

  // ---------- shared ----------

  update(time, delta) {
    if (this.gameOver) return;

    if (this.challengeTimer && this.timerBar.visible) {
      const left = 1 - this.challengeTimer.getProgress();
      this.timerBar.width = 200 * left;
      this.timerBar.setFillStyle(left < 0.25 ? COLORS.missile : COLORS.timer);
    }

    if (this.challenge === 'dodge' || this.challenge === 'boss') {
      for (const m of this.dodgeMissiles) {
        if (!m.active) continue;
        if (Math.abs(m.x - this.kaiju.x) < 55 && m.y > this.kaiju.y - 85 && m.y < this.kaiju.y + 40) {
          this.sparkBurst(m.x, m.y, 10);
          m.destroy();
          this.loseHp();
          if (this.gameOver) return;
        }
      }
      this.dodgeMissiles = this.dodgeMissiles.filter((m) => m.active);
    }

    if (this.challenge === 'roar') {
      if (this.roaring) {
        this.roarT += delta / 1600;
        // Перетримав шкалу — releaseRoar сам зафіксує провал поза зоною.
        if (this.roarT >= 1) {
          this.roarT = 1;
          this.releaseRoar();
          return;
        }
      }
      this.drawRoarBar();
    }

    if (this.challenge === 'stomp') {
      for (const t of this.tanks) {
        if (t.active && Math.abs(t.x - this.kaiju.x) < 55) {
          this.sparkBurst(t.x, t.y, 10);
          t.destroy();
          this.tanks = this.tanks.filter((x) => x !== t);
          this.endChallenge(false, T.tanksThrough);
          return;
        }
      }
    }

    const bossWindow = this.challenge === 'boss' && this.bossPhase === 'window';
    if (this.challenge === 'throw' || bossWindow) {
      // Aim indicator sweeps until the car is in the air.
      const target = bossWindow ? this.boss : this.heli;
      this.aimGfx.clear();
      if (!this.projectile) {
        this.aimT += delta * 0.0035 * (1 + this.cycle * 0.15);
        const a = this.currentAimAngle();
        const x0 = this.kaiju.x;
        const y0 = this.kaiju.y - 90;
        this.aimGfx.lineStyle(3, COLORS.car, 0.9);
        this.aimGfx.lineBetween(x0, y0, x0 + 90 * Math.cos(a), y0 + 90 * Math.sin(a));
        this.aimGfx.fillStyle(COLORS.car, 0.9);
        this.aimGfx.fillCircle(x0 + 90 * Math.cos(a), y0 + 90 * Math.sin(a), 5);
      } else if (this.projectile.active && target) {
        const d = Phaser.Math.Distance.Between(this.projectile.x, this.projectile.y, target.x, target.y);
        if (d < (bossWindow ? 75 : 55)) {
          if (bossWindow) {
            this.hitBoss();
          } else {
            // Direct hit: the copter tumbles down.
            sfx.bigBoom();
            this.sparkBurst(this.heli.x, this.heli.y, 22);
            this.dustBurst(this.heli.x, this.heli.y, 8, 0x666680);
            this.tweens.killTweensOf(this.heli);
            const heli = this.heli;
            this.tweens.add({
              targets: heli, y: GROUND_Y - 24, angle: 130, duration: 700, ease: 'Quad.easeIn',
              onComplete: () => heli.destroy(),
            });
            this.heli = null;
            if (this.projectile.active) this.projectile.destroy();
            this.projectile = null;
            this.addScore(40);
            this.endChallenge(true, T.directHit);
          }
        } else if (this.projectile.y > GROUND_Y - 10 || this.projectile.x < -40 || this.projectile.x > W + 40) {
          if (bossWindow) {
            // Промах по босу не карає — вікно й таймер лімітують самі.
            this.projectile.destroy();
            this.projectile = null;
          } else {
            this.projectileMissed();
          }
        }
      }
    }
  }

  endRun() {
    this.gameOver = true;
    this.challenge = null;
    sfx.over();
    portal.gameplayStop();
    if (this.challengeTimer) { this.challengeTimer.remove(); this.challengeTimer = null; }
    for (const ev of this.challengeEvents) ev.remove();
    this.challengeEvents = [];
    this.timerBar.setVisible(false);
    this.aimGfx.clear();
    this.hintText.setText('');

    // Банкуємо скрап і рекорди. bankedScrap захищає від подвійного нарахування,
    // коли забіг продовжено через rewarded і endRun приходить удруге.
    save.scrap += this.runScrap - (this.bankedScrap || 0);
    this.bankedScrap = this.runScrap;
    const isBest = this.score > save.best;
    if (isBest) save.best = this.score;
    if (this.round > save.bestRound) save.bestRound = this.round;
    persistSave();

    const ui = [];
    this.overUi = ui;
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(10);
    ui.push(overlay);
    ui.push(this.add.text(W / 2, H / 2 - 80, T.kaijuDown, {
      fontFamily: 'Courier New', fontSize: '42px', color: COLORS.danger, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11));
    ui.push(this.add.text(W / 2, H / 2 - 15, T.overStats(this.score, this.round), {
      fontFamily: 'Courier New', fontSize: '22px', color: COLORS.text,
    }).setOrigin(0.5).setDepth(11));
    ui.push(this.add.text(W / 2, H / 2 + 17, T.scrapEarned(this.runScrap), {
      fontFamily: 'Courier New', fontSize: '17px', fontStyle: 'bold', color: '#ffe08a',
    }).setOrigin(0.5).setDepth(11));
    if (isBest) {
      const nb = this.add.text(W / 2, H / 2 - 125, T.newBest, {
        fontFamily: 'Courier New', fontSize: '26px', fontStyle: 'bold', color: COLORS.accent,
      }).setOrigin(0.5).setDepth(11);
      this.tweens.add({ targets: nb, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      ui.push(nb);
    }

    // Rewarded continue: раз на забіг, повертає в гру з 1 HP.
    if (!this.usedContinue) {
      const btn = this.add.text(W / 2, H / 2 + 55, T.btnContinue, {
        fontFamily: 'Courier New', fontSize: '20px', color: '#101020', fontStyle: 'bold',
        backgroundColor: COLORS.accent, padding: { x: 16, y: 10 },
      }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true });
      ui.push(btn);
      btn.once('pointerdown', (p, lx, ly, event) => {
        if (event) event.stopPropagation();
        sfx.press();
        this.continueRun();
      });
    }

    ui.push(this.add.text(W / 2, H / 2 + (this.usedContinue ? 55 : 125), T.tapAgain, {
      fontFamily: 'Courier New', fontSize: '18px', color: COLORS.accent,
    }).setOrigin(0.5).setDepth(11));

    const menuBtn = this.add.text(W / 2, H / 2 + (this.usedContinue ? 105 : 175), T.btnMenu, {
      fontFamily: 'Courier New', fontSize: '16px', color: '#9a9ab8',
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true });
    menuBtn.once('pointerdown', (p, lx, ly, event) => {
      if (event) event.stopPropagation();
      sfx.press();
      this.scene.start('menu');
    });
    ui.push(menuBtn);

    overlay.setInteractive();
    this.time.delayedCall(500, () => {
      if (!this.gameOver) return; // уже продовжили через rewarded
      overlay.once('pointerdown', async () => {
        sfx.press();
        await portal.commercialBreak();
        this.scene.restart();
      });
    });
  }

  // Rewarded continue: якщо нагороду отримано — прибираємо екран game over
  // і продовжуємо той самий забіг з 1 HP (рахунок і раунд зберігаються).
  async continueRun() {
    const ok = await portal.rewardedBreak();
    if (!ok || !this.gameOver) return;
    this.usedContinue = true;
    for (const el of this.overUi) if (el.active) el.destroy();
    this.overUi = [];
    this.clearChallengeObjects();
    this.gameOver = false;
    this.hp = 1;
    this.hpText.setText('♥');
    portal.gameplayStart();
    this.cameras.main.flash(200, 124, 252, 0);
    this.time.delayedCall(400, () => this.startNextChallenge());
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: W,
  height: H,
  backgroundColor: COLORS.skyTop,
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.15 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene],
};

// Стартуємо після ініціалізації SDK (з таймаутом усередині init) — вимога порталів
// показати loading finished до першого кадру геймплею, а Data Module має бути
// готовий до того, як меню читає збереження.
portal.init().finally(() => {
  try {
    if (portal.adapter === 'crazygames') {
      const cg = window.CrazyGames.SDK.data.getItem(SAVE_KEY);
      if (cg) mergeSave(cg);
    }
  } catch { /* збереження з Data Module необовʼязкове */ }
  window.game = new Phaser.Game(config);
});
