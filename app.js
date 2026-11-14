/* =====================================================================
   APP.JS — le fonctionnement de l'app.
   Tu n'as normalement PAS besoin de modifier ce fichier :
   tes exercices et ton planning sont dans programme.js.

   Organisation du fichier :
   1. Sauvegarde des données (localStorage)
   2. Petits calculs (semaine en cours, durée d'une séance...)
   3. Pages : Planning, Séance, Fiche d'exercice, Historique, Réglages
   4. Navigation (le "routeur")
   ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
   1. SAUVEGARDE DES DONNÉES
   Tout est rangé dans la mémoire de ton navigateur (localStorage),
   sous une seule clé. Rien n'est envoyé sur internet.
   --------------------------------------------------------------------- */
const CLE_STOCKAGE = "calisthenie-donnees";

// Forme des données au premier lancement
function donneesVides() {
  return {
    version: 1,
    dateDebut: aujourdhuiISO(), // début du programme (sert à calculer la semaine)
    journal: [],                // tes séances faites (étape 2)
    ajustements: {}             // charges / reps modifiées par l'adaptation (étape 3)
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
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(d));
  } catch (e) {
    alert("Impossible d'enregistrer (mémoire pleine ou navigation privée ?).");
  }
}

let donnees = chargerDonnees();

/* ---------------------------------------------------------------------
   2. PETITS CALCULS
   --------------------------------------------------------------------- */
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

// Date du jour au format "2026-11-14"
function aujourdhuiISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Nom du jour d'aujourd'hui ("lundi"...). En JS, dimanche = 0.
function jourDuJour() {
  return JOURS[(new Date().getDay() + 6) % 7];
}

// Numéro de semaine du programme (1, 2, 3...) depuis la date de début
function semaineEnCours() {
  const debut = new Date(donnees.dateDebut + "T00:00:00");
  const jours = Math.floor((Date.now() - debut.getTime()) / 86400000);
  return Math.max(1, Math.floor(jours / 7) + 1);
}

// Semaines 1-2 = phase de début (moins de séries)
function enPhaseDebut() {
  return semaineEnCours() <= PROGRAMME.regles.semainesPhaseDebut;
}

// Nombre de séries prévu cette semaine pour un exercice
function seriesPrevues(exo) {
  return enPhaseDebut() ? exo.series.debut : exo.series.plein;
}

// Ce qui est prévu pour un exercice : valeurs de programme.js,
// éventuellement remplacées par un ajustement (étape 3).
function prevu(idExo) {
  const exo = PROGRAMME.exercices[idExo];
  const aj = donnees.ajustements[idExo] || {};
  return {
    series: seriesPrevues(exo),
    cible: aj.cible || exo.cible,
    chargeKg: aj.chargeKg !== undefined ? aj.chargeKg : exo.chargeKg
  };
}

// Texte du type "3 × 8-12 reps" ou "2 × 20-45 s (par côté)"
function texteObjectif(idExo) {
  const exo = PROGRAMME.exercices[idExo];
  const p = prevu(idExo);
  const unite = exo.type === "temps" ? "s" : "reps";
  const cote = exo.parCote ? (exo.chargeKg !== undefined ? " par main" : " par côté") : "";
  return `${p.series} × ${p.cible[0]}-${p.cible[1]} ${unite}${cote}`;
}

// Texte du repos : "60-90 s" ou "1-2 min"
function texteRepos(repos) {
  const [a, b] = repos;
  if (a >= 60 && b >= 60 && a % 60 === 0 && b % 60 === 0) {
    return a === b ? `${a / 60} min` : `${a / 60}-${b / 60} min`;
  }
  return a === b ? `${a} s` : `${a}-${b} s`;
}

// Durée estimée d'un exercice, en secondes.
// Hypothèse : 1 rep ≈ 3 s ; repos moyen entre les séries ; 30 s pour s'installer.
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
  const total = PROGRAMME.seances[idSeance].exercices
    .reduce((somme, id) => somme + dureeExercice(id), 0);
  return Math.round(total / 60); // en minutes
}

// Protège le texte avant de l'insérer dans la page
function esc(texte) {
  return String(texte).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function majuscule(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

/* ---------------------------------------------------------------------
   3. PAGES
   Chaque fonction "page..." renvoie le HTML à afficher.
   --------------------------------------------------------------------- */

// Lien vers une séance (utilisé dans le planning)
function lienSeance(idSeance) {
  const s = PROGRAMME.seances[idSeance];
  if (!s) return `<div class="lien-seance">⚠️ Séance « ${esc(idSeance)} » introuvable dans programme.js</div>`;
  const cat = PROGRAMME.categories[s.categorie] || { emoji: "•" };
  return `<a class="lien-seance" href="#/seance/${idSeance}">
      <span>${cat.emoji} ${esc(s.nom)} <span class="doux">· ~${dureeSeance(idSeance)} min</span></span>
      <span class="fleche">›</span>
    </a>`;
}

// ----- Page Planning (accueil) -----
function pagePlanning() {
  const aujourdhui = jourDuJour();
  const phase = enPhaseDebut()
    ? `Phase de reprise : séries réduites jusqu'à la fin de la semaine ${PROGRAMME.regles.semainesPhaseDebut}.`
    : "Phase complète : nombre de séries normal.";

  let html = `<div class="carte">
      <h2>Semaine ${semaineEnCours()}</h2>
      <div class="doux">${phase}</div>
    </div>`;

  // On commence la liste par aujourd'hui, puis les jours suivants
  const debut = JOURS.indexOf(aujourdhui);
  const ordre = JOURS.slice(debut).concat(JOURS.slice(0, debut));

  for (const jour of ordre) {
    const seances = PROGRAMME.planning[jour] || [];
    const estAujourdhui = jour === aujourdhui;
    const facultatif = PROGRAMME.joursFacultatifs.includes(jour);
    const classes = ["carte"];
    if (estAujourdhui) classes.push("aujourdhui");
    if (seances.length === 0) classes.push("repos");

    html += `<section class="${classes.join(" ")}">
        <h3>${majuscule(jour)}
          ${estAujourdhui ? '<span class="badge">Aujourd\'hui</span>' : ""}
          ${facultatif ? '<span class="badge gris">Facultatif</span>' : ""}
        </h3>`;

    if (seances.length === 0) {
      html += `<div class="doux">Repos 😴</div>`;
    } else {
      for (const element of seances) {
        if (Array.isArray(element)) {
          // Séances "au choix"
          html += element.map((id, i) =>
            (i > 0 ? `<div class="ou">— ou —</div>` : "") + lienSeance(id)).join("");
        } else {
          html += lienSeance(element);
        }
      }
    }
    html += `</section>`;
  }

  html += `<div class="carte"><h3>Rappels</h3><ul class="doux">
      ${PROGRAMME.regles.rappels.map(r => `<li>${esc(r)}</li>`).join("")}
    </ul></div>`;
  return { titre: "Planning", html };
}

// ----- Page d'une séance : liste des exercices -----
function pageSeance(idSeance) {
  const s = PROGRAMME.seances[idSeance];
  if (!s) return pageIntrouvable();

  let html = `<p class="doux">Durée estimée : ~${dureeSeance(idSeance)} min · ${s.exercices.length} exercices.
    Touche un exercice pour voir comment le faire.</p>`;

  s.exercices.forEach((idExo, i) => {
    const exo = PROGRAMME.exercices[idExo];
    if (!exo) {
      html += `<div class="carte">⚠️ Exercice « ${esc(idExo)} » introuvable dans programme.js</div>`;
      return;
    }
    const p = prevu(idExo);
    const charge = p.chargeKg !== undefined ? ` · ≈ ${p.chargeKg} kg` : "";
    html += `<a class="carte ligne-exo" href="#/exo/${idSeance}/${idExo}">
        <span class="num">${i + 1}</span>
        <span class="infos">
          <strong>${esc(exo.nom)}</strong><br>
          <span class="doux">${texteObjectif(idExo)}${charge} · repos ${texteRepos(exo.repos)}</span>
        </span>
        <span class="fleche doux">›</span>
      </a>`;
  });
  return { titre: s.nom, html, retour: "#/" };
}

// ----- Fiche d'un exercice -----
function pageExercice(idSeance, idExo) {
  const exo = PROGRAMME.exercices[idExo];
  if (!exo) return pageIntrouvable();
  const p = prevu(idExo);

  let html = `<div class="grille">
      <div class="case"><div class="etiquette">Séries</div><div class="valeur">${p.series}</div></div>
      <div class="case"><div class="etiquette">${exo.type === "temps" ? "Secondes" : "Reps"}</div>
        <div class="valeur">${p.cible[0]}-${p.cible[1]}</div></div>
      <div class="case"><div class="etiquette">Repos</div><div class="valeur">${texteRepos(exo.repos)}</div></div>
      <div class="case"><div class="etiquette">${p.chargeKg !== undefined ? "Charge" : "Côtés"}</div>
        <div class="valeur">${p.chargeKg !== undefined ? "≈ " + p.chargeKg + " kg" : (exo.parCote ? "Chaque côté" : "—")}</div></div>
    </div>`;

  html += `<div class="carte"><h3>Niveau</h3><div>${esc(exo.niveau)}</div>
      ${exo.parCote ? `<div class="doux">À faire ${exo.chargeKg !== undefined ? "avec chaque main" : "de chaque côté"}.</div>` : ""}
      ${enPhaseDebut() && exo.series.debut !== exo.series.plein
        ? `<div class="doux">Semaines 1-${PROGRAMME.regles.semainesPhaseDebut} : ${exo.series.debut} séries, puis ${exo.series.plein}.</div>` : ""}
    </div>`;

  html += `<div class="carte"><h3>Comment faire</h3><ol class="etapes">
      ${exo.etapes.map(e => `<li>${esc(e)}</li>`).join("")}
    </ol></div>`;

  if (exo.note) html += `<p class="note">⚠️ ${esc(exo.note)}</p>`;

  html += `<div class="carte"><h3>Plus facile</h3><div>${esc(exo.facile)}</div></div>
    <div class="carte"><h3>Plus difficile</h3><div>${esc(exo.difficile)}</div></div>`;

  return { titre: exo.nom, html, retour: `#/seance/${idSeance}` };
}

// ----- Historique (arrive à l'étape 5) -----
function pageHistorique() {
  return {
    titre: "Historique",
    html: `<div class="carte doux">L'historique et les graphiques arrivent dans une prochaine étape.</div>`
  };
}

// ----- Réglages -----
function pageReglages() {
  const html = `<div class="carte">
      <h3>Début du programme</h3>
      <p class="doux">Sert à calculer la semaine en cours (semaines 1-2 = séries réduites).</p>
      <label for="date-debut">Date de début</label>
      <input type="date" id="date-debut" value="${donnees.dateDebut}">
      <p class="doux">Tu es en semaine ${semaineEnCours()}.</p>
    </div>`;
  return { titre: "Réglages", html, apres: brancherReglages };
}

function brancherReglages() {
  document.getElementById("date-debut").addEventListener("change", e => {
    if (!e.target.value) return;
    donnees.dateDebut = e.target.value;
    sauverDonnees(donnees);
    afficher(); // réaffiche la page avec la nouvelle semaine
  });
}

function pageIntrouvable() {
  return { titre: "Introuvable", html: `<div class="carte">Page introuvable. <a href="#/">Retour au planning</a></div>`, retour: "#/" };
}

/* ---------------------------------------------------------------------
   4. NAVIGATION
   L'adresse après le # indique la page : #/ , #/seance/pousser ,
   #/exo/pousser/pompes-diamant , #/historique , #/reglages
   --------------------------------------------------------------------- */
function afficher() {
  const morceaux = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  let page, onglet = "planning";

  if (morceaux.length === 0) page = pagePlanning();
  else if (morceaux[0] === "seance") page = pageSeance(morceaux[1]);
  else if (morceaux[0] === "exo") page = pageExercice(morceaux[1], morceaux[2]);
  else if (morceaux[0] === "historique") { page = pageHistorique(); onglet = "historique"; }
  else if (morceaux[0] === "reglages") { page = pageReglages(); onglet = "reglages"; }
  else page = pageIntrouvable();

  document.getElementById("titre").textContent = page.titre;
  document.title = page.titre + " · Calisthénie";
  document.getElementById("contenu").innerHTML = page.html;

  const retour = document.getElementById("retour");
  retour.hidden = !page.retour;
  retour.onclick = () => { location.hash = page.retour; };

  document.querySelectorAll(".nav-bas a").forEach(a =>
    a.classList.toggle("actif", a.dataset.onglet === onglet));

  if (page.apres) page.apres();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", afficher);
afficher();
