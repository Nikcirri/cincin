"""Prova completa dell'app nel browser (Chrome), come farebbe una persona.

Uso (dopo `npm run build`):  python3 tests/smoke.py
Serve Python con Playwright e Google Chrome installati. Non gira su GitHub Actions.
"""
import functools
import http.server
import json
import pathlib
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
DIST = ROOT.parent / "dist"
errors = []


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(QuietHandler, directory=str(DIST))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print("  ok -", msg)


def open_page(page, url):
    page.goto(url)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(250)


def shot(page, name):
    page.screenshot(path=str(ROOT / f"screenshot-{name}.png"))


def back(page, expected=True):
    """Tasto Indietro di Android, poi attesa della fine delle animazioni."""
    result = page.evaluate("handleAndroidBack()")
    page.wait_for_timeout(260)
    check(result is expected, f"Indietro {'gestito' if expected else 'lasciato al sistema'}")


def common_checks(page, name):
    check(page.locator(".fullscreen-toggle-btn").count() == 0, f"{name}: niente pulsanti schermo intero")
    check(page.locator(".sound-toggle-btn").count() >= 1, f"{name}: pulsante dei suoni")


def test_home(page, base):
    print("Menu iniziale")
    open_page(page, base + "/index.html")
    check(page.locator("h1").inner_text().strip() == "CIN CIN", "titolo Cin Cin")
    check(page.locator(".home-game-card").count() == 3, "tre giochi nel menu")
    check(page.locator("[data-game=verita-o-bevi]").get_attribute("href") == "./verita-o-bevi.html", "link a Verità o Bevi")
    check(page.locator("[data-game=hai-mai]").get_attribute("href") == "./hai-mai.html", "link a Hai Mai?")
    check(page.locator("[data-game=neon-sips]").get_attribute("href") == "./neon-sips.html", "link a Neon Sips")
    check("Versione" in page.locator("#footer-version").inner_text(), "versione in fondo")
    common_checks(page, "menu")
    page.click("button[aria-label='Informazioni e impostazioni']")
    page.wait_for_timeout(300)
    check(page.locator("#info-modal").is_visible(), "si apre la finestra informazioni")
    check(page.locator("#setting-sound").is_checked() and page.locator("#setting-haptics").is_checked(), "suoni e vibrazione accesi")
    page.locator("#setting-sound").uncheck()
    check(page.evaluate("appSettings().sound") is False, "suoni spenti dall'interruttore")
    check("volume-xmark" in page.locator(".sound-toggle-btn").first.inner_html(), "l'icona dei suoni si aggiorna")
    page.locator("#setting-sound").check()
    shot(page, "home-info")
    back(page)
    check(page.locator("#info-modal").is_hidden(), "finestra chiusa")
    back(page, False)
    shot(page, "home")


def test_neon_sips(page, base):
    print("Neon Sips")
    open_page(page, base + "/neon-sips.html")
    common_checks(page, "Neon Sips")
    check(page.locator("#twists-toggle").is_checked(), "imprevisti accesi all'inizio")
    check(page.locator("#start-game-btn").is_disabled(), "inizia disattivato senza giocatori")
    check(page.locator("#resume-game-btn").is_hidden(), "niente partita da riprendere")
    for name in ["Anna", "Bruno", "<b>Carla</b>"]:
        page.fill("#player-input", name)
        page.press("#player-input", "Enter")
    page.fill("#player-input", "anna")
    page.press("#player-input", "Enter")
    check(page.locator("#lobby-player-list > div").count() == 3, "3 giocatori, doppione rifiutato")
    check(not page.locator("#start-game-btn").is_disabled(), "si può iniziare")

    page.click("#start-game-btn")
    page.wait_for_timeout(600)
    check(page.locator("#game-screen").is_visible(), "partita iniziata")
    check(page.locator("#deck-counter").inner_text().strip() == "1 / 70", "prima carta di 70")
    page.click("#next-card-btn")
    page.wait_for_timeout(450)
    check(page.locator("#deck-counter").inner_text().strip() == "2 / 70", "seconda carta")

    # Carta Scudo: assegna lo scudo al giocatore di turno
    page.evaluate("""() => {
      currentCard = { ...MASTER_DECK.find(c => c.category === 'SCUDO') };
      cardActionUsed = false;
      updateGameUI();
      saveMatch();
    }""")
    holder = page.locator("#current-turn-name").inner_text().strip()
    page.click("#grant-shield-btn")
    check(page.locator("#players-shield-bar").inner_text().count("🛡️ 1") == 1, f"scudo assegnato a {holder}")

    # Nomi con simboli strani: restano testo, non diventano HTML
    page.evaluate("""() => {
      currentCard = { ...MASTER_DECK.find(c => c.category === 'DUELLO') };
      currentP1 = players.find(p => p.name.includes('Carla'));
      currentP2 = players.find(p => p.name === 'Anna');
      updateGameUI();
    }""")
    check(page.locator("#card-description b").count() == 0, "il nome <b>Carla</b> non diventa grassetto")
    check("<b>Carla</b>" in page.locator("#card-description").inner_text(), "il nome si legge com'è")

    # Regola sul tavolo
    page.evaluate("""() => {
      currentCard = { ...MASTER_DECK.find(c => c.category === 'REGOLA') };
      cardActionUsed = false;
      updateGameUI();
    }""")
    page.click("#pin-effect-btn")
    check(page.locator("#active-rules-count").inner_text() == "1", "regola attivata sul tavolo")

    # Imbucato e giocatore che se ne va
    page.click("button[title='Opzioni Partita']")
    page.fill("#midgame-player-input", "Dario")
    page.press("#midgame-player-input", "Enter")
    check(page.evaluate("players.length") == 4, "imbucato aggiunto")
    page.click("button[title='Opzioni Partita']")
    page.locator("#midgame-players-list button").nth(3).click()
    check(page.evaluate("players.length") == 3, "un giocatore lascia il tavolo")
    check(page.evaluate("players.includes(currentP1) && players.includes(currentP2) && currentP1 !== currentP2"),
          "turno e avversario sono ancora al tavolo")
    page.click("#reset-modal button[onclick='closeResetModal()']")
    page.wait_for_timeout(260)

    # Imprevisti: "salta il turno" e "giro al contrario" cambiano davvero i turni
    page.evaluate("window.__pick = pickNeonTwist; window.pickNeonTwist = () => 'salta'")
    page.click("#next-card-btn")
    page.wait_for_timeout(700)
    check(page.locator("#card-twist .twist-box").is_visible(), "si vede l'imprevisto sulla carta")
    check("sips-badge-twist" in page.locator("#card-sips-badge").get_attribute("class"), "il bollino dei sorsi si illumina")
    skipped = page.evaluate("players.find(p => p.id === skipPlayerId).name")
    check(skipped in page.locator("#card-twist").inner_text(), f"l'imprevisto dice chi salta ({skipped})")
    page.evaluate("window.pickNeonTwist = () => null")
    page.click("#next-card-btn")
    page.wait_for_timeout(700)
    check(page.locator("#current-turn-name").inner_text().strip() != skipped, f"{skipped} ha saltato il turno")
    check(page.locator("#card-twist").is_hidden(), "carta senza imprevisto")
    page.evaluate("window.pickNeonTwist = () => 'inverti'")
    order_before = page.evaluate("players.map(p => p.name)")
    page.click("#next-card-btn")
    page.wait_for_timeout(700)
    check(page.evaluate("direction") == -1 and page.locator("#turn-direction").is_visible(), "giro al contrario segnato in alto")
    turn_now = page.evaluate("currentTurnIndex")
    page.evaluate("window.pickNeonTwist = window.__pick")
    page.click("#next-card-btn")
    page.wait_for_timeout(700)
    expected = (turn_now - 1) % len(order_before)
    check(page.evaluate("currentTurnIndex") == expected or page.evaluate("skipPlayerId") is not None,
          "il turno passa al giocatore precedente")
    page.dblclick("#next-card-btn")
    page.wait_for_timeout(700)
    shot(page, "neon-game")

    # Tasto Indietro: dalla partita alla schermata iniziale
    back(page)
    check(page.locator("#start-screen").is_visible(), "torna alla schermata iniziale")
    check("RIPRENDI" in page.locator("#resume-game-btn").inner_text(), "si può riprendere la partita")
    back(page, False)

    # Riapro la pagina: la partita è salvata
    open_page(page, base + "/neon-sips.html")
    check(page.locator("#resume-game-btn").is_visible(), "partita salvata dopo aver chiuso")
    page.click("#resume-game-btn")
    page.wait_for_timeout(500)
    check(page.locator("#game-screen").is_visible(), "partita ripresa")
    check(page.evaluate("direction") == -1, "il giro al contrario resta dopo aver chiuso")
    check(page.locator("#active-rules-count").inner_text() in ("0", "1"), "regole sul tavolo ritrovate")
    check("🛡️ 1" in page.locator("#players-shield-bar").inner_text() or holder == "Dario", "lo scudo è ancora lì")

    # Carta personalizzata
    back(page)
    page.click("text=Crea Carta")
    page.wait_for_timeout(300)
    page.fill("#form-card-title", "Carta di prova")
    page.fill("#form-card-text", "{p1} brinda con {p2} <img src=x onerror=alert(1)>")
    page.click("#form-save-card-btn")
    check(page.locator("#lobby-deck-count").inner_text() == "71", "carta aggiunta al mazzo (71)")
    back(page)
    check(page.locator("#deck-manager-modal").is_hidden(), "editor chiuso")
    page.click("#resume-game-btn")
    page.evaluate("""() => {
      currentCard = { ...customDeck.find(c => c.title === 'Carta di prova') };
      updateGameUI();
    }""")
    check(page.locator("#card-description img").count() == 0, "il testo della carta non può inserire immagini o codice")
    back(page)
    page.locator("#twists-toggle").uncheck()
    check(page.evaluate("loadJSON('cincin_neon_settings_v1', {}).twists") is False, "imprevisti spenti e salvati")
    page.locator("#twists-toggle").check()
    shot(page, "neon-lobby")


def test_hai_mai(page, base):
    print("Hai Mai?")
    open_page(page, base + "/hai-mai.html")
    common_checks(page, "Hai Mai?")
    check(page.locator("#selected-count-badge").inner_text() == "90 domande", "90 domande (piccanti spente)")
    check(page.locator("#categories-list label").count() == 4, "4 categorie (le vostre compaiono quando ci sono)")
    page.locator("#categories-list input").nth(3).check()
    check(page.locator("#selected-count-badge").inner_text() == "120 domande", "piccanti accese: 120")
    shot(page, "haimai-setup")

    page.click("#start-btn")
    page.wait_for_timeout(500)
    check(page.locator("#game-screen").is_visible(), "partita iniziata")
    check(page.locator("#hm-counter").inner_text() == "1 / 120", "domanda 1 di 120")
    check(page.locator("#hm-prev-btn").is_disabled(), "niente domanda precedente alla prima")
    first = page.locator("#hm-question").inner_text()
    page.click("#hm-card")
    page.wait_for_timeout(450)
    check(page.locator("#hm-counter").inner_text() == "2 / 120", "toccando la carta si va avanti")
    page.click("#hm-prev-btn")
    page.wait_for_timeout(450)
    check(page.locator("#hm-question").inner_text() == first, "indietro torna alla stessa domanda")

    # Imprevisto forzato
    page.evaluate("() => { hmMatch.twists[hmMatch.index] = 'contrario'; fillCard(); }")
    page.wait_for_timeout(800)
    check(page.locator("#hm-twist .twist-box").is_visible(), "si vede l'imprevisto (stesso riquadro di Neon Sips)")
    check("NON" in page.locator("#hm-twist .twist-rule").inner_text(), "regola dell'imprevisto al contrario")
    check("sips-badge-twist" in page.locator("#hm-sips-badge").get_attribute("class"), "il bollino dei sorsi si illumina")
    check(page.locator("#hm-rule").is_hidden(), "la regola normale si nasconde")
    shot(page, "haimai-twist")

    # Domanda vostra
    page.click("button[title='Le vostre domande']")
    page.wait_for_timeout(300)
    page.fill("#custom-input", "hai mai bevuto <i>tutto</i>")
    page.press("#custom-input", "Enter")
    check(page.evaluate("hmCustom.length") == 1, "domanda vostra aggiunta con Invio")
    check(page.evaluate("hmCustom[0].text") == "Hai mai bevuto <i>tutto</i>?", "domanda sistemata (maiuscola e ?)")
    check(page.locator("#custom-list p i").count() == 0, "il testo non diventa HTML")
    check(page.evaluate("hmMatch.order.length") == 121, "entra nella partita in corso")
    back(page)
    back(page)
    check(page.locator("#setup-screen").is_visible(), "schermata categorie")
    check(page.locator("#categories-list label").count() == 5, "compare la categoria Le vostre")

    # Spengo una categoria a partita in corso: le prossime domande non ne hanno più
    page.locator("#categories-list input").nth(0).uncheck()
    rest_ok = page.evaluate("""() => hmMatch.order.slice(hmMatch.index + 1)
      .every(id => hmQuestionsById.get(id).category !== 'TRANQUILLE')""")
    check(rest_ok, "categoria spenta tolta dalle prossime domande")

    # Riapro la pagina: la partita è salvata
    current = page.evaluate("hmQuestionsById.get(hmMatch.order[hmMatch.index]).text")
    open_page(page, base + "/hai-mai.html")
    check(page.locator("#resume-btn").is_visible(), "partita salvata")
    page.click("#resume-btn")
    page.wait_for_timeout(300)
    check(page.locator("#hm-question").inner_text() == current, "si riprende dalla stessa domanda")

    # Fine del mazzo: si rimescola
    page.evaluate("() => { hmMatch.index = hmMatch.order.length - 1; saveMatch(); fillCard(); }")
    page.click("footer >> text=PROSSIMA DOMANDA")
    page.wait_for_timeout(450)
    check(page.locator("#hm-counter").inner_text().startswith("1 / "), "finite le domande si ricomincia")
    back(page)


def test_verita(page, base):
    print("Verità o Bevi")
    open_page(page, base + "/verita-o-bevi.html")
    common_checks(page, "Verità o Bevi")
    check(page.locator("#players-list > div").count() == 3, "i nomi salvati arrivano anche qui")
    check(page.locator("#selected-count-badge").inner_text() == "160 domande", "160 domande (livelli 18+ spenti)")
    check(page.locator("#categories-list label").count() == 6, "6 livelli")
    check(page.locator("#crescendo-toggle").is_checked() and page.locator("#twists-toggle").is_checked(), "crescendo e imprevisti accesi")

    # Livelli 18+: prima la conferma
    page.locator("#categories-list input").nth(5).click()
    page.wait_for_timeout(350)
    check(page.locator("#adult-modal").is_visible(), "accendendo Hot spinto si chiede se siete maggiorenni")
    check(not page.locator("#categories-list input").nth(5).is_checked(), "finché non confermi resta spento")
    shot(page, "verita-adult")
    back(page)
    check(page.locator("#selected-count-badge").inner_text() == "160 domande", "annullato: niente domande hot")
    page.locator("#categories-list input").nth(5).click()
    page.wait_for_timeout(350)
    page.click("text=Siamo tutti maggiorenni")
    page.wait_for_timeout(300)
    check(page.locator("#selected-count-badge").inner_text() == "200 domande", "confermato: Hot spinto acceso")
    page.locator("#categories-list input").nth(4).check()
    page.wait_for_timeout(200)
    check(page.locator("#adult-modal").is_hidden(), "la conferma vale una volta sola")
    check(page.locator("#selected-count-badge").inner_text() == "240 domande", "tutti i livelli: 240 domande")
    shot(page, "verita-setup")

    # Partita: si parte leggeri, a turno
    page.click("#start-btn")
    page.wait_for_timeout(600)
    check(page.locator("#game-screen").is_visible(), "partita iniziata")
    check(page.locator("#vb-counter").inner_text() == "1 / 240", "domanda 1 di 240")
    check(page.evaluate("VERITA_CATEGORIES[currentQuestion().category].level") <= 2, "col crescendo si parte leggeri")
    check(page.evaluate("""() => {
      const n = crescendoStageSize(vbPlayers.length);
      const lv = id => VERITA_CATEGORIES[vbQuestionsById.get(id).category].level;
      return vbMatch.order.slice(0, n).every(id => lv(id) === 1)
        && vbMatch.order.slice(0, n * 6).some(id => lv(id) === 6);
    }"""), "prime 2-3 domande a testa leggere, poi si arriva fino alle hot")
    first = page.locator("#turn-name").inner_text()
    check(page.locator("#vb-for").inner_text() == first, "la domanda è per chi è di turno")
    page.evaluate("vbMatch.twistId = null; fillCard()")
    page.click("#vb-answer-btn")
    page.wait_for_timeout(450)
    check(page.evaluate("vbMatch.stats[vbPlayers[0].id].answered") == 1, "risposta contata")
    check(page.locator("#turn-name").inner_text() != first, "poi tocca al prossimo")
    page.evaluate("vbMatch.twistId = null; fillCard()")
    second = page.evaluate("vbMatch.p1Id")
    page.click("#vb-drink-btn")
    page.wait_for_timeout(450)
    check("beve" in page.locator("#toast-container").inner_text(), "chi beve viene annunciato")
    check(page.evaluate(f"vbMatch.stats['{second}'].drunk") == 1, "bevuta contata")

    # Imprevisti: pass e sorsi doppi
    page.evaluate("vbMatch.twistId = 'pass'; fillCard()")
    check(page.locator("#vb-drink-label").inner_text() == "Salto (pass)", "con il pass si salta senza bere")
    third = page.evaluate("vbMatch.p1Id")
    page.click("#vb-drink-btn")
    page.wait_for_timeout(450)
    check(page.evaluate(f"vbMatch.stats['{third}'].passed") == 1 and page.evaluate(f"vbMatch.stats['{third}'].drunk") == 0, "pass contato, niente sorsi")
    page.evaluate("vbMatch.twistId = 'doppio'; fillCard()")
    page.wait_for_timeout(800)
    doubled = page.evaluate("refusalSips(currentQuestion().category, 'doppio')")
    check(page.locator("#vb-drink-label").inner_text() == f"Bevo {doubled}", f"sorsi doppi ({doubled})")
    check(page.locator("#vb-twist .twist-box").is_visible(), "riquadro dell'imprevisto")
    check(page.evaluate("vbMatch.p1Id") and page.locator("#turn-name").inner_text() in page.locator("#vb-twist").inner_text(), "l'imprevisto nomina chi è di turno")
    shot(page, "verita-card")

    # {p2} con un nome strano: resta testo
    page.evaluate("""() => {
      vbMatch.order[vbMatch.index] = 'd28';
      vbMatch.twistId = null;
      vbMatch.p1Id = vbPlayers.find(p => !p.name.includes('Carla')).id;
      vbMatch.p2Id = vbPlayers.find(p => p.name.includes('Carla')).id;
      fillCard();
    }""")
    check(page.locator("#vb-question b").count() == 0 and "<b>Carla</b>" in page.locator("#vb-question").inner_text(), "il nome nella domanda resta testo")
    check("{p2}" not in page.locator("#vb-question").inner_text(), "{p2} sostituito dal nome")

    # Cambia domanda: stessa persona
    who = page.evaluate("vbMatch.p1Id")
    idx = page.evaluate("vbMatch.index")
    page.click("text=Cambia domanda")
    page.wait_for_timeout(450)
    check(page.evaluate("vbMatch.p1Id") == who and page.evaluate("vbMatch.index") == idx + 1, "Cambia domanda: stessa persona, domanda nuova")

    # Opzioni: arriva e se ne va qualcuno; classifica
    page.click("button[title='Opzioni Partita']")
    page.wait_for_timeout(300)
    page.fill("#midgame-player-input", "Elena")
    page.press("#midgame-player-input", "Enter")
    check(page.evaluate("vbPlayers.length") == 4, "nuovo arrivato al tavolo")
    page.locator("#midgame-players-list button").nth(3).click()
    check(page.evaluate("vbPlayers.length") == 3, "chi se ne va esce dal tavolo")
    check(page.evaluate("vbPlayers.some(p => p.id === vbMatch.p1Id) && vbMatch.p1Id !== vbMatch.p2Id"), "turno sempre a qualcuno al tavolo")
    page.click("text=Classifica della serata")
    page.wait_for_timeout(350)
    check("il più sincero" in page.locator("#leaderboard-titles").inner_text().lower(), "classifica della serata")
    check(page.locator("#leaderboard-list > div").count() == 3, "tutti i giocatori in classifica")
    shot(page, "verita-classifica")
    back(page)
    back(page)
    check(page.locator("#game-screen").is_visible(), "Indietro chiude prima le finestre")

    # Domanda vostra
    page.evaluate("openCustomModal()")
    page.wait_for_timeout(300)
    page.fill("#custom-input", "qual è il segreto del gruppo")
    page.press("#custom-input", "Enter")
    check(page.evaluate("vbCustom[0].text") == "Qual è il segreto del gruppo?", "domanda vostra sistemata")
    check(page.evaluate("vbMatch.order.includes(vbCustom[0].id)"), "entra nella partita in corso")
    back(page)

    # Riapro la pagina: partita salvata
    current = page.evaluate("currentQuestion().text")
    back(page)
    check(page.locator("#setup-screen").is_visible(), "Indietro dalla partita torna ai giocatori")
    check(page.locator("#categories-list label").count() == 7, "compare il livello Le vostre")
    back(page, False)
    open_page(page, base + "/verita-o-bevi.html")
    check(page.locator("#resume-btn").is_visible(), "partita salvata")
    page.click("#resume-btn")
    page.wait_for_timeout(300)
    check(page.evaluate("currentQuestion().text") == current, "si riprende dalla stessa domanda")
    check(page.evaluate("Object.keys(vbMatch.stats).length") >= 2, "i conti della serata restano")
    back(page)


APP_VERSION = json.loads((ROOT.parent / "package.json").read_text())["version"]
APK_URL = "https://github.com/Nikcirri/cincin/releases/download/v9.9.9/CinCin-v9.9.9.apk"

# Telefono finto: window.CinCinApp come nell'app Android, con il plugin degli aggiornamenti simulato.
FAKE_PHONE = """
(() => {
  window.__phone = { allowed: false, downloads: [], settingsOpened: 0, external: [] };
  const mock = {
    version: '%s',
    isNative: true,
    vibrate() {},
    minimize() {},
    openExternal(url) { window.__phone.external.push(url); },
    updater: {
      async canInstall() { return window.__phone.allowed; },
      async openInstallSettings() { window.__phone.settingsOpened++; },
      async downloadAndInstall(url, onProgress) {
        window.__phone.downloads.push(url);
        for (const p of [25, 50, 75, 100]) {
          await new Promise(r => setTimeout(r, 150));
          onProgress(p);
        }
      }
    }
  };
  // src/native.js prova a sostituirlo: qui si tiene quello finto
  Object.defineProperty(window, 'CinCinApp', { configurable: true, get() { return mock; }, set() {} });
})();
""" % APP_VERSION


def release_json(apk_url=APK_URL):
    return {
        "tag_name": "v9.9.9",
        "html_url": "https://github.com/Nikcirri/cincin/releases/tag/v9.9.9",
        "body": "Novità di prova.\n\n- **Prima** novità\n- Seconda novità\n  - dettaglio\n- Terza novità\n- Quarta novità\n\n### Come installare\n- niente",
        "assets": [{"name": "CinCin-v9.9.9.apk", "browser_download_url": apk_url}],
    }


def test_updates(browser, base):
    print("Aggiornamenti dentro l'app (telefono simulato)")
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    context.add_init_script(FAKE_PHONE)
    calls = {"n": 0, "apk": APK_URL}

    def github(route):
        calls["n"] += 1
        route.fulfill(status=200, content_type="application/json", body=json.dumps(release_json(calls["apk"])))

    context.route("https://api.github.com/repos/Nikcirri/cincin/releases/latest", github)
    page = context.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # "App aggiornata alla versione X" solo al primo avvio dopo un aggiornamento
    open_page(page, base + "/index.html")
    page.evaluate("localStorage.setItem('cincin_last_version_v1', JSON.stringify('1.1.0'))")
    open_page(page, base + "/index.html")
    page.wait_for_timeout(700)
    check(f"App aggiornata alla versione {APP_VERSION}" in page.locator("#toast-container").inner_text(), "messaggio App aggiornata")
    open_page(page, base + "/index.html")
    page.wait_for_timeout(700)
    check("App aggiornata" not in page.locator("#toast-container").inner_text(), "il messaggio compare una volta sola")

    # Avviso in alto con versione, 3 novità, Aggiorna e Dopo
    banner = page.locator("#update-banner")
    check(banner.is_visible(), "avviso della nuova versione in alto")
    text = banner.inner_text()
    check("Nuova versione 9.9.9" in text, "numero di versione nell'avviso")
    check(banner.locator("li").count() == 3 and "Prima novità" in text and "Quarta" not in text and "dettaglio" not in text,
          "le prime 3 novità del changelog")
    check(banner.locator("button", has_text="Aggiorna").count() == 1 and banner.locator("button", has_text="Dopo").count() == 1,
          "pulsanti Aggiorna e Dopo")
    check(calls["n"] == 1, "un solo controllo su GitHub")
    shot(page, "update-banner")

    page.locator("#update-banner button", has_text="Dopo").click()
    page.wait_for_timeout(300)
    check(banner.is_hidden(), "Dopo chiude l'avviso")
    check("Aggiornamenti" in page.locator("#toast-container").inner_text(), "Dopo dice dove ritrovarlo")
    check(page.locator("#updates-entry-dot").is_visible() and "9.9.9" in page.locator("#updates-entry-sub").inner_text(),
          "la voce Aggiornamenti segnala la nuova versione")

    open_page(page, base + "/index.html")
    page.wait_for_timeout(300)
    check(banner.is_hidden(), "dopo Dopo l'avviso non torna a ogni pagina")
    check(calls["n"] == 1, "entro 10 minuti non si richiede a GitHub")
    page.evaluate("""() => {
      const s = JSON.parse(localStorage.getItem('cincin_updates_v1'));
      s.lastCheck = new Date(Date.now() - 11 * 60000).toISOString();
      localStorage.setItem('cincin_updates_v1', JSON.stringify(s));
      window.dispatchEvent(new Event('cincin:resume'));
    }""")
    page.wait_for_timeout(500)
    check(calls["n"] == 2, "al ritorno nell'app, dopo 10 minuti, ricontrolla")

    # Voce Aggiornamenti: versione, Controlla, Aggiorna dall'app, Scarica da GitHub
    page.click("#updates-entry")
    page.wait_for_timeout(300)
    check(f"Versione installata: {APP_VERSION}" in page.locator("#updates-version").inner_text(), "versione installata")
    page.click("#updates-check-btn")
    page.wait_for_timeout(400)
    check("9.9.9" in page.locator("#updates-status").inner_text(), "Controlla aggiornamenti trova la 9.9.9")
    shot(page, "updates-modal")
    page.click("text=Scarica da GitHub")
    check(page.evaluate("window.__phone.external") == ["https://github.com/Nikcirri/cincin/releases/latest"], "Scarica da GitHub apre la pagina delle Release")

    # Permesso "Installa app sconosciute": spiegazione, impostazioni, ripresa da sola
    page.click("#updates-install-btn")
    page.wait_for_timeout(350)
    check(page.locator("#permission-modal").is_visible(), "spiega il permesso da dare")
    shot(page, "update-permission")
    page.locator("#permission-modal button", has_text="Apri impostazioni").click()
    page.wait_for_timeout(300)
    check(page.evaluate("window.__phone.settingsOpened") == 1, "apre le impostazioni giuste")
    check("Dai il permesso" in banner.inner_text(), "l'avviso dice cosa fare")
    page.evaluate("window.__phone.allowed = true; window.dispatchEvent(new Event('cincin:resume'))")
    page.wait_for_timeout(380)
    check("Scarico la versione 9.9.9" in banner.inner_text() and "%" in banner.inner_text(), "al ritorno riparte e mostra la percentuale")
    shot(page, "update-download")
    page.wait_for_timeout(800)
    check(page.evaluate("window.__phone.downloads") == [APK_URL], "scarica solo l'APK della Release")
    check("Quasi fatto" in banner.inner_text(), "poi apre l'installazione di Android")
    page.evaluate("window.dispatchEvent(new Event('cincin:resume'))")
    page.wait_for_timeout(300)
    check("Nuova versione 9.9.9" in banner.inner_text(), "se non si installa, si può riprovare")

    # Indirizzo dell'APK non ammesso: niente download, si apre la pagina di GitHub
    calls["apk"] = "https://altrove.example/CinCin-v9.9.9.apk"
    page.evaluate("localStorage.removeItem('cincin_updates_v1'); sessionStorage.clear()")
    open_page(page, base + "/index.html")
    page.wait_for_timeout(400)
    page.locator("#update-banner button", has_text="Aggiorna").click()
    page.wait_for_timeout(300)
    check(page.evaluate("window.__phone.downloads.length") == 0, "un APK fuori dalle Release non si scarica")
    check(page.evaluate("window.__phone.external.slice(-1)[0]").startswith("https://github.com/Nikcirri/cincin/"), "si apre GitHub al suo posto")
    back(page, False)
    context.close()


def main():
    if not (DIST / "index.html").exists():
        print("Prima esegui: npm run build")
        sys.exit(1)
    httpd = serve()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("dialog", lambda d: (errors.append("finestra di dialogo inattesa: " + d.message), d.dismiss()))

        test_home(page, base)
        test_neon_sips(page, base)
        test_hai_mai(page, base)
        test_verita(page, base)
        test_updates(browser, base)

        print("Menu con partite in corso")
        open_page(page, base + "/index.html")
        check(page.locator(".home-game-card", has_text="Partita in corso").count() == 3, "il menu segna le partite in corso")
        check(page.evaluate("loadSavedPlayerNames().length") == 3, "i nomi dei giocatori sono salvati")
        shot(page, "home-in-corso")
        browser.close()
    httpd.shutdown()

    if errors:
        print("Errori nella pagina:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("Tutto ok")


if __name__ == "__main__":
    main()
