"""Prova completa dell'app nel browser (Chrome), come farebbe una persona.

Uso (dopo `npm run build`):  python3 tests/smoke.py
Serve Python con Playwright e Google Chrome installati. Non gira su GitHub Actions.
"""
import functools
import http.server
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


def test_home(page, base):
    print("Menu iniziale")
    open_page(page, base + "/index.html")
    check(page.locator("h1").inner_text().strip() == "CIN CIN", "titolo Cin Cin")
    check(page.locator(".home-game-card").count() == 2, "due giochi nel menu")
    check(page.locator("[data-game=hai-mai]").get_attribute("href") == "./hai-mai.html", "link a Hai Mai?")
    check(page.locator("[data-game=neon-sips]").get_attribute("href") == "./neon-sips.html", "link a Neon Sips")
    check("Versione" in page.locator("#footer-version").inner_text(), "versione in fondo")
    page.click("button[aria-label='Informazioni e aggiornamenti']")
    check(page.locator("#info-modal").is_visible(), "si apre la finestra informazioni")
    check(page.evaluate("handleAndroidBack()") is True, "Indietro chiude la finestra")
    check(page.locator("#info-modal").is_hidden(), "finestra chiusa")
    check(page.evaluate("handleAndroidBack()") is False, "Indietro dal menu: esce dall'app")
    shot(page, "home")


def test_neon_sips(page, base):
    print("Neon Sips")
    open_page(page, base + "/neon-sips.html")
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
    shot(page, "neon-game")

    # Tasto Indietro: dalla partita alla schermata iniziale
    check(page.evaluate("handleAndroidBack()") is True, "Indietro gestito in partita")
    check(page.locator("#start-screen").is_visible(), "torna alla schermata iniziale")
    check("RIPRENDI" in page.locator("#resume-game-btn").inner_text(), "si può riprendere la partita")
    check(page.evaluate("handleAndroidBack()") is False, "Indietro dalla schermata iniziale: menu dei giochi")

    # Riapro la pagina: la partita è salvata
    open_page(page, base + "/neon-sips.html")
    check(page.locator("#resume-game-btn").is_visible(), "partita salvata dopo aver chiuso")
    page.click("#resume-game-btn")
    page.wait_for_timeout(500)
    check(page.locator("#game-screen").is_visible(), "partita ripresa")
    check(page.locator("#active-rules-count").inner_text() == "1", "la regola è ancora sul tavolo")
    check("🛡️ 1" in page.locator("#players-shield-bar").inner_text() or holder == "Dario", "lo scudo è ancora lì")

    # Carta personalizzata
    page.evaluate("handleAndroidBack()")
    page.click("text=Crea Carta")
    page.fill("#form-card-title", "Carta di prova")
    page.fill("#form-card-text", "{p1} brinda con {p2} <img src=x onerror=alert(1)>")
    page.click("#form-save-card-btn")
    check(page.locator("#lobby-deck-count").inner_text() == "71", "carta aggiunta al mazzo (71)")
    check(page.evaluate("handleAndroidBack()") is True, "Indietro chiude l'editor")
    check(page.locator("#deck-manager-modal").is_hidden(), "editor chiuso")
    page.click("#resume-game-btn")
    page.evaluate("""() => {
      currentCard = { ...customDeck.find(c => c.title === 'Carta di prova') };
      updateGameUI();
    }""")
    check(page.locator("#card-description img").count() == 0, "il testo della carta non può inserire immagini o codice")
    page.evaluate("handleAndroidBack()")
    shot(page, "neon-lobby")


def test_hai_mai(page, base):
    print("Hai Mai?")
    open_page(page, base + "/hai-mai.html")
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
    check(page.locator("#hm-twist").is_visible(), "si vede l'imprevisto")
    check("NON" in page.locator("#hm-twist-rule").inner_text(), "regola dell'imprevisto al contrario")
    check(page.locator("#hm-rule").is_hidden(), "la regola normale si nasconde")
    shot(page, "haimai-twist")

    # Domanda vostra
    page.click("button[title='Le vostre domande']")
    page.fill("#custom-input", "hai mai bevuto <i>tutto</i>")
    page.press("#custom-input", "Enter")
    check(page.evaluate("hmCustom.length") == 1, "domanda vostra aggiunta con Invio")
    check(page.evaluate("hmCustom[0].text") == "Hai mai bevuto <i>tutto</i>?", "domanda sistemata (maiuscola e ?)")
    check(page.locator("#custom-list p i").count() == 0, "il testo non diventa HTML")
    check(page.evaluate("hmMatch.order.length") == 121, "entra nella partita in corso")
    check(page.evaluate("handleAndroidBack()") is True, "Indietro chiude la finestra")
    check(page.evaluate("handleAndroidBack()") is True, "Indietro dalla partita torna alle categorie")
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
    page.evaluate("handleAndroidBack()")


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

        print("Menu con partite in corso")
        open_page(page, base + "/index.html")
        check(page.locator(".home-game-card", has_text="Partita in corso").count() == 2, "il menu segna le partite in corso")
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
