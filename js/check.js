// check.js — ✅知ってるかチェック（11/20）
//   設定タブの一番上の入口から開く専用ページ。クロコが作った候補（シート「チェック候補」）に 💗好き／🙂知ってる／👎苦手 を押す
//   押していない＝知らない。18時の回は、押したものを🎁に出さない（👎は近いものも避ける・💗は好みの材料）
//   押した瞬間に保存（GASの rate）。同じボタンをもう一度押すと取り消し
//   🎁カードの「💡 知ってた」もここの choose を使う（sheets.js）
var Check = (function () {
  var esc = UI.esc;
  var KINDS = [['映画', '🎬 映画'], ['ドラマ', '📺 ドラマ'], ['漫画', '📚 漫画'], ['YouTube', '▶️ YouTube'], ['バラエティ', '😆 バラエティ'], ['曲', '🎵 曲'], ['デート', '💑 デート']];
  var BTNS = [['好き', '💗', '好き'], ['普通', '🙂', '知ってる'], ['苦手', '👎', '苦手']];
  var cands = [];
  var kind = '映画';
  var order = [];
  var listEl = document.getElementById('checkList');
  var kindsEl = document.getElementById('checkKinds');
  var infoEl = document.getElementById('checkInfo');
  // 送るのは1件ずつ順番に（GAS側もロックするが、待ち時間を短くする）
  var queue = Promise.resolve();

  function send(params) {
    var p = queue.then(function () { return API.call('rate', params); });
    queue = p.catch(function () {});
    return p;
  }

  function open() {
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-check'; });
    document.getElementById('pageTitle').textContent = '✅ 知ってるかチェック';
    window.scrollTo(0, 0);
    load();
  }

  function load() {
    listEl.innerHTML = '<div class="empty">読み込み中…</div>';
    return API.call('checkList').then(function (res) {
      cands = res.cands;
      var first = KINDS.filter(function (k) { return mine(k[0]).length; })[0];
      if (!mine(kind).length && first) kind = first[0];
      render(true);
    }).catch(function (err) { listEl.innerHTML = '<div class="empty">読めませんでした：' + esc(err.message) + '</div>'; });
  }

  function mine(k) { return cands.filter(function (c) { return c.shurui === k; }); }

  // resort＝押したものを下へ回す（種類を変えたとき・開いたときだけ。押した瞬間は動かさない＝指の下で行がずれないように）
  function render(resort) {
    var all = cands.length, done = cands.filter(function (c) { return c.hyoka; }).length;
    infoEl.textContent = '全部で' + all + '件・押したもの ' + done + '件';
    kindsEl.innerHTML = KINDS.filter(function (k) { return mine(k[0]).length; }).map(function (k) {
      var m = mine(k[0]);
      return '<button class="chip' + (k[0] === kind ? ' on' : '') + '" data-ck-kind="' + esc(k[0]) + '">' + esc(k[1]) +
        '<small>' + m.filter(function (c) { return c.hyoka; }).length + '/' + m.length + '</small></button>';
    }).join('');
    if (resort) {
      var m = mine(kind);
      order = m.filter(function (c) { return !c.hyoka; }).concat(m.filter(function (c) { return c.hyoka; }));
    }
    if (!order.length) { listEl.innerHTML = '<div class="empty"><b>候補がありません</b>クロコに「知ってるかチェックの候補を作って」と言ってください</div>'; return; }
    listEl.innerHTML = '<div class="note ck-note">見た・行った・聴いたことがあるものだけ押してください。押していないもの＝知らない、としておすすめの候補に使います。同じボタンをもう一度押すと取り消し。押したものは、次に開いたとき下に回ります。</div>' +
      order.map(function (c, i) { return rowHtml(c, i); }).join('');
  }

  function rowHtml(c, i) {
    return '<div class="ck-item' + (c.hyoka ? ' done' : '') + '" data-ck-i="' + i + '"><div class="ck-name">' + esc(c.name) +
      (c.setsumei ? '<small>' + esc(c.setsumei) + '</small>' : '') + '</div><div class="ck-btns">' +
      BTNS.map(function (b) {
        return '<button class="ck-btn' + (c.hyoka === b[0] ? ' on h-' + b[0] : '') + '" data-ck-h="' + b[0] + '" aria-label="' + b[2] + '">' + b[1] + '<small>' + b[2] + '</small></button>';
      }).join('') + '</div></div>';
  }

  function press(row, h) {
    var c = order[Number(row.dataset.ckI)];
    if (!c) return;
    var before = c.hyoka;
    var next = before === h ? '' : h;
    c.hyoka = next;
    render(false);
    send({ shurui: c.shurui, name: c.name, hyoka: next, doko: 'チェック' }).catch(function (err) {
      c.hyoka = before;
      render(false);
      UI.toast('保存できませんでした：' + err.message);
    });
  }

  kindsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ck-kind]');
    if (!b || b.dataset.ckKind === kind) return;
    kind = b.dataset.ckKind;
    render(true);
    window.scrollTo(0, 0);
  });
  listEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ck-h]');
    if (b) press(b.closest('.ck-item'), b.dataset.ckH);
  });
  document.getElementById('checkBack').addEventListener('click', function () { Main.show('settings'); });

  // 🎁カードの「💡 知ってた」＝評価を選ぶ小さなシート。選んだら onPick(評価)
  function choose(title, onPick) {
    var sh = UI.openSheet('<h2>💡 知ってた</h2><div class="note">' + esc(title) + '</div>' +
      '<h3>どうだった？</h3><div class="ck-choose">' +
      BTNS.map(function (b) { return '<button class="btn sub" data-pick="' + b[0] + '">' + b[1] + ' ' + b[2] + '</button>'; }).join('') + '</div>' +
      '<div class="note">💗好き＝「好きなもの」に入って、次から好みの材料になります。どれを選んでも、これはもう🎁に出しません（👎苦手は近いものも避けます）。</div>');
    sh.querySelectorAll('[data-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () { UI.closeSheet(); onPick(btn.dataset.pick); });
    });
  }

  return { open: open, choose: choose, send: send };
})();
