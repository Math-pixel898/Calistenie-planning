/* =====================================================================
   APP.JS — le fonctionnement de l'app.
   Tu n'as normalement PAS besoin de modifier ce fichier :
   tes exercices, ton planning et tes règles sont dans programme.js.

   Organisation du fichier :
   1. Sauvegarde des données (localStorage)
   2. Petits outils (dates, textes, durées)
   3. Suivi : enregistrer un exercice fait
   4. Adaptation automatique (règles simples, sans IA)
   5. Douleurs
   6. Saisie vocale (lecture de la phrase dictée)
   7. Pages : Planning, Séance, Fiche, Historique, Réglages
   8. Navigation + installation (PWA)
   ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
   1. SAUVEGARDE DES DONNÉES
   Tout est rangé dans la mémoire de ton navigateur (localStorage),
   sous une seule clé. Rien n'est envoyé sur internet.
   --------------------------------------------------------------------- */
// En mode test (page tests.html), on travaille sur une copie à part :
// tes vraies données ne sont jamais touchées.
const MODE_TEST = window.MODE_TEST === true;
const CLE_STOCKAGE = MODE_TEST ? "calisthenie-tests" : "calisthenie-donnees";
const REGLES = PROGRAMME.regles;

// Forme des données au premier lancement
function donneesVides() {
  return {
    version: 1,
    dateDebut: aujourdhuiISO(), // début du programme (sert à calculer la semaine)
    journal: [],                // chaque exercice fait = une "entrée"
    ajustements: {},            // charges / fourchettes modifiées : { idExo: { chargeKg, cible } }
    historiqueAjustements: [],  // trace de chaque changement accepté
    propositionsTraitees: {},   // { idEntrée: "acceptee" | "ignoree" }
    douleurs: [],               // douleurs signalées et leur suivi
    decalages: {},              // { "lundi de la semaine": [{ cle, jourPrevu, vers }] }
    seancesSautees: {},         // { "lundi de la semaine": ["cle@jourPrevu"] } (séance ratée laissée tomber)
    echauffements: {},          // { "2026-11-14": "fait" | "passe" }
    derniereSauvegarde: null,   // date du dernier export (fichier de sauvegarde)
    rappelSauvegardeMasque: null // jour où tu as appuyé sur « Plus tard »
  };
}

function chargerDonnees() {
  try {
    const texte = localStorage.getItem(CLE_STOCKAGE);
    if (texte) return Object.assign(donneesVides(), JSON.parse(texte));
  } catch (e) {
    console.warn("Lecture impossible du stockage :", e);
  }
  const neuves = donneesVides();
  sauverDonnees(neuves);
  return neuves;
}

function sauverDonnees(d) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(d || donnees));
  } catch (e) {
    alert("Impossible d'enregistrer (mémoire pleine ou navigation privée ?).");
  }
}

let donnees = chargerDonnees();

/* ---------------------------------------------------------------------
   2. PETITS OUTILS
   --------------------------------------------------------------------- */
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const UN_JOUR = 86400000; // millisecondes dans une journée

// Date du jour au format "2026-11-14" (heure locale)
function aujourdhuiISO(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// "2026-11-14..." -> "sam. 14 nov."
function dateCourte(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function jourDuJour() {
  return JOURS[(new Date().getDay() + 6) % 7]; // en JS, dimanche = 0
}

// Numéro de semaine du programme (1, 2, 3...)
function semaineEnCours() {
  const debut = new Date(donnees.dateDebut + "T00:00:00");
  const jours = Math.floor((Date.now() - debut.getTime()) / UN_JOUR);
  return Math.max(1, Math.floor(jours / 7) + 1);
}

function enPhaseDebut() {
  return semaineEnCours() <= REGLES.semainesPhaseDebut;
}

// Ce qui est prévu AUJOURD'HUI pour un exercice : valeurs de programme.js,
// remplacées par un ajustement accepté s'il y en a un.
function prevu(idExo) {
  const exo = PROGRAMME.exercices[idExo];
  const aj = donnees.ajustements[idExo] || {};
  return {
    series: enPhaseDebut() ? exo.series.debut : exo.series.plein,
    cible: aj.cible || exo.cible,
    chargeKg: aj.chargeKg !== undefined ? aj.chargeKg : exo.chargeKg,
    // "normale" ou "facile" (seulement pour les exercices sans charge)
    version: exo.chargeKg !== undefined ? "normale" : (aj.version || exo.versionDepart || "normale")
  };
}

const estFacile = idExo => prevu(idExo).version === "facile";

const avecCharge = exo => exo.chargeKg !== undefined;

// Gripper : "Haute résistance", "Résistance moyenne"... selon le réglage en kg
function texteResistance(chargeKg) {
  return REGLES.niveauxResistance?.[String(chargeKg)] || "Réglage ajusté";
}
const unite = exo => exo.type === "temps" ? "s" : "reps";

// "3 × 8-12 reps par côté"
function texteObjectif(idExo) {
  const exo = PROGRAMME.exercices[idExo];
  const p = prevu(idExo);
  const cote = exo.parCote ? (avecCharge(exo) ? " par main" : " par côté") : "";
  return `${p.series} × ${p.cible[0]}-${p.cible[1]} ${unite(exo)}${cote}`;
}

// "60-90 s" ou "1-2 min"
function texteRepos([a, b]) {
  if (a % 60 === 0 && b % 60 === 0) return a === b ? `${a / 60} min` : `${a / 60}-${b / 60} min`;
  return a === b ? `${a} s` : `${a}-${b} s`;
}

// Durée estimée d'un exercice en secondes (1 rep ≈ 3 s, repos moyen, 30 s d'installation)
function dureeExercice(idExo) {
  const exo = PROGRAMME.exercices[idExo];
  const p = prevu(idExo);
  const moyenne = (p.cible[0] + p.cible[1]) / 2;
  let effort = exo.type === "temps" ? moyenne : moyenne * 3;
  if (exo.parCote) effort *= 2;
  const reposMoyen = (exo.repos[0] + exo.repos[1]) / 2;
  return 30 + p.series * effort + (p.series - 1) * reposMoyen;
}

function dureeSeance(idSeance) {
  const s = PROGRAMME.seances[idSeance];
  return Math.round(s.exercices.filter(id => PROGRAMME.exercices[id])
    .reduce((somme, id) => somme + dureeExercice(id), 0) / 60);
}

// Protège un texte avant de l'insérer dans la page
function esc(texte) {
  return String(texte ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1);
const kg = n => String(n).replace(".", ",") + " kg";
const $ = sel => document.querySelector(sel);

// Petit message en bas de l'écran
function toast(texte) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = texte;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

/* ---------------------------------------------------------------------
   3. SUIVI : ENREGISTRER UN EXERCICE
   Une entrée du journal ressemble à :
   { id, date, seance, exo, resultat: "tout"|"moins"|"dur",
     series: [8, 8, 7] (ou null), chargeKg, cible: [5, 8],
     seriesPrevues: 3, douleur: ["coude"], douleurNote: "" }
   --------------------------------------------------------------------- */
function enregistrer({ seance, exo, resultat, series, chargeKg, douleur = [], douleurNote = "" }) {
  const p = prevu(exo);
  const entree = {
    id: "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: new Date().toISOString(),
    seance, exo, resultat,
    series: series && series.length ? series : null,
    chargeKg: chargeKg !== undefined ? chargeKg : p.chargeKg,
    cible: p.cible.slice(),
    seriesPrevues: p.series,
    version: p.version,
    douleur, douleurNote
  };
  donnees.journal.push(entree);
  noterDouleurs(douleur, douleurNote);
  sauverDonnees();
  return entree;
}

function annulerEntree(id) {
  donnees.journal = donnees.journal.filter(e => e.id !== id);
  delete donnees.propositionsTraitees[id];
  sauverDonnees();
}

function entreesDe(idExo) {
  return donnees.journal.filter(e => e.exo === idExo)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function faitAujourdhui(idExo) {
  const jour = aujourdhuiISO();
  return donnees.journal.some(e => e.exo === idExo && aujourdhuiISO(new Date(e.date)) === jour);
}

// Le résultat d'une saisie détaillée, déduit des chiffres
// ("Trop dur" ne vient que du bouton rouge ; l'adaptation, elle, regarde les chiffres.)
function resultatDepuisSeries(series, cible, seriesPrevues) {
  if (series.length >= seriesPrevues && series.every(r => r >= cible[1])) return "tout";
  return "moins";
}

const RESULTATS = {
  tout:  { emoji: "✅", texte: "Tout fait" },
  moins: { emoji: "🟠", texte: "Fait moins" },
  dur:   { emoji: "🔴", texte: "Trop dur" }
};

/* ---------------------------------------------------------------------
   4. ADAPTATION AUTOMATIQUE — progression par double palier
   On regarde la DERNIÈRE entrée d'un exercice :
   - bas de fourchette pas atteint (ou "trop dur") -> proposer de baisser
   - haut de fourchette atteint sur toutes les séries :
       · depuis moins de 2 semaines -> rester à cette charge (info)
       · depuis 2 semaines ou plus  -> proposer de monter du plus petit cran
   L'app explique toujours pourquoi. Rien ne change sans ton accord.
   --------------------------------------------------------------------- */
const auTop = e => e.series && e.series.length >= e.seriesPrevues && e.series.every(r => r >= e.cible[1]);
const sousLeBas = e => e.resultat === "dur" || (e.series && e.series.some(r => r < e.cible[0]));
const memeNiveau = (a, b) => a.chargeKg === b.chargeKg && a.cible[0] === b.cible[0] && a.cible[1] === b.cible[1]
  && (a.version || "normale") === (b.version || "normale");

function analyser(idExo) {
  const exo = PROGRAMME.exercices[idExo];
  const liste = entreesDe(idExo);
  if (!exo || liste.length === 0) return null;
  const derniere = liste[liste.length - 1];
  const p = prevu(idExo);
  const u = unite(exo);
  const pas = exo.type === "temps" ? REGLES.pasSecondes : REGLES.pasReps;

  // Si un ajustement a déjà été fait depuis cette entrée, on ne repropose rien
  const dejaAjuste = !memeNiveau(derniere, { chargeKg: p.chargeKg, cible: p.cible, version: p.version });
  const traitee = donnees.propositionsTraitees[derniere.id] || (dejaAjuste ? "acceptee" : null);

  // ----- Trop dur : proposer de baisser -----
  if (sousLeBas(derniere)) {
    const pourquoi = derniere.resultat === "dur" && !derniere.series
      ? "Tu as indiqué « trop dur »."
      : `Tu n'as pas atteint le bas de la fourchette (${derniere.cible[0]} ${u}) sur toutes les séries.`;
    if (avecCharge(exo)) {
      const nouvelle = Math.max(0, +(p.chargeKg - REGLES.plusPetitCranKg).toFixed(2));
      return {
        entree: derniere, traitee, sens: "baisser",
        titre: `Baisser à ${kg(nouvelle)} ?`,
        raison: `${pourquoi} Baisser d'un cran (${kg(p.chargeKg)} → ${kg(nouvelle)}) te permet de faire toutes tes séries correctement. Les tendons s'adaptent lentement : mieux vaut un peu trop facile qu'un peu trop dur.`,
        changement: { chargeKg: nouvelle }
      };
    }
    if (p.version === "normale" && exo.facile) {
      return {
        entree: derniere, traitee, sens: "baisser",
        titre: "Passer à la version facile ?",
        raison: `${pourquoi} Proposition : garder la même fourchette mais faire la version facile (${exo.facile}) pour finir tes séries proprement. Tu repasseras à la version normale quand tu seras au top 2 semaines.`,
        changement: { version: "facile" }
      };
    }
    const nouvelleCible = [Math.max(1, p.cible[0] - pas), Math.max(2, p.cible[1] - pas)];
    return {
      entree: derniere, traitee, sens: "baisser",
      titre: `Baisser à ${nouvelleCible[0]}-${nouvelleCible[1]} ${u} ?`,
      raison: `${pourquoi} On baisse un peu la fourchette pour que tu puisses finir tes séries proprement. Tu peux aussi prendre la version plus facile : ${exo.facile}`,
      changement: { cible: nouvelleCible }
    };
  }

  // ----- Haut de la fourchette atteint -----
  if (auTop(derniere)) {
    // Depuis quand est-on au top, sans interruption, à ce niveau ?
    let debutSerie = derniere, nbAuTop = 1;
    for (let i = liste.length - 2; i >= 0; i--) {
      if (auTop(liste[i]) && memeNiveau(liste[i], derniere)) { debutSerie = liste[i]; nbAuTop++; }
      else break;
    }
    const jours = Math.floor((new Date(derniere.date) - new Date(debutSerie.date)) / UN_JOUR);
    const attente = REGLES.joursAuTopAvantMonter;
    const minSeances = REGLES.seancesAuTopAvantMonter || 1;

    if (jours < attente || nbAuTop < minSeances) {
      const reste = [];
      if (jours < attente) reste.push(`encore environ ${attente - jours} jour(s)`);
      if (nbAuTop < minSeances) reste.push(`encore ${minSeances - nbAuTop} séance(s) réussie(s)`);
      return {
        entree: derniere, traitee: traitee || "info", sens: "rester",
        titre: "Haut de la fourchette atteint 👏",
        raison: `Tu as fait ${derniere.cible[1]} ${u} sur toutes les séries. Règle du double palier : on reste au même niveau 2 à 3 semaines (et au moins ${minSeances} séances au top) pour que les tendons suivent, puis on monte. Il faut ${reste.join(" et ")} au top avant de monter.`
      };
    }
    if (avecCharge(exo)) {
      if (p.chargeKg >= REGLES.chargeMaxKg) {
        return {
          entree: derniere, traitee: traitee || "info", sens: "rester",
          titre: "Charge maximale atteinte",
          raison: `Tu es au maximum du gripper (${kg(REGLES.chargeMaxKg)}). Pour continuer : ouvre plus lentement, tiens plus longtemps, ou garde ce niveau.`
        };
      }
      const nouvelle = Math.min(REGLES.chargeMaxKg, +(p.chargeKg + REGLES.plusPetitCranKg).toFixed(2));
      return {
        entree: derniere, traitee, sens: "monter",
        titre: `Monter à ${kg(nouvelle)} ?`,
        raison: `Tu atteins le haut de la fourchette (${derniere.cible[1]} ${u}) sur toutes les séries depuis ${jours} jours (${nbAuTop} séances). On monte du plus petit cran (${kg(p.chargeKg)} → ${kg(nouvelle)}). Tes reps vont baisser un peu au début, c'est normal : tu remonteras ensuite vers le haut de la fourchette.`,
        changement: { chargeKg: nouvelle }
      };
    }
    if (p.version === "facile") {
      return {
        entree: derniere, traitee, sens: "monter",
        titre: "Passer à la version normale ?",
        raison: `Tu atteins le haut de la fourchette (${derniere.cible[1]} ${u}) en version facile sur toutes les séries depuis ${jours} jours (${nbAuTop} séances). On passe à la version normale avec la même fourchette. Tes reps vont baisser au début, c'est normal.`,
        changement: { version: "normale" }
      };
    }
    const nouvelleCible = [p.cible[0] + pas, p.cible[1] + pas];
    return {
      entree: derniere, traitee, sens: "monter",
      titre: `Monter à ${nouvelleCible[0]}-${nouvelleCible[1]} ${u} ?`,
      raison: `Tu atteins le haut de la fourchette (${derniere.cible[1]} ${u}) sur toutes les séries depuis ${jours} jours (${nbAuTop} séances). On monte un peu la fourchette. Autre option : passer à la version plus difficile (${exo.difficile}) et garder la fourchette actuelle.`,
      changement: { cible: nouvelleCible }
    };
  }

  // ----- Dans la fourchette : rien à changer -----
  return {
    entree: derniere, traitee: traitee || "info", sens: "rester",
    titre: "Dans la fourchette 👍",
    raison: `Continue au même niveau et essaie d'atteindre ${derniere.cible[1]} ${u} sur toutes les séries. L'app proposera de monter quand tu y seras depuis 2 semaines.`
  };
}

function accepterProposition(idExo) {
  const a = analyser(idExo);
  if (!a || !a.changement) return;
  const avant = prevu(idExo);
  donnees.ajustements[idExo] = Object.assign({}, donnees.ajustements[idExo], a.changement);
  donnees.historiqueAjustements.push({
    date: new Date().toISOString(), exo: idExo,
    avant: { chargeKg: avant.chargeKg, cible: avant.cible, version: avant.version },
    apres: a.changement, raison: a.raison
  });
  donnees.propositionsTraitees[a.entree.id] = "acceptee";
  sauverDonnees();
}

function ignorerProposition(idExo) {
  const a = analyser(idExo);
  if (!a) return;
  donnees.propositionsTraitees[a.entree.id] = "ignoree";
  sauverDonnees();
}

// Propositions qui attendent une réponse (pour la page Planning)
function propositionsEnAttente() {
  const exos = [...new Set(donnees.journal.map(e => e.exo))];
  return exos.map(id => [id, analyser(id)]).filter(([, a]) => a && a.changement && !a.traitee);
}

// Carte HTML d'une analyse (avec boutons si un changement est proposé)
function carteAnalyse(idExo, a) {
  if (!a) return "";
  const exo = PROGRAMME.exercices[idExo];
  const classe = { monter: "proposition monter", baisser: "proposition baisser", rester: "proposition" }[a.sens];
  let boutons = "";
  if (a.changement && !a.traitee) {
    boutons = `<div class="rangee">
        <button class="bouton petit" data-accepter="${idExo}">Accepter</button>
        <button class="bouton petit secondaire" data-ignorer="${idExo}">Ignorer</button>
      </div>`;
  } else if (a.changement && a.traitee) {
    boutons = `<div class="doux">${a.traitee === "acceptee" ? "✔️ Accepté" : "Ignoré"}</div>`;
  }
  return `<div class="carte ${classe}">
      <div class="doux">${esc(exo.nom)}</div>
      <h3>${esc(a.titre)}</h3>
      <p><strong>Pourquoi :</strong> ${esc(a.raison)}</p>
      ${boutons}
    </div>`;
}

// Branche les boutons Accepter / Ignorer présents dans la page
function brancherPropositions() {
  document.querySelectorAll("[data-accepter]").forEach(b => b.onclick = () => {
    accepterProposition(b.dataset.accepter); toast("Changement appliqué"); afficher();
  });
  document.querySelectorAll("[data-ignorer]").forEach(b => b.onclick = () => {
    ignorerProposition(b.dataset.ignorer); afficher();
  });
}

/* ---------------------------------------------------------------------
   5. DOULEURS
   Quand tu coches une douleur, l'app la suit. Les jours suivants elle
   te demande si elle est toujours là.
   - plus de 24 h  -> conseil de réduire ou sauter les séances concernées
   - plus de 7 jours -> conseil de consulter un médecin ou un kiné
   (L'app ne donne pas de conseil médical : ce sont des règles de prudence.)
   --------------------------------------------------------------------- */
function noterDouleurs(zones, note) {
  const maintenant = new Date().toISOString();
  for (const zone of zones) {
    const active = donnees.douleurs.find(d => d.zone === zone && !d.finie);
    if (active) {
      active.derniereConfirmation = maintenant;
      if (note) active.note = note;
    } else {
      donnees.douleurs.push({ id: "d" + Date.now() + zone, zone, note, debut: maintenant, derniereConfirmation: maintenant, finie: false });
    }
  }
}

const douleursActives = () => donnees.douleurs.filter(d => !d.finie);

// Durée de la douleur en heures (du début à la dernière fois où tu l'as confirmée)
const dureeDouleurHeures = d => (new Date(d.derniereConfirmation) - new Date(d.debut)) / 3600000;

function nomZone(d) {
  const z = REGLES.zonesDouleur[d.zone];
  return (z ? z.nom : d.zone) + (d.note ? ` (${d.note})` : "");
}

// La règle douleur, sans affichage (testée dans tests.html) :
// renvoie { niveau: "surveiller" | "reduire" | "medecin", jours, raison }
function etatDouleur(d) {
  const heures = dureeDouleurHeures(d);
  const jours = Math.floor(heures / 24);
  const zone = REGLES.zonesDouleur[d.zone] || { categories: [] };
  const cats = zone.categories.map(c => PROGRAMME.categories[c]?.nom || c).join(", ");
  if (heures > REGLES.douleurMedecinApresJours * 24) {
    return { niveau: "medecin", jours,
      raison: `Ça dure depuis plus d'une semaine (${jours} j). Je te conseille de consulter un médecin ou un kiné avant de continuer les exercices qui sollicitent cette zone. Je ne peux pas évaluer une douleur.` };
  }
  if (heures > REGLES.douleurReduireApresHeures) {
    return { niveau: "reduire", jours,
      raison: `Ça dure depuis plus de 24 h. Proposition : réduis (version plus facile, moins de séries, charge plus basse) ou saute les séances qui sollicitent cette zone : ${cats}. Pourquoi : une douleur qui persiste est un signal que la récupération n'est pas finie.` };
  }
  return { niveau: "surveiller", jours,
    raison: "Signalée depuis moins de 24 h : l'app te redemandera demain si elle est toujours là." };
}

// Carte d'alerte douleur. "categorie" = limiter aux douleurs qui concernent cette catégorie.
function cartesDouleur(categorie) {
  let html = "";
  const jour = aujourdhuiISO();
  for (const d of douleursActives()) {
    const zone = REGLES.zonesDouleur[d.zone] || { categories: [] };
    if (categorie && !zone.categories.includes(categorie)) continue;
    const aDemander = aujourdhuiISO(new Date(d.derniereConfirmation)) !== jour;
    const etat = etatDouleur(d);
    const conseil = etat.niveau === "surveiller" ? "" : `<p>${esc(etat.raison)}</p>`;

    html += `<div class="carte alerte">
        <h3>🩹 Douleur : ${esc(nomZone(d))}</h3>
        <div class="doux">Signalée le ${dateCourte(d.debut)} · encore là le ${dateCourte(d.derniereConfirmation)}</div>
        ${conseil}
        ${aDemander ? `<p>Elle est toujours là aujourd'hui ?</p>` : ""}
        <div class="rangee">
          ${aDemander ? `<button class="bouton petit" data-douleur-oui="${d.id}">Oui, encore</button>` : ""}
          <button class="bouton petit secondaire" data-douleur-finie="${d.id}">C'est passé</button>
        </div>
      </div>`;
  }
  return html;
}

function brancherDouleurs() {
  document.querySelectorAll("[data-douleur-oui]").forEach(b => b.onclick = () => {
    const d = donnees.douleurs.find(x => x.id === b.dataset.douleurOui);
    d.derniereConfirmation = new Date().toISOString();
    sauverDonnees(); afficher();
  });
  document.querySelectorAll("[data-douleur-finie]").forEach(b => b.onclick = () => {
    const d = donnees.douleurs.find(x => x.id === b.dataset.douleurFinie);
    d.finie = true; d.fin = new Date().toISOString();
    sauverDonnees(); toast("Tant mieux ! Reprends doucement."); afficher();
  });
}

/* ---------------------------------------------------------------------
   5 bis. LA SEMAINE : décalages, séances faites / ratées
   Un "élément" du planning = une séance (ou un choix de séances, ex.
   dos à la barre OU à la maison). Un décalage ne vaut que pour la
   semaine où il est fait : la semaine suivante, le planning normal revient.
   --------------------------------------------------------------------- */

// Lundi de la semaine d'une date, au format "2026-11-09"
function lundiDe(d = new Date()) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return aujourdhuiISO(x);
}

// Date d'un jour de la semaine : ("2026-11-09", "mercredi") -> "2026-11-11"
function dateDuJour(lundi, jour) {
  const x = new Date(lundi + "T12:00:00");
  x.setDate(x.getDate() + JOURS.indexOf(jour));
  return aujourdhuiISO(x);
}

function decalerDate(iso, jours) {
  const x = new Date(iso + "T12:00:00");
  x.setDate(x.getDate() + jours);
  return aujourdhuiISO(x);
}

const cleElement = el => Array.isArray(el) ? el.join("|") : el;

// Le planning d'une semaine, décalages compris :
// { lundi: [ { cle, seances: [...], jourPrevu, jour, facultatif }, ... ], mardi: [...], ... }
function planSemaine(lundi = lundiDe()) {
  const plan = Object.fromEntries(JOURS.map(j => [j, []]));
  for (const jour of JOURS) {
    for (const el of PROGRAMME.planning[jour] || []) {
      plan[jour].push({
        cle: cleElement(el), seances: Array.isArray(el) ? el : [el],
        jourPrevu: jour, jour, facultatif: PROGRAMME.joursFacultatifs.includes(jour)
      });
    }
  }
  for (const d of donnees.decalages[lundi] || []) {
    const liste = plan[d.jourPrevu];
    const i = liste.findIndex(x => x.cle === d.cle && x.jour === d.jourPrevu);
    if (i < 0 || !plan[d.vers]) continue;
    const [element] = liste.splice(i, 1);
    element.jour = d.vers;
    plan[d.vers].push(element);
  }
  return plan;
}

// Une séance compte comme faite ce jour-là si au moins la moitié de ses exercices ont été notés
function seanceFaiteLe(idSeance, dateISO) {
  const s = PROGRAMME.seances[idSeance];
  if (!s) return false;
  const faits = new Set(donnees.journal
    .filter(e => e.seance === idSeance && aujourdhuiISO(new Date(e.date)) === dateISO)
    .map(e => e.exo));
  return faits.size >= Math.ceil(s.exercices.length / 2);
}

const elementFait = (element, lundi) => element.seances.some(id => seanceFaiteLe(id, dateDuJour(lundi, element.jour)));
const cleSautee = element => element.cle + "@" + element.jourPrevu;
const nomElement = element => element.seances.map(id => PROGRAMME.seances[id]?.nom || id).join(" ou ");

// Séances ratées : jour passé, pas faite, pas facultative, pas « laissée tomber »
function seancesRatees(lundi = lundiDe()) {
  const plan = planSemaine(lundi);
  const aujourdhui = aujourdhuiISO();
  const ratees = [];
  for (const jour of JOURS) {
    const date = dateDuJour(lundi, jour);
    if (date >= aujourdhui || date < donnees.dateDebut) continue; // pas encore passé, ou avant le début du programme
    for (const el of plan[jour]) {
      if (el.facultatif || elementFait(el, lundi)) continue;
      if ((donnees.seancesSautees[lundi] || []).includes(cleSautee(el))) continue;
      ratees.push(el);
    }
  }
  return ratees;
}

// Déplace un élément de la semaine en cours vers un autre jour
function decaler(element, vers, lundi = lundiDe()) {
  const liste = (donnees.decalages[lundi] || []).filter(d => !(d.cle === element.cle && d.jourPrevu === element.jourPrevu));
  if (vers !== element.jourPrevu) liste.push({ cle: element.cle, jourPrevu: element.jourPrevu, vers });
  donnees.decalages[lundi] = liste;
  sauverDonnees();
}

// Règle de repos entre deux séances d'une même catégorie (ex. grip : 1 jour de repos minimum).
// Renvoie un message d'alerte si le décalage ne la respecte pas, sinon "".
function alerteRepos(element, vers, lundi = lundiDe()) {
  const minimum = REGLES.joursReposEntre || {};
  const messages = [];
  for (const [categorie, repos] of Object.entries(minimum)) {
    if (!element.seances.some(id => PROGRAMME.seances[id]?.categorie === categorie)) continue;
    const dateVers = dateDuJour(lundi, vers);
    // toutes les autres séances de cette catégorie : semaine en cours + semaines voisines
    const autres = [];
    for (const l of [decalerDate(lundi, -7), lundi, decalerDate(lundi, 7)]) {
      const plan = planSemaine(l);
      for (const jour of JOURS) for (const el of plan[jour]) {
        if (l === lundi && el.cle === element.cle && el.jourPrevu === element.jourPrevu) continue;
        if (el.seances.some(id => PROGRAMME.seances[id]?.categorie === categorie)) autres.push({ date: dateDuJour(l, jour), el });
      }
    }
    for (const a of autres) {
      const ecart = Math.abs(new Date(a.date) - new Date(dateVers)) / UN_JOUR;
      if (ecart <= repos) {
        const nomCat = PROGRAMME.categories[categorie]?.nom || categorie;
        messages.push(`${nomCat} : il y a déjà « ${nomElement(a.el)} » le ${dateCourte(a.date + "T12:00:00")} — la règle est d'avoir au moins ${repos} jour de repos entre deux séances.`);
      }
    }
  }
  return [...new Set(messages)].join("\n");
}

// Formulaire « Décaler » (liste des jours + boutons)
function formulaireDecaler(element, idForm) {
  const lundi = lundiDe();
  return `<div class="form-decaler" id="${idForm}" hidden>
      <label for="${idForm}-jour">Déplacer « ${esc(nomElement(element))} » à :</label>
      <select id="${idForm}-jour">${JOURS.map(j =>
        `<option value="${j}" ${j === element.jour ? "selected" : ""}>${majuscule(j)} ${dateCourte(dateDuJour(lundi, j) + "T12:00:00").replace(/^\S+ /, "")}${j === element.jourPrevu ? " (jour prévu)" : ""}</option>`).join("")}
      </select>
      <div class="rangee">
        <button class="bouton petit" data-valider-decalage="${idForm}" data-cle="${esc(element.cle)}" data-prevu="${element.jourPrevu}">Décaler</button>
        <button class="bouton petit secondaire" data-fermer="${idForm}">Annuler</button>
      </div>
      <p class="doux">Le décalage ne vaut que pour cette semaine.</p>
    </div>`;
}

function brancherDecalages() {
  document.querySelectorAll("[data-ouvrir]").forEach(b => b.onclick = e => {
    e.preventDefault();
    const f = $("#" + b.dataset.ouvrir);
    f.hidden = !f.hidden;
  });
  document.querySelectorAll("[data-fermer]").forEach(b => b.onclick = () => { $("#" + b.dataset.fermer).hidden = true; });
  document.querySelectorAll("[data-valider-decalage]").forEach(b => b.onclick = () => {
    const idForm = b.dataset.validerDecalage;
    const vers = $("#" + idForm + "-jour").value;
    const plan = planSemaine();
    const element = JOURS.flatMap(j => plan[j]).find(x => x.cle === b.dataset.cle && x.jourPrevu === b.dataset.prevu);
    if (!element) return;
    const alerte = alerteRepos(element, vers);
    if (alerte && !confirm("⚠️ " + alerte + "\n\nDécaler quand même ?")) return;
    decaler(element, vers);
    toast(vers === element.jourPrevu ? "Remis à son jour prévu" : `Décalé au ${vers}`);
    afficher({ garderDefilement: true });
  });
  document.querySelectorAll("[data-laisser]").forEach(b => b.onclick = () => {
    const lundi = lundiDe();
    donnees.seancesSautees[lundi] = (donnees.seancesSautees[lundi] || []).concat(b.dataset.laisser);
    sauverDonnees(); afficher({ garderDefilement: true });
  });
}

// Bilan d'une semaine : séances prévues (hors jours facultatifs) et faites
function bilanSemaine(lundi = lundiDe()) {
  const plan = planSemaine(lundi);
  const elements = JOURS.flatMap(j => plan[j]);
  const obligatoires = elements.filter(e => !e.facultatif);
  return {
    lundi,
    prevues: obligatoires.length,
    faites: obligatoires.filter(e => elementFait(e, lundi)).length,
    facultativesFaites: elements.filter(e => e.facultatif && elementFait(e, lundi)).length,
    parJour: JOURS.filter(j => plan[j].length).map(j => ({
      jour: j, total: plan[j].length,
      faites: plan[j].filter(e => elementFait(e, lundi)).length,
      facultatif: plan[j].every(e => e.facultatif)
    }))
  };
}

// Carte résumé de la semaine (page Planning)
function carteBilanSemaine() {
  const b = bilanSemaine();
  const pastilles = b.parJour.map(d => {
    const etat = d.faites === d.total ? "complet" : d.faites > 0 ? "partiel" : "";
    return `<span class="pastille-jour ${etat} ${d.facultatif ? "facultatif" : ""}">${majuscule(d.jour.slice(0, 3))}
      <small>${d.faites === d.total ? "✅" : `${d.faites}/${d.total}`}</small></span>`;
  }).join("");
  return `<div class="bilan">
      <div class="bilan-chiffre"><strong>${b.faites}</strong> séance${b.faites > 1 ? "s" : ""} sur ${b.prevues} faites cette semaine
        ${b.facultativesFaites ? `<span class="doux">(+ ${b.facultativesFaites} facultative${b.facultativesFaites > 1 ? "s" : ""})</span>` : ""}</div>
      <div class="pastilles-jours">${pastilles}</div>
    </div>`;
}

// Cartes « séance ratée » en haut du planning
function cartesRatees() {
  return seancesRatees().map((el, k) => `<div class="carte rappel">
      <h3>📌 Séance ratée : ${esc(nomElement(el))}</h3>
      <p class="doux">Prévue ${el.jour === el.jourPrevu ? "" : "(après décalage) "}le ${el.jour}. Tu veux la décaler ?</p>
      <div class="rangee">
        <button class="bouton petit" data-ouvrir="rate-${k}">Décaler</button>
        <button class="bouton petit secondaire" data-laisser="${esc(cleSautee(el))}">Laisser tomber</button>
      </div>
      ${formulaireDecaler(el, "rate-" + k)}
    </div>`).join("");
}

/* ---------------------------------------------------------------------
   6. SAISIE VOCALE
   Format de phrase : « position normale, 4 séries de 8, 10 kilos »
   ou « planche, 3 séries de 30 secondes ».
   On ne fait JAMAIS confiance à la dictée : l'app montre ce qu'elle
   a compris et tu corriges avant d'enregistrer.
   --------------------------------------------------------------------- */
const NOMBRES = {
  "dix-sept": 17, "dix sept": 17, "dix-huit": 18, "dix huit": 18, "dix-neuf": 19, "dix neuf": 19,
  "vingt-cinq": 25, "vingt cinq": 25, "trente": 30, "quarante": 40, "quarante-cinq": 45, "soixante": 60,
  "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7, "huit": 8,
  "neuf": 9, "dix": 10, "onze": 11, "douze": 12, "treize": 13, "quatorze": 14, "quinze": 15,
  "seize": 16, "vingt": 20
};

// Minuscules, sans accents, chiffres en toutes lettres -> chiffres
function normaliser(texte) {
  let t = texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  // les nombres composés d'abord (les clés les plus longues en premier)
  for (const mot of Object.keys(NOMBRES).sort((a, b) => b.length - a.length)) {
    t = t.replace(new RegExp(`\\b${mot}\\b`, "g"), NOMBRES[mot]);
  }
  t = t.replace(/(\d+) et demi/g, "$1.5");
  t = t.replace(/(\d+),(\d)(?!\d)/g, "$1.$2"); // "10,5" -> "10.5" (mais pas "8, 10")
  return t;
}

// Mots trop courants pour aider à reconnaître un exercice
const MOTS_VIDES = ["serie", "series", "les", "des", "avec", "sur", "par", "gripper"];

// Les mots importants du nom d'un exercice
function motsCles(idExo) {
  return normaliser(PROGRAMME.exercices[idExo].nom).split(/[^a-z0-9]+/)
    .filter(m => (m.length >= 3 || /^\d+$/.test(m)) && !MOTS_VIDES.includes(m));
}

// Cherche l'exercice dont on parle parmi ceux de la séance.
// Renvoie { id, ambigu, candidats } :
// - id = null si aucun exercice reconnu
// - ambigu = true si plusieurs exercices correspondent autant (ex. juste « pompes »)
function trouverExercice(texte, idsExos) {
  const scores = idsExos.map(id => {
    const mots = motsCles(id);
    const trouves = mots.filter(m => new RegExp(`\\b${m}`).test(texte)).length;
    return { id, trouves, complet: trouves === mots.length && trouves > 0, taille: mots.length };
  }).filter(x => x.trouves > 0);
  if (!scores.length) return { id: null, ambigu: false, candidats: [] };

  const max = Math.max(...scores.map(x => x.trouves));
  const meilleurs = scores.filter(x => x.trouves === max);
  // Un exercice dont TOUS les mots ont été dits l'emporte (ex. « position normale »)
  const complets = meilleurs.filter(x => x.complet).sort((a, b) => a.taille - b.taille);
  if (complets.length === 1 || (complets.length > 1 && complets[0].taille < complets[1].taille)) {
    return { id: complets[0].id, ambigu: false, candidats: [] };
  }
  if (meilleurs.length === 1) return { id: meilleurs[0].id, ambigu: false, candidats: [] };
  return { id: null, ambigu: true, candidats: meilleurs.map(x => x.id) };
}

// Transforme la phrase en { exo, series, reps, chargeKg }
function comprendrePhrase(phrase, idsExos) {
  const t = normaliser(phrase);
  const trouve = trouverExercice(t, idsExos);
  const resultat = { texte: t, exo: trouve.id, ambigu: trouve.ambigu, candidats: trouve.candidats,
                     series: null, reps: null, chargeKg: null, nombresInutilises: [] };

  let m = t.match(/(\d+)\s*(?:x|fois)\s*(\d+)/);              // "4 x 8" ou "4 fois 8"
  if (m) { resultat.series = +m[1]; resultat.reps = +m[2]; }
  m = t.match(/(\d+)\s*series?\b/);                           // "4 series"
  if (m) resultat.series = +m[1];
  m = t.match(/series?\s*(?:de\s*)?(\d+)/);                   // "series de 8"
  if (m) resultat.reps = +m[1];
  m = t.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilogrammes?)\b/); // "10 kilos"
  if (m) resultat.chargeKg = +m[1];
  if (resultat.reps === null) {                               // "8 reps" ou "30 secondes"
    m = t.match(/(\d+)\s*(?:reps?|repetitions?|secondes?|sec|s)\b/);
    if (m) resultat.reps = +m[1];
  }
  // Les nombres entendus mais non compris (ex. « 10 » sans « kilos »)
  const restants = [resultat.series, resultat.reps, resultat.chargeKg].filter(n => n !== null);
  if (resultat.exo) restants.push(...motsCles(resultat.exo).filter(m => /^\d+$/.test(m)).map(Number)); // ex. « 90 »
  for (const n of (t.match(/\d+(?:\.\d+)?/g) || []).map(Number)) {
    const i = restants.indexOf(n);
    if (i >= 0) restants.splice(i, 1); else resultat.nombresInutilises.push(n);
  }
  return resultat;
}

// Limites au-delà desquelles un chiffre est impossible (bloque l'enregistrement)
const LIMITES = { series: [1, 10], reps: [1, 60], secondes: [1, 300] };

// Vérifie les valeurs du formulaire de confirmation.
// Renvoie { erreurs: [...], inhabituels: [...] }
//  - erreurs : il manque quelque chose ou c'est impossible -> on ne peut pas enregistrer
//  - inhabituels : possible mais loin de ce qui était prévu -> il faut cocher « je confirme »
function verifierSaisie({ exo: idExo, series, reps, chargeKg }) {
  const erreurs = [], inhabituels = [];
  if (!idExo) { erreurs.push("Choisis l'exercice."); return { erreurs, inhabituels }; }
  const exo = PROGRAMME.exercices[idExo];
  const p = prevu(idExo);
  const motReps = exo.type === "temps" ? "secondes" : "reps";
  const [rMin, rMax] = exo.type === "temps" ? LIMITES.secondes : LIMITES.reps;

  if (series === null || isNaN(series)) erreurs.push("Indique le nombre de séries.");
  else if (series < LIMITES.series[0] || series > LIMITES.series[1]) erreurs.push(`${series} séries, ce n'est pas possible : corrige (entre ${LIMITES.series[0]} et ${LIMITES.series[1]}).`);
  else if (Math.abs(series - p.series) > 1) inhabituels.push(`${series} séries alors que ${p.series} étaient prévues.`);

  if (reps === null || isNaN(reps)) erreurs.push(`Indique le nombre de ${motReps} par série.`);
  else if (reps < rMin || reps > rMax) erreurs.push(`${reps} ${motReps}, ça paraît impossible : corrige.`);
  else if (reps > p.cible[1] * 1.5 || reps < p.cible[0] / 2) inhabituels.push(`${reps} ${motReps} alors que la fourchette est ${p.cible[0]}-${p.cible[1]}.`);

  if (avecCharge(exo)) {
    if (chargeKg === null || isNaN(chargeKg)) erreurs.push("Indique la charge en kg.");
    else if (chargeKg <= 0 || chargeKg > REGLES.chargeMaxKg) erreurs.push(`${kg(chargeKg)}, c'est impossible avec ton gripper (maximum ${kg(REGLES.chargeMaxKg)}) : corrige.`);
    else if (Math.abs(chargeKg - p.chargeKg) > REGLES.plusPetitCranKg) inhabituels.push(`${kg(chargeKg)} alors que ${kg(p.chargeKg)} étaient prévus.`);
  }
  return { erreurs, inhabituels };
}

// La reconnaissance vocale du navigateur est-elle disponible ?
const Reconnaissance = window.SpeechRecognition || window.webkitSpeechRecognition;

function ecouter(champ, bouton) {
  const r = new Reconnaissance();
  r.lang = "fr-FR";
  r.interimResults = false;
  r.maxAlternatives = 1;
  bouton.textContent = "🎙️ J'écoute…";
  bouton.disabled = true;
  r.onresult = e => { champ.value = e.results[0][0].transcript; };
  r.onerror = e => toast("Micro : " + (e.error === "not-allowed" ? "autorisation refusée" : e.error));
  r.onend = () => { bouton.textContent = "🎤 Parler"; bouton.disabled = false; if (champ.value) $("#analyser").click(); };
  r.start();
}

/* ---------------------------------------------------------------------
   MINUTEUR (repos entre les séries, échauffement)
   Une barre fixe en bas de l'écran. On garde l'heure de FIN plutôt
   qu'un simple compteur : ainsi le temps reste juste même si le
   téléphone ralentit l'app en arrière-plan.
   --------------------------------------------------------------------- */
const minuteur = {
  titre: "", duree: 0,     // en secondes
  fin: null,               // heure de fin (ms) quand il tourne
  restant: null,           // secondes restantes quand il est en pause / pas lancé
  ensuite: null,           // ce qu'on fait à la fin (optionnel)
  intervalle: null, verrou: null
};
let audio = null; // pour le bip

// Prépare un compte à rebours (sans le lancer, sauf si lancer = true)
function preparerMinuteur({ titre, secondes, lancer = false, ensuite = null }) {
  arreterTic();
  Object.assign(minuteur, { titre, duree: secondes, fin: null, restant: secondes, ensuite });
  if (lancer) lancerMinuteur(); else dessinerMinuteur();
}

function lancerMinuteur() {
  // Le son doit être "débloqué" par un appui de l'utilisateur
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch {}
  // Garder l'écran allumé pendant le repos, si le téléphone le permet
  try { navigator.wakeLock?.request("screen").then(v => { minuteur.verrou = v; }).catch(() => {}); } catch {}
  minuteur.fin = Date.now() + minuteur.restant * 1000;
  minuteur.restant = null;
  arreterTic();
  minuteur.intervalle = setInterval(tic, 250);
  dessinerMinuteur();
}

function pauseMinuteur() {
  minuteur.restant = Math.max(0, Math.ceil((minuteur.fin - Date.now()) / 1000));
  minuteur.fin = null;
  arreterTic();
  dessinerMinuteur();
}

function ajouterTemps(sec) {
  if (minuteur.fin) minuteur.fin = Math.max(Date.now() + 1000, minuteur.fin + sec * 1000);
  else minuteur.restant = Math.max(5, minuteur.restant + sec);
  dessinerMinuteur();
}

function fermerMinuteur() {
  arreterTic();
  minuteur.fin = null; minuteur.restant = null;
  $("#minuteur").hidden = true;
  document.body.classList.remove("avec-minuteur");
}

function arreterTic() {
  clearInterval(minuteur.intervalle);
  minuteur.intervalle = null;
  try { minuteur.verrou?.release(); } catch {}
  minuteur.verrou = null;
}

function tic() {
  if (minuteur.fin && Date.now() >= minuteur.fin) {
    signalFin();
    const suite = minuteur.ensuite;
    fermerMinuteur();
    if (suite) suite(); else toast("⏰ Repos terminé : c'est reparti !");
    return;
  }
  dessinerMinuteur();
}

// Bip + vibration à la fin (si le navigateur le permet)
function signalFin() {
  try { navigator.vibrate?.([300, 150, 300]); } catch {}
  try {
    if (!audio) return;
    [0, 0.35].forEach(decalage => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, audio.currentTime + decalage);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + decalage + 0.3);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + decalage);
      o.stop(audio.currentTime + decalage + 0.3);
    });
  } catch {}
}

const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function dessinerMinuteur() {
  const zone = $("#minuteur");
  if (minuteur.fin === null && minuteur.restant === null) { zone.hidden = true; return; }
  const enCours = minuteur.fin !== null;
  const reste = enCours ? Math.max(0, Math.ceil((minuteur.fin - Date.now()) / 1000)) : minuteur.restant;
  const avancement = minuteur.duree ? 100 * (1 - reste / minuteur.duree) : 0;
  zone.hidden = false;
  document.body.classList.add("avec-minuteur");
  zone.innerHTML = `
    <div class="minuteur-barre" style="width:${avancement}%"></div>
    <div class="minuteur-haut">
      <span class="minuteur-titre">${esc(minuteur.titre)}</span>
      <span class="minuteur-temps">${mmss(reste)}</span>
    </div>
    <div class="minuteur-boutons">
      <button data-m="moins">−15 s</button>
      ${enCours ? `<button data-m="pause" class="principal">⏸ Pause</button>`
                : `<button data-m="lancer" class="principal">▶ ${minuteur.duree === reste ? "Lancer" : "Reprendre"}</button>`}
      <button data-m="plus">+15 s</button>
      <button data-m="passer">Passer</button>
    </div>`;
  zone.querySelectorAll("[data-m]").forEach(b => b.onclick = () => {
    const action = b.dataset.m;
    if (action === "lancer") lancerMinuteur();
    else if (action === "pause") pauseMinuteur();
    else if (action === "moins") ajouterTemps(-15);
    else if (action === "plus") ajouterTemps(15);
    else if (action === "passer") {
      const suite = minuteur.ensuite;
      fermerMinuteur();
      if (suite) suite();
    }
  });
}

// Durée de repos proposée : le milieu de la fourchette, arrondi à 15 s
const reposConseille = exo => Math.round((exo.repos[0] + exo.repos[1]) / 2 / 15) * 15;

// Nombre de séries déjà validées aujourd'hui, par exercice (en mémoire seulement)
const seriesValidees = {};
const cleSeries = idExo => aujourdhuiISO() + "|" + idExo;

/* ---------------------------------------------------------------------
   7. PAGES
   Chaque fonction "page..." renvoie { titre, html, retour?, apres? }.
   "apres" branche les boutons une fois la page affichée.
   --------------------------------------------------------------------- */

function lienSeance(idSeance, dateISO = aujourdhuiISO()) {
  const s = PROGRAMME.seances[idSeance];
  if (!s) return `<div class="lien-seance">⚠️ Séance « ${esc(idSeance)} » introuvable dans programme.js</div>`;
  const cat = PROGRAMME.categories[s.categorie] || { emoji: "•" };
  const faits = new Set(donnees.journal.filter(e => e.seance === idSeance && aujourdhuiISO(new Date(e.date)) === dateISO).map(e => e.exo)).size;
  const etat = faits === 0 ? "" : faits >= s.exercices.length ? " · ✅" : ` · ${faits}/${s.exercices.length}`;
  return `<a class="lien-seance" href="#/seance/${idSeance}">
      <span><span class="icone-cat">${cat.emoji}</span>${esc(s.nom)} <span class="doux">· ~${dureeSeance(idSeance)} min${etat}</span></span>
      <span class="fleche">›</span>
    </a>`;
}

// ----- Planning (accueil) -----
function pagePlanning() {
  const aujourdhui = jourDuJour();
  const phase = enPhaseDebut()
    ? `Phase de reprise : séries réduites jusqu'à la fin de la semaine ${REGLES.semainesPhaseDebut}.`
    : "Phase complète : nombre de séries normal.";

  let html = cartesDouleur() + carteRappelSauvegarde() + cartesRatees();

  const props = propositionsEnAttente();
  if (props.length) {
    html += `<h2 class="section">Propositions d'ajustement</h2>`;
    html += props.map(([id, a]) => carteAnalyse(id, a)).join("");
  }

  html += `<div class="carte"><h2>Semaine ${semaineEnCours()}</h2><div class="doux">${phase}</div>${carteBilanSemaine()}</div>`;

  // La semaine du lundi au dimanche, aujourd'hui encadré
  const lundi = lundiDe();
  const plan = planSemaine(lundi);
  for (const jour of JOURS) {
    const elements = plan[jour];
    const dateJour = dateDuJour(lundi, jour);
    const passe = dateJour < aujourdhuiISO();
    const classes = ["carte"];
    if (jour === aujourdhui) classes.push("aujourdhui");
    if (elements.length === 0) classes.push("repos");
    if (passe) classes.push("passe");
    const toutFait = elements.length > 0 && elements.every(el => elementFait(el, lundi));

    html += `<section class="${classes.join(" ")}">
        <h3>${majuscule(jour)} <span class="doux date-jour">${dateCourte(dateJour + "T12:00:00").replace(/^\S+ /, "")}</span>
          ${jour === aujourdhui ? '<span class="badge">Aujourd\'hui</span>' : ""}
          ${PROGRAMME.joursFacultatifs.includes(jour) ? '<span class="badge gris">Facultatif</span>' : ""}
          ${toutFait ? "✅" : ""}
        </h3>`;
    if (elements.length === 0) html += `<div class="doux">Repos 😴</div>`;
    elements.forEach((el, k) => {
      const idForm = `dec-${jour}-${k}`;
      html += `<div class="element">`;
      html += el.seances.map((id, n) => (n > 0 ? `<div class="ou">— ou —</div>` : "") + lienSeance(id, dateJour)).join("");
      html += `<div class="ligne-decaler">
          ${el.jour !== el.jourPrevu ? `<span class="doux">↪ décalée du ${el.jourPrevu}</span>` : "<span></span>"}
          <button class="lien" data-ouvrir="${idForm}">Décaler</button>
        </div>${formulaireDecaler(el, idForm)}</div>`;
    });
    html += `</section>`;
  }

  html += `<div class="carte"><h3>Rappels</h3><ul class="doux">
      ${REGLES.rappels.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>`;
  return { titre: "Planning", html, apres: () => { brancherPropositions(); brancherDouleurs(); brancherRappelSauvegarde(); brancherDecalages(); } };
}

// ----- Échauffement (en haut des séances qui en ont un) -----
let etapeEchauffement = null; // numéro du mouvement en cours (null = pas commencé)

function carteEchauffement(seance) {
  const ech = PROGRAMME.echauffements?.[seance.echauffement];
  if (!ech) return "";
  const etat = donnees.echauffements[aujourdhuiISO()];
  const total = ech.mouvements.reduce((a, m) => a + m.secondes, 0);
  if (etat && etapeEchauffement === null) {
    return `<div class="carte echauffement replie">
        <span>${etat === "fait" ? "✅ Échauffement fait aujourd'hui" : "⏭️ Échauffement passé"}</span>
        <button class="lien" id="ech-commencer">${etat === "fait" ? "Refaire" : "Le faire"}</button>
      </div>`;
  }
  return `<div class="carte echauffement">
      <h3>🔥 ${esc(ech.nom)} <span class="doux">· ~${Math.ceil(total / 60)} min</span></h3>
      <ol class="mouvements">${ech.mouvements.map((m, k) => `
        <li class="${k === etapeEchauffement ? "en-cours" : k < (etapeEchauffement ?? 0) ? "fait" : ""}">
          <strong>${esc(m.nom)}</strong> <span class="doux">· ${m.secondes} s</span><br>
          <span class="doux">${esc(m.consigne)}</span></li>`).join("")}
      </ol>
      ${etapeEchauffement === null ? `<div class="rangee">
          <button class="bouton petit" id="ech-commencer">▶ Commencer</button>
          <button class="bouton petit secondaire" id="ech-passer">Passer</button>
        </div>` : `<button class="bouton petit secondaire" id="ech-arreter">Arrêter l'échauffement</button>`}
    </div>`;
}

function brancherEchauffement(seance) {
  const ech = PROGRAMME.echauffements?.[seance.echauffement];
  if (!ech) return;
  const finir = etat => {
    etapeEchauffement = null;
    donnees.echauffements[aujourdhuiISO()] = etat;
    sauverDonnees();
    afficher({ garderDefilement: true });
  };
  // Lance le mouvement k ; à la fin du minuteur, on passe au suivant
  const lancer = k => {
    if (k >= ech.mouvements.length) { toast("Échauffement terminé 👍"); finir("fait"); return; }
    etapeEchauffement = k;
    const m = ech.mouvements[k];
    preparerMinuteur({ titre: `${k + 1}/${ech.mouvements.length} · ${m.nom}`, secondes: m.secondes, lancer: true, ensuite: () => lancer(k + 1) });
    afficher({ garderDefilement: true });
  };
  $("#ech-commencer") && ($("#ech-commencer").onclick = () => lancer(0));
  $("#ech-passer") && ($("#ech-passer").onclick = () => finir("passe"));
  $("#ech-arreter") && ($("#ech-arreter").onclick = () => { fermerMinuteur(); finir("passe"); });
}

// ----- Séance : liste des exercices + saisie vocale -----
function pageSeance(idSeance) {
  const s = PROGRAMME.seances[idSeance];
  if (!s) return pageIntrouvable();
  const ids = s.exercices.filter(id => PROGRAMME.exercices[id]);
  const faits = ids.filter(faitAujourdhui).length;

  let html = cartesDouleur(s.categorie) + carteEchauffement(s);
  html += `<p class="doux">~${dureeSeance(idSeance)} min · ${ids.length} exercices · ${faits}/${ids.length} faits aujourd'hui.
    Touche un exercice pour voir comment le faire et noter ta série.</p>`;

  s.exercices.forEach((idExo, i) => {
    const exo = PROGRAMME.exercices[idExo];
    if (!exo) { html += `<div class="carte">⚠️ Exercice « ${esc(idExo)} » introuvable dans programme.js</div>`; return; }
    const p = prevu(idExo);
    const fait = faitAujourdhui(idExo);
    html += `<a class="carte ligne-exo ${fait ? "fait" : ""}" href="#/exo/${idSeance}/${idExo}">
        <span class="num">${fait ? "✓" : i + 1}</span>
        <span class="infos"><strong>${esc(exo.nom)}</strong><br>
          ${estFacile(idExo) ? `<span class="etiquette-facile">version facile</span> ` : ""}<span class="doux">${texteObjectif(idExo)}${avecCharge(exo) ? ` · <strong>${texteResistance(p.chargeKg)}</strong> ≈ ${kg(p.chargeKg)}` : ""} · repos ${texteRepos(exo.repos)}</span>
        </span>
        <span class="fleche doux">›</span>
      </a>`;
  });

  // Saisie vocale
  html += `<div class="carte" id="vocal">
      <h3>🎤 Dicter un exercice</h3>
      <p class="doux">Exemple : « ${esc(exempleDictee(ids))} ». Tu peux utiliser le micro de ton clavier dans le champ.</p>
      <textarea id="dictee" rows="2" placeholder="Tape ou dicte ici…"></textarea>
      <div class="rangee">
        ${Reconnaissance ? `<button class="bouton petit secondaire" id="micro">🎤 Parler</button>` : ""}
        <button class="bouton petit" id="analyser">Analyser</button>
      </div>
      ${Reconnaissance ? "" : `<p class="doux">Le bouton micro n'est pas disponible sur ce navigateur : utilise le micro du clavier.</p>`}
      <div id="compris"></div>
    </div>`;

  return { titre: s.nom, html, retour: "#/", apres: () => { brancherDouleurs(); brancherEchauffement(s); brancherVocal(idSeance, ids); } };
}

function exempleDictee(ids) {
  const exo = PROGRAMME.exercices[ids[0]];
  const p = prevu(ids[0]);
  const nom = exo.nom.replace(/^Gripper — /, "").replace(/\s*\(.*\)/, "").toLowerCase();
  const fin = exo.type === "temps" ? " secondes" : "";
  return `${nom}, ${p.series} séries de ${p.cible[1]}${fin}${avecCharge(exo) ? ", " + p.chargeKg + " kilos" : ""}`;
}

function brancherVocal(idSeance, ids) {
  const champ = $("#dictee");
  if ($("#micro")) $("#micro").onclick = () => ecouter(champ, $("#micro"));

  $("#analyser").onclick = () => {
    if (!champ.value.trim()) { toast("Rien à analyser"); return; }
    const c = comprendrePhrase(champ.value, ids);
    const val = v => v === null ? "" : v;
    const nomExo = id => esc(PROGRAMME.exercices[id].nom);

    // Formulaire de confirmation : ce qui n'a pas été compris reste VIDE
    $("#compris").innerHTML = `
      <div class="confirmation">
        <h3>Voilà ce que j'ai compris — vérifie et corrige :</h3>
        <p class="doux">Phrase reçue : « ${esc(champ.value)} »</p>
        ${c.ambigu ? `<p class="avertissement">⚠️ Plusieurs exercices possibles (${c.candidats.map(nomExo).join(", ")}) : choisis le bon.</p>`
          : c.exo ? "" : `<p class="avertissement">⚠️ Je n'ai pas reconnu l'exercice : choisis-le.</p>`}
        ${c.nombresInutilises.length ? `<p class="avertissement">⚠️ J'ai entendu ${c.nombresInutilises.join(", ")} sans savoir à quoi ça correspond : vérifie les cases.</p>` : ""}
        <label for="v-exo">Exercice</label>
        <select id="v-exo" required>
          <option value="" ${c.exo ? "" : "selected"}>— choisis l'exercice —</option>
          ${ids.map(id => `<option value="${id}" ${id === c.exo ? "selected" : ""}>${nomExo(id)}</option>`).join("")}
        </select>
        <div class="deux-colonnes">
          <div><label for="v-series">Séries</label><input id="v-series" type="number" inputmode="numeric" value="${val(c.series)}">
            <div class="doux" id="v-series-prevu"></div></div>
          <div><label for="v-reps" id="v-reps-label">Reps par série</label><input id="v-reps" type="number" inputmode="numeric" value="${val(c.reps)}">
            <div class="doux" id="v-reps-prevu"></div></div>
        </div>
        <div id="v-charge-bloc"><label for="v-charge">Charge (kg)</label>
          <input id="v-charge" type="number" inputmode="decimal" step="0.5" value="${val(c.chargeKg)}">
          <div class="doux" id="v-charge-prevu"></div></div>
        <div id="v-problemes"></div>
        <label class="case-a-cocher" id="v-confirme-bloc" hidden><input type="checkbox" id="v-confirme"> Oui, ces chiffres sont justes</label>
        <button class="bouton" id="v-ok">✔️ C'est bon, enregistrer</button>
        <button class="bouton secondaire" id="v-annuler">Annuler</button>
      </div>`;

    const nombre = sel => $(sel).value.trim() === "" ? null : Number($(sel).value.replace(",", "."));
    const lire = () => ({ exo: $("#v-exo").value || null, series: nombre("#v-series"), reps: nombre("#v-reps"), chargeKg: nombre("#v-charge") });

    // À chaque modification : on revérifie et on (dé)bloque le bouton
    const verifier = () => {
      const saisie = lire();
      const exo = saisie.exo ? PROGRAMME.exercices[saisie.exo] : null;
      const p = saisie.exo ? prevu(saisie.exo) : null;
      $("#v-charge-bloc").hidden = !(exo && avecCharge(exo));
      $("#v-reps-label").textContent = exo?.type === "temps" ? "Secondes par série" : "Reps par série";
      $("#v-series-prevu").textContent = p ? `prévu : ${p.series}` : "";
      $("#v-reps-prevu").textContent = p ? `prévu : ${p.cible[0]}-${p.cible[1]}` : "";
      $("#v-charge-prevu").textContent = p?.chargeKg !== undefined ? `prévu : ${kg(p.chargeKg)}` : "";
      if (exo && !avecCharge(exo) && c.chargeKg !== null && !$("#v-charge-bloc").dataset.dit) {
        $("#v-charge-bloc").dataset.dit = "1";
        toast("J'ai entendu des kg, mais cet exercice n'a pas de charge : ignoré.");
      }

      const { erreurs, inhabituels } = verifierSaisie(saisie);
      ["#v-series", "#v-reps", "#v-charge"].forEach(sel => $(sel).classList.toggle("a-preciser", $(sel).value.trim() === ""));
      $("#v-problemes").innerHTML =
        erreurs.map(e => `<p class="erreur">✋ ${esc(e)}</p>`).join("") +
        inhabituels.map(e => `<p class="avertissement">⚠️ Inhabituel : ${esc(e)}</p>`).join("");
      $("#v-confirme-bloc").hidden = erreurs.length > 0 || inhabituels.length === 0;
      const bloque = erreurs.length > 0 || (inhabituels.length > 0 && !$("#v-confirme").checked);
      $("#v-ok").disabled = bloque;
      $("#v-ok").textContent = erreurs.length ? "Complète ou corrige pour enregistrer"
        : bloque ? "Coche « ces chiffres sont justes »" : "✔️ C'est bon, enregistrer";
      return !bloque;
    };
    ["#v-exo", "#v-series", "#v-reps", "#v-charge", "#v-confirme"].forEach(sel => $(sel).addEventListener("input", verifier));
    $("#v-exo").addEventListener("change", verifier);
    verifier();

    $("#v-annuler").onclick = () => { $("#compris").innerHTML = ""; };
    $("#v-ok").onclick = () => {
      if (!verifier()) return; // sécurité : jamais d'enregistrement si quelque chose cloche
      const { exo: exoId, series: nb, reps, chargeKg } = lire();
      const exo = PROGRAMME.exercices[exoId];
      const pr = prevu(exoId);
      const series = Array(nb).fill(reps);
      enregistrer({
        seance: idSeance, exo: exoId,
        resultat: resultatDepuisSeries(series, pr.cible, pr.series),
        series, chargeKg: avecCharge(exo) ? chargeKg : undefined
      });
      champ.value = "";
      toast("Enregistré : " + exo.nom);
      location.hash = `#/exo/${idSeance}/${exoId}?ok`;
    };
  };
}

// ----- Schéma des muscles (silhouette simplifiée, dessinée en SVG) -----
// Chaque forme appartient à une zone ; "neutre" = partie du corps jamais colorée.
const SILHOUETTE = {
  devant: [
    ["neutre", '<ellipse cx="60" cy="20" rx="12" ry="14"/>'],
    ["neutre", '<rect x="54" y="32" width="12" height="9" rx="3"/>'],
    ["epaules", '<ellipse cx="38" cy="52" rx="10" ry="10"/><ellipse cx="82" cy="52" rx="10" ry="10"/>'],
    ["pectoraux", '<rect x="44" y="43" width="15.5" height="25" rx="7"/><rect x="60.5" y="43" width="15.5" height="25" rx="7"/>'],
    ["biceps", '<rect x="27" y="63" width="12" height="31" rx="6"/><rect x="81" y="63" width="12" height="31" rx="6"/>'],
    ["avantbras", '<rect x="24" y="96" width="11" height="36" rx="5.5"/><rect x="85" y="96" width="11" height="36" rx="5.5"/>'],
    ["mains", '<ellipse cx="29" cy="141" rx="6" ry="8"/><ellipse cx="91" cy="141" rx="6" ry="8"/>'],
    ["obliques", '<rect x="41" y="71" width="7" height="41" rx="3.5"/><rect x="72" y="71" width="7" height="41" rx="3.5"/>'],
    ["abdos", '<rect x="49.5" y="70" width="21" height="46" rx="7"/>'],
    ["neutre", '<rect x="43" y="115" width="34" height="16" rx="8"/>'],
    ["quadriceps", '<rect x="42" y="130" width="17" height="58" rx="8.5"/><rect x="61" y="130" width="17" height="58" rx="8.5"/>'],
    ["neutre", '<rect x="44" y="192" width="13" height="44" rx="6.5"/><rect x="63" y="192" width="13" height="44" rx="6.5"/>'],
    ["neutre", '<ellipse cx="50" cy="241" rx="8" ry="4.5"/><ellipse cx="70" cy="241" rx="8" ry="4.5"/>']
  ],
  derriere: [
    ["neutre", '<ellipse cx="60" cy="20" rx="12" ry="14"/>'],
    ["neutre", '<rect x="54" y="32" width="12" height="9" rx="3"/>'],
    ["trapezes", '<path d="M60 38 L77 46 L69 60 L60 80 L51 60 L43 46 Z"/>'],
    ["epaules", '<ellipse cx="38" cy="52" rx="10" ry="10"/><ellipse cx="82" cy="52" rx="10" ry="10"/>'],
    ["dorsaux", '<path d="M45 59 L53 66 L57 97 L50 103 L42 86 Z"/><path d="M75 59 L67 66 L63 97 L70 103 L78 86 Z"/>'],
    ["triceps", '<rect x="27" y="63" width="12" height="31" rx="6"/><rect x="81" y="63" width="12" height="31" rx="6"/>'],
    ["avantbras", '<rect x="24" y="96" width="11" height="36" rx="5.5"/><rect x="85" y="96" width="11" height="36" rx="5.5"/>'],
    ["mains", '<ellipse cx="29" cy="141" rx="6" ry="8"/><ellipse cx="91" cy="141" rx="6" ry="8"/>'],
    ["lombaires", '<rect x="53" y="99" width="14" height="17" rx="5"/>'],
    ["fessiers", '<ellipse cx="51" cy="127" rx="10" ry="11"/><ellipse cx="69" cy="127" rx="10" ry="11"/>'],
    ["ischios", '<rect x="42" y="140" width="17" height="50" rx="8.5"/><rect x="61" y="140" width="17" height="50" rx="8.5"/>'],
    ["mollets", '<ellipse cx="50.5" cy="210" rx="7.5" ry="18"/><ellipse cx="69.5" cy="210" rx="7.5" ry="18"/>'],
    ["neutre", '<ellipse cx="50" cy="241" rx="8" ry="4.5"/><ellipse cx="70" cy="241" rx="8" ry="4.5"/>']
  ]
};

function carteMuscles(exo) {
  if (!exo.muscles) return "";
  const { principaux = [], secondaires = [] } = exo.muscles;
  const classe = zone => zone === "neutre" ? "neutre"
    : principaux.includes(zone) ? "muscle principal"
    : secondaires.includes(zone) ? "muscle secondaire" : "muscle";
  const vue = (nom, x, titre) => `<g transform="translate(${x} 0)">
      ${SILHOUETTE[nom].map(([zone, forme]) => `<g class="${classe(zone)}">${forme}</g>`).join("")}
      <text class="vue" x="60" y="260" text-anchor="middle">${titre}</text></g>`;
  const noms = liste => liste.map(m => PROGRAMME.nomsMuscles?.[m] || m).join(", ");
  return `<div class="carte schema-muscles">
      <h3>Muscles travaillés</h3>
      <svg viewBox="0 0 250 266" role="img" aria-label="Muscles travaillés : ${esc(noms(principaux))}">
        ${vue("devant", 0, "Devant")}${vue("derriere", 130, "Derrière")}
      </svg>
      <div class="legende-muscles">
        ${principaux.length ? `<div><span class="pastille-couleur principal"></span><span><strong>Travaille surtout :</strong> ${esc(noms(principaux))}</span></div>` : ""}
        ${secondaires.length ? `<div><span class="pastille-couleur secondaire"></span><span><strong>Aide aussi :</strong> ${esc(noms(secondaires))}</span></div>` : ""}
      </div>
      <p class="doux">Schéma simplifié, pour te repérer.</p>
    </div>`;
}

// ----- Démonstration animée (bonhomme dessiné en code, voir illustrations.js) -----
const MEMBRES = { tronc: 32, cou: 11, tete: 7, bras: 17, avantbras: 16, cuisse: 26, tibia: 26, pied: 8 };
const rad = d => d * Math.PI / 180;
const versAngle = (p, angle, l) => [p[0] + l * Math.cos(rad(angle)), p[1] + l * Math.sin(rad(angle))];
const melange = (a, b, f) => a + (b - a) * f;

// Deux segments (bras + avant-bras, cuisse + tibia) qui doivent atteindre un point :
// renvoie l'articulation du milieu (coude, genou) et le bout (main, cheville).
function plier(debut, cible, l1, l2, sens) {
  const dx = cible[0] - debut[0], dy = cible[1] - debut[1];
  const d = Math.hypot(dx, dy) || 0.001;
  const ux = dx / d, uy = dy / d;
  if (d >= l1 + l2) { // trop loin : membre tendu dans la direction du point
    return { milieu: [debut[0] + ux * l1, debut[1] + uy * l1], bout: [debut[0] + ux * (l1 + l2), debut[1] + uy * (l1 + l2)] };
  }
  const dd = Math.max(d, Math.abs(l1 - l2) + 0.01);
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return { milieu: [debut[0] + ux * a - sens * uy * h, debut[1] + uy * a + sens * ux * h], bout: cible };
}

// Met une pose sous une forme complète et régulière
function normaliserPose(p) {
  const deux = m => {
    if (m === undefined) return [null, null];
    if (Array.isArray(m) && typeof m[0] === "number") return [{ a: m }, { a: m }];
    if (!Array.isArray(m)) return [m, m];
    return [0, 1].map(i => { const x = m[i] ?? m[0]; return Array.isArray(x) ? { a: x } : x; });
  };
  // corps = [x cheville, y cheville, angle] : la hanche se déduit (corps tendu)
  const hanche = p.corps ? versAngle([p.corps[0], p.corps[1]], p.corps[2], MEMBRES.cuisse + MEMBRES.tibia) : p.hanche;
  return {
    hanche, corps: p.corps || null, tronc: p.tronc, tete: p.tete ?? p.tronc, largeur: p.largeur || 0,
    bras: deux(p.bras), jambes: deux(p.jambes),
    pied: p.pied === undefined ? null : (Array.isArray(p.pied) ? p.pied : [p.pied, p.pied])
  };
}

// Position intermédiaire entre deux poses (f de 0 à 1)
function entrePoses(p, q, f) {
  const membre = (m, n) => {
    if (!m || !n) return m || n;
    if (m.a && n.a) return { a: [melange(m.a[0], n.a[0], f), melange(m.a[1], n.a[1], f)] };
    if (m.c && n.c) return { c: [melange(m.c[0], n.c[0], f), melange(m.c[1], n.c[1], f)], s: f < 0.5 ? m.s : n.s, tendu: m.tendu };
    return f < 0.5 ? m : n;
  };
  // Corps tendu des deux côtés : on fait pivoter le corps autour des pieds (il reste droit)
  const corps = p.corps && q.corps ? [0, 1, 2].map(i => melange(p.corps[i], q.corps[i], f)) : null;
  const hanche = corps ? versAngle([corps[0], corps[1]], corps[2], MEMBRES.cuisse + MEMBRES.tibia)
    : [melange(p.hanche[0], q.hanche[0], f), melange(p.hanche[1], q.hanche[1], f)];
  return {
    hanche, corps,
    tronc: melange(p.tronc, q.tronc, f), tete: melange(p.tete, q.tete, f),
    largeur: melange(p.largeur, q.largeur, f),
    bras: [0, 1].map(i => membre(p.bras[i], q.bras[i])),
    jambes: [0, 1].map(i => membre(p.jambes[i], q.jambes[i])),
    pied: p.pied && q.pied ? [0, 1].map(i => melange(p.pied[i], q.pied[i], f)) : (p.pied || q.pied)
  };
}

// Calcule la position de chaque articulation
function articulations(pose) {
  const H = pose.hanche, E = versAngle(H, pose.tronc, MEMBRES.tronc);
  const px = -Math.sin(rad(pose.tronc)), py = Math.cos(rad(pose.tronc)); // perpendiculaire au tronc
  const w = pose.largeur;
  const epaules = [[E[0] - px * w, E[1] - py * w], [E[0] + px * w, E[1] + py * w]];
  const hanches = [[H[0] - px * w * 0.6, H[1] - py * w * 0.6], [H[0] + px * w * 0.6, H[1] + py * w * 0.6]];
  const membre = (depart, m, l1, l2, sensDefaut) => {
    if (!m) return null;
    if (m.a) { const mil = versAngle(depart, m.a[0], l1); return { milieu: mil, bout: versAngle(mil, m.a[1], l2) }; }
    if (m.tendu) return { milieu: [(depart[0] + m.c[0]) / 2, (depart[1] + m.c[1]) / 2], bout: m.c };
    return plier(depart, m.c, l1, l2, m.s ?? sensDefaut);
  };
  const bras = [0, 1].map(i => membre(epaules[i], pose.bras[i], MEMBRES.bras, MEMBRES.avantbras, 1));
  const jambes = [0, 1].map(i => membre(hanches[i], pose.jambes[i], MEMBRES.cuisse, MEMBRES.tibia, -1));
  const orteils = pose.pied ? [0, 1].map(i => jambes[i] && versAngle(jambes[i].bout, pose.pied[i], MEMBRES.pied)) : [null, null];
  return { H, E, tete: versAngle(E, pose.tete, MEMBRES.cou), epaules, hanches, bras, jambes, orteils };
}

// Durée de chaque étape de l'animation
function etapesAnimation(spec) {
  const n = spec.poses.length;
  const pause = spec.pause ?? 0.35;
  return Array.from({ length: n }, (_, i) => ({ pause, duree: spec.durees?.[i] ?? spec.duree ?? 1.2 }));
}

// La pose à l'instant t (en secondes), en boucle
function poseA(spec, t) {
  if (!spec._poses) spec._poses = spec.poses.map(normaliserPose);
  const poses = spec._poses;
  if (poses.length === 1) return poses[0];
  const etapes = etapesAnimation(spec);
  const total = etapes.reduce((a, e) => a + e.pause + e.duree, 0);
  let reste = t % total;
  for (let i = 0; i < etapes.length; i++) {
    const e = etapes[i];
    if (reste < e.pause) return poses[i];
    reste -= e.pause;
    if (reste < e.duree) {
      const f = 0.5 - Math.cos(Math.PI * reste / e.duree) / 2; // départ et arrivée en douceur
      return entrePoses(poses[i], poses[(i + 1) % poses.length], f);
    }
    reste -= e.duree;
  }
  return poses[0];
}

const pt = p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

// Dessine le bonhomme (et les objets qu'il tient) pour une pose
function dessinBonhomme(spec, pose) {
  const j = articulations(pose);
  const deFace = spec.vue === "face" || spec.vue === "dessus";
  const ligne = (points, classe = "os") => `<polyline class="${classe}" points="${points.map(pt).join(" ")}"/>`;
  const membre = (depart, m, classe) => m ? ligne([depart, m.milieu, m.bout], classe) : "";
  const pied = (i, classe) => j.orteils[i] && j.jambes[i] ? ligne([j.jambes[i].bout, j.orteils[i]], classe) : "";
  const loin = deFace ? "os" : "os loin";
  let svg = "";
  // Membres du côté éloigné (plus clairs, derrière)
  svg += membre(j.hanches[1], j.jambes[1], loin) + pied(1, loin) + membre(j.epaules[1], j.bras[1], loin);
  // Tronc (et épaules / bassin vus de face)
  svg += ligne([j.H, j.E]);
  if (deFace) svg += ligne([j.epaules[0], j.epaules[1]]) + ligne([j.hanches[0], j.hanches[1]]);
  svg += `<circle class="tete" cx="${j.tete[0].toFixed(1)}" cy="${j.tete[1].toFixed(1)}" r="${MEMBRES.tete}"/>`;
  // Membres du côté proche
  svg += membre(j.hanches[0], j.jambes[0], "os") + pied(0, "os") + membre(j.epaules[0], j.bras[0], "os");
  // Objets qui suivent le corps (sac, serviette)
  const point = nom => {
    const [type, i] = [nom.slice(0, -1), +nom.slice(-1)];
    return type === "main" ? j.bras[i]?.bout : type === "pied" ? j.jambes[i]?.bout : null;
  };
  for (const a of spec.accessoires || []) {
    if (a.t === "sac") {
      const m = j.bras[a.main]?.bout;
      if (m) svg += `<line class="anse" x1="${m[0].toFixed(1)}" y1="${m[1].toFixed(1)}" x2="${m[0].toFixed(1)}" y2="${(m[1] + 3).toFixed(1)}"/>
        <rect class="objet" x="${(m[0] - 6).toFixed(1)}" y="${(m[1] + 2).toFixed(1)}" width="12" height="14" rx="3"/>`;
    }
    if (a.t === "serviette") {
      const p1 = point(a.de), p2 = point(a.a);
      if (p1 && p2) svg += `<line class="serviette" x1="${pt(p1).split(",")[0]}" y1="${pt(p1).split(",")[1]}" x2="${pt(p2).split(",")[0]}" y2="${pt(p2).split(",")[1]}"/>`;
    }
  }
  return svg;
}

// Décor fixe (sol, mur, barre, chaise...)
function dessinDecor(spec) {
  const sol = spec.sol === undefined ? 114 : spec.sol;
  let svg = sol === null ? "" : `<line class="sol" x1="8" y1="${sol + 2}" x2="192" y2="${sol + 2}"/>`;
  for (const a of spec.accessoires || []) {
    if (a.t === "mur") svg += `<line class="decor" x1="${a.x}" y1="14" x2="${a.x}" y2="${sol + 2}"/>`;
    if (a.t === "barre") svg += `<line class="decor epais" x1="${a.x1}" y1="${a.y}" x2="${a.x2}" y2="${a.y}"/>`;
    if (a.t === "barreBasse") svg += `<line class="decor" x1="${a.x}" y1="${a.y}" x2="${a.x}" y2="${sol + 2}"/><circle class="decor-plein" cx="${a.x}" cy="${a.y}" r="3.5"/>`;
    if (a.t === "chaise") svg += `<polyline class="decor" points="${a.x1},${a.y - 32} ${a.x1},${a.y} ${a.x2},${a.y}"/>
      <line class="decor" x1="${a.x1 + 2}" y1="${a.y}" x2="${a.x1 + 2}" y2="${sol + 2}"/><line class="decor" x1="${a.x2 - 2}" y1="${a.y}" x2="${a.x2 - 2}" y2="${sol + 2}"/>`;
    if (a.t === "table" || a.t === "banc") svg += `<line class="decor epais" x1="${a.x1}" y1="${a.y}" x2="${a.x2}" y2="${a.y}"/>
      <line class="decor" x1="${a.x1 + 4}" y1="${a.y}" x2="${a.x1 + 4}" y2="${sol + 2}"/><line class="decor" x1="${a.x2 - 4}" y1="${a.y}" x2="${a.x2 - 4}" y2="${sol + 2}"/>`;
    if (a.t === "reperes") {
      svg += `<g class="reperes"><rect x="158" y="4" width="38" height="40" rx="8"/>
        <circle cx="177" cy="12" r="3"/><line x1="169" y1="19" x2="185" y2="19"/>
        ${a.forme === "diamant" ? `<polygon points="177,24 182,29 177,34 172,29"/>` : `<circle cx="163" cy="27" r="2.6"/><circle cx="191" cy="27" r="2.6"/>`}
        <text x="177" y="41" text-anchor="middle">mains</text></g>`;
    }
  }
  return svg;
}

// La carte « Démonstration » d'une fiche
function carteDemonstration(idExo) {
  const spec = typeof ILLUSTRATIONS !== "undefined" ? ILLUSTRATIONS[idExo] : null;
  const exo = PROGRAMME.exercices[idExo];
  const recherche = spec?.recherche || exo.nom;
  const lienVideo = `https://www.youtube.com/results?search_query=${encodeURIComponent(recherche)}`;
  let dessin = "";
  if (spec?.poses) {
    const hauteur = spec.hauteur || 125;
    const vue = spec.vue === "face" ? "Vu de face" : spec.vue === "dessus" ? "Vu de dessus" : "Vu de côté";
    dessin = `<div class="scene"><svg class="illustration" viewBox="0 0 200 ${hauteur}" data-illustration="${idExo}" role="img" aria-label="Animation : ${esc(exo.nom)}">
        ${dessinDecor(spec)}<g class="bonhomme">${dessinBonhomme(spec, poseA(spec, 0))}</g></svg></div>
      <p class="doux">${esc(spec.legende || vue + ".")} ${spec.poses.length === 1 ? "Position à tenir." : "Animation simplifiée."}
        ${!avecCharge(exo) && prevu(idExo).version === "facile" ? " Le dessin montre la version normale ; ta version facile est décrite plus bas." : ""}</p>`;
  }
  return `<div class="carte demo">
      <h3>Démonstration</h3>
      ${dessin}
      <a class="bouton secondaire petit lien-video" href="${lienVideo}" target="_blank" rel="noopener noreferrer">▶ Voir des vidéos sur YouTube</a>
      <p class="doux">Ouvre une recherche YouTube sur « ${esc(recherche)} ». Je n'ai pas vérifié les vidéos : choisis-en une claire, de préférence par un coach.</p>
    </div>`;
}

// Fait bouger toutes les animations visibles (une image toutes les ~16 ms)
let animationEnCours = null;
function animerIllustrations() {
  const zones = document.querySelectorAll("[data-illustration]");
  if (!zones.length) { animationEnCours = null; return; }
  const t = performance.now() / 1000;
  zones.forEach(svg => {
    const spec = ILLUSTRATIONS[svg.dataset.illustration];
    if (!spec || spec.poses.length < 2) return;
    svg.querySelector(".bonhomme").innerHTML = dessinBonhomme(spec, poseA(spec, t));
  });
  animationEnCours = requestAnimationFrame(animerIllustrations);
}
function lancerIllustrations() {
  if (!animationEnCours && document.querySelector("[data-illustration]")) animationEnCours = requestAnimationFrame(animerIllustrations);
}

// ----- Fiche d'un exercice + suivi -----
function pageExercice(idSeance, idExo, juste) {
  const exo = PROGRAMME.exercices[idExo];
  const seance = PROGRAMME.seances[idSeance];
  if (!exo || !seance) return pageIntrouvable();
  const p = prevu(idExo);
  const u = exo.type === "temps" ? "Secondes" : "Reps";

  let html = cartesDouleur(seance.categorie);

  html += `<div class="grille">
      <div class="case"><div class="etiquette">Séries</div><div class="valeur">${p.series}</div></div>
      <div class="case"><div class="etiquette">${u}</div><div class="valeur">${p.cible[0]}-${p.cible[1]}</div></div>
      <div class="case"><div class="etiquette">Repos</div><div class="valeur">${texteRepos(exo.repos)}</div></div>
      <div class="case"><div class="etiquette">${avecCharge(exo) ? "Réglage" : "Côtés"}</div>
        <div class="valeur">${avecCharge(exo) ? "≈ " + kg(p.chargeKg) : (exo.parCote ? "Chacun" : "—")}</div></div>
    </div>`;
  if (avecCharge(exo)) {
    html += `<div class="carte resistance">
        <div class="etiquette">Résistance</div>
        <div class="niveau-resistance">${texteResistance(p.chargeKg)}</div>
        <div class="doux">≈ ${kg(p.chargeKg)} · ${esc(REGLES.avertissementKg)}</div>
        ${exo.variante ? `<p class="note">${esc(REGLES.avertissementVariante)}</p>` : ""}
      </div>`;
  }

  html += carteDemonstration(idExo);

  html += `<div class="carte">${avecCharge(exo) ? "<h3>À savoir</h3>" : `<h3>Niveau</h3><div>${esc(exo.niveau)}</div>`}
      ${exo.parCote ? `<div class="doux">À faire ${avecCharge(exo) ? "avec chaque main" : "de chaque côté"}.</div>` : ""}
      ${enPhaseDebut() && exo.series.debut !== exo.series.plein
        ? `<div class="doux">Semaines 1-${REGLES.semainesPhaseDebut} : ${exo.series.debut} série(s), puis ${exo.series.plein}.</div>` : ""}
      ${donnees.ajustements[idExo] ? `<div class="doux">Ajusté par l'adaptation (programme d'origine : ${exo.cible[0]}-${exo.cible[1]}${avecCharge(exo) ? ", " + kg(exo.chargeKg) : ""}).</div>` : ""}
    </div>`;

  html += carteMuscles(exo);

  if (!avecCharge(exo) && exo.facile) {
    const facile = p.version === "facile";
    html += `<div class="carte version">
        <h3>Version</h3>
        <div class="choix-version" role="group" aria-label="Version de l'exercice">
          <button class="${facile ? "" : "actif"}" data-version="normale" aria-pressed="${!facile}">Normale</button>
          <button class="${facile ? "actif" : ""}" data-version="facile" aria-pressed="${facile}">Facile</button>
        </div>
        ${facile ? `<p><strong>Tu fais la version facile :</strong> ${esc(exo.facile)}</p>
          <p class="doux">Même fourchette de reps. L'app te proposera la version normale quand tu seras au top 2 semaines.</p>` : ""}
        ${exo.versionDepart === "facile" && !donnees.ajustements[idExo]?.version ? `<p class="doux">Version facile conseillée pour la reprise.</p>` : ""}
      </div>`;
  }

  html += `<details class="carte" ${faitAujourdhui(idExo) ? "" : "open"}><summary><h3>Comment faire</h3></summary><ol class="etapes">
      ${exo.etapes.map(e => `<li>${esc(e)}</li>`).join("")}</ol>
      ${exo.note ? `<p class="note">⚠️ ${esc(exo.note)}</p>` : ""}
      <p><strong>${!avecCharge(exo) && p.version === "facile" ? "Version facile (en cours)" : "Plus facile"} :</strong> ${esc(exo.facile)}</p>
      <p><strong>Plus difficile :</strong> ${esc(exo.difficile)}</p>
    </details>`;

  // ----- Suivi -----
  const entreeJuste = juste ? entreesDe(idExo).slice(-1)[0] : null;
  if (entreeJuste) {
    const r = RESULTATS[entreeJuste.resultat];
    html += `<div class="carte succes">
        <h3>${r.emoji} Enregistré : ${r.texte}</h3>
        <div class="doux">${entreeJuste.series ? entreeJuste.series.join(" / ") + " " + unite(exo) : "sans détail"}${avecCharge(exo) ? " · " + kg(entreeJuste.chargeKg) : ""}</div>
        <button class="lien" id="annuler">Annuler cet enregistrement</button>
      </div>`;
    html += carteAnalyse(idExo, analyser(idExo));
    const suivant = seance.exercices[seance.exercices.indexOf(idExo) + 1];
    html += suivant
      ? `<a class="bouton" href="#/exo/${idSeance}/${suivant}">Exercice suivant : ${esc(PROGRAMME.exercices[suivant]?.nom)} ›</a>`
      : `<a class="bouton" href="#/seance/${idSeance}">Séance terminée 🎉 Retour à la séance</a>`;
  } else {
    const faites = seriesValidees[cleSeries(idExo)] || 0;
    html += `<div class="carte" id="series-en-cours">
      <h3>Séries : ${Math.min(faites, p.series)} / ${p.series}</h3>
      <div class="pastilles">${Array.from({ length: p.series }, (_, k) =>
        `<span class="pastille ${k < faites ? "faite" : ""}">${k + 1}</span>`).join("")}</div>
      ${faites < p.series
        ? `<button class="bouton" id="valider-serie">✓ Série ${faites + 1} faite</button>
           <p class="doux">Après chaque série, un repos de ${mmss(reposConseille(exo))} te sera proposé (repos conseillé : ${texteRepos(exo.repos)}).</p>`
        : `<p>Toutes les séries sont faites 💪 Dis-moi comment ça s'est passé :</p>`}
    </div>`;
    html += `<div class="carte" id="suivi">
      <h3>Comment ça s'est passé ?</h3>
      <p class="doux">Objectif : ${p.series} × ${p.cible[1]} ${unite(exo)}${exo.parCote ? (avecCharge(exo) ? " par main" : " par côté") : ""}${avecCharge(exo) ? " à " + kg(p.chargeKg) : ""} (haut de la fourchette).</p>

      <fieldset class="douleur">
        <legend>Douleur ?</legend>
        ${Object.entries(REGLES.zonesDouleur).map(([cle, z]) =>
          `<label class="case-a-cocher"><input type="checkbox" name="douleur" value="${cle}"> ${esc(z.nom)}</label>`).join("")}
        <input type="text" id="douleur-note" placeholder="Précise si tu veux (ex. épaule droite)" hidden>
      </fieldset>

      <button class="gros vert" data-resultat="tout">✅ J'ai tout fait<small>toutes les séries, haut de la fourchette</small></button>
      <button class="gros orange" data-resultat="moins">🟠 J'ai fait moins<small>je corrige les chiffres</small></button>
      <button class="gros rouge" data-resultat="dur">🔴 Trop dur<small>pas pu atteindre le bas de la fourchette</small></button>

      <details id="detail">
        <summary>Saisir les reps et la charge exactes</summary>
        <div id="champs-series">
          ${Array.from({ length: p.series }, (_, k) => `
            <div class="ligne-serie"><label for="s${k}">Série ${k + 1}</label>
            <input id="s${k}" class="serie" type="number" inputmode="numeric" min="0" value="${p.cible[1]}">
            <span class="doux">${unite(exo)}</span></div>`).join("")}
        </div>
        <button class="lien" id="ajouter-serie">+ ajouter une série</button>
        ${avecCharge(exo) ? `<label for="charge">Charge (kg)</label>
          <input id="charge" type="number" inputmode="decimal" step="0.5" min="0" value="${p.chargeKg}">` : ""}
        <button class="bouton" id="enregistrer-detail">Enregistrer ces chiffres</button>
      </details>
    </div>`;
  }

  // Historique court de cet exercice
  const passees = entreesDe(idExo).slice(-5).reverse();
  if (passees.length) {
    html += `<div class="carte"><h3>Dernières fois</h3>${passees.map(e =>
      `<div class="ligne-histo">${RESULTATS[e.resultat].emoji} ${dateCourte(e.date)} — ${e.series ? e.series.join("/") + " " + unite(exo) : "sans détail"}${e.version === "facile" ? " (facile)" : ""}${e.chargeKg !== undefined && e.chargeKg !== null ? " · " + kg(e.chargeKg) : ""}${e.douleur?.length ? " · 🩹" : ""}</div>`).join("")}
      <a class="lien" href="#/historique/${idExo}">Voir le graphique ›</a></div>`;
  }

  return {
    titre: exo.nom, html, retour: `#/seance/${idSeance}`,
    apres: () => { brancherDouleurs(); brancherPropositions(); brancherSuivi(idSeance, idExo, entreeJuste); }
  };
}

function brancherSuivi(idSeance, idExo, entreeJuste) {
  const exo = PROGRAMME.exercices[idExo];
  // Choix Normale / Facile (retenu pour les prochaines fois)
  document.querySelectorAll("[data-version]").forEach(b => b.onclick = () => {
    donnees.ajustements[idExo] = Object.assign({}, donnees.ajustements[idExo], { version: b.dataset.version });
    sauverDonnees();
    toast(b.dataset.version === "facile" ? "Version facile choisie" : "Version normale choisie");
    afficher({ garderDefilement: true });
  });
  if (entreeJuste) {
    $("#annuler").onclick = () => {
      annulerEntree(entreeJuste.id);
      toast("Enregistrement annulé");
      location.hash = `#/exo/${idSeance}/${idExo}`;
    };
    return;
  }

  // Bouton "Série faite" -> repos proposé (sauf après la dernière série)
  const valider = $("#valider-serie");
  if (valider) valider.onclick = () => {
    const cle = cleSeries(idExo);
    seriesValidees[cle] = (seriesValidees[cle] || 0) + 1;
    const total = prevu(idExo).series;
    if (seriesValidees[cle] < total) {
      preparerMinuteur({ titre: `Repos avant la série ${seriesValidees[cle] + 1}`, secondes: reposConseille(exo) });
    } else {
      fermerMinuteur();
    }
    afficher({ garderDefilement: true });
    if (seriesValidees[cle] >= total) setTimeout(() => $("#suivi")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // Afficher le champ de précision quand "Autre" est coché
  const autre = document.querySelector('input[name="douleur"][value="autre"]');
  if (autre) autre.onchange = () => { $("#douleur-note").hidden = !autre.checked; };

  const lireDouleur = () => [...document.querySelectorAll('input[name="douleur"]:checked')].map(c => c.value);
  const lireSeries = () => [...document.querySelectorAll(".serie")]
    .map(i => parseInt(i.value, 10)).filter(n => !isNaN(n));
  const lireCharge = () => avecCharge(exo) ? (parseFloat($("#charge").value) || prevu(idExo).chargeKg) : undefined;

  const terminer = infos => {
    enregistrer(Object.assign({ seance: idSeance, exo: idExo, douleur: lireDouleur(), douleurNote: $("#douleur-note").value.trim() }, infos));
    location.hash = `#/exo/${idSeance}/${idExo}?ok`;
  };

  document.querySelectorAll("[data-resultat]").forEach(b => b.onclick = () => {
    const p = prevu(idExo);
    const r = b.dataset.resultat;
    if (r === "tout") {
      // Tout fait = toutes les séries prévues, au haut de la fourchette
      terminer({ resultat: "tout", series: Array(p.series).fill(p.cible[1]), chargeKg: p.chargeKg });
    } else if (r === "moins") {
      // On ouvre le détail pour que tu corriges les chiffres
      $("#detail").open = true;
      $("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
      toast("Corrige les séries puis « Enregistrer ces chiffres »");
    } else {
      // Trop dur : si tu as ouvert le détail, on garde tes chiffres, sinon sans détail
      terminer({ resultat: "dur", series: $("#detail").open ? lireSeries() : null, chargeKg: lireCharge() });
    }
  });

  $("#ajouter-serie").onclick = () => {
    const k = document.querySelectorAll(".serie").length;
    const div = document.createElement("div");
    div.className = "ligne-serie";
    div.innerHTML = `<label for="s${k}">Série ${k + 1}</label>
      <input id="s${k}" class="serie" type="number" inputmode="numeric" min="0" value="${prevu(idExo).cible[1]}">
      <span class="doux">${unite(exo)}</span>`;
    $("#champs-series").appendChild(div);
  };

  $("#enregistrer-detail").onclick = () => {
    const series = lireSeries();
    if (!series.length) { toast("Entre au moins une série"); return; }
    const p = prevu(idExo);
    terminer({ resultat: resultatDepuisSeries(series, p.cible, p.series), series, chargeKg: lireCharge() });
  };
}

// ----- Historique -----
function pageHistorique(idExoChoisi) {
  if (donnees.journal.length === 0) {
    return { titre: "Historique", html: carteRegularite() + `<div class="carte doux">Pas encore d'exercice enregistré. Fais un exercice et appuie sur un des trois boutons : il apparaîtra ici.</div>`, apres: brancherGraphiques };
  }
  const exosFaits = [...new Set(donnees.journal.map(e => e.exo))].filter(id => PROGRAMME.exercices[id]);
  const idExo = exosFaits.includes(idExoChoisi) ? idExoChoisi : donnees.journal[donnees.journal.length - 1].exo;
  const exo = PROGRAMME.exercices[idExo];

  let html = carteRegularite();
  html += `<label for="choix-exo">Évolution de l'exercice</label>
    <select id="choix-exo">${exosFaits.map(id =>
      `<option value="${id}" ${id === idExo ? "selected" : ""}>${esc(PROGRAMME.exercices[id].nom)}</option>`).join("")}</select>`;

  const entrees = entreesDe(idExo);
  const avecSeries = entrees.filter(e => e.series);
  html += `<div class="carte"><h3>${exo.type === "temps" ? "Secondes" : "Reps"} moyennes par série</h3>
      ${avecSeries.length ? graphique(avecSeries.map(e => ({ date: e.date, valeur: moyenne(e.series), detail: e.series.join(" / ") + " " + unite(exo) })),
        { bande: prevu(idExo).cible, unite: unite(exo) })
        : `<p class="doux">Pas encore de chiffres détaillés pour cet exercice.</p>`}
      <p class="doux">La zone grisée = ta fourchette actuelle (${prevu(idExo).cible.join("-")} ${unite(exo)}).</p>
    </div>`;
  if (avecCharge(exo)) {
    html += `<div class="carte"><h3>Charge (kg)</h3>
      ${graphique(entrees.filter(e => e.chargeKg != null).map(e => ({ date: e.date, valeur: e.chargeKg, detail: kg(e.chargeKg) })), { unite: "kg", min: 0 })}
    </div>`;
  }

  const ajusts = donnees.historiqueAjustements.filter(a => a.exo === idExo);
  if (ajusts.length) {
    html += `<div class="carte"><h3>Changements acceptés</h3>${ajusts.slice().reverse().map(a =>
      `<div class="ligne-histo">${dateCourte(a.date)} — ${a.apres.chargeKg !== undefined ? kg(a.avant.chargeKg) + " → " + kg(a.apres.chargeKg)
        : a.apres.version ? "version " + (a.avant.version || "normale") + " → " + a.apres.version
        : a.avant.cible.join("-") + " → " + a.apres.cible.join("-")}</div>`).join("")}</div>`;
  }

  // Séances passées, regroupées par jour
  html += `<h2 class="section">Séances passées</h2>`;
  const parJour = {};
  for (const e of donnees.journal) (parJour[aujourdhuiISO(new Date(e.date))] ||= []).push(e);
  for (const jour of Object.keys(parJour).sort().reverse()) {
    html += `<div class="carte"><h3>${majuscule(dateCourte(jour + "T12:00:00"))}</h3>${parJour[jour].map(e => {
      const x = PROGRAMME.exercices[e.exo];
      if (!x) return "";
      return `<div class="ligne-histo">${RESULTATS[e.resultat].emoji} <a href="#/historique/${e.exo}">${esc(x.nom)}</a>
        <span class="doux">— ${e.series ? e.series.join("/") + " " + unite(x) : "sans détail"}${e.chargeKg != null ? " · " + kg(e.chargeKg) : ""}${e.douleur?.length ? " · 🩹 " + e.douleur.join(", ") : ""}</span></div>`;
    }).join("")}</div>`;
  }

  return {
    titre: "Historique", html,
    apres: () => {
      $("#choix-exo").onchange = e => { location.hash = "#/historique/" + e.target.value; };
      brancherGraphiques();
    }
  };
}

// Régularité : séances faites par semaine, depuis le début du programme (8 semaines max)
function carteRegularite() {
  const semaines = [];
  let l = lundiDe();
  const premier = lundiDe(new Date(donnees.dateDebut + "T12:00:00"));
  while (l >= premier && semaines.length < 8) { semaines.unshift(bilanSemaine(l)); l = decalerDate(l, -7); }
  if (!semaines.length) return "";

  const L = 320, H = 160, g = 28, d = 8, h = 14, bas = 24;
  const max = Math.max(...semaines.map(s => s.faites + s.facultativesFaites), ...semaines.map(s => s.prevues), 1);
  const y = v => H - bas - (v * (H - bas - h)) / max;
  const pas = (L - g - d) / semaines.length;
  const largeur = Math.min(28, pas * 0.6);
  let svg = `<svg class="graphique" viewBox="0 0 ${L} ${H}" role="img" aria-label="Séances faites par semaine">`;
  for (const v of [0, Math.round(max / 2), max]) {
    svg += `<line class="grille-ligne" x1="${g}" x2="${L - d}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="axe" x="${g - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  semaines.forEach((s, i) => {
    const total = s.faites + s.facultativesFaites;
    const cx = g + pas * i + pas / 2;
    const info = `Semaine du ${dateCourte(s.lundi + "T12:00:00")} : ${s.faites} / ${s.prevues} séances${s.facultativesFaites ? ` (+ ${s.facultativesFaites} facultative${s.facultativesFaites > 1 ? "s" : ""})` : ""}`;
    svg += `<g class="point" data-info="${esc(info)}">
      <rect class="cible-toucher" x="${cx - pas / 2}" y="${h}" width="${pas}" height="${H - bas - h}"/>
      ${total > 0 ? `<rect class="barre" x="${cx - largeur / 2}" y="${y(total)}" width="${largeur}" height="${y(0) - y(total)}" rx="4"/>` : ""}
      <line class="objectif" x1="${cx - largeur / 2 - 3}" x2="${cx + largeur / 2 + 3}" y1="${y(s.prevues)}" y2="${y(s.prevues)}"/>
      <text class="axe" x="${cx}" y="${H - 8}" text-anchor="middle">${new Date(s.lundi + "T12:00:00").getDate()}/${new Date(s.lundi + "T12:00:00").getMonth() + 1}</text>
    </g>`;
  });
  svg += `</svg><div class="info-point doux">Touche une semaine pour voir le détail.</div>`;
  const moy = Math.round(100 * semaines.reduce((a, s) => a + Math.min(s.faites, s.prevues), 0) / Math.max(1, semaines.reduce((a, s) => a + s.prevues, 0)));
  return `<div class="carte"><h3>Régularité (séances par semaine)</h3>${svg}
      <p class="doux">Barre = séances faites · trait = séances prévues. ${semaines.length > 1 ? `Sur ces ${semaines.length} semaines : ${moy} % des séances prévues faites.` : ""}</p></div>`;
}

const moyenne = t => Math.round((t.reduce((a, b) => a + b, 0) / t.length) * 10) / 10;

// Petit graphique en courbe, dessiné en SVG (pas de bibliothèque).
// points = [{ date, valeur, detail }], options = { bande: [min, max], unite, min }
function graphique(points, options = {}) {
  if (!points.length) return `<p class="doux">Pas de données.</p>`;
  const L = 320, H = 170, g = 34, d = 12, h = 12, b = 26; // largeur, hauteur, marges
  const valeurs = points.map(p => p.valeur).concat(options.bande || []);
  let yMin = options.min ?? Math.min(...valeurs), yMax = Math.max(...valeurs);
  if (options.min === undefined) yMin = Math.max(0, Math.floor(yMin - 2));
  yMax = Math.ceil(yMax + 1);
  if (yMax === yMin) yMax = yMin + 1;

  const x = i => points.length === 1 ? (g + L - d) / 2 : g + (i * (L - g - d)) / (points.length - 1);
  const y = v => H - b - ((v - yMin) * (H - b - h)) / (yMax - yMin);

  let svg = `<svg class="graphique" viewBox="0 0 ${L} ${H}" role="img" aria-label="Évolution">`;
  // Repères horizontaux (3 lignes)
  for (const v of [yMin, (yMin + yMax) / 2, yMax]) {
    const vy = y(v);
    svg += `<line class="grille-ligne" x1="${g}" x2="${L - d}" y1="${vy}" y2="${vy}"/>
      <text class="axe" x="${g - 6}" y="${vy + 4}" text-anchor="end">${Math.round(v * 10) / 10}</text>`;
  }
  if (options.bande) {
    const [a, c] = options.bande;
    svg += `<rect class="bande" x="${g}" width="${L - g - d}" y="${y(c)}" height="${Math.max(1, y(a) - y(c))}"/>`;
  }
  // Courbe
  if (points.length > 1) {
    svg += `<polyline class="courbe" points="${points.map((p, i) => `${x(i)},${y(p.valeur)}`).join(" ")}"/>`;
  }
  // Points (zone de toucher plus grande que le point)
  points.forEach((p, i) => {
    svg += `<g class="point" data-info="${esc(dateCourte(p.date) + " : " + p.detail)}">
      <circle class="cible-toucher" cx="${x(i)}" cy="${y(p.valeur)}" r="14"/>
      <circle class="marque" cx="${x(i)}" cy="${y(p.valeur)}" r="4.5"/></g>`;
  });
  // Dates de début et de fin
  svg += `<text class="axe" x="${g}" y="${H - 6}">${esc(dateCourte(points[0].date))}</text>`;
  if (points.length > 1) svg += `<text class="axe" x="${L - d}" y="${H - 6}" text-anchor="end">${esc(dateCourte(points[points.length - 1].date))}</text>`;
  svg += `</svg><div class="info-point doux">Touche un point pour voir le détail.</div>`;
  return svg;
}

function brancherGraphiques() {
  document.querySelectorAll(".graphique").forEach(svg => {
    const info = svg.nextElementSibling;
    svg.querySelectorAll(".point").forEach(pt => {
      const montrer = () => {
        svg.querySelectorAll(".point").forEach(x => x.classList.remove("actif"));
        pt.classList.add("actif");
        info.textContent = pt.dataset.info;
      };
      pt.addEventListener("click", montrer);
      pt.addEventListener("mouseenter", montrer);
    });
  });
}

// ----- Réglages : date de début, sauvegarde, explications -----
function pageReglages() {
  const ajusts = Object.entries(donnees.ajustements).filter(([id]) => PROGRAMME.exercices[id]);
  const html = `
    <div class="carte">
      <h3>Début du programme</h3>
      <p class="doux">Sert à calculer la semaine en cours (semaines 1-${REGLES.semainesPhaseDebut} = séries réduites).</p>
      <label for="date-debut">Date de début</label>
      <input type="date" id="date-debut" value="${donnees.dateDebut}">
      <p class="doux">Tu es en semaine ${semaineEnCours()}.</p>
    </div>

    <div class="carte">
      <h3>💾 Sauvegarde</h3>
      <p>Dernière sauvegarde : <strong>${texteDerniereSauvegarde()}</strong></p>
      <p class="doux">${donnees.journal.length} exercice(s) enregistré(s). Le fichier arrive dans le dossier Téléchargements du téléphone.</p>
      <button class="bouton" id="exporter">Exporter mes données (fichier)</button>
      <label class="bouton secondaire" for="importer">Importer une sauvegarde</label>
      <input type="file" id="importer" accept="application/json,.json" hidden>
    </div>

    <div class="carte">
      <h3>Où sont mes données ?</h3>
      <p>Elles sont enregistrées <strong>uniquement dans ce navigateur, sur cet appareil</strong> (le « localStorage »). Rien n'est envoyé sur internet, ni sur GitHub.</p>
      <p><strong>Ce qui peut les effacer :</strong></p>
      <ul>
        <li>effacer les données / l'historique / les cookies du navigateur ;</li>
        <li>désinstaller l'app de l'écran d'accueil (sur certains téléphones) ;</li>
        <li>sur iPhone, Safari peut effacer les données d'un site non ouvert pendant plusieurs semaines (moins probable si l'app est installée sur l'écran d'accueil) ;</li>
        <li>la navigation privée (tout est effacé à la fermeture) ;</li>
        <li>changer de téléphone ou de navigateur (les données ne suivent pas).</li>
      </ul>
      <p><strong>Conseil :</strong> exporte une sauvegarde chaque semaine et garde le fichier (Drive, mail à toi-même…). Pour la récupérer : « Importer une sauvegarde ».</p>
    </div>

    ${ajusts.length ? `<div class="carte"><h3>Ajustements en cours</h3>${ajusts.map(([id, a]) => {
      const x = PROGRAMME.exercices[id];
      return `<div class="ligne-histo">${esc(x.nom)} : ${a.cible ? a.cible.join("-") + " " + unite(x) : ""}${a.chargeKg !== undefined ? " " + kg(a.chargeKg) : ""}${a.version ? " version " + a.version : ""}
        <button class="lien" data-reinit="${id}">revenir au programme</button></div>`;
    }).join("")}</div>` : ""}

    <div class="carte">
      <h3>Zone dangereuse</h3>
      <button class="bouton danger" id="tout-effacer">Tout effacer</button>
    </div>
    <p class="doux centre">Cette app ne remplace pas un avis médical.</p>`;
  return { titre: "Réglages", html, apres: brancherReglages };
}

function brancherReglages() {
  $("#date-debut").onchange = e => {
    if (!e.target.value) return;
    donnees.dateDebut = e.target.value;
    sauverDonnees(); afficher();
  };

  $("#exporter").onclick = () => { exporter(); afficher({ garderDefilement: true }); };

  $("#importer").onchange = async e => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    try {
      const lu = JSON.parse(await fichier.text());
      if (!Array.isArray(lu.journal)) throw new Error("format");
      if (!confirm(`Remplacer tes données actuelles par cette sauvegarde (${lu.journal.length} exercices) ?`)) return;
      donnees = Object.assign(donneesVides(), lu);
      sauverDonnees(); toast("Sauvegarde importée"); afficher();
    } catch {
      alert("Ce fichier n'est pas une sauvegarde valide de l'app.");
    }
  };

  document.querySelectorAll("[data-reinit]").forEach(b => b.onclick = () => {
    delete donnees.ajustements[b.dataset.reinit];
    sauverDonnees(); afficher();
  });

  $("#tout-effacer").onclick = () => {
    if (!confirm("Effacer TOUTES tes données ? Exporte une sauvegarde avant si tu veux les garder.")) return;
    if (!confirm("Vraiment sûr ? C'est définitif.")) return;
    donnees = donneesVides(); sauverDonnees(); toast("Données effacées"); afficher();
  };
}

// Télécharge un fichier de sauvegarde et note la date
function exporter() {
  donnees.derniereSauvegarde = new Date().toISOString();
  sauverDonnees();
  const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `calisthenie-sauvegarde-${aujourdhuiISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Sauvegarde téléchargée (dossier Téléchargements)");
}

// Nombre de jours depuis la dernière sauvegarde (null = jamais)
function joursDepuisSauvegarde() {
  if (!donnees.derniereSauvegarde) return null;
  return Math.floor((Date.now() - new Date(donnees.derniereSauvegarde)) / UN_JOUR);
}

function texteDerniereSauvegarde() {
  const j = joursDepuisSauvegarde();
  if (j === null) return "jamais";
  const quand = j === 0 ? "aujourd'hui" : j === 1 ? "hier" : `il y a ${j} jours`;
  return `${dateCourte(donnees.derniereSauvegarde)} (${quand})`;
}

// Carte de rappel sur le planning : plus de 7 jours (ou jamais) et au moins une séance notée
function carteRappelSauvegarde() {
  const j = joursDepuisSauvegarde();
  if (donnees.journal.length === 0) return "";
  if (j !== null && j <= 7) return "";
  if (donnees.rappelSauvegardeMasque === aujourdhuiISO()) return "";
  return `<div class="carte rappel">
      <h3>💾 Pense à sauvegarder</h3>
      <p>${j === null ? "Tu n'as encore jamais exporté de sauvegarde." : `Ta dernière sauvegarde date de ${j} jours.`}
        Tes données ne sont que dans ce téléphone : un fichier de sauvegarde te protège si le navigateur les efface.</p>
      <div class="rangee">
        <button class="bouton petit" id="rappel-exporter">Sauvegarder maintenant</button>
        <button class="bouton petit secondaire" id="rappel-plus-tard">Plus tard</button>
      </div>
    </div>`;
}

function brancherRappelSauvegarde() {
  const b = $("#rappel-exporter");
  if (!b) return;
  b.onclick = () => { exporter(); afficher({ garderDefilement: true }); };
  $("#rappel-plus-tard").onclick = () => {
    donnees.rappelSauvegardeMasque = aujourdhuiISO();
    sauverDonnees(); afficher({ garderDefilement: true });
  };
}

function pageIntrouvable() {
  return { titre: "Introuvable", html: `<div class="carte">Page introuvable. <a href="#/">Retour au planning</a></div>`, retour: "#/" };
}

/* ---------------------------------------------------------------------
   8. NAVIGATION
   L'adresse après le # indique la page :
   #/  ·  #/seance/pousser  ·  #/exo/pousser/pompes-diamant  ·
   #/historique  ·  #/historique/squat  ·  #/reglages
   "?ok" à la fin = on vient d'enregistrer
   --------------------------------------------------------------------- */
// garderDefilement = true : réafficher sans remonter en haut de la page
function afficher({ garderDefilement = false } = {}) {
  const [chemin, options] = location.hash.replace(/^#\/?/, "").split("?");
  const m = chemin.split("/").filter(Boolean);
  let page, onglet = "planning";

  if (m.length === 0) page = pagePlanning();
  else if (m[0] === "seance") page = pageSeance(m[1]);
  else if (m[0] === "exo") page = pageExercice(m[1], m[2], options === "ok");
  else if (m[0] === "historique") { page = pageHistorique(m[1]); onglet = "historique"; }
  else if (m[0] === "reglages") { page = pageReglages(); onglet = "reglages"; }
  else page = pageIntrouvable();

  $("#titre").textContent = page.titre;
  document.title = page.titre + " · Calisthénie";
  $("#contenu").innerHTML = page.html;

  const retour = $("#retour");
  retour.hidden = !page.retour;
  retour.onclick = () => { location.hash = page.retour; };

  document.querySelectorAll(".nav-bas a").forEach(a => a.classList.toggle("actif", a.dataset.onglet === onglet));
  if (page.apres) page.apres();
  if (!garderDefilement) window.scrollTo(0, 0);
  lancerIllustrations();
}

if (!MODE_TEST) {
  window.addEventListener("hashchange", () => afficher());
  afficher();
}

// Installation sur l'écran d'accueil + fonctionnement hors connexion.
// (Ne marche qu'une fois l'app en ligne, pas en ouvrant le fichier directement.)
if (!MODE_TEST && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}
