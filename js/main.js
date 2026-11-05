// main.js — 起動・タブ切り替え・読み直し（前回の中身をすぐ出してから最新を取りに行く）
var Main = (function () {
  var CACHE = 'mt_init';
  var TITLES = { home: 'まとめ通信', later: '🔖 あとで見る', archive: '🗂 アーカイブ', settings: '⚙️ 設定' };
  var tab = 'home';
  var laterCount = 0;
  var lastLoad = 0;

  function apply(res) {
    UI.state.genres = res.genres;
    Home.setItems(res.items);
    laterCount = res.laterCount;
    showLater();
    var bn = document.getElementById('banner');
    bn.hidden = !res.banner;
    bn.textContent = res.banner ? res.banner.text : '';
  }

  function showLater() {
    var b = document.getElementById('laterBadge');
    b.hidden = laterCount <= 0;
    b.textContent = laterCount;
  }

  function bumpLater(n) { laterCount += n; showLater(); }

  function reload() {
    var btn = document.getElementById('reloadBtn');
    btn.classList.add('spin');
    lastLoad = Date.now();
    var p = tab === 'home' ? API.call('init').then(function (res) {
      apply(res);
      API.store(CACHE, JSON.stringify(res));
    }) : tab === 'later' ? Later.load() : tab === 'archive' ? Archive.load() : Settings.load();
    return p.catch(function (err) { UI.toast('読めませんでした：' + err.message); })
      .then(function () { btn.classList.remove('spin'); });
  }

  function show(name) {
    tab = name;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + name; });
    document.getElementById('pageTitle').textContent = TITLES[name];
    window.scrollTo(0, 0);
    if (name !== 'home') reload();
  }

  function start() {
    if (!API.hasKey()) {
      document.getElementById('timeline').innerHTML = '<div class="empty"><b>鍵がありません</b>クロコから届いた「?k=」付きのURLで1回開いてください</div>';
      return;
    }
    var cached = API.store(CACHE);
    if (cached) { try { apply(JSON.parse(cached)); } catch (e) {} }
    reload();
  }

  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (!b) return;
    if (b.dataset.tab === tab) { reload(); return; }
    show(b.dataset.tab);
  });
  document.getElementById('reloadBtn').addEventListener('click', reload);

  // 元の記事から戻ってきたとき、5分以上たっていたら読み直す
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && tab === 'home' && Date.now() - lastLoad > 5 * 60000) reload();
  });

  // アプリとしてインストール（競輪予想AIと同じ対処・10/9）
  // 🪤Pixel の Chrome は「︙→ホーム画面に追加」で naoto-web.github.io の新しいアプリを「すでにインストールされています」と誤判定する
  //   ⇒ ページ側からインストール画面を直接呼ぶボタン（beforeinstallprompt）。合図が来たときだけ出す
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    if (document.getElementById('installBtn')) return;
    var b = document.createElement('button');
    b.id = 'installBtn';
    b.className = 'install-btn';
    b.textContent = 'アプリとしてインストール';
    b.addEventListener('click', function () {
      if (!installEvt) return;
      installEvt.prompt();
      installEvt.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') { installEvt = null; b.textContent = 'インストール中…'; }
      }).catch(function () {});
    });
    document.querySelector('.top').insertBefore(b, document.getElementById('reloadBtn'));
  });
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('installBtn');
    if (b) b.remove();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }

  start();
  return { bumpLater: bumpLater, reload: reload };
})();
