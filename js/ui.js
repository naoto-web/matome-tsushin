// ui.js — 画面の共通部品（文字の無害化・時刻表示・トースト・シート・ジャンル表示）
var UI = (function () {
  var state = { genres: [] };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // "2026-11-05 18:02:00" → 「5分前」「3時間前」「11/4 21:10」
  function relTime(s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T') + '+09:00');
    if (isNaN(d)) return '';
    var min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'いま';
    if (min < 60) return min + '分前';
    if (min < 24 * 60) return Math.floor(min / 60) + '時間前';
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  }

  var onSheetClose = null;
  function openSheet(html, onClose) {
    var sh = document.getElementById('sheet');
    sh.innerHTML = '<button class="close" data-close>×</button>' + html;
    sh.hidden = false;
    document.getElementById('sheetBack').hidden = false;
    sh.scrollTop = 0;
    onSheetClose = onClose || null;
    return sh;
  }
  function closeSheet() {
    document.getElementById('sheet').hidden = true;
    document.getElementById('sheetBack').hidden = true;
    var f = onSheetClose;
    onSheetClose = null;
    if (f) f();
  }
  document.addEventListener('click', function (e) {
    if (e.target.id === 'sheetBack' || e.target.hasAttribute('data-close')) closeSheet();
  });

  function genre(key) {
    for (var i = 0; i < state.genres.length; i++) if (state.genres[i].key === key) return state.genres[i];
    return { key: key, name: key || 'その他', emoji: '📌' };
  }

  function isCrocoCard(it) { return it.kind === '⭐' || it.kind === '🐟' || it.kind === '🎁'; }

  // 🎁の枠＝ふたり（映画・ドラマ・💑）／ひとり（漫画・YouTube）／曲。waku の無い古い行は ふたり
  function ipponWaku(it) { return (it.body || {}).waku || 'ふたり'; }
  function ipponLabel(it) {
    var w = ipponWaku(it);
    return w === '曲' ? '🎵 今週の1曲' : w === 'ひとり' ? '🎁 ひとりで見る1本' : '🎁 ふたりで見る1本';
  }
  // 「見た」の言い換え（記録の値は見た のまま）＝💑は行った／🎵は聴いた
  function ipponDid(it) {
    if (ipponWaku(it) === '曲') return '聴いた';
    return /デート/.test((it.body || {}).shurui || '') ? '行った' : '見た';
  }

  // 🎁の状態の一言＝見た／やめた／次の1本まで残る
  function ipponState(it) {
    var d = it.done || {};
    var vals = Object.keys(d).map(function (k) { return d[k]; });
    var did = ipponDid(it);
    if (vals.indexOf('見た') >= 0) return d['0'] === '見た' ? '✅ ' + did : '✅ 控えを' + did;
    if (d['0'] === 'やめた' && vals.length === 1) return 'やめた（開くと控えが2本あります）';
    if (vals.length) return 'やめた（次の1本の選び方に使います）';
    return it.read ? '次の1本が届くまでここに残ります' : '';
  }

  // カード1枚（ホーム・あとで見る・アーカイブで共通）
  function cardHtml(it, opt) {
    opt = opt || {};
    var g = genre(it.genre);
    var cls = (it.kind === '⭐' ? ' star' : it.kind === '🐟' ? ' uroko' : it.kind === '🎁' ? ' ippon' : '') + (it.read ? ' read' : '');
    var stateText = opt.state || (it.kind === '🎁' ? ipponState(it) : it.read ? '既読（アプリを閉じるまでここに残ります）' : '');
    var kind = it.kind === '⭐' ? '⭐ クロコのイチオシ' : it.kind === '🐟' ? '🐟 今日の目からうろこ' : it.kind === '🎁' ? ipponLabel(it) : '';
    var lead = '';
    if (it.kind === '⭐') {
      var s = it.body.sanko;
      lead = Array.isArray(s) ? s[0] : (s || '');
    } else if (it.kind === '🐟') {
      lead = it.body.naze ? String(it.body.naze).split('\n')[0] : '';
    } else if (it.kind === '🎁') {
      lead = it.body.ippo ? '🚪 ' + it.body.ippo : '';
    }
    var src = it.kind === '🐟' ? '' : it.kind === '🎁' ? '<span class="src">' + esc(it.body.shurui || '') + '</span>' :
      '<span>' + esc(g.emoji) + '</span><span class="src">' + esc(kind ? g.name : it.source) + '</span>';
    return '<article class="card' + cls + '" data-id="' + esc(it.id) + '">' +
      '<div class="meta">' + (kind ? '<span class="kind">' + kind + '</span>' : '') + src +
      '<span class="time">' + relTime(it.published) + '</span></div>' +
      '<div class="title">' + (it.followup ? '<span class="tag">🔁続報</span>' : '') + esc(it.title) + '</div>' +
      (lead ? '<div class="lead">' + esc(lead) + '</div>' : '') +
      (stateText ? '<div class="state">' + esc(stateText) + '</div>' : '') +
      '<div class="acts">' +
      '<button data-act="good" class="' + (it.fb === 'good' ? 'on' : '') + '" aria-label="いいね">👍</button>' +
      '<button data-act="bad" class="' + (it.fb === 'bad' ? 'on' : '') + '" aria-label="いまいち">👎</button>' +
      '<button data-act="later" class="' + (it.later ? 'on' : '') + '" aria-label="あとで見る">🔖</button>' +
      '</div></article>';
  }

  // 👍👎を送ったら、画面に出ている同じ記事のカード全部（ホーム・あとで見る・アーカイブ）のボタンに色を付ける
  function markFb(it) {
    document.querySelectorAll('.card[data-id="' + String(it.id).replace(/"/g, '') + '"]').forEach(function (c) {
      var g = c.querySelector('[data-act="good"]'), b = c.querySelector('[data-act="bad"]');
      if (g) g.classList.toggle('on', it.fb === 'good');
      if (b) b.classList.toggle('on', it.fb === 'bad');
    });
  }

  return { state: state, esc: esc, markFb: markFb, ipponState: ipponState, ipponWaku: ipponWaku, ipponLabel: ipponLabel, ipponDid: ipponDid, relTime: relTime, toast: toast, openSheet: openSheet, closeSheet: closeSheet, genre: genre, isCrocoCard: isCrocoCard, cardHtml: cardHtml };
})();
