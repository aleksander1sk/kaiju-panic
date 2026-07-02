// E2E: three scenarios in one headless run.
// 1. No SDK (dev mode): full challenge cycle SMASH -> DODGE -> THROW -> round 4,
//    portal fallback marks, game over -> rewarded continue revives the run.
// 2. Fake CrazyGames SDK: adapter detection, gameplayStart/Stop reach the SDK,
//    rewarded continue goes through the ad plumbing.
// 3. Ukrainian locale: i18n picks uk, HUD strings localized.
// Exits 0 only if every check passes and the console stays clean.
const path = require('path');
const http = require('http');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8158;
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(ROOT, urlPath), (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(urlPath)] || 'application/octet-stream' });
    res.end(data);
  });
});

async function newGamePage(browser, errors, setup) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // Свідомо заблоковані SDK-домени сиплють "Failed to load resource" — це не помилка гри.
    const url = (m.location() && m.location().url) || '';
    if (/poki\.com|crazygames\.com/.test(url)) return;
    errors.push('console: ' + m.text());
  });
  // Реальні SDK порталів блокуються в усіх сценаріях: "без SDK" має бути
  // детермінованим, а поведінка адаптерів перевіряється фейковим SDK.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (/poki\.com|crazygames\.com/.test(req.url())) req.abort();
    else req.continue();
  });
  if (setup) await page.evaluateOnNewDocument(setup);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return page;
}

const scene = () => `window.game.scene.getScene('game')`;
const MENU_READY = `window.game && window.game.isBooted && window.game.scene.isActive('menu')`;
const startGame = (page) => page.evaluate(() => window.game.scene.getScene('menu').scene.start('game'));
// Обриває поточний виклик (з його таймерами/спавнерами) і форсує заданий.
const forceChallenge = (page, type) => page.evaluate((t) => {
  const s = window.game.scene.getScene('game');
  if (s.challengeTimer) { s.challengeTimer.remove(); s.challengeTimer = null; }
  for (const ev of s.challengeEvents) ev.remove();
  s.challengeEvents = [];
  s.challenge = null;
  s.clearChallengeObjects();
  s.cycleOrder = [t];
  s.startNextChallenge();
}, type);

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'],
  });
  const errors = [];

  // ============ Scenario 1: no SDK — gameplay cycle + portal fallback + continue ============
  {
    // Локаль хост-машини може бути будь-якою (тут — uk), тому en форсується явно.
    // localStorage чиститься: сценарії ділять origin, сейв не має протікати.
    const page = await newGamePage(browser, errors, () => {
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
      localStorage.clear();
    });
    const waitFor = (cond, timeout = 20000) => page.waitForFunction(cond, { timeout });

    // --- boot: у меню, свіжий сейв ---
    await waitFor(MENU_READY);
    const menuBoot = await page.evaluate(() => ({
      adapter: window.portal.adapter, log: window.portal.log.slice(), lang: window.i18n.lang,
      save: window.save,
    }));
    check('boots into menu', true);
    check('portal fallback: no-sdk adapter', menuBoot.adapter === 'none' && menuBoot.log.includes('no-sdk'));
    check('i18n defaults to en', menuBoot.lang === 'en');
    check('fresh save defaults', menuBoot.save && menuBoot.save.scrap === 0 && menuBoot.save.unlocks.stomp === false);

    // --- PLAY: round 1 is SMASH ---
    await startGame(page);
    await waitFor(`${scene()} && ${scene()}.challenge === 'smash'`);
    const boot = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return { round: s.round, buildings: s.buildings.length, hp: s.hp, log: window.portal.log.slice() };
    });
    check('starts into SMASH round 1', boot.round === 1 && boot.hp === 3);
    check('buildings spawned', boot.buildings >= 3, `${boot.buildings}`);
    check('portal gameplayStart marked', boot.log.includes('gameplayStart'));

    // --- win SMASH ---
    await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      for (const b of [...s.buildings]) s.smashBuilding(b);
    });
    await waitFor(`${scene()}.challenge === 'dodge'`);
    const afterSmash = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return { round: s.round, score: s.score };
    });
    check('SMASH win -> DODGE round 2', afterSmash.round === 2);
    check('smash scored', afterSmash.score >= 30, `${afterSmash.score}`);

    // --- survive DODGE with an auto-dodger ---
    await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      window.__dodger = setInterval(() => {
        if (s.challenge !== 'dodge') return;
        const LANES = [120, 240, 360];
        const danger = LANES.map((lx) =>
          s.dodgeMissiles.filter((m) => m.active && Math.abs(m.x - lx) < 10 && m.y < s.kaiju.y).length);
        let best = 0;
        for (let i = 1; i < LANES.length; i++) if (danger[i] < danger[best]) best = i;
        if (best !== s.kaijuLane) s.moveKaiju(best);
      }, 120);
    });
    await waitFor(`${scene()}.challenge === 'throw'`, 25000);
    await page.evaluate(() => clearInterval(window.__dodger));
    const afterDodge = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return { round: s.round, hp: s.hp, gameOver: s.gameOver };
    });
    check('DODGE survived -> THROW round 3', afterDodge.round === 3 && !afterDodge.gameOver, `hp=${afterDodge.hp}`);

    // --- rig a THROW direct hit: park the copter straight above the kaiju, aim up ---
    const scoreBeforeThrow = await page.evaluate(() => window.game.scene.getScene('game').score);
    await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      s.tweens.killTweensOf(s.heli);
      s.heli.setPosition(s.kaiju.x, 420);
      s.aimT = 0; // currentAimAngle() -> -90deg, straight up
      s.throwCar();
    });
    // Цикл 2+ перемішаний, тому тип раунду 4 не детермінований — чекаємо сам раунд.
    await waitFor(`${scene()}.round === 4 && ${scene()}.challenge !== null`, 15000);
    const final = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return { round: s.round, score: s.score, gameOver: s.gameOver };
    });
    check('THROW resolved -> round 4 starts', final.round === 4 && !final.gameOver);
    check('direct hit scored (+40 & bonus)', final.score >= scoreBeforeThrow + 40, `${scoreBeforeThrow} -> ${final.score}`);

    // --- комбо: три бездоганні виклики = стрік 3, чіп видимий ---
    const combo = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return { streak: s.streak, chip: s.comboText.text, scrap: s.runScrap };
    });
    check('combo streak after 3 flawless', combo.streak === 3 && combo.chip.includes('1.3'), combo.chip);
    check('run scrap accrued (3 challenges + cycle)', combo.scrap === 11, `${combo.scrap}`);

    // --- rig game over, then revive through the rewarded continue ---
    await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      s.hp = 1;
      s.loseHp();
    });
    const over = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return {
        gameOver: s.gameOver, log: window.portal.log.slice(), usedContinue: s.usedContinue,
        ui: s.overUi.length, savedScrap: window.save.scrap, best: window.save.best,
        bestRound: window.save.bestRound, score: s.score,
      };
    });
    check('game over reached', over.gameOver && !over.usedContinue);
    check('portal gameplayStop marked', over.log.includes('gameplayStop'));
    check('game over UI shown (with continue btn)', over.ui >= 5, `${over.ui}`);
    check('scrap banked to save', over.savedScrap === 11, `${over.savedScrap}`);
    check('records saved (NEW BEST)', over.best === over.score && over.bestRound === 4, `best=${over.best}`);

    await page.evaluate(() => window.game.scene.getScene('game').continueRun());
    await waitFor(`${scene()}.gameOver === false && ${scene()}.challenge !== null`, 15000);
    const revived = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return { hp: s.hp, usedContinue: s.usedContinue, round: s.round, log: window.portal.log.slice() };
    });
    check('rewarded continue revives with 1 HP', revived.hp === 1 && revived.usedContinue);
    check('run keeps its round after continue', revived.round >= 5, `${revived.round}`);
    check('rewardedBreak marked', revived.log.includes('rewardedBreak'));

    await page.close();
  }

  // ============ Scenario 2: fake CrazyGames SDK — adapter + ad plumbing ============
  {
    const page = await newGamePage(browser, errors, () => {
      window.__cg = { starts: 0, stops: 0, ads: [] };
      window.CrazyGames = {
        SDK: {
          init: async () => {},
          game: {
            gameplayStart: () => { window.__cg.starts++; },
            gameplayStop: () => { window.__cg.stops++; },
          },
          ad: {
            requestAd: (type, cb) => {
              window.__cg.ads.push(type);
              setTimeout(() => { cb.adStarted(); cb.adFinished(); }, 50);
            },
          },
        },
      };
    });
    const waitFor = (cond, timeout = 20000) => page.waitForFunction(cond, { timeout });

    await waitFor(MENU_READY);
    await startGame(page);
    await waitFor(`${scene()} && ${scene()}.challenge === 'smash'`);
    const cgBoot = await page.evaluate(() => ({
      adapter: window.portal.adapter, log: window.portal.log.slice(), starts: window.__cg.starts,
    }));
    check('CG adapter detected', cgBoot.adapter === 'crazygames' && cgBoot.log.includes('initialized-crazygames'));
    check('CG gameplayStart reached SDK', cgBoot.starts >= 1, `${cgBoot.starts}`);

    await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      s.hp = 1;
      s.loseHp();
    });
    const cgOver = await page.evaluate(() => ({ stops: window.__cg.stops }));
    check('CG gameplayStop reached SDK', cgOver.stops >= 1, `${cgOver.stops}`);

    await page.evaluate(() => window.game.scene.getScene('game').continueRun());
    await waitFor(`${scene()}.gameOver === false`, 15000);
    const cgRevived = await page.evaluate(() => ({
      ads: window.__cg.ads.slice(), hp: window.game.scene.getScene('game').hp,
    }));
    check('CG rewarded ad requested & revived', cgRevived.ads.includes('rewarded') && cgRevived.hp === 1, cgRevived.ads.join(','));

    await page.close();
  }

  // ============ Scenario 3: Ukrainian locale + seeded save ============
  {
    const page = await newGamePage(browser, errors, () => {
      Object.defineProperty(navigator, 'languages', { get: () => ['uk-UA', 'uk'] });
      Object.defineProperty(navigator, 'language', { get: () => 'uk-UA' });
      localStorage.clear();
      localStorage.setItem('kp-save-v1', JSON.stringify({ scrap: 100, best: 77 }));
    });
    const waitFor = (cond, timeout = 20000) => page.waitForFunction(cond, { timeout });

    await waitFor(MENU_READY);
    const seeded = await page.evaluate(() => window.save);
    check('seeded save loaded (merge with defaults)', seeded.scrap === 100 && seeded.best === 77 && seeded.unlocks.roar === false);

    // --- магазин: купівля, брак коштів, одягання скіна, персист ---
    const shop = await page.evaluate(() => {
      const m = window.game.scene.getScene('menu');
      const bought = m.buy('stomp');            // 100 - 25 = 75
      const cantAfford = !m.buy('heart') && window.save.scrap === 75; // 80 > 75 → відмова
      m.buy('magma');                           // купує (75-15=60) і одягає
      const equipped = window.save.skin;
      m.buy('magma');                           // тап по одягненому → назад класика
      const shieldBought = m.buy('shield');     // 60 - 40 = 20
      return {
        bought, cantAfford, equipped, skinAfter: window.save.skin, shieldBought,
        scrap: window.save.scrap, unlocked: window.save.unlocks.stomp,
        persisted: JSON.parse(localStorage.getItem('kp-save-v1')).scrap,
      };
    });
    check('shop: buy stomp for 25', shop.bought && shop.unlocked && shop.scrap === 20, `scrap=${shop.scrap}`);
    check('shop: cannot afford heart', shop.cantAfford);
    check('shop: skin equip/unequip', shop.equipped === 'magma' && shop.skinAfter === 'classic');
    check('shop: shield bought & purchases persisted', shop.shieldBought && shop.persisted === 20, `${shop.persisted}`);

    await startGame(page);
    await waitFor(`${scene()} && ${scene()}.challenge === 'smash'`);
    const pool = await page.evaluate(() => window.game.scene.getScene('game').pool);
    check('unlocked stomp joins the pool', pool.length === 4 && pool.includes('stomp'), pool.join(','));
    const uk = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      return { lang: window.i18n.lang, hint: s.hintText.text, score: s.scoreText.text, round: s.roundText.text };
    });
    check('uk locale detected', uk.lang === 'uk');
    check('uk HUD strings', uk.score.startsWith('РАХУНОК') && uk.round.startsWith('РАУНД'), `${uk.score} / ${uk.round}`);
    check('uk hint localized', uk.hint.includes('РОЗТРОЩИ'), uk.hint);

    // --- щит: перша помилка не забирає серце ---
    const shield = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      const before = { hp: s.hp, up: s.shieldUp };
      s.loseHp();
      const afterFirst = { hp: s.hp, up: s.shieldUp };
      s.loseHp();
      return { before, afterFirst, hpAfterSecond: s.hp };
    });
    check('shield absorbs first mistake', shield.before.up && shield.afterFirst.hp === shield.before.hp && !shield.afterFirst.up);
    check('second mistake costs a heart', shield.hpAfterSecond === shield.before.hp - 1);

    // --- STOMP: форсуємо виклик, чавимо всі танки ---
    await forceChallenge(page, 'stomp');
    await waitFor(`${scene()}.challenge === 'stomp'`);
    await waitFor(`${scene()}.tanks.length >= 1`, 8000);
    const stomp = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      const before = s.score;
      s.tanksToSpawn = 0; // не чекаємо решту спавнів
      for (const t of [...s.tanks]) s.stompTank(t);
      return { before, after: s.score, done: s.challenge === null };
    });
    check('stomp: tanks crushed -> success', stomp.done && stomp.after > stomp.before, `${stomp.before} -> ${stomp.after}`);

    // --- ROAR: реліз у зоні = успіх; поза зоною = провал (-1 серце) ---
    await waitFor(`${scene()}.challenge !== null`, 10000); // наступний раунд стартував
    await forceChallenge(page, 'roar');
    await waitFor(`${scene()}.challenge === 'roar'`);
    const roarOk = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      const before = s.score;
      s.roaring = true;
      s.roarT = 0.7; // зона циклу 1: [0.62, 0.82]
      s.releaseRoar();
      return { before, after: s.score, done: s.challenge === null, drones: s.drones.filter((d) => d.active).length };
    });
    check('roar: release in zone -> blast success', roarOk.done && roarOk.after > roarOk.before, `${roarOk.before} -> ${roarOk.after}`);

    await waitFor(`${scene()}.challenge !== null`, 10000);
    await forceChallenge(page, 'roar');
    await waitFor(`${scene()}.challenge === 'roar'`);
    const roarFail = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      const hpBefore = s.hp;
      s.roaring = true;
      s.roarT = 0.3; // поза зоною
      s.releaseRoar();
      return { hpBefore, hpAfter: s.hp, done: s.challenge === null };
    });
    check('roar: release out of zone -> fail costs heart', roarFail.done && roarFail.hpAfter === roarFail.hpBefore - 1, `${roarFail.hpBefore} -> ${roarFail.hpAfter}`);

    // --- БОСС: тригер на межі 3-го циклу, 3 влучання, нагороди ---
    await waitFor(`${scene()}.challenge !== null`, 10000);
    const bossType = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      if (s.challengeTimer) { s.challengeTimer.remove(); s.challengeTimer = null; }
      for (const ev of s.challengeEvents) ev.remove();
      s.challengeEvents = [];
      s.challenge = null;
      s.clearChallengeObjects();
      s.completedCycles = 2;   // наступна межа циклу стане третьою
      s.bossJustDone = false;
      s.cycleOrder = [];
      s.startNextChallenge();
      return s.challenge;
    });
    check('boss triggers on 3rd cycle boundary', bossType === 'boss');
    const bossFight = await page.evaluate(() => {
      const s = window.game.scene.getScene('game');
      const scoreBefore = s.score;
      const scrapBefore = s.runScrap;
      s.hitBoss();
      s.hitBoss();
      const midHp = s.bossHp;
      s.hitBoss();
      return {
        midHp, done: s.challenge === null, bossGone: s.boss === null,
        scoreGain: s.score - scoreBefore, scrapGain: s.runScrap - scrapBefore,
      };
    });
    check('boss dies after 3 hits', bossFight.midHp === 1 && bossFight.done && bossFight.bossGone);
    check('boss rewards score and scrap', bossFight.scoreGain >= 60 && bossFight.scrapGain === 12, `+${bossFight.scoreGain} / +${bossFight.scrapGain}`);

    await page.close();
  }

  check('no console/page errors', errors.length === 0, errors.join(' | ').slice(0, 300));

  await browser.close();
  server.close();

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e.message);
  server.close();
  process.exit(2);
});
