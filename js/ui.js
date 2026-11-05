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

  function isCrocoCard(it) { return it.kind === '⭐' || it.kind === '🐟'; }

  // カード1枚（ホーム・あとで見る・アーカイブで共通）
  function cardHtml(it, opt) {
    opt = opt || {};
    var g = genre(it.genre);
    var cls = it.kind === '⭐' ? ' star' : it.kind === '🐟' ? ' uroko' : '';
    var kind = it.kind === '⭐' ? '⭐ クロコのイチオシ' : it.kind === '🐟' ? '🐟 今日の目からうろこ' : '';
    var lead = '';
    if (it.kind === '⭐') {
      var s = it.body.sanko;
      lead = Array.isArray(s) ? s[0] : (s || '');
    } else if (it.kind === '🐟') {
      lead = it.body.naze ? String(it.body.naze).split('\n')[0] : '';
    }
    return '<article class="card' + cls + '" data-id="' + esc(it.id) + '">' +
      '<div class="meta">' + (kind ? '<span class="kind">' + kind + '</span>' : '') +
      (it.kind === '🐟' ? '' : '<span>' + esc(g.emoji) + '</span><span class="src">' + esc(kind ? g.name : it.source) + '</span>') +
      '<span class="time">' + relTime(it.published) + '</span></div>' +
      '<div class="title">' + (it.followup ? '<span class="tag">🔁続報</span>' : '') + esc(it.title) + '</div>' +
      (lead ? '<div class="lead">' + esc(lead) + '</div>' : '') +
      (opt.state ? '<div class="state">' + esc(opt.state) + '</div>' : '') +
      '<div class="acts">' +
      '<button data-act="good" aria-label="いいね">👍</button>' +
      '<button data-act="bad" aria-label="いまいち">👎</button>' +
      '<button data-act="later" class="' + (it.later ? 'on' : '') + '" aria-label="あとで見る">🔖</button>' +
      '</div></article>';
  }

  return { state: state, esc: esc, relTime: relTime, toast: toast, openSheet: openSheet, closeSheet: closeSheet, genre: genre, isCrocoCard: isCrocoCard, cardHtml: cardHtml };
})();
