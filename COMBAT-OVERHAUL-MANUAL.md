# Coriolis Combat Overhaul Manual

This document describes the Combat Overhaul rules adaptation for the Coriolis RPG Foundry VTT system. These optional rules provide a more tactical combat experience with additional mechanics for stress, suppression, and action economy.

## Enabling Combat Overhaul

1. Go to **Game Settings** > **Configure Settings**
2. Find **System Settings** > **Coriolis**
3. Enable **"Combat Overhaul Rules"**

When enabled, the system will use the alternative combat rules described below.

---

## Features Overview

### 1. D66 Initiative System

Instead of rolling a single die for initiative, Combat Overhaul uses a D66 system:

- Roll 2d6 and read them as tens and ones (e.g., 3 and 5 = 35)
- Valid values range from 11-66 (no digits of 0)
- Higher initiative acts first
- The combat tracker displays initiative as whole numbers
- GMs can manually edit initiative values in the combat tracker

**How to use:**
- Add combatants to the combat tracker as normal
- Click "Roll All" or roll individual initiatives
- Initiative will be displayed as D66 values (11-66)

---

### 2. Stress Tracking

Characters now track Stress in addition to HP and MP:

- Stress bar appears on the character sheet (below Reputation)
- Maximum stress is 10 points
- Stress accumulates from combat situations and failed checks
- High stress can trigger negative effects

**How to use:**
- Click on the stress bar segments to increase/decrease stress
- Stress resets between sessions or during downtime (GM discretion)

---

### 3. Suppression System

When characters take damage, they may become suppressed:

**Suppression States:**
- **Suppressed**: Character loses their Fast Action for the current round
- **Pinned Down**: Character loses their Slow Action for the current round

**Suppression Check:**
After calculating damage, click the "Suppression Check" button to roll:
- Roll 1d6 + current stress
- Modifiers apply for weapon features (Stun, Heavy, etc.)
- Results determine if the target becomes Suppressed or Pinned Down

**Status Display:**
- Suppressed/Pinned Down status shows on the character sheet
- Click the X button next to the status to clear it
- Status automatically clears at the start of a new combat round

---

### 4. Action Economy

Each character has actions per round that are tracked on their sheet:

**Available Actions:**
- **Slow Action (S)**: One slow action per round (attack, use skill, etc.)
- **Fast Action (F)**: One fast action per round (move, draw weapon, etc.)

**Trading Actions:**
- Click the exchange icon to trade your Slow Action for a second Fast Action
- This gives you two Fast Actions but no Slow Action

**Status Effects on Actions:**
- **Suppressed**: Lose your Fast Action (shown as "lost")
- **Pinned Down**: Lose your Slow Action (shown as "lost")

**Action Buttons:**
- Green = Available
- Gray with checkmark = Used
- Orange with exchange icon = Traded
- Red with X = Lost (due to suppression)

**Reset:**
- Click the reset button to manually reset actions
- Actions automatically reset at the start of each combat round

---

### 5. Cover System

Characters can take cover during combat for additional protection:

**Cover States:**
- **No Cover (0)**: No bonus to DR
- **Light Cover (+1)**: Partial concealment, adds +1 to DR
- **Heavy Cover (+2)**: Significant protection, adds +2 to DR

**Setting Cover:**
- In the combat tracker, click the shield icon next to your combatant
- Each click cycles through: No Cover → Light Cover → Heavy Cover → No Cover
- Cover state is displayed by icon and color:
  - Gray person icon = No Cover
  - Blue shield = Light Cover
  - Green shield = Heavy Cover

**Effect on Damage:**
- Cover bonus is automatically added to DR when calculating damage
- The damage calculator shows the cover modifier when a target is selected

---

### 6. Damage Calculator

Weapon attacks include an integrated damage calculator:

**How to use:**
1. Roll a weapon attack
2. If successful, expand the "Damage Calculator" section
3. Select a **Target** from the dropdown - DR is auto-calculated
4. Select **Extra Damage** from dropdown (limited to available extra successes)
5. Click **Calculate**

**Extra Damage Validation:**
- Extra damage is limited to (successes - 1), since at least 1 success is needed to hit
- Example: With 3 successes, you can spend 0, 1, or 2 on extra damage

**Auto-Calculated DR:**
- When you select a target, their DR is automatically calculated from:
  - Base DR from equipped armor
  - Cover bonus (+1 for light, +2 for heavy)
- A cover indicator shows if cover is contributing to DR

**Calculation:**
- Total Damage = Base Weapon Damage + Extra Damage
- Effective DR = Target DR - Armor Penetration (minimum 0)
- Final Damage = Total Damage - Effective DR (minimum 0)

**Critical Hits:**
- If Final Damage >= Crit Threshold, a critical is triggered
- Critical severity increases if damage is 2x or 3x the threshold

---

### 7. Damage Application

After calculating damage, you can apply it directly to a target:

**How to use:**
1. Select a target and calculate damage using the Damage Calculator
2. Click **Apply Damage**
3. Target's HP is reduced and a chat message confirms the damage

**Target Selection:**
- If a combat is active, the dropdown shows all combatants
- If no combat, it shows all character and NPC actors
- Targets are sorted alphabetically

---

### 8. Full Auto Attacks

Automatic weapons can fire in Full Auto mode for multiple attacks:

**How it works:**
- Full Auto fires 3 attacks (or 4 with High Capacity weapon feature)
- Each attack rolls separately at -2 modifier (negated by Machinegunner talent)
- Each attack can target the same or different enemies
- Attacks cannot be pushed (no "Pray to the Icons")

**Using Full Auto:**
1. Select a weapon with the Automatic feature
2. Choose "Full Auto" when rolling the attack
3. The system rolls all attacks and displays results
4. Use the damage calculator for each hit

**Damage Application for Full Auto:**
- Each hit has its own target selector and damage inputs
- Select different targets for each hit if desired
- Click individual "Apply Damage" buttons, or
- Click "Apply All Damage" to apply all calculated damage at once

---

### 9. Combat Tracker Integration

Combat Overhaul adds action buttons and quick attack directly to the combat tracker, eliminating the need to keep character sheets open during combat.

**Combat Tracker Buttons:**
Each combatant row displays five buttons:
- **S (Slow)**: Toggle slow action used/available
- **F (Fast)**: Toggle fast action used/available
- **Exchange Icon**: Trade your slow action for an extra fast action
- **Shield Icon**: Cycle cover state (None → Light → Heavy)
- **Crosshairs**: Quick Attack with primary weapon

**Button Colors:**
- Green = Available
- Gray = Used/Inactive
- Orange = Traded (slow traded for fast) or Trade button hover
- Red = Lost (due to suppression)
- Blue Shield = Light Cover
- Green Shield = Heavy Cover

**Permissions:**
- Players can use buttons for their own characters
- GMs can use buttons for all combatants

---

### 10. Primary Weapon & Quick Attack

Set a primary weapon for fast attacks from the combat tracker:

**Setting Primary Weapon:**
1. Open the character's Gear tab
2. Find the "Primary Weapon" dropdown (appears when Combat Overhaul is enabled)
3. Select the weapon you want as your default attack

**Using Quick Attack:**
1. In the combat tracker, click the crosshairs icon next to your combatant
2. A roll dialog appears with an option for **Quick Shot** (ranged) or **Quick Strike** (melee)
3. Choose your attack type:
   - **Normal Attack**: Uses your Slow action (no penalty)
   - **Quick Shot/Strike**: Uses your Fast action with a **-2 penalty**
4. The appropriate action is automatically marked as used after the roll

**Quick Shot / Quick Strike:**
- Allows you to attack using your Fast action instead of Slow action
- Applies a -2 modifier to the attack roll
- Useful when you've already used your Slow action or want to save it

**Automatic Action Spending:**
- When attacking via the combat tracker, the system automatically spends the appropriate action
- Normal attack → Slow action marked as used
- Quick Shot/Strike → Fast action marked as used
- Actions can be reset via the character sheet or when a new combat round begins

**Notes:**
- If no primary weapon is set, clicking Quick Attack shows a warning
- Primary weapon can be any weapon or explosive in your inventory
- Change your primary weapon anytime from the Gear tab

---

### 11. Armor and Damage Reduction

Combat Overhaul changes how armor works:

**Core Rules (when Combat Overhaul is OFF):**
- Armor provides Armor Rating added to defense rolls

**Combat Overhaul (when ON):**
- Armor provides Damage Reduction (DR) that subtracts from incoming damage
- Weapons may have Armor Penetration (AP) that reduces effective DR

**Weapon Stats:**
- **Damage**: Base damage dealt
- **AP (Armor Penetration)**: Reduces target's effective DR
- **Crit**: Damage threshold to trigger critical injuries

---

## Character Sheet Changes

When Combat Overhaul is enabled, the character sheet displays:

1. **Stress Bar**: Below the Reputation bar
2. **Suppression Status**: Shows when Suppressed or Pinned Down
3. **Action Economy**: Shows Slow/Fast action buttons with trade and reset options
4. **Primary Weapon Selector**: Dropdown in Gear tab to select default weapon for quick attacks

---

## Migration

When enabling Combat Overhaul, the system automatically migrates existing data:

- Weapons with "Contact" or "Close" range become "Engaged"
- Weapons get Armor Penetration field (default 0)
- Armor gets Damage Reduction field (set equal to Armor Rating)
- Characters get Stress tracking fields
- Characters get Action tracking fields

---

## Tips for GMs

1. **Suppression Checks**: Use these after significant hits to add tension
2. **Action Economy**: Track actions during combat to enforce tactical choices
3. **Stress**: Award stress for scary situations, not just damage
4. **Full Auto**: Remember the -2 penalty is significant; Machinegunner talent is valuable
5. **Target Selection**: The dropdown makes damage application quick during combat

---

## Keyboard Shortcuts

- **T** (while hovering token): Target/untarget for damage application
- Standard Foundry combat tracker shortcuts apply

---

## Troubleshooting

**CSS changes not visible:**
- Check if other modules (like Coriolis UI) are overriding styles
- Disable conflicting UI modules if needed

**Target dropdown empty:**
- Ensure actors exist in the world
- Start a combat encounter to populate from combatants

**Damage not applying:**
- Verify you've clicked Calculate first
- Ensure a target is selected
- Check that Final Damage is greater than 0

**Quick Attack not working:**
- Ensure a primary weapon is selected in the Gear tab
- Check that the weapon still exists in the actor's inventory
- Verify Combat Overhaul is enabled in system settings

**Combat tracker buttons not appearing:**
- Verify Combat Overhaul is enabled
- Check that the combatant is a character or NPC (not a ship)
- Refresh the combat tracker by toggling it closed and open
