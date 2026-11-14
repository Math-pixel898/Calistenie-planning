/* =====================================================================
   TESTS.JS — simule plusieurs semaines de séances fictives et montre
   ce que l'app propose à chaque fois. Ouvre tests.html pour les voir.
   Rien ici ne touche à tes vraies données (mode test).
   ===================================================================== */
"use strict";

const DEBUT = new Date("2026-01-05T18:00:00"); // un lundi fictif
let verifs = [];   // { ok, texte }
let html = "";

function verifier(condition, texte) { verifs.push({ ok: !!condition, texte }); return condition; }

// Remet l'app à zéro (données de test vides, phase "complète" : séries pleines)
function reinitialiser() {
  donnees = donneesVides();
  donnees.dateDebut = "2025-01-01";
}

// Ajoute une séance fictive au journal, "jour" jours après DEBUT
function seanceFictive(idExo, jour, { series = null, resultat = null, toutesLesSeries = true } = {}) {
  const p = prevu(idExo);
  // "toutes" = le haut de la fourchette sur toutes les séries prévues
  if (series === "toutes") series = Array(p.series).fill(p.cible[1]);
  const e = {
    id: "test" + jour + Math.random(), date: new Date(DEBUT.getTime() + jour * UN_JOUR).toISOString(),
    seance: "test", exo: idExo,
    resultat: resultat || (series ? resultatDepuisSeries(series, p.cible, p.series) : "dur"),
    series, chargeKg: p.chargeKg, cible: p.cible.slice(), seriesPrevues: p.series, version: p.version, douleur: []
  };
  donnees.journal.push(e);
  return e;
}

// Joue un scénario : liste de séances, l'app analyse après chacune.
// accepter = true : on accepte les propositions (comme si tu appuyais sur "Accepter")
function scenario(titre, explication, idExo, seances, { accepter = true } = {}) {
  reinitialiser();
  const exo = PROGRAMME.exercices[idExo];
  const lignes = [];
  for (const s of seances) {
    const avant = prevu(idExo);
    const e = seanceFictive(idExo, s.jour, s);
    const a = analyser(idExo);
    lignes.push({ jour: s.jour, avant, e, a });
    verifier(a && a.raison && a.raison.length > 30, `${titre} — jour ${s.jour} : l'app explique pourquoi`);
    if (accepter && a && a.changement && !a.traitee) accepterProposition(idExo);
  }
  html += `<section class="carte"><h2>${titre}</h2><p class="doux">${explication}</p>
    <p class="doux">Exercice : <strong>${exo.nom}</strong> (fourchette de départ ${exo.cible.join("-")} ${unite(exo)}${avecCharge(exo) ? ", " + kg(exo.chargeKg) : ""})</p>
    <div class="defile"><table><tr><th>Jour</th><th>Ce que tu as fait</th><th>Ce que l'app propose</th><th class="raison">Pourquoi</th></tr>
    ${lignes.map(l => `<tr>
      <td>S${Math.floor(l.jour / 7) + 1} · j${l.jour}</td>
      <td>${l.e.series ? l.e.series.join("/") : "« Trop dur »"}${avecCharge(exo) ? " à " + kg(l.e.chargeKg) : ""}<br><span class="doux">fourchette ${l.e.cible.join("-")}</span></td>
      <td><strong>${l.a.titre}</strong>${l.a.changement ? (accepter ? " → accepté" : "") : ""}</td>
      <td class="raison doux">${l.a.raison}</td></tr>`).join("")}
    </table></div></section>`;
  return lignes;
}

const monte = l => l.a.sens === "monter";
const baisse = l => l.a.sens === "baisser";

/* ---------- 1. Tout réussi, avec charge (gripper) ---------- */
{
  const top = "toutes";
  const l = scenario("1. Tout réussi (gripper)",
    "Tu fais le haut de la fourchette sur toutes les séries à chaque séance, 2 fois par semaine. Après la montée de charge, tes reps baissent puis remontent.",
    "grip-normale", [
      { jour: 0, series: top }, { jour: 3, series: top }, { jour: 7, series: top }, { jour: 10, series: top },
      { jour: 14, series: top },                                // 2 semaines au top -> monter
      { jour: 17, series: [6, 6, 5, 5] }, { jour: 21, series: [7, 6, 6, 6] }, { jour: 24, series: [8, 7, 7, 7] },
      { jour: 28, series: top }, { jour: 31, series: top }, { jour: 35, series: top }, { jour: 38, series: top },
      { jour: 42, series: top }                                 // 2 semaines au top à 11 kg -> monter
    ]);
  verifier(l.slice(0, 4).every(x => !monte(x)), "1 — pas de montée avant 2 semaines au top");
  verifier(monte(l[4]) && l[4].a.changement.chargeKg === 11, "1 — montée proposée au bout de 14 jours, d'un seul cran (10 → 11 kg)");
  verifier(l.slice(5, 12).every(x => !monte(x)), "1 — après la montée, on attend à nouveau 2 semaines au top");
  verifier(monte(l[12]) && l[12].a.changement.chargeKg === 12, "1 — nouvelle montée d'un cran seulement (11 → 12 kg)");
}

/* ---------- 2. Tout réussi, sans charge (pompes) ---------- */
{
  const l = scenario("2. Tout réussi (pompes, sans charge)",
    "Même chose avec un exercice au poids du corps.",
    "pompes-classiques", [0, 4, 7, 11, 14, 18].map(j => ({ jour: j, series: "toutes" })));
  verifier(l.slice(0, 4).every(x => !monte(x)), "2 — pas de montée avant 2 semaines");
  verifier(monte(l[4]), "2 — proposition de monter au bout de 14 jours");
}

/* ---------- 3. Séries ratées ---------- */
{
  const l = scenario("3. Séries ratées (sous le bas de la fourchette)",
    "Tu n'arrives pas au bas de la fourchette (5 reps). Puis, à la charge baissée, ça va mieux.",
    "grip-normale", [
      { jour: 0, series: [5, 4, 4, 3] },
      { jour: 3, series: [7, 6, 6, 6] },
      { jour: 7, series: null, resultat: "dur" }
    ]);
  verifier(baisse(l[0]) && l[0].a.changement.chargeKg === 9, "3 — baisse proposée, d'un seul cran (10 → 9 kg)");
  verifier(l[1].a.sens === "rester", "3 — dans la fourchette : on ne change rien");
  verifier(baisse(l[2]), "3 — bouton « Trop dur » : baisse proposée");
}

/* ---------- 4. Une séance moins bonne au milieu ---------- */
{
  const l = scenario("4. Une séance moins bonne au milieu",
    "Au top, puis une séance un peu moins bonne : le compteur des 2 semaines repart de zéro.",
    "grip-normale", [
      { jour: 0, series: "toutes" }, { jour: 3, series: "toutes" }, { jour: 7, series: "toutes" },
      { jour: 10, series: [8, 8, 7, 7] },
      { jour: 14, series: "toutes" }, { jour: 17, series: "toutes" }, { jour: 21, series: "toutes" }, { jour: 24, series: "toutes" },
      { jour: 28, series: "toutes" }
    ]);
  verifier(!monte(l[4]) && !monte(l[7]), "4 — pas de montée au jour 14 ni 24 (compteur reparti au jour 14)");
  verifier(monte(l[8]), "4 — montée au jour 28 (2 semaines après la reprise du top)");
}

/* ---------- 5. Haut atteint, mais pas toutes les séries ---------- */
{
  const l = scenario("5. Une série oubliée",
    "Haut de la fourchette, mais 3 séries au lieu de 4 : ça ne compte pas comme « tout réussi ».",
    "grip-normale", [0, 3, 7, 10, 14, 17].map(j => ({ jour: j, series: [8, 8, 8] })));
  verifier(l.every(x => !monte(x)), "5 — jamais de montée si toutes les séries ne sont pas faites");
}

/* ---------- 5 bis. Séances espacées ---------- */
{
  const l = scenario("5 bis. Seulement 2 séances en 2 semaines",
    "Tu as sauté des séances : 2 séances au top à 14 jours d'écart ne suffisent pas, il en faut au moins 4.",
    "grip-normale", [{ jour: 0, series: "toutes" }, { jour: 14, series: "toutes" }, { jour: 17, series: "toutes" }, { jour: 21, series: "toutes" }]);
  verifier(!monte(l[1]) && !monte(l[2]), "5 bis — pas de montée avec seulement 2 ou 3 séances au top");
  verifier(monte(l[3]), "5 bis — montée à la 4e séance au top (plus de 2 semaines)");
}

/* ---------- 5 ter. Version facile ---------- */
{
  const l = scenario("5 ter. Version facile (pompes diamant)",
    "L'exercice commence en version facile (reprise). Au top 2 semaines : l'app propose la version normale. Si c'est trop dur en normale : retour à la version facile avant de baisser les reps.",
    "pompes-diamant", [
      { jour: 0, series: "toutes" }, { jour: 4, series: "toutes" }, { jour: 7, series: "toutes" }, { jour: 11, series: "toutes" },
      { jour: 14, series: "toutes" },
      { jour: 18, series: [5, 4, 4] }
    ]);
  verifier(l[0].e.version === "facile", "5 ter — la séance est notée en version facile");
  verifier(l.slice(0, 4).every(x => !monte(x)), "5 ter — pas de changement avant 2 semaines");
  verifier(monte(l[4]) && l[4].a.changement.version === "normale", "5 ter — proposition : passer à la version normale (même fourchette)");
  verifier(baisse(l[5]) && l[5].a.changement.version === "facile", "5 ter — trop dur en normale : retour à la version facile d'abord");
}

/* ---------- 6. Gripper au maximum ---------- */
{
  reinitialiser();
  donnees.ajustements["grip-normale"] = { chargeKg: 12 };
  [0, 3, 7, 10, 14].forEach(j => seanceFictive("grip-normale", j, { series: "toutes" }));
  const a = analyser("grip-normale");
  verifier(!a.changement || a.changement.chargeKg <= 12, "6 — jamais au-dessus de 12 kg (maximum du gripper)");
  html += `<section class="carte"><h2>6. Gripper au maximum (12 kg)</h2><p><strong>${a.titre}</strong></p><p class="doux">${a.raison}</p></section>`;
}

/* ---------- 7. Douleur ---------- */
{
  reinitialiser();
  const H = 3600000;
  const cas = [
    ["Signalée il y a 12 h", 12, "surveiller"],
    ["Toujours là après 30 h", 30, "reduire"],
    ["Toujours là après 6 jours", 6 * 24, "reduire"],
    ["Toujours là après 8 jours", 8 * 24, "medecin"]
  ];
  html += `<section class="carte"><h2>7. Douleur (coude)</h2>
    <p class="doux">L'app compte la durée entre le moment où tu signales la douleur et la dernière fois où tu confirmes qu'elle est toujours là.</p>
    <div class="defile"><table><tr><th>Situation</th><th>Ce que l'app propose</th></tr>`;
  for (const [texte, heures, attendu] of cas) {
    const d = { zone: "coude", debut: DEBUT.toISOString(), derniereConfirmation: new Date(DEBUT.getTime() + heures * H).toISOString() };
    const e = etatDouleur(d);
    verifier(e.niveau === attendu, `7 — ${texte} : niveau « ${attendu} »`);
    verifier(e.raison.length > 30, `7 — ${texte} : l'app explique pourquoi`);
    html += `<tr><td>${texte}</td><td>${e.raison}</td></tr>`;
  }
  html += `</table></div></section>`;
}

/* ---------- Résumé ---------- */
const nbOk = verifs.filter(v => v.ok).length;
document.getElementById("resultats").innerHTML =
  `<div class="carte ${nbOk === verifs.length ? "succes" : "alerte"}">
     <h2>${nbOk === verifs.length ? "✅" : "❌"} ${nbOk} / ${verifs.length} vérifications réussies</h2>
     <details><summary>Voir la liste</summary><ul>${verifs.map(v =>
       `<li class="${v.ok ? "ok" : "ko"}">${v.ok ? "✔" : "✘"} <span>${v.texte}</span></li>`).join("")}</ul></details>
   </div>` + html;

// On efface la mémoire de test
localStorage.removeItem(CLE_STOCKAGE);
