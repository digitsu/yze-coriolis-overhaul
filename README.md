
# Coriolis Reloaded: Combat Overhaul (compatible with CORE official system as well)

The **UN-Official** system for playing [Coriolis](https://frialigan.se/en/games/coriolis-2/) on Foundry VTT, modified to use the optional Coriolis Reloaded: Combat Overhaul modified combat rules.
This is a fork of the official [one](https://github.com/hodpub/yze-coriolis.git) and has all the functionality of it, but is a fork because AI coding tools were used to assist in the development and testing of the module, and Foundry has a strict no AI rule, which applies even when AI tools like copilot are used for code development.  This module will strive to maintain feature parity and be up-to-date with any changes in the official fork, but is subject to being maintained by the community.  I also added MIT licensing to this fork and all its modifications, whereas the original module did not have any license specified for the module code. (only OGL for the game system).

## Installation

1. Go to your foundry data folder (login to foundry, Settings->Foundry Data folder to see where it is for you) and then in the Data/modules directory, git clone this repository.

## Documentation

Detailed documentation of the combat overhaul features added can be found [here](https://github.com/digitsu/yze-coriolis-overhaul/blob/master/COMBAT-OVERHAUL-MANUAL.md)

## Official Modules

To save time recreating hundreds of items, journals, NPCs, and maps from the official print or PDF source material, there are a official modules available:

- [Core Rulebook Module](https://foundryvtt.com/packages/coriolis-corerules)
- [Last Voyage of the Ghazali](https://foundryvtt.com/packages/coriolis-ghazali)
- [Emissary Lost](https://foundryvtt.com/packages/coriolis-emissarylost)

## Features (in addition to the original modules' features)

<img width="1007" height="809" alt="charsheet2" src="https://github.com/user-attachments/assets/2ab2780d-8b74-4f8f-a1d0-6197b3751ac4" />

- Slow, Fast Action economy buttons, with reset and trade
- Combat tab integration, adding the action buttons and a quick attack button, allowing you to attack using your primary weapon
- Modified the weapons and armor and rules to accomodate the changes is how critical successes are handled in CO.
- Added the stress mechanic
- Added the stress table
- Allow for the assignment of damage to a target after you attack, allowing for the choice of what to do with your extra successes
- Incorporated Damage Reduction rules, cover rules, auto-fire, and suppression rules

## How-Tos

### Initiative

Now follows the published D66 format, to be compatible with the Icon deck card initiative method.

<img width="293" height="614" alt="initiative" src="https://github.com/user-attachments/assets/4dc4aa48-8b01-4554-99fd-ca03d89b970b" />


### Autofire 

<img width="298" height="912" alt="autofire" src="https://github.com/user-attachments/assets/a31a377d-f6e2-44a8-ab6a-e15ea3ebacd7" />


### Rolling Damage Rolls

<img width="285" height="649" alt="attackroll" src="https://github.com/user-attachments/assets/dc8ff966-e7cd-43b5-bc57-5301b0e00a7c" />


After a successful attack, you can run the Damage Calculator to work out damage, (calculate according to the upgraded rules) and assign to the target or targets (if using auto-fire).

<img width="286" height="436" alt="damagecalc" src="https://github.com/user-attachments/assets/1c9f931f-b270-4206-b05d-39f8181cc476" />


Suppression is now tracked

<img width="289" height="351" alt="supression" src="https://github.com/user-attachments/assets/04516cad-c4ca-4042-b0a3-f7903f7145fd" />


### Slow/Fast Action economy

<img width="389" height="356" alt="combatbar1" src="https://github.com/user-attachments/assets/4e43cca9-5b2a-49d9-b3a6-d1908b5837b2" />


Hot-key buttons on the combat tab, which track which actions you have used, and also what you have left.  Also a convenient "attack with primary weapon" button. No more fishing for your weapon in your sheet to just do an attack roll! Set your primary weapon in your items tab.

### Using Weapons and Armor

Weapons, Explosives, and Armor updated to have both stats for Combat Overhaul crit and DR system, while still maintaining compatibility with the original core system stats.

## Todos

- Minions rules
- Critical success effects automatically affected onto the target sheets.

## Support

For questions, feature requests, or bug reports, feel free to contact me on the Foundry Discord (digitsu#8858) or open an issue here directly.


## License

This Foundry VTT system is licensed under a [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/)

This work is licensed under [Foundry Virtual Tabletop EULA - Limited License Agreement for module development](https://foundryvtt.com/article/license/).
