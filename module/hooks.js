import { resetCrewForShip } from "./actor/crew.js";
import { createBlankEPTokens, setActiveEPTokens } from "./item/ep-token.js";
import { displayDarknessPoints } from "./darkness-points.js";
import { CoriolisModifierDialog } from "./coriolisRollModifier.js";

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
      const actor = combatant?.actor;
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

      // Combat Overhaul: Add action buttons and quick attack to combatant row
      if (combatOverhaul && actor && (actor.type === "character" || actor.type === "npc")) {
        // Check if user can control this actor
        const canControl = actor.isOwner || game.user.isGM;

        // Create action buttons container
        const actionsHtml = createCombatTrackerActions(actor, canControl);

        // Insert after the combatant controls
        const controlsDiv = el.querySelector(".combatant-controls");
        if (controlsDiv) {
          const actionsDiv = document.createElement("div");
          actionsDiv.className = "combatant-actions";
          actionsDiv.innerHTML = actionsHtml;
          controlsDiv.parentNode.insertBefore(actionsDiv, controlsDiv);

          // Add event listeners for action buttons
          setupCombatTrackerActionListeners(actionsDiv, actor);
        }
      }
    });
  }
});

/**
 * Create HTML for combat tracker action buttons
 */
function createCombatTrackerActions(actor, canControl) {
  const actions = actor.system.actions || {};
  const suppressed = actor.system.suppressed;
  const pinnedDown = actor.system.pinnedDown;

  // Determine button states
  let slowClass = "available";
  let slowIcon = "fa-clock";
  if (actions.tradedSlow) {
    slowClass = "traded";
    slowIcon = "fa-exchange-alt";
  } else if (pinnedDown) {
    slowClass = "lost";
    slowIcon = "fa-ban";
  } else if (actions.slowUsed) {
    slowClass = "used";
    slowIcon = "fa-check";
  }

  let fastClass = "available";
  let fastIcon = "fa-bolt";
  if (suppressed) {
    fastClass = "lost";
    fastIcon = "fa-ban";
  } else if (actions.fastUsed) {
    fastClass = "used";
    fastIcon = "fa-check";
  }

  // Trade button: enabled only when slow action is available and not used/lost
  const canTrade = !actions.tradedSlow && !actions.slowUsed && !pinnedDown;
  const tradeDisabled = (!canControl || !canTrade) ? "disabled" : "";
  const tradeClass = actions.tradedSlow ? "active" : "";

  const disabled = canControl ? "" : "disabled";

  return `
    <div class="ct-actions-row">
      <button type="button" class="ct-action-btn ${slowClass}" data-action="slow" ${disabled} title="${game.i18n.localize("YZECORIOLIS.ActionSlowShort")}">
        <i class="fas ${slowIcon}"></i>
      </button>
      <button type="button" class="ct-action-btn ${fastClass}" data-action="fast" ${disabled} title="${game.i18n.localize("YZECORIOLIS.ActionFastShort")}">
        <i class="fas ${fastIcon}"></i>
      </button>
      <button type="button" class="ct-trade-btn ${tradeClass}" data-action="trade" ${tradeDisabled} title="${game.i18n.localize("YZECORIOLIS.TradeSlowForFast")}">
        <i class="fas fa-exchange-alt"></i>
      </button>
      <button type="button" class="ct-quick-attack" ${disabled} title="${game.i18n.localize("YZECORIOLIS.QuickAttack")}">
        <i class="fas fa-crosshairs"></i>
      </button>
    </div>
  `;
}

/**
 * Setup event listeners for combat tracker action buttons
 */
function setupCombatTrackerActionListeners(container, actor) {
  // Slow action button
  container.querySelector('[data-action="slow"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const actions = actor.system.actions || {};
    if (actor.system.pinnedDown || actions.tradedSlow) return;
    await actor.update({ "system.actions.slowUsed": !actions.slowUsed });
  });

  // Fast action button
  container.querySelector('[data-action="fast"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const actions = actor.system.actions || {};
    if (actor.system.suppressed) return;
    await actor.update({ "system.actions.fastUsed": !actions.fastUsed });
  });

  // Trade button - trade slow action for extra fast action
  container.querySelector('[data-action="trade"]')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const actions = actor.system.actions || {};
    if (actor.system.pinnedDown || actions.slowUsed || actions.tradedSlow) return;
    await actor.update({ "system.actions.tradedSlow": true });
  });

  // Quick attack button
  container.querySelector('.ct-quick-attack')?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await performQuickAttack(actor);
  });
}

/**
 * Perform a quick attack with the actor's primary weapon
 */
async function performQuickAttack(actor) {
  const primaryWeaponId = actor.system.primaryWeapon;

  if (!primaryWeaponId) {
    ui.notifications.warn(game.i18n.localize("YZECORIOLIS.NoPrimaryWeapon"));
    return;
  }

  const weapon = actor.items.get(primaryWeaponId);
  if (!weapon) {
    ui.notifications.warn(game.i18n.localize("YZECORIOLIS.NoPrimaryWeapon"));
    return;
  }

  // Build proper rollData following the pattern from actor-sheet.js _onRoll
  const actorData = actor.system;
  const item = weapon.system;
  const isMelee = item.melee;
  const skillKey = isMelee ? "meleecombat" : "rangedcombat";
  const attributeKey = isMelee ? "strength" : "agility";

  // Get item modifiers for the skill
  let itemModifiers = {};
  if (actorData.itemModifiers && actorData.itemModifiers[skillKey]) {
    itemModifiers = actorData.itemModifiers[skillKey];
  } else if (actorData.itemModifiers && actorData.itemModifiers[attributeKey]) {
    itemModifiers = actorData.itemModifiers[attributeKey];
  }

  const combatOverhaul = game.settings.get("yzecoriolis", "combatOverhaul");

  const rollData = {
    actorType: actor.type,
    rollType: "weapon",
    attributeKey: attributeKey,
    attribute: actorData.attributes[attributeKey]?.value || 0,
    skillKey: skillKey,
    skill: actorData.skills[skillKey]?.value || 0,
    modifier: 0,
    bonus: item.bonus ? Number(item.bonus) : 0,
    rollTitle: weapon.name,
    pushed: false,
    isAutomatic: item.automatic,
    isExplosive: item.explosive,
    blastPower: item.blastPower,
    blastRadius: item.blastRadius,
    damage: item.damage,
    damageText: item.damageText,
    armorPenetration: item.armorPenetration || 0,
    damageReduction: item.damageReduction || 0,
    range: item.range,
    crit: combatOverhaul ? item.critThreshold : item.crit?.numericValue,
    critThreshold: item.critThreshold || 0,
    critText: item.crit?.customValue,
    features: item.special ? Object.values(item.special).join(", ") : "",
    itemModifiers: itemModifiers,
    combatOverhaul: combatOverhaul,
    // Combat Tracker Quick Attack data
    fromCombatTracker: true,
    combatTrackerActor: actor,
    isMeleeWeapon: isMelee,
  };

  const chatOptions = actor._prepareChatRollOptions(
    "systems/yzecoriolis/templates/sidebar/roll.html",
    "weapon"
  );

  new CoriolisModifierDialog(rollData, chatOptions).render(true);
}

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
