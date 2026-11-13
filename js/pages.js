// pages.js — 📰新着／🔖あとで見る／🗂アーカイブ／⚙️設定
var STATE_LABEL = { '既読': '既読', '見なくていい': '見なくていい（スワイプ）', 'アーカイブ（未読）': '未読のまま3日たった', '未読': '未読' };

function makeLookup(getList) {
  return function (id) {
    var list = getList();
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  };
}

// 📰新着＝クロコが要約していない普通の新着。ホームには出さない（読まなくても3日で消える）
var News = (function () {
  var items = [];
  var el = document.getElementById('newsList');
  var info = document.getElementById('newsInfo');

  function load() {
    info.textContent = '読み込み中…';
    return API.call('shinchaku').then(function (res) {
      items = res.items;
      info.textContent = res.total + '件' + (res.total > items.length ? '（新しい' + items.length + '件を表示）' : '') + '・読まなくても3日で自動的に消えます';
      render();
    }).catch(function (err) { info.textContent = '読めませんでした：' + err.message; });
  }
  function render() {
    el.innerHTML = items.length ? items.map(function (it) { return UI.cardHtml(it); }).join('')
      : '<div class="empty"><b>新着なし</b>次の新着は3時間おき（7〜22時）に届きます</div>';
  }
  Cards.bind(el, makeLookup(function () { return items; }), {
    swipe: true,
    onRead: function (it, card) { it.read = true; if (card) card.outerHTML = UI.cardHtml(it); },
    onSwipe: function (it, card) {
      items = items.filter(function (x) { return x !== it; });
      if (card) card.classList.add('gone');
      setTimeout(render, 200);
    }
  });
  return { load: load };
})();

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

  // 🎁今週の1本の頻度と種類（シート「おすすめ設定」＝18時の回がこれを読んで出す日を決める）
  var FREQ_LABEL = [['週2', '週2回（火・金）'], ['毎週', '毎週（金）'], ['隔週', '2週に1回'], ['月1', '月1回'], ['オフ', 'オフ']];
  // 種類ごとの出し方。必ず＝その枠が出る日は毎回／順番＝順番の中から1回に1つ
  var MODE_LABEL = [['必ず', '毎回必ず'], ['順番', '順番で'], ['オフ', 'オフ']];
  // 💑デートは自分の枠（11/13〜）＝頻度だけ選ぶ。出る日は毎回、次のデートに向けて1枚
  var OSU = [
    { key: 'futari', name: '🎁 ふたりで見る1本', kinds: [['eiga', '🎬 映画'], ['drama', '📺 ドラマ']] },
    { key: 'hitori', name: '🎁 ひとりで見る1本', kinds: [['manga', '📚 漫画'], ['youtube', '▶️ YouTube']] },
    { key: 'date', name: '💑 デートの行き先', kinds: [] },
    { key: 'kyoku', name: '🎵 今週の1曲', kinds: [] }
  ];

  function osuSelect(item, labels, value) {
    return '<select data-osu="' + item + '">' + labels.map(function (f) {
      return '<option value="' + f[0] + '"' + (value === f[0] ? ' selected' : '') + '>' + f[1] + '</option>';
    }).join('') + '</select>';
  }

  function osusumeHtml() {
    var o = data.osusume;
    // mode が無い＝GASが古い版のまま。箱は出さない（ほかの設定は使える）
    if (!o || !o.mode) return '';
    var html = '<div class="box"><h2>🎁 おすすめ（今週の1本）</h2><div class="note">18時の回に出ます。変えると、下の「これからの予定」がその場で変わります。</div>';
    OSU.forEach(function (c) {
      var dateNote = (c.key === 'date' && o.dates.length) ? '<small>次のデート：' + esc(o.dates.join('・')) + '</small>' : '';
      html += '<div class="grow"><div class="name">' + esc(c.name) + dateNote + '</div>' + osuSelect(c.key, FREQ_LABEL, o.freq[c.key]) + '</div>';
      if (c.kinds.length) {
        html += '<div class="srcs">' + c.kinds.map(function (k) {
          return '<div class="grow"><div class="name">' + esc(k[1]) + '</div>' + osuSelect(k[0], MODE_LABEL, o.mode[k[0]]) + '</div>';
        }).join('') + '<div class="rule">📋 ' + esc(o.rule[c.key]) + '</div></div>';
      }
    });
    html += '<div class="grow"><div class="name">🎮 流行りの遊び<small>控えの「🔥今の流行り」に出ることがあります</small></div>' + sw('data-osu-on="asobi"', o.asobi) + '</div>';

    html += '<h3 class="plan-head">📅 これからの予定</h3>';
    if (!o.plan.length) html += '<div class="note">出る予定がありません（全部オフです）。</div>';
    o.plan.forEach(function (p) {
      html += '<div class="plan"><div class="plan-day">' + esc(p.day) + (p.today ? '<b>今日</b>' : '') + '</div><div class="plan-items">' +
        p.items.map(function (it) {
          return '<div><span>' + esc(it.waku) + '</span>' + esc(it.kinds.join(' ＋ ')) + '</div>';
        }).join('') + '</div></div>';
    });
    html += '<div class="note">「毎回必ず」＝その枠が出る日は毎回出ます。「順番で」＝順番の中から1回に1つ出ます。' +
      'デートの行き先は、次のデートに向けた案が毎回ちがう内容で出ます。' +
      '🎮流行りの遊びは予定には出ません（カードの中の控えに入ります）。</div></div>';
    return html;
  }

  function render() {
    var html = osusumeHtml();
    html += '<div class="box"><h2>ジャンル</h2><div class="note">オフにすると新着に出なくなります。名前を押すと集め先が見られます。</div>';
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
    if (t.dataset.osu || t.dataset.osuOn) {
      var osuItem = t.dataset.osu || t.dataset.osuOn;
      var osuValue = t.dataset.osu ? t.value : t.checked;
      UI.toast('予定を作り直しています…');
      API.call('setOsusume', { item: osuItem, value: osuValue }).then(function (res) {
        data.osusume = res.osusume;
        render();
        UI.toast('変えました（予定を更新）');
      }).catch(function (err) { UI.toast(err.message); load(); });
      return;
    }
    if (t.dataset.genre) {
      API.call('setGenre', { genre: t.dataset.genre, on: t.checked }).then(function () {
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
