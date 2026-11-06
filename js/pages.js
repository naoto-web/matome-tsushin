// pages.js — 🔖あとで見る／🗂アーカイブ／⚙️設定
var STATE_LABEL = { '既読': '既読', '見なくていい': '見なくていい（スワイプ）', 'アーカイブ（未読）': '未読のまま3日たった', '未読': '未読' };

function makeLookup(getList) {
  return function (id) {
    var list = getList();
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  };
}

var Later = (function () {
  var items = [];
  var el = document.getElementById('laterList');

  function load() {
    el.innerHTML = '<div class="empty">読み込み中…</div>';
    return API.call('laterList').then(function (res) { items = res.items; render(); })
      .catch(function (err) { el.innerHTML = '<div class="empty">読めませんでした：' + UI.esc(err.message) + '</div>'; });
  }
  function render() {
    if (!items.length) { el.innerHTML = '<div class="empty"><b>空っぽ</b>カードの🔖を押すとここにたまります</div>'; return; }
    el.innerHTML = items.map(function (it) { return UI.cardHtml(it, { state: it.state === '未読' ? '' : STATE_LABEL[it.state] }); }).join('');
  }
  Cards.bind(el, makeLookup(function () { return items; }), {
    onRead: function (it) { it.state = '既読'; Home.markRead(Home.lookup(it.id), document.querySelector('#timeline .card[data-id="' + it.id + '"]')); },
    onLaterOff: function (it) { items = items.filter(function (x) { return x !== it; }); setTimeout(render, 300); }
  });
  return { load: load };
})();

var Archive = (function () {
  var items = [];
  var el = document.getElementById('archiveList');
  var info = document.getElementById('archiveInfo');
  var q = document.getElementById('archiveQ');
  var sel = document.getElementById('archiveGenre');
  var timer;

  function fillGenres() {
    var cur = sel.value;
    sel.innerHTML = '<option value="">全ジャンル</option>' + UI.state.genres.map(function (g) {
      return '<option value="' + UI.esc(g.key) + '">' + UI.esc(g.emoji + ' ' + g.name) + '</option>';
    }).join('');
    sel.value = cur;
  }
  function load() {
    fillGenres();
    info.textContent = '読み込み中…';
    return API.call('archive', { genre: sel.value, q: q.value.trim() }).then(function (res) {
      items = res.items;
      info.textContent = res.total + '件' + (res.total > items.length ? '（新しい' + items.length + '件を表示）' : '');
      el.innerHTML = items.length ? items.map(function (it) { return UI.cardHtml(it, { state: STATE_LABEL[it.state] || it.state }); }).join('')
        : '<div class="empty">見つかりませんでした</div>';
    }).catch(function (err) { info.textContent = '読めませんでした：' + err.message; });
  }
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(load, 500); });
  sel.addEventListener('change', load);
  Cards.bind(el, makeLookup(function () { return items; }), {});
  return { load: load };
})();

var Settings = (function () {
  var el = document.getElementById('settingsBody');
  var data = null;
  var openGenre = null;
  var esc = UI.esc;

  function load() {
    if (!data) el.innerHTML = '<div class="empty">読み込み中…</div>';
    return API.call('settings').then(function (res) { data = res; UI.state.genres = res.genres; render(); })
      .catch(function (err) { el.innerHTML = '<div class="empty">読めませんでした：' + esc(err.message) + '</div>'; });
  }

  function sw(attrs, on) {
    return '<label class="switch"><input type="checkbox" ' + attrs + (on ? ' checked' : '') + '><i></i></label>';
  }

  function render() {
    var html = '<div class="box"><h2>ジャンル</h2><div class="note">オフにすると新着に出なくなります。名前を押すと集め先が見られます。</div>';
    data.genres.forEach(function (g) {
      var srcs = data.sources.filter(function (s) { return s.genre === g.key; });
      var onCount = srcs.filter(function (s) { return s.on; }).length;
      html += '<div class="grow"><div class="name"><button class="more" data-open="' + esc(g.key) + '">' + esc(g.emoji + ' ' + g.name) + '</button>' +
        '<small>集め先 ' + onCount + 'か所</small></div>' + sw('data-genre="' + esc(g.key) + '"', g.on) + '</div>';
      if (openGenre === g.key) {
        html += '<div class="srcs">' + srcs.map(function (s) {
          return '<div class="grow"><div class="name">' + esc(s.name) + '<small>' + esc(s.status || 'まだ集めていない') + (s.memo ? '・' + esc(s.memo) : '') + '</small></div>' +
            sw('data-src-genre="' + esc(s.genre) + '" data-src-url="' + esc(s.url) + '"', s.on) + '</div>';
        }).join('') +
          '<div class="form"><input type="url" id="srcUrl" placeholder="集め先のURL（RSS）を貼る"><input type="text" id="srcName" placeholder="名前（なくてOK）">' +
          '<button class="btn" data-addsrc="' + esc(g.key) + '">集め先を追加</button></div></div>';
      }
    });
    html += '</div>';

    html += '<div class="box"><h2>ジャンルを追加</h2><div class="form">' +
      '<div class="two"><input type="text" id="gEmoji" placeholder="📌" maxlength="4"><input type="text" id="gName" placeholder="名前（例：将棋）"></div>' +
      '<input type="url" id="gUrl" placeholder="集め先のURL（RSS）※わからなければ空でOK">' +
      '<button class="btn" id="gAdd">ジャンルを追加</button>' +
      '<div class="note">URLがわからないときは、クロコに「○○のジャンル足して」と言えば集め先探しからやります。</div></div></div>';

    html += '<div class="box"><h2>🧠 クロコが学んだこと</h2>' +
      (data.konomi ? '<div class="note">更新 ' + esc(data.konomi.updated) + '</div><div class="konomi">' + esc(data.konomi.text) + '</div>'
        : '<div class="note">まだありません。👍👎・あとで見る・ひとことがたまると、⭐🐟を書く前にクロコがここを書き直します。</div>') + '</div>';
    el.innerHTML = html;
  }

  el.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]');
    if (b) { openGenre = openGenre === b.dataset.open ? null : b.dataset.open; render(); return; }
    var add = e.target.closest('[data-addsrc]');
    if (add) {
      var url = document.getElementById('srcUrl').value.trim();
      if (!url) { UI.toast('URLを貼ってください'); return; }
      add.disabled = true; add.textContent = '読めるか試しています…';
      API.call('addSource', { genre: add.dataset.addsrc, url: url, name: document.getElementById('srcName').value.trim() })
        .then(function (res) { UI.toast('追加しました（' + res.count + '件読めました）'); load(); })
        .catch(function (err) { UI.toast(err.message); add.disabled = false; add.textContent = '集め先を追加'; });
      return;
    }
    if (e.target.id === 'gAdd') {
      var name = document.getElementById('gName').value.trim();
      if (!name) { UI.toast('名前を入れてください'); return; }
      e.target.disabled = true;
      API.call('addGenre', { name: name, emoji: document.getElementById('gEmoji').value.trim(), url: document.getElementById('gUrl').value.trim() })
        .then(function () { UI.toast('ジャンルを追加しました'); load(); })
        .catch(function (err) { UI.toast(err.message); e.target.disabled = false; });
    }
  });

  el.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.genre) {
      API.call('setGenre', { key: t.dataset.genre, on: t.checked }).then(function () {
        data.genres.forEach(function (g) { if (g.key === t.dataset.genre) g.on = t.checked; });
        UI.toast(t.checked ? 'オンにしました' : 'オフにしました（次の集めから反映）');
      }).catch(function (err) { UI.toast(err.message); t.checked = !t.checked; });
    }
    if (t.dataset.srcUrl) {
      API.call('setSource', { genre: t.dataset.srcGenre, url: t.dataset.srcUrl, on: t.checked }).then(function () {
        UI.toast(t.checked ? 'オンにしました' : 'オフにしました');
      }).catch(function (err) { UI.toast(err.message); t.checked = !t.checked; });
    }
  });

  return { load: load };
})();
