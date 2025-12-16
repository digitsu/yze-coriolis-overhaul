import { resetCrewForShip } from "./actor/crew.js";
import { createBlankEPTokens, setActiveEPTokens } from "./item/ep-token.js";
import { displayDarknessPoints } from "./darkness-points.js";

// eslint-disable-next-line no-unused-vars
Hooks.on("updateUser", (entity, delta, options, userId) => {
  // we avoid any null sets because we are just doing a clearing of the flag
  // before setting it to a valid value.
  const isSettingDP =
    hasProperty(delta, "flags.yzecoriolis.darknessPoints") &&
    delta.flags.yzecoriolis.darknessPoints !== null;

  if (options.diff && isSettingDP) {
    if (game.user.isGM) {
      displayDarknessPoints();
    }
  }
});

// eslint-disable-next-line no-unused-vars
Hooks.on("updateActor", (entity, delta, options, userId) => {
  rerenderAllShips();
});

// eslint-disable-next-line no-unused-vars
Hooks.on("deleteActor", (entity, options, userId) => {
  if (entity.type === "ship") {
    resetCrewForShip(entity.id).then(() => {
      rerenderAllCrew();
    });
  }
});

// eslint-disable-next-line no-unused-vars
Hooks.on("createActor", async (entity, options, userId) => {
  if (entity.type === "ship") {
    rerenderAllCrew();
    await createEPTokensForShip(entity);
    await setMaxEPTokensActive(entity);
  }
});

Hooks.on("renderDialog", (dialog, html) => {
  // hiding engeryPointTokens from the create dialog as they are used
  // only internally
  Array.from(html.find("#document-create option")).forEach((i) => {
    if (i.value == "energyPointToken") {
      i.remove();
    }
  });
});

Hooks.on("renderCombatTracker", (app, html, combatInfo) => {
  const currentCombat = combatInfo.combat;
  if (currentCombat) {
    const combatOverhaul = game.settings.get("yzecoriolis", "combatOverhaul");

    $(html).find(".combatant").each((i, el) => {
      const id = el.dataset.combatantId;
      const combatant = currentCombat.combatants.find((c) => c.id === id);
      const initDiv = el.getElementsByClassName("token-initiative")[0];

      if (combatant.initiative != null) {
        const readOnly = game.user.isGM ? "" : "readonly";

        if (combatOverhaul) {
          // D66 display: show as whole number, format nicely
          const initValue = Math.floor(combatant.initiative);
          initDiv.innerHTML = `<input style="color: white; width: 2.5em; text-align: center;" type="number" min="11" max="66" step="1" ${readOnly} value="${initValue}">`;
        } else {
          // Core Rules: decimal tiebreaker display
          initDiv.innerHTML = `<input style="color: white;" type="number" ${readOnly} value="${combatant.initiative}">`;
        }

        initDiv.addEventListener("change", async (e) => {
          const inputElement = e.target;
          const combatantId = inputElement.closest("[data-combatant-id]")
            .dataset.combatantId;
          await currentCombat.setInitiative(combatantId, inputElement.value);
        });
      }
    });
  }
});

// Combat Overhaul: Reset actions at the start of a new combat round
Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
  // Only process if round changed and Combat Overhaul is enabled
  if (!("round" in updateData)) return;
  if (!game.settings.get("yzecoriolis", "combatOverhaul")) return;
  if (!game.user.isGM) return;

  // Reset actions for all combatants when a new round starts
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor || actor.type === "ship") continue;

    // Reset action tracking and clear suppression status for new round
    await actor.update({
      "system.actions.slowUsed": false,
      "system.actions.fastUsed": false,
      "system.actions.fast2Used": false,
      "system.actions.tradedSlow": false,
      "system.suppressed": false,
      "system.pinnedDown": false
    });
  }

  ui.notifications.info(game.i18n.localize("YZECORIOLIS.ActionsReset"));
});

function rerenderAllCrew() {
  // re render all characters/npcs to update their crew position drop downs.
  for (let e of game.actors.contents) {
    let rootData = e;
    if (rootData.type === "character" || rootData.type === "npc") {
      e.render(false);
    }
  }
}

function rerenderAllShips() {
  // re render all ships to update their crew tabs.
  for (let e of game.actors.contents) {
    if (e.type === "ship") {
      e.render(false);
    }
  }
}

async function createEPTokensForShip(entity) {
  await createBlankEPTokens(entity, CONFIG.YZECORIOLIS.MaxEPTokensPerShip);
}

// setMaxEPTokensActive sets maxEnergyPoints worth of EP tokens active for the
// ship on initial creation so the bar isn't empty when you creat a new ship.
async function setMaxEPTokensActive(entity) {
  const epMax = entity.system.maxEnergyPoints;
  if (epMax) {
    await setActiveEPTokens(entity, epMax);
  }
}
