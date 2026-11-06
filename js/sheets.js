// sheets.js — 下から出るシート：⭐🐟の中身／👍👎の送信
var Sheets = (function () {
  var esc = UI.esc;

  function lines(v) {
    if (Array.isArray(v)) return v;
    return String(v || '').split('\n').filter(function (s) { return s.trim(); });
  }

  function linkify(s) {
    return esc(s).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>'; });
  }

  // ⭐：📝3行で言うと／💬雑談ネタ／🔍ちなみに／元の記事　🐟：💡なぜ？／💬雑談で使うなら／📚出典
  function detail(it, onClose) {
    var b = it.body || {};
    var g = UI.genre(it.genre);
    var html;
    if (it.kind === '⭐') {
      html = '<div class="kind-line">⭐ クロコのイチオシ　' + esc(g.emoji + ' ' + g.name) + (it.followup ? '　🔁続報' : '') + '</div>' +
        '<h2>' + esc(it.title) + '</h2>' +
        (b.sanko ? '<h3>📝 3行で言うと</h3><ul>' + lines(b.sanko).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
        (b.zatsudan ? '<h3>💬 雑談ネタ</h3><p>' + esc(b.zatsudan) + '</p>' : '') +
        (b.chinami ? '<h3>🔍 ちなみに</h3><p>' + esc(b.chinami) + '</p>' : '');
    } else {
      html = '<div class="kind-line uroko">🐟 今日の目からうろこ</div>' +
        '<h2>' + esc(it.title) + '</h2>' +
        (b.naze ? '<h3>💡 なぜ？</h3>' + lines(b.naze).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') : '') +
        (b.zatsudan ? '<h3>💬 雑談で使うなら</h3><p>' + esc(b.zatsudan) + '</p>' : '') +
        (b.shutten ? '<h3>📚 出典</h3><ul>' + [].concat(b.shutten).map(function (s) {
          if (typeof s === 'string') return '<li>' + linkify(s) + '</li>';
          return '<li>' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title || s.url) + '</a>' : esc(s.title)) + '</li>';
        }).join('') + '</ul>' : '');
    }
    html += '<div class="row">' +
      (it.url ? '<a class="btn wide" href="' + esc(it.url) + '" target="_blank" rel="noopener">元の記事へ</a>' : '') +
      '<button class="btn sub' + (it.fb === 'good' ? ' on' : '') + '" data-fb="good">👍</button>' +
      '<button class="btn sub' + (it.fb === 'bad' ? ' on' : '') + '" data-fb="bad">👎</button></div>';
    var sh = UI.openSheet(html, onClose);
    sh.querySelectorAll('[data-fb]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var good = btn.dataset.fb === 'good';
        UI.closeSheet();
        feedback(it, good);
      });
    });
  }

  // 👍＝こういうのが欲しい（＋ひとこと）／👎＝理由を1つ（＋ひとこと）。「書き方がつまらない」は⭐🐟だけ
  function feedback(it, good) {
    var html;
    if (good) {
      html = '<h2>👍 こういうのが欲しい</h2><div class="note">' + esc(it.title) + '</div>' +
        '<h3>ひとこと（なくてOK）</h3><textarea id="fbComment" placeholder="例：この選手の話はもっと読みたい"></textarea>';
    } else {
      var reasons = [
        ['この記事だけ微妙', 'ジャンルはいい。1回では学ばない・重なったら共通点を探して減らす'],
        ['こういう話はいらない', '同じ型の記事を減らす'],
      ];
      if (UI.isCrocoCard(it)) reasons.push(['書き方がつまらない', '話題は残して書き方を変える']);
      html = '<h2>👎 いまいちだった理由</h2><div class="note">' + esc(it.title) + '</div>' +
        '<div class="reasons">' + reasons.map(function (r, i) {
          return '<label><input type="radio" name="fbReason" value="' + esc(r[0]) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(r[0]) + '<small>' + esc(r[1]) + '</small></span></label>';
        }).join('') + '</div>' +
        '<h3>ひとこと（なくてOK）</h3><textarea id="fbComment"></textarea>';
    }
    html += '<div class="row"><button class="btn wide" id="fbSend">送る</button></div>';
    var sh = UI.openSheet(html);
    sh.querySelector('#fbSend').addEventListener('click', function () {
      var r = sh.querySelector('input[name=fbReason]:checked');
      var data = { id: it.id, good: good, reason: r ? r.value : '', comment: sh.querySelector('#fbComment').value.trim() };
      UI.closeSheet();
      it.fb = good ? 'good' : 'bad';
      UI.markFb(it);
      UI.toast(good ? '👍 送りました' : '👎 送りました');
      API.call('feedback', data).catch(function (err) { UI.toast('送れませんでした：' + err.message); });
    });
  }

  return { detail: detail, feedback: feedback };
})();
