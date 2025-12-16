import { addDarknessPoints, spendDarknessPoints } from "./darkness-points.js";
import { CoriolisModifierDialog } from "./coriolisPrayerModifier.js";

/**
 * takes in rendering options, rollData and:
 * 1. does the roll
 * 2. evaluates the roll
 * 3. takes the results and shows them in a chat message.
 * @param  {} chatOptions the options used to display the roll result in chat.
 * @param  {} rollData contains all data necessary to make a roll in Coriolis.
 */
export async function coriolisRoll(chatOptions, rollData) {
  let errorObj = { error: "YZECORIOLIS.ErrorsInvalidSkillRoll" };
  const isValid = isValidRoll(rollData, errorObj);
  if (!isValid) {
    ui.notifications.error(new Error(game.i18n.localize(errorObj.error)));
    return;
  }

  // Combat Overhaul: Use multi-attack system for automatic fire
  const combatOverhaul = rollData.combatOverhaul;
  const automaticFire = rollData.automaticFire;

  if (combatOverhaul && automaticFire) {
    return coriolisRollOverhaulFullAuto(chatOptions, rollData);
  }

  let totalDice = getTotalDice(rollData);
  if (totalDice <= 0) {
    totalDice = 2; // desparation roll where both will have to be successes to be considered a success.
  }
  const formula = automaticFire
    ? createAutomaticFireFormula(totalDice, rollData.numberOfIgnoredOnes)
    : `${totalDice}d6`;
  let roll = new Roll(formula);
  await roll.evaluate({ async: false });
  /* await showDiceSoNice(roll, chatOptions.rollMode); */
  const result = evaluateCoriolisRoll(rollData, roll);
  await showChatMessage(chatOptions, result, roll);
}

/**
 * handle pushing a roll
 * @param  {} chatMessage
 * @param  {} origRollData
 * @param  {} origRoll
 */
export async function coriolisPushRoll(chatMessage, origRollData, origRoll) {
    origRollData.pushed = true;
    for (let part of origRoll.dice) {
      for (let r of part.results) {
        if (r.result !== CONFIG.YZECORIOLIS.maxRoll) {
          let newDie = new Die(6);
          await newDie.roll(1);
          r.result = newDie.results[0].result;
        }
      }

      // do not apply the prayer bonus on automatic fire rolls
      let bonus = origRollData.prayerBonus + origRollData.prayerModifiersBonus;
      if (!part.modifiers.includes("x>1")) {
        part.number = part.number + bonus;
        for (let i = 0; i < bonus; i++) {
          let newDie = new Die(6);
          await newDie.roll(1);
          part.results.push(newDie.results[0]);
        }
      }
    }

    await showDiceSoNice(origRoll, chatMessage.rollMode);
    const result = evaluateCoriolisRoll(origRollData, origRoll);
    await updateChatMessage(chatMessage, result, origRoll);
    if (origRollData.actorType === "npc") {
      await spendDarknessPoints(1);
    } else {
      await addDarknessPoints(1);
    }
}

/**
 *
 * returns if this is a valid Roll or not and an error describing why it isn't.
 * @param  {} rollData
 * @param  {} errorObj
 * @returns true / false
 */
function isValidRoll(rollData, errorObj) {
  // TODO: account for modifier somehow.
  // not as straight forward. should I apply modifiers before checking for zero?
  const skill = rollData.skill;
  const attribute = rollData.attribute;
  const bonus = rollData.bonus;
  switch (rollData.rollType) {
    case "general": // general skills
      return attribute + skill > 0;
    case "advanced": // advanced skills
      if (skill <= 0) {
        errorObj.error = "YZECORIOLIS.ErrorsInvalidAdvancedSkillRoll";
        return false;
      }
      return attribute + skill > 0;
    case "weapon":
      return attribute + skill + bonus > 0;
    case "armor":
      return bonus >= 0; // should probably always be true?
    case "attribute":
      return attribute > 0;
  }
  errorObj.error = "YZECORIOLIS.ErrorsInvalidSkillRoll";
  return false;
}

/**
 * takes the result of the role and associated roll data and returns a result object.
 * @param  {rollType, skill, attribute, modifier} rollData
 * @param  {} roll
 * @returns {limitedSuccess,criticalSuccess,failure, roll, rollData} returns the results plus the initial rollData and roll object in case you wish to push.
 */
export function evaluateCoriolisRoll(rollData, roll) {
  let successes = 0;
  let maxRoll = CONFIG.YZECORIOLIS.maxRoll;
  roll.dice.forEach((part) => {
    part.results.forEach((r) => {
      if (r.result === maxRoll) {
        successes++;
      }
    });
  });
  const isDesparation = getTotalDice(rollData) <= 0;
  let result = {
    desparationRoll: isDesparation,
    successes: successes,
    limitedSuccess: isDesparation
      ? successes === 2
      : successes > 0 && successes < 3,
    criticalSuccess: successes >= 3,
    failure: isDesparation ? successes < 2 : successes === 0,
    rollData: rollData,
    pushed: rollData.pushed,
  };

  return result;
}

function getTotalDice(rollData) {
  let attributeValue = rollData.attribute;
  let skillValue = rollData.skill;
  let modifier = rollData.modifier;
  let itemModifierBonus = parseInt(getRollModifiersBonus(rollData));
  let bonus = rollData.bonus;
  switch (rollData.rollType) {
    case "general":
      return attributeValue + skillValue + modifier + itemModifierBonus;
    case "advanced":
      return attributeValue + skillValue + modifier + itemModifierBonus;
    case "attribute":
      return attributeValue + modifier + itemModifierBonus;
    case "weapon":
      if (rollData.automaticFire) {
        return attributeValue + skillValue + bonus + modifier + itemModifierBonus - 2;
      } else {
        return attributeValue + skillValue + bonus + modifier + itemModifierBonus;
      }
    case "armor":
      return bonus + modifier + itemModifierBonus;
  }
  return 0;
}

async function showChatMessage(chatMsgOptions, resultData, roll) {
  let tooltip = await renderTemplate(
    "systems/yzecoriolis/templates/sidebar/dice-results.html",
    getTooltipData(resultData, roll)
  );
  let chatData = {
    title: getRollTitle(resultData.rollData),
    icon: getRollIconKey(resultData.rollData),
    results: resultData,
    tooltip: tooltip,
    canPush: !resultData.pushed,
    totalDice: getTotalDice(resultData.rollData),
    actorType: getActorType(resultData.rollData),
    rollType: getRollType(resultData.rollData),
    attribute: getRollAttribute(resultData.rollData),
    attributeName: getRollAttributeName(resultData.rollData),
    skill: getRollSkill(resultData.rollData),
    skillName: getRollSkillName(resultData.rollData),
    modifier: getRollModifier(resultData.rollData),
    isAutomatic: getRollIsAuto(resultData.rollData),
    isAutomaticActive: getRollIsAutoActive(resultData.rollData),
    automaticRollAmount: parseInt(getRollAutoIgnoOnes(resultData.rollData)) + 1,
    isExplosive: getRollIsExplosive(resultData.rollData),
    bonus: getRollBonus(resultData.rollData),
    blastPower: getRollBlastPower(resultData.rollData),
    blastRadius: getRollBlastRadius(resultData.rollData),
    crit: getRollCrit(resultData.rollData),
    critText: getRollCritText(resultData.rollData),
    damage: getRollDmg(resultData.rollData),
    damageText: getRollDmgText(resultData.rollData),
    armorPenetration: getRollArmorPenetration(resultData.rollData),
    damageReduction: getRollDamageReduction(resultData.rollData),
    combatOverhaul: resultData.rollData.combatOverhaul || false,
    range: getRollRange(resultData.rollData),
    features: getRollFeatures(resultData.rollData),
    itemModifiersBonus: getRollModifiersBonus(resultData.rollData),
    itemModifiersChecked: getRollModifiersChecked(resultData.rollData),
  };

  if (["gmroll", "blindroll"].includes(chatMsgOptions.rollMode))
    chatMsgOptions["whisper"] = ChatMessage.getWhisperRecipients("GM");
  if (chatMsgOptions.rollMode === "blindroll") chatMsgOptions["blind"] = true;
  else if (chatMsgOptions.rollMode === "selfroll")
    chatMsgOptions["whisper"] = [game.user];

  chatMsgOptions.roll = roll;
  const html = await renderTemplate(chatMsgOptions.template, chatData);
  chatMsgOptions["content"] = html;
  chatMsgOptions["rolls"] = [roll];
  const msg = await ChatMessage.create(chatMsgOptions);
  // attach the results to the chat message so we can push later if needed.
  await msg.setFlag("yzecoriolis", "results", chatData.results);
  return msg;
}

async function updateChatMessage(
  chatMessage,
  resultData,
  origRoll
) {
  let tooltip = await renderTemplate(
    "systems/yzecoriolis/templates/sidebar/dice-results.html",
    getTooltipData(resultData, origRoll)
  );
  let chatData = {
    title: getRollTitle(resultData.rollData),
    results: resultData,
    tooltip: tooltip,
    canPush: false,
    prayerBonus: resultData.rollData.prayerBonus,
    totalDice: getTotalDice(resultData.rollData),
    actorType: getActorType(resultData.rollData),
    rollType: getRollType(resultData.rollData),
    attribute: getRollAttribute(resultData.rollData),
    attributeName: getRollAttributeName(resultData.rollData),
    skill: getRollSkill(resultData.rollData),
    skillName: getRollSkillName(resultData.rollData),
    modifier: getRollModifier(resultData.rollData),
    isAutomatic: getRollIsAuto(resultData.rollData),
    isAutomaticActive: getRollIsAutoActive(resultData.rollData),
    automaticRollAmount: parseInt(getRollAutoIgnoOnes(resultData.rollData)) + 1,
    isExplosive: getRollIsExplosive(resultData.rollData),
    bonus: getRollBonus(resultData.rollData),
    blastPower: getRollBlastPower(resultData.rollData),
    blastRadius: getRollBlastRadius(resultData.rollData),
    crit: getRollCrit(resultData.rollData),
    critText: getRollCritText(resultData.rollData),
    damage: getRollDmg(resultData.rollData),
    damageText: getRollDmgText(resultData.rollData),
    armorPenetration: getRollArmorPenetration(resultData.rollData),
    damageReduction: getRollDamageReduction(resultData.rollData),
    combatOverhaul: resultData.rollData.combatOverhaul || false,
    range: getRollRange(resultData.rollData),
    features: getRollFeatures(resultData.rollData),
    itemModifiersBonus: getRollModifiersBonus(resultData.rollData),
    itemModifiersChecked: getRollModifiersChecked(resultData.rollData),
    prayerModifiersChecked: getPrayerModifiersChecked(resultData.rollData),
  };

  return renderTemplate(
    "systems/yzecoriolis/templates/sidebar/roll.html",
    chatData
  ).then((html) => {
    chatMessage["content"] = html;
    return chatMessage
      .update({
        content: html,
        ["flags.data"]: { results: chatData.results },
      })
      .then((newMsg) => {
        ui.chat.updateMessage(newMsg);
      });
  });
}

function getRollTitle(rollData) {
  return `${rollData.rollTitle}`;
}

function getRollIconKey(rollData) {
  const icon = CONFIG.YZECORIOLIS.skillIcons[rollData.skillKey];
  return icon ? CONFIG.YZECORIOLIS.icons[icon] : "";
}

function getTooltipData(results, roll) {
  const rollData = {
    formula: roll.formula,
    total: results.successes,
  };
  // Prepare dice parts
  rollData["parts"] = roll.dice.map((d) => {
    let maxRoll = CONFIG.YZECORIOLIS.maxRoll;
    // Generate tooltip data
    return {
      total: results.successes,
      faces: d.faces,
      rolls: d.results.map((r) => {
        return {
          result: "&nbsp;",
          showNum: r.result === maxRoll,
          classes: [
            d.constructor.name.toLowerCase(),
            "d" + d.faces,
            "dice-" + r.result,
            "dice-face",
            r.rerolled ? "rerolled" : null,
            r.result === maxRoll ? "success" : null,
          ]
            .filter((c) => c)
            .join(" "),
        };
      }),
    };
  });
  return rollData;
}

function getActorType(rollData) {
  return `${rollData.actorType}`;
}

function getRollType(rollData) {
  return `${rollData.rollType}`;
}

function getRollAttribute(rollData) {
  return `${rollData.attribute}`;
}

function getRollAttributeName(rollData) {
  return CONFIG.YZECORIOLIS.attributes[rollData.attributeKey];
}

function getRollSkill(rollData) {
  return `${rollData.skill}`;
}

function getRollSkillName(rollData) {
  return CONFIG.YZECORIOLIS.skills[rollData.skillKey];
}

function getRollModifier(rollData) {
  return `${rollData.modifier}`;
}

function getRollIsAuto(rollData) {
  return `${rollData.isAutomatic}`;
}

function getRollIsAutoActive(rollData) {
  return `${rollData.automaticFire}`;
}

function getRollAutoIgnoOnes(rollData) {
  return `${rollData.numberOfIgnoredOnes}`;
}

function getRollIsExplosive(rollData) {
  return `${rollData.isExplosive}`;
}

function getRollBonus(rollData) {
  return `${rollData.bonus}`;
}

function getRollBlastPower(rollData) {
  return `${rollData.blastPower}`;
}

function getRollBlastRadius(rollData) {
  return CONFIG.YZECORIOLIS.ranges[rollData.blastRadius];
}

function getRollCrit(rollData) {
  return `${rollData.crit}`;
}

function getRollCritText(rollData) {
  return `${rollData.critText}`;
}

function getRollDmg(rollData) {
  return `${rollData.damage}`;
}

function getRollDmgText(rollData) {
  return `${rollData.damageText}`;
}

function getRollArmorPenetration(rollData) {
  return `${rollData.armorPenetration || 0}`;
}

function getRollDamageReduction(rollData) {
  return `${rollData.damageReduction || 0}`;
}

function getRollRange(rollData) {
  return CONFIG.YZECORIOLIS.ranges[rollData.range];
}

function getRollFeatures(rollData) {
  return `${rollData.features}`;
}

function getRollModifiersBonus(rollData) {
  let bonus = 0;
  for (const modifier in rollData.itemModifiers) {
    if (rollData.itemModifiers[modifier].checked) {
      bonus += rollData.itemModifiers[modifier].value;
    }
  }
  return `${bonus}`;
}

function getRollModifiersChecked(rollData) {
  let modifiersCheckedList = [];
  for (const modifier in rollData.itemModifiers) {
    if (rollData.itemModifiers[modifier].checked) {
      let value = rollData.itemModifiers[modifier].value > 0
        ? '+' + rollData.itemModifiers[modifier].value
        : rollData.itemModifiers[modifier].value;
      modifiersCheckedList.push(rollData.itemModifiers[modifier].name + ' (' + value + ')');
    }
  }
  const modifiersChecked = modifiersCheckedList.join("\n")
  return modifiersChecked;
}

function getPrayerModifiersChecked(rollData) {
  let modifiersCheckedList = [];
  for (const modifier in rollData.prayerModifiers) {
    let value = rollData.prayerModifiers[modifier].value > 0
      ? '+' + rollData.prayerModifiers[modifier].value
      : rollData.prayerModifiers[modifier].value;
    modifiersCheckedList.push(`+ ${rollData.prayerModifiers[modifier].name} (${value})`);
  }
  const modifiersChecked = modifiersCheckedList.join(", ")
  return modifiersChecked;
}

export async function coriolisChatListeners(html) {
  // Push roll listener
  $(html).on("click", ".dice-push", (ev) => {
    let button = $(ev.currentTarget),
      messageId = button.parents(".message").attr("data-message-id"),
      message = game.messages.get(messageId);
    let results = message.getFlag("yzecoriolis", "results");
    console.log(message);
    let originalRoll = message.rolls[0]; // TODO: handle this in a safer manner.
    if (message.flags.data?.results.pushed) {
      let errorObj = { error: "YZECORIOLIS.ErrorsAlreadyPushed" };
      ui.notifications.error(new Error(game.i18n.localize(errorObj.error)));
      return;
    } else {
      new CoriolisModifierDialog(
        message,
        results.rollData,
        originalRoll
      ).render(true);
    }
  });

  // Combat Overhaul Damage Calculator listener
  $(html).on("click", ".calc-damage-btn", (ev) => {
    const button = $(ev.currentTarget);
    const container = button.closest(".damage-calculator");

    // Get input values
    const baseDamage = parseInt(container.find(".calc-base-damage").val()) || 0;
    const extraDamage = parseInt(container.find(".calc-extra-damage").val()) || 0;
    const targetDR = parseInt(container.find(".calc-target-dr").val()) || 0;
    const armorPen = parseInt(container.find(".calc-armor-pen").val()) || 0;
    const critThreshold = parseInt(container.find(".calc-crit-threshold").val()) || 0;

    // Calculate damage
    const totalDamage = baseDamage + extraDamage;
    const effectiveDR = Math.max(0, targetDR - armorPen);
    const finalDamage = Math.max(0, totalDamage - effectiveDR);

    // Check for critical
    const critTriggered = critThreshold > 0 && finalDamage >= critThreshold;
    const critSeverity = critTriggered ? Math.floor(finalDamage / critThreshold) : 0;

    // Update result display
    const resultDiv = container.find(".damage-calc-result");
    resultDiv.show();
    resultDiv.find(".result-effective-dr").text(effectiveDR);
    resultDiv.find(".result-final-damage").text(finalDamage);

    // Show/hide critical indicator
    const critDiv = resultDiv.find(".result-critical");
    if (critTriggered) {
      critDiv.show();
      let severityText = "";
      if (critSeverity === 1) {
        severityText = game.i18n.localize("YZECORIOLIS.CritSeverityNormal");
      } else if (critSeverity === 2) {
        severityText = game.i18n.localize("YZECORIOLIS.CritSeverityDouble");
      } else if (critSeverity > 2) {
        severityText = game.i18n.format("YZECORIOLIS.CritSeverityMultiple", { count: critSeverity });
      }
      critDiv.find(".result-crit-severity").text(severityText);
    } else {
      critDiv.hide();
    }
  });

  // Combat Overhaul Suppression Check button listener
  $(html).on("click", ".roll-suppression-btn", (ev) => {
    ev.preventDefault();
    // Get selected token's actor, or prompt user to select one
    const tokens = canvas.tokens?.controlled;
    if (tokens && tokens.length === 1) {
      promptSuppressionCheck(tokens[0].actor);
    } else if (tokens && tokens.length > 1) {
      ui.notifications.warn(game.i18n.localize("YZECORIOLIS.SelectOneToken"));
    } else {
      // No token selected, show a dialog to pick an actor
      const actors = game.actors.filter(a => a.type === "character" || a.type === "npc");
      if (actors.length === 0) {
        ui.notifications.warn(game.i18n.localize("YZECORIOLIS.SuppressionNoActor"));
        return;
      }

      const options = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
      new Dialog({
        title: game.i18n.localize("YZECORIOLIS.SuppressionCheck"),
        content: `<form><div class="form-group"><label>${game.i18n.localize("YZECORIOLIS.SelectActor")}:</label><select name="actor">${options}</select></div></form>`,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("YZECORIOLIS.OK"),
            callback: (html) => {
              const actorId = html.find('[name="actor"]').val();
              const actor = game.actors.get(actorId);
              if (actor) {
                promptSuppressionCheck(actor);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("YZECORIOLIS.Cancel")
          }
        },
        default: "ok"
      }).render(true);
    }
  });

  // Combat Overhaul Full Auto damage calculator listener
  $(html).on("click", ".calc-all-damage-btn", (ev) => {
    const button = $(ev.currentTarget);
    const container = button.closest(".full-auto-damage-section");

    // Get global values
    const baseDamage = parseInt(container.find(".calc-base-damage").val()) || 0;
    const armorPen = parseInt(container.find(".calc-armor-pen").val()) || 0;
    const critThreshold = parseInt(container.find(".calc-crit-threshold").val()) || 0;

    // Calculate damage for each hit
    container.find(".full-auto-hit-calc").each(function() {
      const hitCalc = $(this);
      const extraDamage = parseInt(hitCalc.find(".calc-extra-damage").val()) || 0;
      const targetDR = parseInt(hitCalc.find(".calc-target-dr").val()) || 0;

      // Calculate damage
      const totalDamage = baseDamage + extraDamage;
      const effectiveDR = Math.max(0, targetDR - armorPen);
      const finalDamage = Math.max(0, totalDamage - effectiveDR);

      // Check for critical
      const critTriggered = critThreshold > 0 && finalDamage >= critThreshold;

      // Update result display
      const resultDiv = hitCalc.find(".damage-calc-result");
      resultDiv.show();
      resultDiv.find(".result-final-damage").text(finalDamage);

      // Show/hide critical indicator
      const critDiv = resultDiv.find(".result-critical");
      if (critTriggered) {
        critDiv.show();
      } else {
        critDiv.hide();
      }
    });

    // Show suppression check button and Apply All Damage button
    container.find(".roll-suppression-btn").show();
    container.find(".apply-all-damage-btn").show();
  });

  // Populate target selectors with available combatants
  populateTargetSelectors(html);

  // Apply Damage button listener (regular rolls)
  $(html).on("click", ".apply-damage-btn", async (ev) => {
    const button = $(ev.currentTarget);
    const container = button.closest(".damage-calculator");
    const targetSelect = container.find(".damage-target-select");
    const targetId = targetSelect.val();
    const finalDamage = parseInt(container.find(".result-final-damage").text()) || 0;

    if (!targetId) {
      ui.notifications.warn(game.i18n.localize("YZECORIOLIS.NoTargetSelected"));
      return;
    }
    if (finalDamage <= 0) {
      ui.notifications.warn(game.i18n.localize("YZECORIOLIS.NoDamageToApply"));
      return;
    }

    await applyDamageToActor(targetId, finalDamage);
  });

  // Apply Single Damage button listener (Full Auto individual hits)
  $(html).on("click", ".apply-single-damage-btn", async (ev) => {
    const button = $(ev.currentTarget);
    const hitCalc = button.closest(".full-auto-hit-calc");
    const targetSelect = hitCalc.find(".damage-target-select");
    const targetId = targetSelect.val();
    const finalDamage = parseInt(hitCalc.find(".result-final-damage").text()) || 0;

    if (!targetId) {
      ui.notifications.warn(game.i18n.localize("YZECORIOLIS.NoTargetSelected"));
      return;
    }
    if (finalDamage <= 0) {
      ui.notifications.warn(game.i18n.localize("YZECORIOLIS.NoDamageToApply"));
      return;
    }

    await applyDamageToActor(targetId, finalDamage);
  });

  // Apply All Damage button listener (Full Auto - apply all calculated damage)
  $(html).on("click", ".apply-all-damage-btn", async (ev) => {
    const button = $(ev.currentTarget);
    const container = button.closest(".full-auto-damage-section");

    // Collect all hits with targets and damage
    const hits = [];
    container.find(".full-auto-hit-calc").each(function() {
      const hitCalc = $(this);
      const resultDiv = hitCalc.find(".damage-calc-result");
      if (resultDiv.is(":visible")) {
        const targetId = hitCalc.find(".damage-target-select").val();
        const finalDamage = parseInt(hitCalc.find(".result-final-damage").text()) || 0;
        if (targetId && finalDamage > 0) {
          hits.push({ targetId, finalDamage });
        }
      }
    });

    if (hits.length === 0) {
      ui.notifications.warn(game.i18n.localize("YZECORIOLIS.NoDamageToApply"));
      return;
    }

    // Apply damage to each target
    for (const hit of hits) {
      await applyDamageToActor(hit.targetId, hit.finalDamage);
    }
  });
}

/**
 * Calculate an actor's total Damage Reduction from equipped armor + cover
 * @param {Actor} actor - The actor to calculate DR for
 * @returns {Object} - { baseDR, coverDR, totalDR, coverLevel }
 */
function calculateActorDR(actor) {
  let baseDR = 0;
  let coverDR = 0;
  const coverLevel = actor.system.cover || 0;

  // Get DR from equipped armor
  for (const item of actor.items) {
    if (item.type === "armor" && item.system.equipped) {
      // Use damageReduction if available (Combat Overhaul), otherwise use armorRating
      baseDR += item.system.damageReduction || item.system.armorRating || 0;
    }
  }

  // Add cover bonus: light = 1, heavy = 2
  coverDR = coverLevel;

  return {
    baseDR,
    coverDR,
    totalDR: baseDR + coverDR,
    coverLevel
  };
}

/**
 * Populate target selector dropdowns with available combatants
 * Also populates extra damage dropdown based on successes
 * @param {jQuery} html - The chat message HTML
 */
function populateTargetSelectors(html) {
  const selects = $(html).find(".damage-target-select");
  if (selects.length === 0) return;

  // Populate extra damage dropdowns based on successes
  $(html).find(".calc-extra-damage").each(function() {
    const select = $(this);
    const container = select.closest(".damage-calculator, .full-auto-hit-calc");
    const successes = parseInt(container.find(".calc-successes").val()) || 1;
    // Extra damage can be 0 to (successes - 1), since you need at least 1 success to hit
    const maxExtra = Math.max(0, successes - 1);

    select.empty();
    for (let i = 0; i <= maxExtra; i++) {
      select.append(`<option value="${i}">${i}</option>`);
    }
  });

  // Get available targets from combat or all actors
  let targets = [];

  // First, check if there's an active combat
  if (game.combat) {
    for (const combatant of game.combat.combatants) {
      if (combatant.actor && (combatant.actor.type === "character" || combatant.actor.type === "npc")) {
        targets.push({
          id: combatant.actor.id,
          name: combatant.actor.name,
          img: combatant.actor.img
        });
      }
    }
  }

  // If no combat, fall back to all character/npc actors
  if (targets.length === 0) {
    for (const actor of game.actors) {
      if (actor.type === "character" || actor.type === "npc") {
        targets.push({
          id: actor.id,
          name: actor.name,
          img: actor.img
        });
      }
    }
  }

  // Sort alphabetically
  targets.sort((a, b) => a.name.localeCompare(b.name));

  // Populate each select
  selects.each(function() {
    const select = $(this);
    select.empty();
    select.append(`<option value="">-- ${game.i18n.localize("YZECORIOLIS.SelectTarget")} --</option>`);
    for (const target of targets) {
      select.append(`<option value="${target.id}">${target.name}</option>`);
    }

    // Add change listener to update DR when target is selected
    select.off("change.drUpdate").on("change.drUpdate", function() {
      const targetId = $(this).val();
      const container = $(this).closest(".damage-calculator, .full-auto-hit-calc");
      const drDisplay = container.find(".calc-target-dr-display");
      const drHidden = container.find(".calc-target-dr");
      const coverIndicator = container.find(".calc-cover-indicator");

      if (!targetId) {
        drDisplay.text("0");
        drHidden.val("0");
        coverIndicator.text("");
        return;
      }

      const actor = game.actors.get(targetId);
      if (!actor) {
        drDisplay.text("0");
        drHidden.val("0");
        coverIndicator.text("");
        return;
      }

      const drInfo = calculateActorDR(actor);
      drDisplay.text(drInfo.totalDR);
      drHidden.val(drInfo.totalDR);

      // Show cover indicator
      if (drInfo.coverLevel === 1) {
        coverIndicator.text(`(+${drInfo.coverDR} ${game.i18n.localize("YZECORIOLIS.CoverLight")})`);
      } else if (drInfo.coverLevel === 2) {
        coverIndicator.text(`(+${drInfo.coverDR} ${game.i18n.localize("YZECORIOLIS.CoverHeavy")})`);
      } else {
        coverIndicator.text(drInfo.baseDR > 0 ? `(${game.i18n.localize("YZECORIOLIS.Armor")})` : "");
      }
    });
  });
}

/**
 * Apply damage to an actor by reducing their HP
 * @param {string} actorId - The actor's ID
 * @param {number} damage - The amount of damage to apply
 */
async function applyDamageToActor(actorId, damage) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications.error("Actor not found");
    return;
  }

  const currentHP = actor.system.hitPoints?.value ?? 0;
  const newHP = Math.max(0, currentHP - damage);

  await actor.update({ "system.hitPoints.value": newHP });

  // Show notification
  const message = game.i18n.format("YZECORIOLIS.DamageApplied", {
    damage: damage,
    name: actor.name
  });
  ui.notifications.info(message);

  // Also post to chat for visibility
  ChatMessage.create({
    content: `<div class="yzecoriolis damage-applied">
      <strong>${actor.name}</strong> takes <strong>${damage}</strong> damage!
      <br><em>(HP: ${currentHP} → ${newHP})</em>
    </div>`,
    speaker: { alias: game.i18n.localize("YZECORIOLIS.DamageCalculator") }
  });
}
/**
 * Add support for the Dice So Nice module
 * @param {Object} roll
 * @param {String} rollMode
 */
async function showDiceSoNice(roll, rollMode) {
  if (
    game.modules.get("dice-so-nice") &&
    game.modules.get("dice-so-nice").active
  ) {
    let whisper = null;
    let blind = false;
    switch (rollMode) {
      case "blindroll": //GM only
        blind = true;
      // fall through
      // eslint-disable-next-line no-fallthrough
      case "gmroll": {
        //GM + rolling player
        let gmList = game.users.filter((user) => user.isGM);
        let gmIDList = [];
        gmList.forEach((gm) => gmIDList.push(gm._id));
        whisper = gmIDList;
        break;
      }
      case "roll": {
        //everybody
        let userList = game.users.filter((user) => user.active);
        let userIDList = [];
        userList.forEach((user) => userIDList.push(user._id));
        whisper = userIDList;
        break;
      }
      case "selfroll": {
        // only roll to yourself
        let selfList = game.users.filter((user) => user._id === game.user._id);
        let selfIDList = [];
        selfList.forEach((user) => selfIDList.push(user._id));
        whisper = selfIDList;
        break;
      }
    }
    await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
  }
}

/**
 * Create the automatic fire formula.
 *
 * Normally, automatic fire you roll a d6 until the first 1.
 * There is a talent (Machinegunner) and a weapon feature (High Capacity) that ignores the first 1
 * so it is possible to ignore the first two 1s when combining both.
 *
 * This is implemented as a sequence of `1d6x>1` dice rolls, each representing rolling
 * until the first 1 result.
 */

function createAutomaticFireFormula(totalDice, numberOfIgnoredOnes) {
  let formula = `${totalDice}d6`;
  for (let i = 0; i <= numberOfIgnoredOnes; i++) {
    formula = formula + ", 1d6x>1";
  }
  return `{${formula}}`;
}

/**
 * Combat Overhaul: Full Auto multi-attack system
 * Makes 3 separate attacks at -2 each (4 with High Capacity)
 * Machinegunner talent negates the -2 penalty
 * @param {Object} chatOptions - Chat display options
 * @param {Object} rollData - Roll data
 */
async function coriolisRollOverhaulFullAuto(chatOptions, rollData) {
  // Calculate number of attacks: 3 base, +1 with High Capacity
  const numAttacks = rollData.highCapacity ? 4 : 3;

  // Machinegunner negates the -2 penalty
  const fullAutoModifier = rollData.machineGunner ? 0 : -2;

  // Calculate base dice (without the core rules -2 that's already applied)
  // We need to recalculate without the automatic fire penalty since we apply our own
  const baseAttribute = rollData.attribute;
  const baseSkill = rollData.skill;
  const baseBonus = rollData.bonus;
  const modifier = rollData.modifier;
  const itemModifierBonus = parseInt(getRollModifiersBonus(rollData));

  // Base dice pool without any full auto modifier
  let baseDicePool = baseAttribute + baseSkill + baseBonus + modifier + itemModifierBonus;

  // Apply Combat Overhaul full auto modifier
  let totalDice = baseDicePool + fullAutoModifier;

  if (totalDice <= 0) {
    totalDice = 2; // desperation roll
  }

  // Make multiple attack rolls
  const attacks = [];
  const allRolls = [];

  for (let i = 0; i < numAttacks; i++) {
    const formula = `${totalDice}d6`;
    const roll = new Roll(formula);
    await roll.evaluate({ async: false });
    allRolls.push(roll);

    // Evaluate this attack
    let successes = 0;
    const maxRoll = CONFIG.YZECORIOLIS.maxRoll;
    roll.dice.forEach((part) => {
      part.results.forEach((r) => {
        if (r.result === maxRoll) {
          successes++;
        }
      });
    });

    const isDesparation = totalDice <= 0;
    const attackResult = {
      attackNum: i + 1,
      roll: roll,
      successes: successes,
      limitedSuccess: isDesparation ? successes === 2 : successes > 0 && successes < 3,
      criticalSuccess: successes >= 3,
      failure: isDesparation ? successes < 2 : successes === 0,
      desparationRoll: isDesparation
    };

    attacks.push(attackResult);
  }

  // Calculate total successes and hits
  const totalSuccesses = attacks.reduce((sum, a) => sum + a.successes, 0);
  const totalHits = attacks.filter(a => !a.failure).length;

  // Prepare result data
  const resultData = {
    desparationRoll: totalDice <= 0,
    successes: totalSuccesses,
    limitedSuccess: false,
    criticalSuccess: false,
    failure: totalHits === 0,
    rollData: rollData,
    pushed: rollData.pushed,
    // Combat Overhaul full auto specific
    isOverhaulFullAuto: true,
    attacks: attacks,
    numAttacks: numAttacks,
    totalHits: totalHits,
    totalSuccesses: totalSuccesses,
    fullAutoModifier: fullAutoModifier,
    dicePerAttack: totalDice
  };

  await showFullAutoMessage(chatOptions, resultData, allRolls);
}

/**
 * Show chat message for Combat Overhaul Full Auto attack
 */
async function showFullAutoMessage(chatMsgOptions, resultData, rolls) {
  // Generate tooltips for each attack
  const attacksWithTooltips = [];
  for (let i = 0; i < resultData.attacks.length; i++) {
    const attack = resultData.attacks[i];
    const tooltip = await renderTemplate(
      "systems/yzecoriolis/templates/sidebar/dice-results.html",
      getTooltipData({ successes: attack.successes, rollData: resultData.rollData }, attack.roll)
    );
    attacksWithTooltips.push({
      ...attack,
      tooltip: tooltip
    });
  }

  let chatData = {
    title: getRollTitle(resultData.rollData),
    icon: getRollIconKey(resultData.rollData),
    results: resultData,
    attacks: attacksWithTooltips,
    canPush: false, // Cannot push full auto attacks
    totalDice: resultData.dicePerAttack,
    actorType: getActorType(resultData.rollData),
    rollType: getRollType(resultData.rollData),
    attribute: getRollAttribute(resultData.rollData),
    attributeName: getRollAttributeName(resultData.rollData),
    skill: getRollSkill(resultData.rollData),
    skillName: getRollSkillName(resultData.rollData),
    modifier: getRollModifier(resultData.rollData),
    isAutomatic: 'true',
    isAutomaticActive: 'true',
    isOverhaulFullAuto: true,
    numAttacks: resultData.numAttacks,
    totalHits: resultData.totalHits,
    totalSuccesses: resultData.totalSuccesses,
    fullAutoModifier: resultData.fullAutoModifier,
    bonus: getRollBonus(resultData.rollData),
    crit: getRollCrit(resultData.rollData),
    critText: getRollCritText(resultData.rollData),
    damage: getRollDmg(resultData.rollData),
    damageText: getRollDmgText(resultData.rollData),
    armorPenetration: getRollArmorPenetration(resultData.rollData),
    damageReduction: getRollDamageReduction(resultData.rollData),
    combatOverhaul: true,
    range: getRollRange(resultData.rollData),
    features: getRollFeatures(resultData.rollData),
    itemModifiersBonus: getRollModifiersBonus(resultData.rollData),
    itemModifiersChecked: getRollModifiersChecked(resultData.rollData),
    hasMachinegunner: resultData.rollData.machineGunner ? true : false,
    hasHighCapacity: resultData.rollData.highCapacity ? true : false
  };

  if (["gmroll", "blindroll"].includes(chatMsgOptions.rollMode))
    chatMsgOptions["whisper"] = ChatMessage.getWhisperRecipients("GM");
  if (chatMsgOptions.rollMode === "blindroll") chatMsgOptions["blind"] = true;
  else if (chatMsgOptions.rollMode === "selfroll")
    chatMsgOptions["whisper"] = [game.user];

  // Use the first roll for the message
  chatMsgOptions.roll = rolls[0];
  const html = await renderTemplate("systems/yzecoriolis/templates/sidebar/roll-full-auto.html", chatData);
  chatMsgOptions["content"] = html;
  chatMsgOptions["rolls"] = rolls;
  const msg = await ChatMessage.create(chatMsgOptions);
  await msg.setFlag("yzecoriolis", "results", chatData.results);
  return msg;
}

/**
 * Combat Overhaul: Calculate final damage after armor
 * @param {number} baseDamage - Weapon's base damage
 * @param {number} extraDamage - Extra damage from spending successes
 * @param {number} damageReduction - Target's DR (from armor)
 * @param {number} armorPenetration - Weapon's AP
 * @returns {number} Final damage dealt
 */
export function calculateOverhaulDamage(baseDamage, extraDamage, damageReduction, armorPenetration) {
  const totalDamage = baseDamage + extraDamage;
  const effectiveDR = Math.max(0, damageReduction - armorPenetration);
  return Math.max(0, totalDamage - effectiveDR);
}

/**
 * Combat Overhaul: Check if damage triggers a critical injury
 * @param {number} finalDamage - Damage after DR subtraction
 * @param {number} critThreshold - Weapon's crit threshold
 * @returns {object} { triggered: boolean, severity: number }
 */
export function checkOverhaulCritical(finalDamage, critThreshold) {
  if (critThreshold <= 0) {
    return { triggered: false, severity: 0 };
  }
  const triggered = finalDamage >= critThreshold;
  const severity = triggered ? Math.floor(finalDamage / critThreshold) : 0;
  return { triggered, severity };
}

/**
 * Combat Overhaul: Get severity description
 * @param {number} severity - Critical severity level
 * @returns {string} Description of severity effect
 */
export function getCriticalSeverityText(severity) {
  if (severity <= 0) return "";
  if (severity === 1) return game.i18n.localize("YZECORIOLIS.CritSeverityNormal");
  if (severity === 2) return game.i18n.localize("YZECORIOLIS.CritSeverityDouble");
  return game.i18n.format("YZECORIOLIS.CritSeverityMultiple", { count: severity });
}

/**
 * Combat Overhaul: Roll a Suppression Check
 * Called when a character is hit by ranged fire
 * @param {Actor} actor - The actor making the suppression check
 * @param {Object} options - Optional modifiers
 * @param {boolean} options.stun - Weapon has Stun feature (+2)
 * @param {boolean} options.threatening - Weapon is Threatening (+2)
 * @param {number} options.shellShock - Shell Shock bonus from grenades
 * @returns {Object} Result of the suppression check
 */
export async function rollSuppressionCheck(actor, options = {}) {
  const currentStress = actor.system.stress?.value || 0;

  // Calculate modifiers
  let modifier = 0;
  const modifierSources = [];

  if (options.stun) {
    modifier += 2;
    modifierSources.push(game.i18n.localize("YZECORIOLIS.SuppressionModStun"));
  }
  if (options.threatening) {
    modifier += 2;
    modifierSources.push(game.i18n.localize("YZECORIOLIS.SuppressionModThreatening"));
  }
  if (options.shellShock && options.shellShock > 0) {
    modifier += options.shellShock * 2;
    modifierSources.push(game.i18n.format("YZECORIOLIS.SuppressionModShellShock", { bonus: options.shellShock * 2 }));
  }

  // Roll 1d6
  const roll = new Roll("1d6");
  await roll.evaluate({ async: false });
  const dieResult = roll.total;

  // Calculate total
  const total = dieResult + currentStress + modifier;

  // Determine result
  let result, effect, stressGain, loseFastAction, loseSlowAction;

  if (total <= 2) {
    result = "unaffected";
    effect = game.i18n.localize("YZECORIOLIS.SuppressionUnaffected");
    stressGain = 0;
    loseFastAction = false;
    loseSlowAction = false;
  } else if (total <= 5) {
    result = "shaken";
    effect = game.i18n.localize("YZECORIOLIS.SuppressionShaken");
    stressGain = 1;
    loseFastAction = false;
    loseSlowAction = false;
  } else if (total <= 8) {
    result = "suppressed";
    effect = game.i18n.localize("YZECORIOLIS.SuppressionSuppressed");
    stressGain = 1;
    loseFastAction = true;
    loseSlowAction = false;
  } else {
    result = "pinnedDown";
    effect = game.i18n.localize("YZECORIOLIS.SuppressionPinnedDown");
    stressGain = 1;
    loseFastAction = false;
    loseSlowAction = true;
  }

  // Prepare chat data
  const chatData = {
    actorName: actor.name,
    actorId: actor.id,
    dieResult: dieResult,
    currentStress: currentStress,
    modifier: modifier,
    modifierSources: modifierSources.join(", "),
    total: total,
    result: result,
    effect: effect,
    stressGain: stressGain,
    newStress: currentStress + stressGain,
    loseFastAction: loseFastAction,
    loseSlowAction: loseSlowAction
  };

  // Show chat message
  const html = await renderTemplate(
    "systems/yzecoriolis/templates/sidebar/suppression-check.html",
    chatData
  );

  const chatOptions = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    content: html,
    rolls: [roll],
    sound: CONFIG.sounds.dice
  };

  await ChatMessage.create(chatOptions);

  // Update actor stress and status (if user owns the actor)
  if (actor.isOwner) {
    const updateData = {};
    if (stressGain > 0) {
      updateData["system.stress.value"] = Math.min(currentStress + stressGain, 10);
    }
    if (loseFastAction) {
      updateData["system.suppressed"] = true;
    }
    if (loseSlowAction) {
      updateData["system.pinnedDown"] = true;
    }
    if (Object.keys(updateData).length > 0) {
      await actor.update(updateData);
    }
  }

  return {
    roll: roll,
    result: result,
    stressGain: stressGain,
    loseFastAction: loseFastAction,
    loseSlowAction: loseSlowAction
  };
}

/**
 * Open suppression check dialog for an actor
 * @param {Actor} actor - The actor to check
 */
export async function promptSuppressionCheck(actor) {
  if (!actor) {
    ui.notifications.warn(game.i18n.localize("YZECORIOLIS.SuppressionNoActor"));
    return;
  }

  const content = await renderTemplate(
    "systems/yzecoriolis/templates/dialog/suppression-check-dialog.html",
    { actorName: actor.name, currentStress: actor.system.stress?.value || 0 }
  );

  new Dialog({
    title: game.i18n.localize("YZECORIOLIS.SuppressionCheck"),
    content: content,
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice"></i>',
        label: game.i18n.localize("YZECORIOLIS.Roll"),
        callback: async (html) => {
          const stun = html.find('[name="stun"]').is(':checked');
          const threatening = html.find('[name="threatening"]').is(':checked');
          const shellShock = parseInt(html.find('[name="shellShock"]').val()) || 0;
          await rollSuppressionCheck(actor, { stun, threatening, shellShock });
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("YZECORIOLIS.Cancel")
      }
    },
    default: "roll"
  }).render(true);
}
