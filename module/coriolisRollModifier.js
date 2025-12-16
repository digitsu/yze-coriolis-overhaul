import { coriolisRoll } from "./coriolis-roll.js";

export class CoriolisModifierDialog extends FormApplication {
    constructor(rollData, chatOptions) {
      super();
      this.rollData = rollData;
      this.chatOptions = chatOptions;
      this.rollVisibility = game.settings.get("yzecoriolis", "RollVisibility");
      this.rollMode = game.settings.get("core", "rollMode");
      this.isAutomatic = rollData.isAutomatic;
      this.automaticFire = rollData.automaticFire;
      this.machineGunner = rollData.machineGunner;
      this.highCapacity = rollData.highCapacity;
      this.shipGunner = rollData.shipGunner;
      this.crewMembersControlled = rollData.crewMembersControlled;
      this.gunnerToChoose = rollData.gunnerToChoose;
      this.gunnerChoosen = rollData.gunnerToChoose
        ? Object.keys(rollData.crewMembersControlled)[0]
        : null;
      this.itemModifiers = rollData.gunnerToChoose
        ? this.crewMembersControlled[this.gunnerChoosen].system.itemModifiers.rangedcombat
        : rollData.itemModifiers;
      // Combat Tracker Quick Attack support
      this.fromCombatTracker = rollData.fromCombatTracker || false;
      this.combatTrackerActor = rollData.combatTrackerActor || null;
      this.isMeleeWeapon = rollData.isMeleeWeapon || false;
    }
  
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ['form'],
        popOut: true,
        template: "systems/yzecoriolis/templates/dialog/coriolis-roll.html",
        id: 'coriolisModifierDialog',
        title: game.i18n.localize("YZECORIOLIS.ModifierForRoll"),
        height: 'auto',
        width: 'auto',
        minimizable: false,
        resizable: true,
        closeOnSubmit: true,
        submitOnClose: false,
        submitOnChange: false,
      });
    }
    
    getData() {
      // Send data to the template
        return {
          rollVisibility: this.rollVisibility,
          rollMode: this.rollMode,
          isAutomatic: this.isAutomatic,
          automaticFire: this.automaticFire,
          machineGunner: this.machineGunner,
          highCapacity: this.highCapacity,
          itemModifiers: this.itemModifiers,
          gunnerToChoose: this.gunnerToChoose,
          gunnerChoosen: this.gunnerChoosen,
          gunnerList: this.crewMembersControlled,
          // Combat Tracker Quick Action
          fromCombatTracker: this.fromCombatTracker,
          quickActionLabel: this.isMeleeWeapon
            ? game.i18n.localize("YZECORIOLIS.QuickStrike")
            : game.i18n.localize("YZECORIOLIS.QuickShot"),
        };
    }
  
    activateListeners(html) {
      super.activateListeners(html);
    }

    async _onChangeInput(event) {
      if (event.currentTarget.name === "dialogRollMode") {
        this.rollMode = event.currentTarget.value;
      }
      if (event.currentTarget.name === "automaticFire") {
        this.automaticFire = event.currentTarget.checked;
      }
      if (event.currentTarget.name === "machineGunner") {
        this.machineGunner = event.currentTarget.checked;
      }
      if (event.currentTarget.name === "highCapacity") {
        this.highCapacity = event.currentTarget.checked;
      }
      if (event.currentTarget.name.match(/^si_.*$/)) {
        this.itemModifiers[event.currentTarget.name].checked = event.currentTarget.checked;
      }
      if (event.currentTarget.name === "gunnerChoosen") {
        this.gunnerChoosen = event.currentTarget.value;
        this.itemModifiers = this.crewMembersControlled[this.gunnerChoosen].system.itemModifiers.rangedcombat;
      }
      this.render();
    }

    async _updateObject(event, formData) {
      this.chatOptions.rollMode = this.rollMode;

      // Parse button value - can be "normal:0", "quick:0", or just a number
      const buttonValue = event.submitter.value;
      let isQuickAction = false;

      if (this.fromCombatTracker && buttonValue.includes(":")) {
        // Combat tracker button format: "normal:modifier" or "quick:modifier"
        const [actionType, modifier] = buttonValue.split(":");
        isQuickAction = actionType === "quick";
        this.rollData.modifier = parseInt(modifier);

        // Apply -2 penalty for Quick Shot/Strike
        if (isQuickAction) {
          this.rollData.modifier -= 2;
        }
      } else {
        // Standard modifier button
        this.rollData.modifier = parseInt(buttonValue);
      }

      this.rollData.automaticFire = this.automaticFire;
      this.rollData.machineGunner = this.machineGunner ? 1 : 0;
      this.rollData.highCapacity = this.highCapacity ? 1 : 0;
      this.rollData.numberOfIgnoredOnes = this.rollData.machineGunner + this.rollData.highCapacity;
      this.rollData.itemModifiers = this.itemModifiers;
      if (this.gunnerToChoose) {
        this.rollData.actorType = this.crewMembersControlled[this.gunnerChoosen].type;
        this.rollData.gunnerName = this.crewMembersControlled[this.gunnerChoosen].name;
        this.rollData.attribute = this.crewMembersControlled[this.gunnerChoosen].system.attributes.agility.value;
        this.rollData.skill = this.crewMembersControlled[this.gunnerChoosen].system.skills.rangedcombat.value;
        this.rollData.rollTitle = game.i18n.localize("YZECORIOLIS.CrewSpotGunner") + " " + this.rollData.gunnerName + "\n- " + this.rollData.ship;
      }

      // Execute the roll
      await coriolisRoll(this.chatOptions, this.rollData);

      // Combat Tracker: Spend the appropriate action after the roll
      if (this.fromCombatTracker && this.combatTrackerActor) {
        if (isQuickAction) {
          // Quick Shot/Strike uses Fast action
          await this.combatTrackerActor.update({ "system.actions.fastUsed": true });
        } else {
          // Normal attack uses Slow action
          await this.combatTrackerActor.update({ "system.actions.slowUsed": true });
        }
      }

      return;
    }
  }
  
  window.CoriolisModifierDialog = CoriolisModifierDialog;