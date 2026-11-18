// The groups and search words of /styles/icons/ (CSS-418). The glyph names
// come from the shipped SVG set (./icons.js); this file only sorts them and
// adds the words a reader types when the glyph's name is not the one they
// think of ("reload" for `refresh`, "arrow" for `north_east`). A shipped glyph
// that no group lists lands in "Other", so a new glyph is never missing from
// the page; test/icon-groups.test.js fails until it is given a group.
const shipped = require('./icons.js');

const GROUPS = [
  ['arrows', 'Arrows and navigation', [
    'arrow_back', 'arrow_forward', 'arrow_right_alt', 'arrow_upward', 'arrow_downward',
    'arrow_outward', 'north_east', 'south_west', 'arrow_drop_down', 'arrow_drop_up',
    'keyboard_arrow_down', 'keyboard_arrow_up', 'chevron_left', 'chevron_right',
    'first_page', 'last_page', 'subdirectory_arrow_right', 'swap_horiz', 'read_more',
    'open_in_new', 'login', 'logout', 'menu', 'more_horiz', 'more_vert', 'fullscreen',
    'fullscreen_exit', 'explore',
  ]],
  ['actions', 'Actions', [
    'add', 'remove', 'edit', 'save', 'undo', 'delete', 'download', 'upload', 'print',
    'share', 'link', 'content_copy', 'attach_file', 'search', 'filter_alt', 'filter_list',
    'sort', 'unfold_more', 'filter_alt_off', 'filter_list_off', 'tune', 'view_column',
    'table_rows', 'drag_indicator', 'settings', 'refresh', 'sync', 'restart_alt', 'send', 'close', 'check',
    'visibility', 'visibility_off', 'lock', 'key', 'key_vertical', 'bookmark',
    'bookmark_star', 'keep', 'toggle_on', 'toggle_off', 'radio_button_checked',
    'radio_button_unchecked', 'format_paint', 'brush',
  ]],
  ['files', 'Files and documents', [
    'description', 'draft', 'edit_document', 'folder', 'folder_open', 'inbox',
    'inventory_2', 'receipt', 'receipt_long', 'code', 'function',
  ]],
  ['people', 'People', [
    'person', 'person_add', 'account_circle', 'group', 'group_add', 'groups',
    'family_group', 'family_restroom', 'handshake', 'waving_hand', 'record_voice_over',
    'psychology', 'cognition', 'smart_toy', 'pets',
  ]],
  ['communication', 'Communication', [
    'mail', 'mark_email_unread', 'drafts', 'chat', 'mark_chat_unread', 'comment', 'sms', 'forum',
    'campaign', 'notifications', 'notifications_active', 'rss_feed',
  ]],
  ['money', 'Money and business', [
    'attach_money', 'payments', 'credit_card', 'currency_exchange', 'savings',
    'account_balance', 'balance', 'business_center', 'work', 'corporate_fare', 'home_work',
    'storefront', 'real_estate_agent', 'warehouse', 'local_shipping',
  ]],
  ['data', 'Charts and data', [
    'bar_chart', 'show_chart', 'insights', 'query_stats', 'trending_up', 'trending_flat',
    'trending_down',
    'dashboard', 'grid_view', 'auto_awesome_mosaic', 'account_tree', 'hub', 'speed', 'target',
  ]],
  ['status', 'Status', [
    'check_circle', 'task_alt', 'error', 'warning', 'info', 'help', 'priority_high',
    'report', 'new_releases', 'cancel', 'block', 'remove_circle', 'pause_circle', 'pending',
    'hourglass_empty', 'cloud_off', 'sync_problem', 'flag',
    'flag_2', 'star', 'star_half', 'star_fill', 'favorite', 'trip_origin',
  ]],
  ['time', 'Time', [
    'schedule', 'history', 'update', 'event', 'event_available', 'event_repeat', 'calendar_today',
    'date_range', 'bedtime',
  ]],
  ['objects', 'Objects', [
    'bolt', 'lightbulb', 'lightbulb_2', 'diamond', 'chess_knight', 'rocket_launch',
    'auto_awesome', 'construction', 'recycling', 'flight', 'directions_car', 'restaurant',
    'festival', 'movie', 'music_note', 'speaker',
  ]],
];

const WORDS = {
  north_east: 'arrow up right', south_west: 'arrow down left', arrow_outward: 'up right external',
  arrow_upward: 'up sort', arrow_downward: 'down sort', arrow_back: 'left previous',
  arrow_forward: 'right next', arrow_right_alt: 'right next',
  arrow_drop_down: 'triangle caret delta down', arrow_drop_up: 'triangle caret delta up',
  keyboard_arrow_down: 'chevron caret expand', keyboard_arrow_up: 'chevron caret collapse',
  chevron_left: 'arrow previous back', chevron_right: 'arrow next forward',
  first_page: 'arrow pagination start', last_page: 'arrow pagination end',
  subdirectory_arrow_right: 'nested reply', swap_horiz: 'arrow exchange switch',
  read_more: 'arrow continue', open_in_new: 'arrow external link window',
  login: 'arrow sign in enter', logout: 'arrow sign out exit', menu: 'hamburger',
  more_horiz: 'dots ellipsis menu', more_vert: 'dots kebab menu',
  fullscreen: 'expand maximize', fullscreen_exit: 'collapse minimize', explore: 'compass',
  add: 'plus new create', remove: 'minus', edit: 'pencil change', save: 'disk floppy',
  undo: 'back revert', delete: 'trash bin remove', download: 'save export',
  upload: 'import', print: 'printer paper', link: 'url chain',
  content_copy: 'duplicate clipboard', attach_file: 'paperclip attachment',
  search: 'magnifier find', filter_alt: 'funnel', filter_list: 'funnel lines',
  sort: 'order lines', unfold_more: 'sort order arrows column', filter_alt_off: 'funnel clear reset',
  filter_list_off: 'funnel clear reset', view_column: 'columns table layout', table_rows: 'table density list',
  drag_indicator: 'handle reorder move grip', tune: 'filter sliders options', settings: 'gear cog options',
  refresh: 'reload update', sync: 'reload refresh update', restart_alt: 'reload refresh reset',
  close: 'x cancel cross', check: 'tick done ok', visibility: 'eye show view',
  visibility_off: 'eye hide hidden', lock: 'secure private closed', key: 'password access',
  key_vertical: 'password access', keep: 'pin', bookmark_star: 'favorite',
  toggle_on: 'switch', toggle_off: 'switch', radio_button_checked: 'circle option',
  radio_button_unchecked: 'circle option empty', format_paint: 'roller style', brush: 'paint style',
  description: 'file document text', draft: 'file document blank', edit_document: 'file pencil',
  inbox: 'tray', inventory_2: 'box archive stock', receipt: 'bill invoice', receipt_long: 'bill invoice',
  code: 'brackets developer', function: 'fx formula',
  person: 'user account', person_add: 'user invite', account_circle: 'user avatar profile',
  group: 'people users team', group_add: 'people users invite', groups: 'people users team',
  family_group: 'people', family_restroom: 'people', handshake: 'deal partner',
  waving_hand: 'hello greeting', record_voice_over: 'speak voice', psychology: 'brain mind',
  cognition: 'brain mind', smart_toy: 'robot bot ai', pets: 'paw animal',
  mail: 'email letter envelope', drafts: 'email letter open', chat: 'message bubble',
  sms: 'message bubble', forum: 'message bubbles discussion', campaign: 'megaphone announce',
  notifications: 'bell alert', notifications_active: 'bell alert ringing new',
  mark_email_unread: 'email letter new message', mark_chat_unread: 'message bubble new', comment: 'message bubble note', rss_feed: 'subscribe',
  attach_money: 'dollar price', payments: 'cash money', credit_card: 'payment bank',
  currency_exchange: 'money rate', savings: 'piggy bank money', account_balance: 'bank institution',
  balance: 'scales law', business_center: 'briefcase', work: 'briefcase job',
  corporate_fare: 'office building company', home_work: 'office building house',
  storefront: 'shop store', real_estate_agent: 'house property', warehouse: 'stock storage',
  local_shipping: 'truck delivery',
  bar_chart: 'graph columns', show_chart: 'graph line', insights: 'graph analytics',
  query_stats: 'graph analytics search', trending_up: 'arrow growth rise',
  trending_down: 'arrow fall decline', trending_flat: 'arrow same steady no change', dashboard: 'layout panels', grid_view: 'tiles layout',
  auto_awesome_mosaic: 'tiles layout', account_tree: 'structure hierarchy', hub: 'network nodes',
  speed: 'gauge meter', target: 'goal aim',
  check_circle: 'ok done success', task_alt: 'ok done success', error: 'alert exclamation danger',
  warning: 'alert triangle caution', info: 'about note', help: 'question', priority_high: 'exclamation urgent',
  new_releases: 'badge new verified', block: 'forbidden ban stop', remove_circle: 'minus stop',
  pause_circle: 'hold wait', report: 'alert exclamation octagon critical', cancel: 'x cross failed error circle',
  pending: 'dots wait progress circle', cloud_off: 'offline no connection data', sync_problem: 'reload stale failed alert', hourglass_empty: 'wait pending loading', flag: 'mark report',
  flag_2: 'mark report', star: 'rating favorite', star_half: 'rating', star_fill: 'rating solid favorite',
  favorite: 'heart like', trip_origin: 'circle dot ring',
  schedule: 'clock time', update: 'clock fresh refreshed time', date_range: 'calendar period', history: 'clock back past', event: 'calendar date',
  event_available: 'calendar date done', event_repeat: 'calendar date recurring',
  calendar_today: 'date day', bedtime: 'moon night dark',
  bolt: 'lightning flash fast', lightbulb: 'idea', lightbulb_2: 'idea', diamond: 'gem value',
  chess_knight: 'strategy horse', rocket_launch: 'start launch', auto_awesome: 'sparkle magic ai',
  construction: 'tools work in progress', recycling: 'reuse', flight: 'plane travel',
  directions_car: 'auto vehicle', restaurant: 'food fork knife', festival: 'tent event',
  movie: 'film video', music_note: 'audio sound', speaker: 'audio sound',
};

const entry = (name) => ({ name, words: WORDS[name] || '' });
const listed = new Set(GROUPS.flatMap(([, , names]) => names));
const groups = GROUPS.map(([id, title, names]) => ({
  id,
  title,
  icons: names.filter((name) => shipped.includes(name)).map(entry),
})).filter((group) => group.icons.length);

const rest = shipped.filter((name) => !listed.has(name));
if (rest.length) groups.push({ id: 'other', title: 'Other', icons: rest.map(entry) });

module.exports = groups;
