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

// Ajoute une séance fictive au journal, "jour" jours après DEBUT.
// series = "ok" -> toutes les séries à l'objectif ; "moins1" -> une rep de moins sur la dernière série
function seanceFictive(idExo, jour, { series = "ok", resultat = null } = {}) {
  const p = prevu(idExo);
  if (series === "ok") series = Array(p.series).fill(p.objectif);
  if (series === "moins1") series = Array(p.series).fill(p.objectif).map((r, i, t) => i === t.length - 1 ? r - 1 : r);
  const e = {
    id: "test" + jour + Math.random(), date: new Date(DEBUT.getTime() + jour * UN_JOUR).toISOString(),
    seance: "test", exo: idExo,
    resultat: resultat || (series ? resultatDepuisSeries(series, p.objectif, p.series) : "dur"),
    series, chargeKg: p.chargeKg, objectif: p.objectif, seriesPrevues: p.series, version: p.version, douleur: []
  };
  donnees.journal.push(e);
  return e;
}

// Joue un scénario : liste de séances, l'app analyse après chacune.
// On accepte les propositions (comme si tu appuyais sur "Accepter").
function scenario(titre, explication, idExo, seances, { accepter = true, preparer = null } = {}) {
  reinitialiser();
  if (preparer) preparer();
  const exo = PROGRAMME.exercices[idExo];
  const lignes = [];
  for (const s of seances) {
    const e = seanceFictive(idExo, s.jour, s);
    const a = analyser(idExo);
    lignes.push({ jour: s.jour, e, a });
    verifier(a && a.raison && a.raison.length > 30, `${titre} — jour ${s.jour} : l'app explique pourquoi`);
    if (accepter && a && a.changement && !a.traitee) accepterProposition(idExo);
  }
  html += `<section class="carte"><h2>${titre}</h2><p class="doux">${explication}</p>
    <p class="doux">Exercice : <strong>${exo.nom}</strong> (objectif de départ ${exo.objectif} ${unite(exo)}${avecCharge(exo) ? ", " + kg(exo.chargeKg) + ", plafond " + exo.max : ""})</p>
    <div class="defile"><table><tr><th>Jour</th><th>Ce que tu as fait</th><th>Ce que l'app propose</th><th class="raison">Pourquoi</th></tr>
    ${lignes.map(l => `<tr>
      <td>S${Math.floor(l.jour / 7) + 1} · j${l.jour}</td>
      <td>${l.e.series ? l.e.series.join("/") : "« Trop dur »"}${avecCharge(exo) ? " à " + kg(l.e.chargeKg) : ""}<br><span class="doux">objectif ${l.e.objectif}${l.e.version === "facile" ? " (facile)" : ""}</span></td>
      <td><strong>${l.a.titre}</strong>${l.a.changement && accepter ? " → accepté" : ""}</td>
      <td class="raison doux">${l.a.raison}</td></tr>`).join("")}
    </table></div></section>`;
  return lignes;
}

const monte = l => l.a.sens === "monter";
const baisse = l => l.a.sens === "baisser";

/* ---------- 1. Gripper : les reps montent une par une, puis +1 kg avec prudence ---------- */
{
  const jours = [0, 3, 7, 10, 14, 17, 21, 24, 28, 31, 35];
  const l = scenario("1. Gripper : tout réussi",
    "Tu réussis l'objectif à chaque séance (2 par semaine). Les reps montent d'1 toutes les 2 séances réussies jusqu'au plafond (8), puis il faut 2 semaines et 4 séances au plafond avant +1 kg.",
    "grip-normale", jours.map(j => ({ jour: j })));
  verifier(!monte(l[0]) && monte(l[1]) && l[1].a.changement.objectif === 6, "1 — +1 rep seulement après 2 séances réussies (5 → 6)");
  verifier(l.every(x => !x.a.changement || !x.a.changement.objectif || x.a.changement.chargeKg !== undefined || x.a.changement.objectif - x.e.objectif === 1), "1 — les reps montent toujours d'1 seule rep");
  const montees = l.filter(x => x.a.changement?.chargeKg !== undefined);
  verifier(montees.length === 1 && montees[0].jour === 35, "1 — +1 kg seulement au jour 35 (2 semaines et 4 séances au plafond de 8)");
  verifier(montees[0]?.a.changement.chargeKg === 11 && montees[0]?.a.changement.objectif === 5, "1 — un seul cran (10 → 11 kg) et l'objectif revient à 5");
}

/* ---------- 2. Pompes : progression régulière, une séance ratée remet le compteur ---------- */
{
  const l = scenario("2. Pompes : une séance moins bonne au milieu",
    "2 séances réussies → +1 rep. Une séance un peu en dessous : on garde l'objectif et le compteur repart.",
    "pompes-classiques", [
      { jour: 0 }, { jour: 4 },                  // -> 11
      { jour: 7 }, { jour: 11, series: "moins1" }, // presque : on garde 11
      { jour: 14 }, { jour: 18 }                 // -> 12
    ]);
  verifier(monte(l[1]) && l[1].a.changement.objectif === 11, "2 — 10 → 11 après 2 séances réussies");
  verifier(l[3].a.sens === "rester" && !l[3].a.changement, "2 — une rep de moins : on garde l'objectif, rien ne change");
  verifier(!monte(l[4]) && monte(l[5]) && l[5].a.changement.objectif === 12, "2 — le compteur repart : 11 → 12 seulement après 2 nouvelles réussites");
}

/* ---------- 3. Trop dur ---------- */
{
  const l = scenario("3. Trop dur",
    "En version normale : l'app propose d'abord la version facile. Déjà en facile : -1 rep.",
    "pompes-classiques", [
      { jour: 0, series: null, resultat: "dur" },  // normale -> facile
      { jour: 4, series: [4, 3, 3] }               // facile, loin de l'objectif -> -1 rep
    ]);
  verifier(baisse(l[0]) && l[0].a.changement.version === "facile", "3 — trop dur en version normale : passer en version facile");
  verifier(baisse(l[1]) && l[1].a.changement.objectif === 9, "3 — trop dur en facile : -1 rep (10 → 9)");
  const g = scenario("3 bis. Gripper trop dur",
    "Au minimum de reps (5) : on baisse d'un cran de charge.",
    "grip-normale", [{ jour: 0, series: [3, 3, 2, 2] }]);
  verifier(baisse(g[0]) && g[0].a.changement.chargeKg === 9, "3 bis — gripper au minimum de reps : -1 kg (10 → 9)");
}

/* ---------- 4. Version facile -> normale ---------- */
{
  const l = scenario("4. Version facile (pompes diamant)",
    "L'exercice commence en version facile (reprise). Il faut 2 semaines et 4 séances réussies avant de proposer la version normale.",
    "pompes-diamant", [0, 4, 7, 11, 14].map(j => ({ jour: j })));
  verifier(l[0].e.version === "facile", "4 — la séance est notée en version facile");
  verifier(l.slice(0, 4).every(x => !monte(x)), "4 — pas de changement avant 2 semaines");
  verifier(monte(l[4]) && l[4].a.changement.version === "normale", "4 — puis : passer en version normale, même objectif");
}

/* ---------- 5. Séances espacées (prudence gripper) ---------- */
{
  const l = scenario("5. Gripper : séances espacées au plafond",
    "Au plafond de reps, 2 séances à 14 jours d'écart ne suffisent pas : il en faut au moins 4.",
    "grip-normale", [{ jour: 0 }, { jour: 14 }, { jour: 17 }, { jour: 21 }],
    { preparer: () => { donnees.ajustements["grip-normale"] = { objectif: 8 }; } });
  verifier(l.slice(0, 3).every(x => !x.a.changement?.chargeKg), "5 — pas de +1 kg avec seulement 2 ou 3 séances au plafond");
  verifier(l[3].a.changement?.chargeKg === 11, "5 — +1 kg à la 4e séance au plafond (plus de 2 semaines)");
}

/* ---------- 6. Gripper au maximum ---------- */
{
  const l = scenario("6. Gripper au maximum (12 kg)", "Au maximum du gripper, l'app ne propose plus de monter.",
    "grip-normale", [0, 3, 7, 10, 14].map(j => ({ jour: j })),
    { preparer: () => { donnees.ajustements["grip-normale"] = { chargeKg: 12, objectif: 8 }; } });
  verifier(l.every(x => !x.a.changement || (x.a.changement.chargeKg ?? 12) <= 12), "6 — jamais au-dessus de 12 kg");
  verifier(/maximale/.test(l[4].a.titre), "6 — message « charge maximale atteinte »");
}

/* ---------- 8. Plafond -> variante plus dure ---------- */
{
  const l = scenario("8. Squat : plafond puis variante plus dure",
    "Plafond du squat : 25. Au plafond, l'app propose la fente bulgare toutes les 2 séances réussies. Ici on refuse (Ignorer) : on reste au squat, puis elle le repropose.",
    "squat", [0, 3, 7, 10, 14, 17].map(j => ({ jour: j })),
    { accepter: false, preparer: () => { donnees.ajustements["squat"] = { objectif: 25 }; } });
  verifier(l[0].a.sens === "rester" && /Plafond/.test(l[0].a.titre), "8 — 1re séance au plafond : on n'ajoute plus de reps");
  verifier(l[1].a.changement?.remplacement === "fente-bulgare", "8 — 2e séance au plafond : proposition de la fente bulgare");
  verifier(!l[2].a.changement && l[3].a.changement?.remplacement === "fente-bulgare", "8 — refusée : on reste au squat, reproposée 2 séances plus tard");
  verifier(l.every(x => !x.a.changement?.objectif || x.a.changement.objectif <= 25), "8 — jamais au-dessus du plafond de 25");
  // On accepte maintenant
  donnees.propositionsTraitees = {};
  accepterProposition("squat");
  verifier(exercicesDe("jambes")[0] === "fente-bulgare", "8 — acceptée : la fente bulgare remplace le squat dans la séance Jambes");
  verifier(prevu("fente-bulgare").objectif === 6, "8 — la variante commence à son propre objectif (6 par jambe)");
  verifier(exercicePrecedent("fente-bulgare") === "squat", "8 — on peut revenir au squat");
  delete donnees.remplacements["squat"];
  verifier(exercicesDe("jambes")[0] === "squat", "8 — retour en arrière : le squat revient dans la séance");
}

/* ---------- 9. Plafond -> alourdir le sac ---------- */
{
  const l = scenario("9. Rowing avec sac : plafond puis sac plus lourd",
    "Plafond : 20. L'app propose d'alourdir le sac et de repartir à 10.",
    "rowing-sac", [{ jour: 0 }, { jour: 3 }],
    { preparer: () => { donnees.ajustements["rowing-sac"] = { objectif: 20 }; } });
  verifier(l[1].a.titre === "Alourdir le sac ?" && l[1].a.changement?.objectif === 10, "9 — au plafond : alourdir le sac et repartir à 10");
}

/* ---------- 10. Plafond sans variante ---------- */
{
  const l = scenario("10. Pompes au mur : plafond sans variante",
    "C'est l'échauffement : au plafond, l'app conseille simplement de garder ce niveau.",
    "pompes-mur", [0, 3, 7, 10].map(j => ({ jour: j })),
    { preparer: () => { donnees.ajustements["pompes-mur"] = { objectif: 25 }; } });
  verifier(l.every(x => !x.a.changement) && /échauffement/.test(l[3].a.raison), "10 — aucun changement proposé, juste un conseil");
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
