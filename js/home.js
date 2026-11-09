// home.js — ホーム（ジャンル絞り込み＋タイムライン）と、カードの操作（タップ・スワイプ・👍👎🔖）
var Cards = (function () {
  // 記事を開く：新着＝元のサイト／⭐🐟🎁＝アプリ内で中身。開いたら既読
  function open(it, onRead) {
    if (UI.isCrocoCard(it)) {
      Sheets.detail(it, onRead);
    } else {
      if (it.url) window.open(it.url, '_blank', 'noopener');
      if (onRead) onRead();
    }
    API.call('open', { id: it.id }).catch(function () {});
  }

  // container の中のカードにタップ・ボタン・（opt.swipe なら）スワイプを付ける
  function bind(container, lookup, opt) {
    opt = opt || {};
    container.addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (!card || card.dataset.swiped) return;
      var it = lookup(card.dataset.id);
      if (!it) return;
      var btn = e.target.closest('button[data-act]');
      if (!btn) { open(it, function () { if (opt.onRead) opt.onRead(it, card); }); return; }
      var act = btn.dataset.act;
      if (act === 'good') Sheets.feedback(it, true);
      if (act === 'bad') Sheets.feedback(it, false);
      if (act === 'later') {
        it.later = !it.later;
        btn.classList.toggle('on', it.later);
        Main.bumpLater(it.later ? 1 : -1);
        UI.toast(it.later ? '🔖 あとで見るに入れました' : 'あとで見るから外しました');
        API.call('later', { id: it.id, on: it.later }).catch(function (err) { UI.toast('保存できませんでした：' + err.message); });
        if (opt.onLaterOff && !it.later) opt.onLaterOff(it, card);
      }
    });
    if (opt.swipe) bindSwipe(container, lookup, opt.onSwipe);
  }

  // 横スワイプ＝見なくていい（開かずにアーカイブへ・学習には使わない）
  function bindSwipe(container, lookup, onSwipe) {
    var sx, sy, card, dx, locked;
    container.addEventListener('touchstart', function (e) {
      card = e.target.closest('.card');
      if (!card) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; locked = null;
      card.style.transition = 'none';
    }, { passive: true });
    container.addEventListener('touchmove', function (e) {
      if (!card) return;
      var mx = e.touches[0].clientX - sx, my = e.touches[0].clientY - sy;
      if (locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (locked !== 'x') return;
      dx = mx;
      card.style.transform = 'translateX(' + dx + 'px)';
      card.style.opacity = String(Math.max(.3, 1 - Math.abs(dx) / 300));
    }, { passive: true });
    container.addEventListener('touchend', function () {
      if (!card) return;
      var c = card;
      card = null;
      c.style.transition = '';
      if (locked === 'x') {
        c.dataset.swiped = '1';
        setTimeout(function () { delete c.dataset.swiped; }, 350);
      }
      if (locked === 'x' && Math.abs(dx) > 90) {
        c.style.transform = 'translateX(' + (dx > 0 ? 120 : -120) + '%)';
        c.style.opacity = '0';
        var it = lookup(c.dataset.id);
        setTimeout(function () { onSwipe(it, c); }, 200);
        API.call('skip', { id: it.id }).catch(function (err) { UI.toast('保存できませんでした：' + err.message); });
      } else {
        c.style.transform = '';
        c.style.opacity = '';
      }
    });
  }

  return { bind: bind, open: open };
})();

var Home = (function () {
  var items = [];
  var filter = 'all';
  var el = document.getElementById('timeline');
  var chipsEl = document.getElementById('chips');

  // 読み直しても、このアプリを開いている間に読んだ記事は残す（戻ってきてから👍👎を押せるように）
  function setItems(list) {
    var ids = {};
    list.forEach(function (it) { ids[it.id] = true; });
    var kept = items.filter(function (it) { return it.read && !ids[it.id]; });
    // 🎁今週の1本はいつも一番上
    items = list.concat(kept).sort(function (a, b) {
      return ((b.kind === '🎁') - (a.kind === '🎁')) || String(b.added).localeCompare(String(a.added));
    });
    render();
  }

  function markRead(it, card) {
    if (!it) return;
    it.read = true;
    if (card) card.outerHTML = UI.cardHtml(it);
    renderChips();
  }

  function lookup(id) {
    for (var i = 0; i < items.length; i++) if (String(items[i].id) === String(id)) return items[i];
    return null;
  }

  function remove(it, card) {
    items = items.filter(function (x) { return x !== it; });
    if (card) {
      card.classList.add('gone');
      setTimeout(render, 200);
    } else {
      render();
    }
  }

  function visible() {
    return items.filter(function (it) {
      if (filter === 'all') return true;
      if (filter === 'croco') return UI.isCrocoCard(it);
      return it.genre === filter;
    });
  }

  function renderChips() {
    var unread = items.filter(function (it) { return !it.read; });
    var counts = { all: unread.length, croco: 0 };
    unread.forEach(function (it) {
      counts[it.genre] = (counts[it.genre] || 0) + 1;
      if (UI.isCrocoCard(it)) counts.croco++;
    });
    var chips = [{ key: 'all', label: '全部' }];
    if (counts.croco) chips.push({ key: 'croco', label: '⭐🐟' });
    UI.state.genres.forEach(function (g) {
      if (g.on && counts[g.key]) chips.push({ key: g.key, label: g.emoji + ' ' + g.name });
    });
    if (!chips.some(function (c) { return c.key === filter; })) filter = 'all';
    chipsEl.innerHTML = chips.map(function (c) {
      return '<button class="chip' + (c.key === filter ? ' on' : '') + '" data-key="' + UI.esc(c.key) + '">' +
        UI.esc(c.label) + '<small>' + (counts[c.key] || 0) + '</small></button>';
    }).join('');
  }

  function render() {
    renderChips();
    var list = visible();
    if (!list.length) {
      el.innerHTML = '<div class="empty"><b>全部見た 🎉</b>' + (items.length ? 'このジャンルの新着はもうありません' : '次の新着は3時間おき（7〜22時）に届きます') + '</div>';
      return;
    }
    el.innerHTML = list.map(function (it) { return UI.cardHtml(it); }).join('');
  }

  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    filter = b.dataset.key;
    render();
    window.scrollTo(0, 0);
  });

  Cards.bind(el, lookup, { swipe: true, onRead: markRead, onSwipe: remove });

  return { setItems: setItems, remove: remove, markRead: markRead, lookup: lookup };
})();
