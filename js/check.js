// check.js — ✅知ってるかチェック（11/20）
//   設定タブの一番上の入口から開く専用ページ。クロコが作った候補（シート「チェック候補」）に 💗好き／🙂知ってる／👎苦手／❓知らない を押す
//   ❓知らない（11/21）＝はっきり知らない。押していない＝まだ見ていない。18時の回は、知っているものを🎁に出さない（👎は近いものも避ける・💗は好みの材料・❓は第一候補）
//   押した瞬間に保存（GASの rate）。同じボタンをもう一度押すと取り消し
//   📝メモ（11/21）＝押した行にひとこと。評価を変えてもメモは引き継ぐ（毎回 memo を送る）
//   🎁カードの「💡 知ってた」もここの choose を使う（sheets.js・❓知らないは出さない）
var Check = (function () {
  var esc = UI.esc;
  var KINDS = [['映画', '🎬 映画'], ['ドラマ', '📺 ドラマ'], ['漫画', '📚 漫画'], ['YouTube', '▶️ YouTube'], ['バラエティ', '😆 バラエティ'], ['曲', '🎵 曲'], ['デート', '💑 デート']];
  var KNOW = [['好き', '💗', '好き'], ['普通', '🙂', '知ってる'], ['苦手', '👎', '苦手']];
  var BTNS = KNOW.concat([['知らない', '❓', '知らない']]);
  var MEMO_MAX = 100;
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
    listEl.innerHTML = '<div class="note ck-note">知っているものは 💗🙂👎、知らないものは ❓ を押してください（押さなくてもOK＝押していないものは「たぶん知らない」として扱います）。同じボタンをもう一度押すと取り消し。押した行には 📝 でひとことを残せます。押したものは、次に開いたとき下に回ります。</div>' +
      order.map(function (c, i) { return rowHtml(c, i); }).join('');
  }

  function rowHtml(c, i) {
    var memo = c.hyoka ? (c.memo ? '<button class="ck-memo has" data-ck-memo>📝 ' + esc(c.memo) + '</button>' : '<button class="ck-memo" data-ck-memo>📝 メモ</button>') : '';
    return '<div class="ck-item' + (c.hyoka ? ' done' : '') + '" data-ck-i="' + i + '"><div class="ck-name">' + esc(c.name) +
      (c.setsumei ? '<small>' + esc(c.setsumei) + '</small>' : '') + memo + '</div><div class="ck-btns">' +
      BTNS.map(function (b) {
        return '<button class="ck-btn' + (c.hyoka === b[0] ? ' on h-' + b[0] : '') + '" data-ck-h="' + b[0] + '" aria-label="' + b[2] + '">' + b[1] + '<small>' + b[2] + '</small></button>';
      }).join('') + '</div></div>';
  }

  function press(row, h) {
    var c = order[Number(row.dataset.ckI)];
    if (!c) return;
    var before = c.hyoka, beforeMemo = c.memo || '';
    var next = before === h ? '' : h;
    c.hyoka = next;
    // 取り消し＝メモも消える（シートの行ごと消えるため）
    if (!next) c.memo = '';
    render(false);
    send({ shurui: c.shurui, name: c.name, hyoka: next, doko: 'チェック', memo: c.memo || '' }).catch(function (err) {
      c.hyoka = before;
      c.memo = beforeMemo;
      render(false);
      UI.toast('保存できませんでした：' + err.message);
    });
  }

  // 📝メモ＝小さなシートで書く。評価はそのままで memo だけ送り直す
  function editMemo(row) {
    var c = order[Number(row.dataset.ckI)];
    if (!c || !c.hyoka) return;
    var b = BTNS.filter(function (x) { return x[0] === c.hyoka; })[0] || ['', '', c.hyoka];
    var sh = UI.openSheet('<h2>📝 メモ</h2><div class="note">' + esc(c.name) + '（' + b[1] + ' ' + esc(b[2]) + '）</div>' +
      '<textarea id="ckMemoText" maxlength="' + MEMO_MAX + '" placeholder="例：面白いけど最近はちょっと微妙／2の方が好き／いつか見たい">' + esc(c.memo || '') + '</textarea>' +
      '<div class="note">' + MEMO_MAX + '文字まで。空にして保存すると消えます。18時の回がおすすめを選ぶ材料にします。</div>' +
      '<button class="btn wide" data-ck-memo-save>保存</button>');
    var ta = sh.querySelector('#ckMemoText');
    ta.focus();
    sh.querySelector('[data-ck-memo-save]').addEventListener('click', function () {
      var before = c.memo || '';
      var memo = ta.value.trim().substring(0, MEMO_MAX);
      UI.closeSheet();
      if (memo === before) return;
      c.memo = memo;
      render(false);
      send({ shurui: c.shurui, name: c.name, hyoka: c.hyoka, doko: 'チェック', memo: memo }).then(function () {
        UI.toast(memo ? 'メモを保存しました' : 'メモを消しました');
      }).catch(function (err) {
        c.memo = before;
        render(false);
        UI.toast('保存できませんでした：' + err.message);
      });
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
    if (b) { press(b.closest('.ck-item'), b.dataset.ckH); return; }
    var m = e.target.closest('[data-ck-memo]');
    if (m) editMemo(m.closest('.ck-item'));
  });
  document.getElementById('checkBack').addEventListener('click', function () { Main.show('settings'); });

  // 🎁カードの「💡 知ってた」＝評価を選ぶ小さなシート。選んだら onPick(評価)
  function choose(title, onPick) {
    var sh = UI.openSheet('<h2>💡 知ってた</h2><div class="note">' + esc(title) + '</div>' +
      '<h3>どうだった？</h3><div class="ck-choose">' +
      KNOW.map(function (b) { return '<button class="btn sub" data-pick="' + b[0] + '">' + b[1] + ' ' + b[2] + '</button>'; }).join('') + '</div>' +
      '<div class="note">💗好き＝「好きなもの」に入って、次から好みの材料になります。どれを選んでも、これはもう🎁に出しません（👎苦手は近いものも避けます）。</div>');
    sh.querySelectorAll('[data-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () { UI.closeSheet(); onPick(btn.dataset.pick); });
    });
  }

  return { open: open, choose: choose, send: send };
})();
