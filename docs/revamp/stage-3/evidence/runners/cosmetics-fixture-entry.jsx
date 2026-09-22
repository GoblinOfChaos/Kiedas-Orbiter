import React from 'react';
import '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/index.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/jetbrains-mono/400.css';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import Cosmetics from '/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src/screens/Cosmetics.jsx';
import Before from './Cosmetics.before.jsx';
import {setPreview,t} from './mock.js';

window.fixture={calls:[],errors:[],t,locale:'en'};
window.addEventListener('error',event=>window.fixture.errors.push(event.message));

const dict={
  '/Name/AlphaFrame':'Alpha Frame','/Name/AlphaSkin':'Alpha Noble Skin','/Name/Primary':'Braton Test Skin',
  '/Name/Secondary':'Lato Test Skin','/Name/Melee':'Skana Test Skin','/Name/Archwing':'Odonata Test Skin',
  '/Name/Sentinel':'Carrier Test Skin','/Name/Syandana':'Test Syandana','/Name/Armor':'Test Armor',
  '/Name/Animation':'Test Animation','/Name/Other':'Operator Test Skin','/Name/Sigil':'Test Sigil',
  '/Name/IconlessOwned':'Owned Iconless Skin','/Name/Emote':'Test Emote'
};
const skin=(name,icon)=>({name,icon});
const ExportCustoms={
  '/Lotus/Upgrades/Skins/Alpha/AlphaSkin':skin('/Name/AlphaSkin','/Lotus/Interface/Icons/Store/Skins/Alpha.png'),
  '/Lotus/Upgrades/Skins/Braton/PrimarySkin':skin('/Name/Primary','/Lotus/Interface/Icons/StoreIcons/Weapons/PrimaryWeapons/Braton.png'),
  '/Lotus/Upgrades/Skins/Lato/SecondarySkin':skin('/Name/Secondary','/Lotus/Interface/Icons/StoreIcons/Weapons/SecondaryWeapons/Lato.png'),
  '/Lotus/Upgrades/Skins/Skana/MeleeSkin':skin('/Name/Melee','/Lotus/Interface/Icons/StoreIcons/Weapons/MeleeWeapons/Skana.png'),
  '/Lotus/Upgrades/Skins/Archwing/OdonataSkin':skin('/Name/Archwing','/Lotus/Interface/Icons/Store/Archwing.png'),
  '/Lotus/Upgrades/Skins/Sentinel/CarrierSkin':skin('/Name/Sentinel','/Lotus/Interface/Icons/Store/Sentinel.png'),
  '/Lotus/Upgrades/Skins/Scarves/TestScarf':skin('/Name/Syandana','/Lotus/Interface/Icons/Store/Scarf.png'),
  '/Lotus/Upgrades/Skins/Armor/TestArmor':skin('/Name/Armor','/Lotus/Interface/Icons/Store/Armor.png'),
  '/Lotus/Upgrades/Skins/AnimationSets/TestAnimation':skin('/Name/Animation','/Lotus/Interface/Icons/Store/Animation.png'),
  '/Lotus/Upgrades/Skins/Operator/TestSkin':skin('/Name/Other','/Lotus/Interface/Icons/Store/Operator.png'),
  '/Lotus/Upgrades/Skins/Sigils/TestSigil':skin('/Name/Sigil','/Lotus/Interface/Icons/Store/Sigil.png'),
  '/Lotus/Upgrades/Skins/Debug/Iconless':{name:'/Name/Iconless'},
  '/Lotus/Upgrades/Skins/Debug/IconlessOwned':{name:'/Name/IconlessOwned'}
};
const WI_Glyphs={
  '/Lotus/Types/StoreItems/AvatarImages/TestGlyph':{name:'Test Glyph',icon:'/Lotus/Interface/Icons/Glyphs/Test.png'},
  '/Lotus/Types/StoreItems/AvatarImages/HiddenGlyph':{name:'Hidden Glyph',icon:'/Lotus/Interface/Icons/Glyphs/Hidden.png',codexSecret:true},
  '/Lotus/Types/StoreItems/AvatarImages/OwnedHiddenGlyph':{name:'Owned Hidden Glyph',icon:'/Lotus/Interface/Icons/Glyphs/OwnedHidden.png',excludeFromCodex:true}
};
const parents=[
  '/Lotus/Types/Items/ShipDecos/ShipDecoItem','/Lotus/Types/Items/ShipDecos/BaseFishTrophy',
  '/Lotus/Types/Items/ShipDecos/ChildDrawingBase','/Lotus/Types/Items/ShipDecos/LotusShawzinPlayableBase',
  '/Lotus/Types/Items/ShipDecos/Plushies/PlushyThumper','/Lotus/Types/Items/ShipDecos/Vignettes/Enemies/ShipDecoItem',
  '/Lotus/Types/Items/ShipDecos/InstrumentDecoItem','/Lotus/Types/Items/ShipDecorationLayerItem'
];
const ExportResources={};
parents.forEach((parentName,index)=>{const key='/Lotus/Types/Items/ShipDecos/Synthetic'+index;const name='/Name/Decoration'+index;dict[name]='Decoration '+String(index).padStart(2,'0');ExportResources[key]={name,parentName,icon:'/Lotus/Interface/Icons/Store/Decoration'+index+'.png'};});
for(let index=0;index<125;index++){const key='/Lotus/Types/StoreItems/AvatarImages/PageGlyph'+String(index).padStart(3,'0');WI_Glyphs[key]={name:'Page Glyph '+String(index).padStart(3,'0'),icon:'/Lotus/Interface/Icons/Glyphs/Page'+index+'.png'};}
const ExportFlavour={'/Lotus/Types/Items/Emotes/TestEmote':{name:'/Name/Emote',icon:'/Lotus/Interface/Icons/Store/Emote.png'},'/Lotus/Types/Items/NotEmotes/Excluded':{name:'Excluded Flavour'}};
const exportData={dict,ExportWarframes:{'/Lotus/Powersuits/Alpha/Alpha':{productCategory:'Suits',name:'/Name/AlphaFrame'},'/Lotus/Powersuits/Archwing/Archwing':{productCategory:'SpaceSuits',name:'Archwing'}},ExportCustoms,WI_Glyphs,ExportResources,ExportFlavour,ExportImages:{'/Lotus/Interface/Icons/Store/Skins/Alpha.png':{contentHash:'hash-alpha'}}};
const rawInventory={
 WeaponSkins:[{ItemType:'/Lotus/Upgrades/Skins/Alpha/AlphaSkin'},{ItemType:'/StoreItems/Lotus/Upgrades/Skins/Debug/IconlessOwned'}],
 FlavourItems:[{ItemType:'/Lotus/Types/Items/Emotes/TestEmote'}],
 MiscItems:[{ItemType:'/StoreItems/Lotus/Types/StoreItems/AvatarImages/OwnedHiddenGlyph'}],
 ShipDecorations:[{ItemType:'/Lotus/Types/Items/ShipDecos/Synthetic0'}]
};
const emptyMap=()=>new Map();
function monitor(mode='populated'){
 return {
  exportData:mode==='loading'?null:exportData,rawInventory:mode==='empty'?{}:rawInventory,EI:{},nameToImage:{},
  dropIndex:{},recipeResultIndex:emptyMap(),exaltedWeaponIndex:emptyMap(),marketIndex:emptyMap(),alwaysAvailableIndex:emptyMap(),bundleIndex:emptyMap(),syndicateIndex:emptyMap(),wikiSigilIndex:emptyMap(),wikiVendorIndex:emptyMap(),wikiTennoGenIndex:emptyMap(),wikiBaroIndex:emptyMap(),wikiBlueprintIndex:emptyMap(),wikiResearchIndex:emptyMap(),wikiResourceIndex:emptyMap(),wikiPageAcquisitionIndex:emptyMap(),wikiAcquisitionStatusIndex:emptyMap(),exportVendorIndex:emptyMap(),glyphSupplementIndex:emptyMap(),exportComponentIndex:emptyMap()
 };
}
const root=createRoot(document.getElementById('root'));
window.fixture.render=({variant='preview',mode='populated',locale='en'}={})=>{
 flushSync(()=>root.render(null));window.fixture.calls=[];window.fixture.errors=[];window.fixture.locale=locale;window.fixture.mode=mode;setPreview(variant==='preview');window.fixture.monitor=monitor(mode);flushSync(()=>root.render(variant==='before'?<Before/>:<Cosmetics/>));
};
window.fixture.render();
