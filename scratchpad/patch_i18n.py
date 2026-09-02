import json, collections

FILES_DIR = 'src/lib/i18n'
LOCALES = ['en','de','es','fr','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

# key -> {locale: value}
DATA = {
  # Maps.jsx
  'maps.switch_to_labeled': {
    'en': 'Switch to labeled map',
    'de': 'Zur beschrifteten Karte wechseln',
    'es': 'Cambiar a mapa etiquetado',
    'fr': 'Passer à la carte étiquetée',
    'it': 'Passa alla mappa etichettata',
    'ja': 'ラベル付きマップに切り替え',
    'ko': '레이블이 있는 지도로 전환',
    'pl': 'Przełącz na mapę z etykietami',
    'pt': 'Mudar para mapa rotulado',
    'ru': 'Переключить на карту с подписями',
    'tc': '切換至標示地圖',
    'th': 'สลับไปยังแผนที่ที่มีป้ายกำกับ',
    'tr': 'Etiketli haritaya geç',
    'uk': 'Перемкнути на карту з підписами',
    'zh': '切换至标注地图',
  },
  'maps.switch_to_raw': {
    'en': 'Switch to raw terrain map',
    'de': 'Zur unbearbeiteten Geländekarte wechseln',
    'es': 'Cambiar a mapa de terreno sin editar',
    'fr': 'Passer à la carte du terrain brute',
    'it': 'Passa alla mappa del terreno grezza',
    'ja': '生の地形マップに切り替え',
    'ko': '원본 지형 지도로 전환',
    'pl': 'Przełącz na surową mapę terenu',
    'pt': 'Mudar para mapa de terreno bruto',
    'ru': 'Переключить на карту местности без подписей',
    'tc': '切換至原始地形地圖',
    'th': 'สลับไปยังแผนที่ภูมิประเทศดิบ',
    'tr': 'Ham arazi haritasına geç',
    'uk': 'Перемкнути на необроблену карту місцевості',
    'zh': '切换至原始地形地图',
  },
  'maps.config_default_name': {
    'en': 'Config {n}',
    'de': 'Konfiguration {n}',
    'es': 'Configuración {n}',
    'fr': 'Config {n}',
    'it': 'Configurazione {n}',
    'ja': '設定 {n}',
    'ko': '설정 {n}',
    'pl': 'Konfiguracja {n}',
    'pt': 'Configuração {n}',
    'ru': 'Конфигурация {n}',
    'tc': '設定 {n}',
    'th': 'การตั้งค่า {n}',
    'tr': 'Yapılandırma {n}',
    'uk': 'Конфігурація {n}',
    'zh': '配置 {n}',
  },
  'maps.game_markers_name': {
    'en': 'Game Markers',
    'de': 'Spielmarkierungen',
    'es': 'Marcadores del juego',
    'fr': 'Marqueurs du jeu',
    'it': 'Marcatori di gioco',
    'ja': 'ゲーム内マーカー',
    'ko': '게임 마커',
    'pl': 'Znaczniki z gry',
    'pt': 'Marcadores do jogo',
    'ru': 'Игровые маркеры',
    'tc': '遊戲標記',
    'th': 'เครื่องหมายในเกม',
    'tr': 'Oyun İşaretleri',
    'uk': 'Ігрові маркери',
    'zh': '游戏标记',
  },
  'maps.game_markers_desc': {
    'en': 'Imported in-game custom markers',
    'de': 'Importierte benutzerdefinierte Spielmarkierungen',
    'es': 'Marcadores personalizados del juego importados',
    'fr': 'Marqueurs personnalisés du jeu importés',
    'it': 'Marcatori personalizzati di gioco importati',
    'ja': 'インポートしたゲーム内カスタムマーカー',
    'ko': '가져온 게임 내 사용자 지정 마커',
    'pl': 'Zaimportowane niestandardowe znaczniki z gry',
    'pt': 'Marcadores personalizados do jogo importados',
    'ru': 'Импортированные игровые пользовательские маркеры',
    'tc': '已匯入的遊戲內自訂標記',
    'th': 'เครื่องหมายกำหนดเองในเกมที่นำเข้า',
    'tr': 'İçe aktarılan oyun içi özel işaretler',
    'uk': 'Імпортовані ігрові користувацькі маркери',
    'zh': '已导入的游戏内自定义标记',
  },
  'maps.visible': {
    'en': 'Visible', 'de': 'Sichtbar', 'es': 'Visible', 'fr': 'Visible', 'it': 'Visibile',
    'ja': '表示', 'ko': '표시됨', 'pl': 'Widoczne', 'pt': 'Visível', 'ru': 'Видимо',
    'tc': '顯示', 'th': 'มองเห็นได้', 'tr': 'Görünür', 'uk': 'Видимо', 'zh': '可见',
  },
  'maps.hidden': {
    'en': 'Hidden', 'de': 'Ausgeblendet', 'es': 'Oculto', 'fr': 'Masqué', 'it': 'Nascosto',
    'ja': '非表示', 'ko': '숨김', 'pl': 'Ukryte', 'pt': 'Oculto', 'ru': 'Скрыто',
    'tc': '隱藏', 'th': 'ซ่อนอยู่', 'tr': 'Gizli', 'uk': 'Приховано', 'zh': '隐藏',
  },
  'maps.adding_ellipsis': {
    'en': 'Adding...', 'de': 'Wird hinzugefügt…', 'es': 'Añadiendo…', 'fr': 'Ajout…', 'it': 'Aggiunta in corso…',
    'ja': '追加中…', 'ko': '추가 중…', 'pl': 'Dodawanie…', 'pt': 'Adicionando…', 'ru': 'Добавление…',
    'tc': '新增中…', 'th': 'กำลังเพิ่ม…', 'tr': 'Ekleniyor…', 'uk': 'Додавання…', 'zh': '正在添加…',
  },
  'maps.marker_button': {
    'en': 'Marker', 'de': 'Markierung', 'es': 'Marcador', 'fr': 'Marqueur', 'it': 'Marcatore',
    'ja': 'マーカー', 'ko': '마커', 'pl': 'Znacznik', 'pt': 'Marcador', 'ru': 'Маркер',
    'tc': '標記', 'th': 'เครื่องหมาย', 'tr': 'İşaret', 'uk': 'Маркер', 'zh': '标记',
  },
  'maps.delete_config_warning': {
    'en': ' All markers and paths in this configuration will be removed.',
    'de': ' Alle Markierungen und Pfade in dieser Konfiguration werden entfernt.',
    'es': ' Se eliminarán todos los marcadores y rutas de esta configuración.',
    'fr': ' Tous les marqueurs et chemins de cette configuration seront supprimés.',
    'it': ' Tutti i marcatori e i percorsi di questa configurazione verranno rimossi.',
    'ja': ' この設定内のすべてのマーカーとパスが削除されます。',
    'ko': ' 이 설정의 모든 마커와 경로가 삭제됩니다.',
    'pl': ' Wszystkie znaczniki i ścieżki w tej konfiguracji zostaną usunięte.',
    'pt': ' Todos os marcadores e caminhos desta configuração serão removidos.',
    'ru': ' Все маркеры и пути в этой конфигурации будут удалены.',
    'tc': ' 此設定中的所有標記和路徑都將被移除。',
    'th': ' เครื่องหมายและเส้นทางทั้งหมดในการตั้งค่านี้จะถูกลบ',
    'tr': ' Bu yapılandırmadaki tüm işaretler ve yollar kaldırılacak.',
    'uk': ' Усі маркери та шляхи в цій конфігурації буде видалено.',
    'zh': ' 此配置中的所有标记和路径都将被移除。',
  },
  'maps.cycle_expired': {
    'en': 'expired', 'de': 'abgelaufen', 'es': 'expirado', 'fr': 'expiré', 'it': 'scaduto',
    'ja': '終了', 'ko': '만료됨', 'pl': 'wygasło', 'pt': 'expirado', 'ru': 'истекло',
    'tc': '已過期', 'th': 'หมดอายุ', 'tr': 'süresi doldu', 'uk': 'минуло', 'zh': '已过期',
  },
  'maps.config_fallback': {
    'en': 'Config', 'de': 'Konfiguration', 'es': 'Configuración', 'fr': 'Config', 'it': 'Configurazione',
    'ja': '設定', 'ko': '설정', 'pl': 'Konfiguracja', 'pt': 'Configuração', 'ru': 'Конфигурация',
    'tc': '設定', 'th': 'การตั้งค่า', 'tr': 'Yapılandırma', 'uk': 'Конфігурація', 'zh': '配置',
  },

  # Inventory.jsx
  'ui.inventory.tab_arcanes': {
    'en': 'Arcanes', 'de': 'Arkana', 'es': 'Arcanos', 'fr': 'Arcanes', 'it': 'Arcani',
    'ja': 'アルカナ', 'ko': '아르카나', 'pl': 'Arkana', 'pt': 'Arcanos', 'ru': 'Арканы',
    'tc': '奧秘', 'th': 'อาร์เคน', 'tr': 'Arkana', 'uk': 'Аркани', 'zh': '奥秘',
  },
  'ui.inventory.tab_peely_pix': {
    'en': 'Peely Pix', 'de': 'Peely Pix', 'es': 'Peely Pix', 'fr': 'Peely Pix', 'it': 'Peely Pix',
    'ja': 'Peely Pix', 'ko': 'Peely Pix', 'pl': 'Peely Pix', 'pt': 'Peely Pix', 'ru': 'Peely Pix',
    'tc': 'Peely Pix', 'th': 'Peely Pix', 'tr': 'Peely Pix', 'uk': 'Peely Pix', 'zh': 'Peely Pix',
  },
  'ui.inventory.tab_consumables': {
    'en': 'Consumables', 'de': 'Verbrauchsgüter', 'es': 'Consumibles', 'fr': 'Consommables', 'it': 'Consumabili',
    'ja': '消費アイテム', 'ko': '소모품', 'pl': 'Materiały eksploatacyjne', 'pt': 'Consumíveis', 'ru': 'Расходники',
    'tc': '消耗品', 'th': 'ของใช้สิ้นเปลือง', 'tr': 'Sarf Malzemeleri', 'uk': 'Витратні матеріали', 'zh': '消耗品',
  },
  'ui.inventory.tab_landing_craft': {
    'en': 'Landing Craft', 'de': 'Landungsschiff', 'es': 'Nave de Aterrizaje', 'fr': "Vaisseau d'atterrissage", 'it': 'Nave da sbarco',
    'ja': 'ランディングクラフト', 'ko': '착륙선', 'pl': 'Statek Desantowy', 'pt': 'Nave de Pouso', 'ru': 'Десантный корабль',
    'tc': '登陸艇', 'th': 'ยานลงจอด', 'tr': 'İniş Aracı', 'uk': 'Десантний корабель', 'zh': '登陆艇',
  },
  'ui.inventory.search_placeholder': {
    'en': 'Search {tab}...', 'de': '{tab} durchsuchen…', 'es': 'Buscar {tab}…', 'fr': 'Rechercher {tab}…', 'it': 'Cerca {tab}…',
    'ja': '{tab}を検索…', 'ko': '{tab} 검색…', 'pl': 'Szukaj: {tab}…', 'pt': 'Pesquisar {tab}…', 'ru': 'Поиск: {tab}…',
    'tc': '搜尋{tab}…', 'th': 'ค้นหา {tab}…', 'tr': '{tab} ara…', 'uk': 'Пошук: {tab}…', 'zh': '搜索{tab}…',
  },
  'ui.inventory.displaying_items': {
    'en': 'Displaying {shown} / {total} items',
    'de': 'Zeige {shown} / {total} Objekte',
    'es': 'Mostrando {shown} / {total} objetos',
    'fr': 'Affichage de {shown} / {total} objets',
    'it': 'Visualizzazione di {shown} / {total} oggetti',
    'ja': '{shown} / {total} 件のアイテムを表示中',
    'ko': '{shown} / {total}개 항목 표시 중',
    'pl': 'Wyświetlanie {shown} / {total} przedmiotów',
    'pt': 'Exibindo {shown} / {total} itens',
    'ru': 'Показано {shown} / {total} предметов',
    'tc': '正在顯示 {shown} / {total} 個物品',
    'th': 'แสดง {shown} / {total} รายการ',
    'tr': '{shown} / {total} öğe gösteriliyor',
    'uk': 'Показано {shown} / {total} предметів',
    'zh': '正在显示 {shown} / {total} 件物品',
  },
  'ui.inventory.set_singular': {
    'en': '{count} Set', 'de': '{count} Set', 'es': '{count} Set', 'fr': '{count} Set', 'it': '{count} Set',
    'ja': '{count} セット', 'ko': '{count}세트', 'pl': '{count} zestaw', 'pt': '{count} Set', 'ru': '{count} набор',
    'tc': '{count} 套', 'th': '{count} ชุด', 'tr': '{count} Set', 'uk': '{count} набір', 'zh': '{count} 套',
  },
  'ui.inventory.set_plural': {
    'en': '{count} Sets', 'de': '{count} Sets', 'es': '{count} Sets', 'fr': '{count} Sets', 'it': '{count} Set',
    'ja': '{count} セット', 'ko': '{count}세트', 'pl': '{count} zestawów', 'pt': '{count} Sets', 'ru': '{count} наборов',
    'tc': '{count} 套', 'th': '{count} ชุด', 'tr': '{count} Set', 'uk': '{count} наборів', 'zh': '{count} 套',
  },
  'ui.inventory.parts_progress': {loc: '{met}/{total} ({pct}%)' for loc in LOCALES},
  'ui.inventory.sell_1click_title': {
    'en': '1-Click Sell on Warframe.Market',
    'de': '1-Klick-Verkauf auf Warframe.Market',
    'es': 'Venta con 1 clic en Warframe.Market',
    'fr': 'Vente en 1 clic sur Warframe.Market',
    'it': 'Vendita in 1 clic su Warframe.Market',
    'ja': 'Warframe.Marketで1クリック販売',
    'ko': 'Warframe.Market에서 원클릭 판매',
    'pl': 'Sprzedaż jednym kliknięciem na Warframe.Market',
    'pt': 'Venda com 1 clique no Warframe.Market',
    'ru': 'Продажа в 1 клик на Warframe.Market',
    'tc': '在 Warframe.Market 一鍵出售',
    'th': 'ขายด้วยคลิกเดียวบน Warframe.Market',
    'tr': "Warframe.Market'te Tek Tıkla Sat",
    'uk': 'Продаж в 1 клік на Warframe.Market',
    'zh': '在 Warframe.Market 一键出售',
  },
  'ui.inventory.sell_button': {
    'en': 'Sell', 'de': 'Verkaufen', 'es': 'Vender', 'fr': 'Vendre', 'it': 'Vendi',
    'ja': '販売', 'ko': '판매', 'pl': 'Sprzedaj', 'pt': 'Vender', 'ru': 'Продать',
    'tc': '出售', 'th': 'ขาย', 'tr': 'Sat', 'uk': 'Продати', 'zh': '出售',
  },
  'ui.inventory.none_owned': {
    'en': 'None owned', 'de': 'Keine im Besitz', 'es': 'Ninguno en posesión', 'fr': 'Aucun possédé', 'it': 'Nessuno posseduto',
    'ja': '所持なし', 'ko': '보유 없음', 'pl': 'Brak w posiadaniu', 'pt': 'Nenhum possuído', 'ru': 'Нет в наличии',
    'tc': '尚未擁有', 'th': 'ไม่มีที่เป็นเจ้าของ', 'tr': 'Sahip olunmuyor', 'uk': 'Немає у власності', 'zh': '尚未拥有',
  },
  'ui.inventory.stat_endo': {
    'en': 'Endo', 'de': 'Endo', 'es': 'Endo', 'fr': 'Endo', 'it': 'Endo',
    'ja': 'エンド', 'ko': 'Endo', 'pl': 'Endo', 'pt': 'Endo', 'ru': 'Эндо',
    'tc': 'Endo', 'th': 'Endo', 'tr': 'Endo', 'uk': 'Ендо', 'zh': 'Endo',
  },
  'ui.inventory.stat_reactors': {
    'en': 'Reactors', 'de': 'Reaktoren', 'es': 'Reactores', 'fr': 'Réacteurs', 'it': 'Reattori',
    'ja': 'リアクター', 'ko': '리액터', 'pl': 'Reaktory', 'pt': 'Reatores', 'ru': 'Реакторы',
    'tc': '反應爐', 'th': 'รีแอคเตอร์', 'tr': 'Reaktörler', 'uk': 'Реактори', 'zh': '反应堆',
  },
  'ui.inventory.stat_catalysts': {
    'en': 'Catalysts', 'de': 'Katalysatoren', 'es': 'Catalizadores', 'fr': 'Catalyseurs', 'it': 'Catalizzatori',
    'ja': 'カタリスト', 'ko': '카탈리스트', 'pl': 'Katalizatory', 'pt': 'Catalisadores', 'ru': 'Катализаторы',
    'tc': '催化劑', 'th': 'ตัวเร่งปฏิกิริยา', 'tr': 'Katalizörler', 'uk': 'Каталізатори', 'zh': '催化剂',
  },

  # Notes.jsx
  'notes.duplicate_name_alert': {
    'en': 'A note with that name already exists',
    'de': 'Eine Notiz mit diesem Namen existiert bereits',
    'es': 'Ya existe una nota con ese nombre',
    'fr': 'Une note portant ce nom existe déjà',
    'it': 'Esiste già una nota con questo nome',
    'ja': 'その名前のノートは既に存在します',
    'ko': '해당 이름의 노트가 이미 존재합니다',
    'pl': 'Notatka o tej nazwie już istnieje',
    'pt': 'Já existe uma nota com esse nome',
    'ru': 'Заметка с таким именем уже существует',
    'tc': '已存在同名的筆記',
    'th': 'มีบันทึกชื่อนี้อยู่แล้ว',
    'tr': 'Bu isimde bir not zaten var',
    'uk': 'Нотатка з такою назвою вже існує',
    'zh': '已存在同名笔记',
  },
  'notes.new_note_name': {
    'en': 'New Note', 'de': 'Neue Notiz', 'es': 'Nueva nota', 'fr': 'Nouvelle note', 'it': 'Nuova nota',
    'ja': '新規ノート', 'ko': '새 메모', 'pl': 'Nowa notatka', 'pt': 'Nova nota', 'ru': 'Новая заметка',
    'tc': '新筆記', 'th': 'โน้ตใหม่', 'tr': 'Yeni not', 'uk': 'Нова нотатка', 'zh': '新建笔记',
  },
}

for loc in LOCALES:
    path = f'{FILES_DIR}/{loc}.json'
    with open(path, encoding='utf-8') as f:
        d = json.load(f, object_pairs_hook=collections.OrderedDict)
    ui = d['ui']
    for key, translations in DATA.items():
        val = translations.get(loc, translations['en'])
        ui[key] = val
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')

print('done')
