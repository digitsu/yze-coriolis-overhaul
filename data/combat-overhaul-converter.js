/**
 * Coriolis Combat Overhaul Converter
 *
 * This script converts weapons and armor to use Combat Overhaul stats.
 * Run this from the browser console (F12) when in a Coriolis world.
 *
 * Usage:
 *   1. Open your Coriolis world in Foundry
 *   2. Press F12 to open browser console
 *   3. Copy and paste this entire script
 *   4. Call: await convertAllItems() to convert all items in the world
 *   5. Or call: await convertActorItems(actorName) for a specific actor
 */

// Load the conversion data
async function loadConversionData() {
  const response = await fetch('systems/yzecoriolis/data/combat-overhaul-equipment.json');
  return await response.json();
}

// Normalize item name for matching
function normalizeName(name) {
  return name.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

// Check if item should be ignored (NPC natural weapons, creature armor, etc.)
function shouldIgnoreItem(itemName, conversionData) {
  if (!conversionData.ignoredPatterns) return false;

  for (const pattern of conversionData.ignoredPatterns) {
    if (itemName.includes(pattern)) {
      return true;
    }
  }
  return false;
}

// Find matching weapon data
function findWeaponData(itemName, conversionData) {
  const normalized = normalizeName(itemName);

  // Check aliases first
  for (const [alias, canonical] of Object.entries(conversionData.nameAliases)) {
    if (normalizeName(alias) === normalized) {
      itemName = canonical;
      break;
    }
  }

  // Search melee weapons
  for (const weapon of conversionData.weapons.melee) {
    if (normalizeName(weapon.name) === normalizeName(itemName)) {
      return { ...weapon, melee: true };
    }
  }

  // Search ranged weapons
  for (const weapon of conversionData.weapons.ranged) {
    if (normalizeName(weapon.name) === normalizeName(itemName)) {
      return { ...weapon, melee: false };
    }
  }

  // Search explosives
  for (const weapon of conversionData.weapons.explosives) {
    if (normalizeName(weapon.name) === normalizeName(itemName)) {
      return { ...weapon, explosive: true };
    }
  }

  return null;
}

// Find matching armor data
function findArmorData(itemName, conversionData) {
  const normalized = normalizeName(itemName);

  // Check aliases first
  for (const [alias, canonical] of Object.entries(conversionData.nameAliases)) {
    if (normalizeName(alias) === normalized) {
      itemName = canonical;
      break;
    }
  }

  for (const armor of conversionData.armor) {
    if (normalizeName(armor.name) === normalizeName(itemName)) {
      return armor;
    }
  }

  return null;
}

// Convert a single weapon item
async function convertWeapon(item, conversionData, dryRun = false) {
  // Check if this item should be ignored (NPC natural weapons, etc.)
  if (shouldIgnoreItem(item.name, conversionData)) {
    console.log(`⏭️ Skipping NPC/creature weapon: ${item.name}`);
    return { success: false, item: item.name, reason: 'Ignored (NPC/creature)', ignored: true };
  }

  const weaponData = findWeaponData(item.name, conversionData);

  if (!weaponData) {
    console.log(`⚠️ No match found for weapon: ${item.name}`);
    return { success: false, item: item.name, reason: 'No match found' };
  }

  const updateData = {
    'system.armorPenetration': weaponData.armorPenetration,
    'system.critThreshold': weaponData.critThreshold,
    'system.damage': weaponData.damage,
    'system.bonus': weaponData.bonus,
    'system.range': weaponData.range
  };

  if (weaponData.explosive) {
    updateData['system.blastPower'] = weaponData.blastPower;
    updateData['system.blastRadius'] = weaponData.blastRadius;
  }

  console.log(`✅ Matched "${item.name}" → "${weaponData.name}"`);
  console.log(`   AP: ${weaponData.armorPenetration}, Crit: ${weaponData.critThreshold}, DMG: ${weaponData.damage}`);

  if (!dryRun) {
    await item.update(updateData);
    console.log(`   Updated!`);
  } else {
    console.log(`   (Dry run - not saved)`);
  }

  return { success: true, item: item.name, matched: weaponData.name, data: updateData };
}

// Convert a single armor item
async function convertArmor(item, conversionData, dryRun = false) {
  // Check if this item should be ignored (creature armor, etc.)
  if (shouldIgnoreItem(item.name, conversionData)) {
    console.log(`⏭️ Skipping NPC/creature armor: ${item.name}`);
    return { success: false, item: item.name, reason: 'Ignored (NPC/creature)', ignored: true };
  }

  const armorData = findArmorData(item.name, conversionData);

  if (!armorData) {
    console.log(`⚠️ No match found for armor: ${item.name}`);
    return { success: false, item: item.name, reason: 'No match found' };
  }

  const updateData = {
    'system.damageReduction': armorData.damageReduction
  };

  console.log(`✅ Matched "${item.name}" → "${armorData.name}"`);
  console.log(`   DR: ${armorData.damageReduction}`);

  if (!dryRun) {
    await item.update(updateData);
    console.log(`   Updated!`);
  } else {
    console.log(`   (Dry run - not saved)`);
  }

  return { success: true, item: item.name, matched: armorData.name, data: updateData };
}

// Convert all items in the world
async function convertAllItems(dryRun = true) {
  console.log('='.repeat(60));
  console.log('Coriolis Combat Overhaul Converter');
  console.log(dryRun ? '(DRY RUN - No changes will be saved)' : '(LIVE - Changes will be saved!)');
  console.log('='.repeat(60));

  const conversionData = await loadConversionData();
  const results = { weapons: [], armor: [], unmatched: [], ignored: [] };

  // Helper to categorize results
  function categorizeResult(result, results) {
    if (result.success) {
      return; // Already handled by caller
    } else if (result.ignored) {
      results.ignored.push(result);
    } else {
      results.unmatched.push(result);
    }
  }

  // Convert world items
  console.log('\n📦 Converting World Items...');
  for (const item of game.items) {
    if (item.type === 'weapon') {
      const result = await convertWeapon(item, conversionData, dryRun);
      if (result.success) results.weapons.push(result);
      else categorizeResult(result, results);
    } else if (item.type === 'armor') {
      const result = await convertArmor(item, conversionData, dryRun);
      if (result.success) results.armor.push(result);
      else categorizeResult(result, results);
    }
  }

  // Convert actor-owned items
  console.log('\n👤 Converting Actor Items...');
  for (const actor of game.actors) {
    console.log(`\nActor: ${actor.name}`);
    for (const item of actor.items) {
      if (item.type === 'weapon') {
        const result = await convertWeapon(item, conversionData, dryRun);
        if (result.success) results.weapons.push(result);
        else categorizeResult(result, results);
      } else if (item.type === 'armor') {
        const result = await convertArmor(item, conversionData, dryRun);
        if (result.success) results.armor.push(result);
        else categorizeResult(result, results);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('CONVERSION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Weapons converted: ${results.weapons.length}`);
  console.log(`✅ Armor converted: ${results.armor.length}`);
  console.log(`⏭️ Ignored (NPC/creature): ${results.ignored.length}`);
  console.log(`⚠️ Unmatched items: ${results.unmatched.length}`);

  if (results.ignored.length > 0) {
    console.log('\nIgnored items (NPC natural weapons, creature armor):');
    for (const item of results.ignored) {
      console.log(`  - ${item.item}`);
    }
  }

  if (results.unmatched.length > 0) {
    console.log('\nUnmatched items (may need aliases added):');
    for (const item of results.unmatched) {
      console.log(`  - ${item.item}`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️ This was a DRY RUN. To apply changes, run:');
    console.log('   await convertAllItems(false)');
  }

  return results;
}

// Convert items for a specific actor
async function convertActorItems(actorName, dryRun = true) {
  const actor = game.actors.getName(actorName);
  if (!actor) {
    console.error(`Actor "${actorName}" not found!`);
    return;
  }

  console.log(`Converting items for actor: ${actor.name}`);
  const conversionData = await loadConversionData();
  const results = { weapons: [], armor: [], unmatched: [], ignored: [] };

  // Helper to categorize results
  function categorizeResult(result) {
    if (result.ignored) {
      results.ignored.push(result);
    } else {
      results.unmatched.push(result);
    }
  }

  for (const item of actor.items) {
    if (item.type === 'weapon') {
      const result = await convertWeapon(item, conversionData, dryRun);
      if (result.success) results.weapons.push(result);
      else categorizeResult(result);
    } else if (item.type === 'armor') {
      const result = await convertArmor(item, conversionData, dryRun);
      if (result.success) results.armor.push(result);
      else categorizeResult(result);
    }
  }

  console.log(`\nConverted: ${results.weapons.length} weapons, ${results.armor.length} armor`);
  console.log(`Ignored: ${results.ignored.length} (NPC/creature items)`);
  console.log(`Unmatched: ${results.unmatched.length} items`);

  return results;
}

// Make functions available globally
window.convertAllItems = convertAllItems;
window.convertActorItems = convertActorItems;

console.log('Combat Overhaul Converter loaded!');
console.log('Usage:');
console.log('  await convertAllItems()      - Dry run all items');
console.log('  await convertAllItems(false) - Convert all items (saves changes)');
console.log('  await convertActorItems("Character Name") - Dry run specific actor');
console.log('  await convertActorItems("Character Name", false) - Convert specific actor');
