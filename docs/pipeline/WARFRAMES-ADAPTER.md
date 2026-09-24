# Warframes DE adapter

This slice compares the cached Digital Extremes PublicExport
`ExportWarframes_en.json` asset with the Preview runtime's
`ExportWarframes.json`. The cache was read from
`/home/jedwards/.cache/kiedas-de-export`; no network request was made.

## Shapes

DE's asset is an object containing `ExportWarframes`, an array of records.
The Preview file is an object keyed by `uniqueName`. The adapter accepts the
DE wrapper, an array, or an equivalent record map and always emits a
`uniqueName`-keyed object sorted by `uniqueName`.

| App-consumed field | DE source | Adapter action | Note |
| --- | --- | --- | --- |
| `uniqueName`, `name`, `parentName`, `description` | same field | direct | DE English values are authoritative |
| `health`, `shield`, `armor`, `stamina`, `power`, `codexSecret`, `masteryReq`, `sprintSpeed`, `passiveDescription`, `productCategory` | same field | direct | no formula or fallback |
| `exalted` | same field | direct array copy | absent records omit it |
| `abilities[].uniqueName` | `abilities[].abilityUniqueName` | renamed | nested app shape |
| `abilities[].name` | `abilities[].abilityName` | renamed | nested app shape |
| `abilities[].description` | same field | direct | nested unknown fields are ignored |
| `icon`, `longDescription`, `variantType`, `additionalItems`, `nemesisUpgradeTag`, `platinumCost`, `excludeFromMarket`, `introducedAt`, `maxLevelCap`, `excludeFromCodex` | absent or app-only | omitted | images, codex enrichment, and commerce metadata remain merge-layer responsibilities |
| polarities | absent from these DE records | omitted | no polarity value is invented |

The adapter's complete top-level allow-list is: `uniqueName`, `name`,
`parentName`, `description`, `health`, `shield`, `armor`, `stamina`, `power`,
`codexSecret`, `masteryReq`, `sprintSpeed`, `passiveDescription`, `exalted`,
`abilities`, and `productCategory`. Missing optional DE fields are omitted,
not replaced with guessed values.

## Verbatim raw samples

These are copied verbatim field-level excerpts from the inspected assets
(shown compactly to keep the comparison readable). The DE excerpts include
Narin, Excalibur, and Volt Prime. Narin has no app counterpart; the two app
excerpts below show the corresponding Excalibur and Volt Prime records.

### DE PublicExport

```json
{"uniqueName":"/Lotus/Powersuits/Duelist/Duelist","name":"Narin","parentName":"/Lotus/Powersuits/Duelist/DuelistBaseSuit","description":"Narin descends in swirling eddies, her blade keen and deadly as an icy wind. She wields ice to defend as deftly as her swift rapier strikes.","health":270,"shield":550,"armor":165,"stamina":3,"power":200,"codexSecret":false,"masteryReq":0,"sprintSpeed":1.1,"passiveDescription":"Each stack of <DT_FREEZE_COLOR>Cold Status Effect on enemies increase chance to spawn Sangodae pickup by |CHANCE|%, granting <DT_FREEZE_COLOR>Extra Cold Damage on Primary and Secondary weapons for |DURATION|s. Narin also gains Cold Damage for her abilities.","abilities":[{"abilityUniqueName":"/Lotus/Powersuits/Duelist/Abilities/DuelistThrustAbility","abilityName":"Neote","description":"Lunge with Narin's ice rapier Neote, inflicting <DT_FREEZE_COLOR> Cold Damage and <DT_FREEZE_COLOR> Cold and <DT_PUNCTURE_COLOR> Puncture Status Effect on foes directly ahead of her.\r\n\r\nGain Ice for each enemy hit."},{"abilityUniqueName":"/Lotus/Powersuits/Duelist/Abilities/DuelistRiposteAbility","abilityName":"Naraemagi","description":"Recover Shields by absorbing <DT_FREEZE_COLOR> Cold Status Effect from nearby enemies. Gain <OVERGUARD_GAIN> Overguard if at full Shields.\r\n\r\nGain Ice for each enemy hit."},{"abilityUniqueName":"/Lotus/Powersuits/Duelist/Abilities/DuelistLeapAbility","abilityName":"Hakchum","description":"Tap to leap into the air, tap again to land at target location. Applies <DT_FREEZE_COLOR> Cold Damage Vulnerability and Status Effect in a large radius upon landing.\r\n\r\nGain Ice for each enemy hit."},{"abilityUniqueName":"/Lotus/Powersuits/Duelist/Abilities/DuelistBladeDanceAbility","abilityName":"Nurinarim","description":"Requires full Ice to cast. An ancestral spirit descends upon Narin and she begins sword dancing for continuous nearby damage. Press Attack on the marked targets to launch shattering icy slashes that deplete Armor and Shields. Hitting Frozen enemies causes them to explode, dealing massive radial <DT_FREEZE_COLOR> Cold Damage."}],"productCategory":"Suits"}
{"uniqueName":"/Lotus/Powersuits/Excalibur/Excalibur","name":"Excalibur","parentName":"/Lotus/Powersuits/Excalibur/ExcaliburBaseSuit","description":"Excalibur epitomizes the warrior spirit. His master swordsmanship deals high damage. He is the embodiment of martial excellence.","health":270,"shield":270,"armor":240,"stamina":3,"power":100,"codexSecret":false,"masteryReq":0,"longDescription":"The Sentients had won. They had turned our weapons, our technology, against us. The war was over unless we found a new way. The blinding night, the hellspace where our science and reason failed.\r\n\r\nExcalibur was the first.","sprintSpeed":1,"passiveDescription":"Excalibur deals |DAMAGE|% increased damage and attacks |SPEED|% faster when wielding swords.","exalted":["/Lotus/Powersuits/Excalibur/DoomSword"],"abilities":[{"abilityUniqueName":"/Lotus/Powersuits/Excalibur/Abilities/SlashDashNewAbility","abilityName":"Slash Dash","description":"Slash and dash through enemies alongside a radial specter. The powerful Exalted Blade’s slashes inflict <DT_SLASH_COLOR>Slash Status."},{"abilityUniqueName":"/Lotus/Powersuits/Excalibur/Abilities/RadialBlindAbility","abilityName":"Radial Blind","description":"Emit a bright flash of light, blinding all nearby enemies."},{"abilityUniqueName":"/Lotus/Powersuits/Excalibur/Abilities/RadialJavelinAbility","abilityName":"Radial Javelin","description":"Radial javelins impale nearby enemies, inflicting <DT_SLASH_COLOR>Slash Status."},{"abilityUniqueName":"/Lotus/Powersuits/Excalibur/Abilities/SwordOfDoomAbility","abilityName":"Exalted Blade","description":"Summon a sword of pure light and immense power."}],"productCategory":"Suits"}
{"uniqueName":"/Lotus/Powersuits/Volt/VoltPrime","name":"Volt Prime","parentName":"/Lotus/Powersuits/Volt/VoltBaseSuit","description":"A glorious warrior from the past, Volt Prime features the same abilities as Volt but with unique mod polarities for greater customization.","health":270,"shield":455,"armor":135,"stamina":3,"power":200,"codexSecret":false,"masteryReq":0,"sprintSpeed":1,"passiveDescription":"Grounded movement generates an electrical charge building up |DAMAGE| Damage per meter that is unleashed with the next attack.","abilities":[{"abilityUniqueName":"/Lotus/Powersuits/Volt/Abilities/ShockAbility","abilityName":"Shock","description":"Launch a voltaic projectile that stuns and damages its target. A chain of electricity extends from the target to shock nearby enemies."},{"abilityUniqueName":"/Lotus/Powersuits/Volt/Abilities/SpeedAbility","abilityName":"Speed","description":"Embody an electric current. Volt and his allies receive a brief movement speed boost and a reload speed buff."},{"abilityUniqueName":"/Lotus/Powersuits/Volt/Abilities/ShieldAbility","abilityName":"Electric Shield","description":"Volt deploys an electric shield that blocks enemy fire and adds <DT_ELECTRICITY_COLOR>Electricity Damage to projectiles.\r\n \r\nHOLD to equip the shield for mobile cover."},{"abilityUniqueName":"/Lotus/Powersuits/Volt/Abilities/OverLoadAbility","abilityName":"Discharge","description":"Volt discharges the electricity that courses through him. The shockwave paralyzes and damages nearby enemies. Enemies on the edge of the shockwave are stunned."}],"productCategory":"Suits"}
```

### Export-plus baseline (corresponding records)

The baseline's corresponding records have the same stable stats but replace
DE text with dictionary keys and add `icon`, `longDescription`, `variantType`,
`additionalItems`, `nemesisUpgradeTag`, `platinumCost`, and timestamps. Its
ability objects use `uniqueName`, `name`, `description`, plus presentation and
energy fields. These two excerpts are verbatim from the runtime file:

```json
{"uniqueName":"/Lotus/Powersuits/Excalibur/Excalibur","name":"/Lotus/Language/Suits/ExcaliburName","description":"/Lotus/Language/Suits/ExcaliburDesc","icon":"/Lotus/Interface/Icons/StoreIcons/Warframes/Excalibur.png","health":270,"shield":270,"armor":240,"stamina":3,"power":100,"codexSecret":false,"masteryReq":0,"sprintSpeed":1,"passiveDescription":"/Lotus/Language/Suits/ExcaliburPassiveAbility","exalted":["/Lotus/Powersuits/Excalibur/DoomSword"],"abilities":[{"uniqueName":"/Lotus/Powersuits/Excalibur/Abilities/SlashDashNewAbility","name":"/Lotus/Language/Suits/SlashDashAbilityName","description":"/Lotus/Language/Suits/SlashDashAbilityDesc","icon":"/Lotus/Interface/Icons/Abilities/Power04.png","energyRequiredToActivate":25}],"productCategory":"Suits","variantType":"VT_NORMAL","additionalItems":["/Lotus/Upgrades/Skins/Excalibur/ExcaliburHelmet","/Lotus/Powersuits/Excalibur/DoomSword"],"nemesisUpgradeTag":"InnateElectricityDamage","platinumCost":75,"introducedAt":1351177200}
{"uniqueName":"/Lotus/Powersuits/Volt/VoltPrime","name":"/Lotus/Language/Primes/VoltPrimeName","description":"/Lotus/Language/Primes/VoltPrimeDesc","icon":"/Lotus/Interface/Icons/StoreIcons/Primes/VoltPrime.png","health":270,"shield":455,"armor":135,"stamina":3,"power":200,"codexSecret":false,"masteryReq":0,"sprintSpeed":1,"passiveDescription":"/Lotus/Language/Suits/VoltPrimePassiveAbility","abilities":[{"uniqueName":"/Lotus/Powersuits/Volt/Abilities/ShockAbility","name":"/Lotus/Language/Suits/ShockAbilityName","description":"/Lotus/Language/Suits/ShockAbilityDesc","icon":"/Lotus/Interface/Icons/Abilities/VoltChainLightning.png","energyRequiredToActivate":15}],"productCategory":"Suits","variantType":"VT_PRIME","additionalItems":["/Lotus/Upgrades/Skins/Volt/VoltPrimeHelmet"],"nemesisUpgradeTag":"InnateElectricityDamage","platinumCost":75,"excludeFromMarket":true,"introducedAt":1427220112}
```

The app baseline has no `/Lotus/Powersuits/Duelist/Duelist` record, so Narin
is represented in the shadow report as DE-only rather than fabricated into a
baseline sample. The report's mismatch examples preserve the first ten
values of every differing field.

## Hybrid merge

The Preview cut-over keeps the mirror record as the base. For a record present
in both sources, `name` and `description` remain the mirror's localization
keys; DE replaces only the app-consumed factual fields when the adapter
provides them: `parentName`, `health`, `shield`, `armor`, `stamina`, `power`,
`codexSecret`, `masteryReq`, `sprintSpeed`, `exalted`, and `productCategory`.
`sprintSpeed` is rounded to six decimal places. Passive and ability text is not
merged because the app does not read those Warframe fields at runtime. DE-only
records are added with DE's literal English text, and mirror-only records are
always retained. Both Node and Rust use sorted unique-name/field output and
report every changed field per record.

The Rust refresh is non-fatal and once-per-24-hours: it resolves
`ExportWarframes_en.json` from DE's compressed manifest index, requires HTTP
success, valid JSON, at least 100 records, and at least 80% of the mirror
count, then writes the DE asset and merged runtime file atomically. Any failure
leaves the validated mirror in place.

## Shadow result

The real run produced `/tmp/de-shadow/warframes-report.json`:

- DE 127; app 125; comparable 125.
- DE-only: Narin (`/Lotus/Powersuits/Duelist/Duelist`) and Citrine Prime
  (`/Lotus/Powersuits/Geode/CitrinePrime`). App-only: none.
- Systematic differences are localized `name`, `description`, and
  `passiveDescription` values, plus normalized-vs-presentation `abilities`.
  Smaller differences occur in Hydroid shield/armor and 14 sprint speeds;
  nine `exalted` relationships differ.
- The app-side change required later is an explicit merge of DE adapter data
  with the existing dictionary/image/commerce layers. This slice changes no
  app runtime or bundled data.

## Remaining category work

This adapter is Warframes-only. Weapons, customs, relics, resources, and
upgrades each need their own adapter and merge rules before adoption. Literal
description fallbacks remain absent for resource/relic/gear/song descriptions
in `src/lib/inventoryParser.js` around lines 2209, 2499, 2518, 2616, and
2683, and in `src-tauri/src/weapon_i18n.rs` around line 128. They are
intentionally not patched in this slice.
