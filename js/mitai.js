// mitai.js — 📌見たいもの（見たい・読みたい作品の置き場）＝11/16
//   設定タブの「📌見たいもの」の箱（一覧＋足す・見た・消す）と、🎁カードの「📌見たいリストに入れる」で使う
//   シート「見たいもの」に入る → 18時の回は、ここにある作品を🎁に出さない（もう知っている）・好みを読む材料にする
var Mitai = (function () {
  var esc = UI.esc;
  // 値はシートの「種類」の列にそのまま入る（GASの MITAI_KINDS と同じ並び）
  var KINDS = [['映画', '🎬 映画'], ['ドラマ', '📺 ドラマ'], ['アニメ', '🧸 アニメ'], ['漫画', '📚 漫画'], ['本', '📖 本'], ['YouTube', '▶️ YouTube'], ['その他', '📌 その他']];
  var lastKind = '映画';
  // 今出している一覧（作品を押したときに中身を開く用）
  var cur = [];

  function formHtml() {
    return '<div class="form mitai-form"><div class="suki-row"><select class="mitai-kind" aria-label="種類">' +
      KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (k[0] === lastKind ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') +
      '</select><input type="text" class="mitai-name" placeholder="名前（例：国宝）" maxlength="60" enterkeyhint="done"></div>' +
      '<button class="btn" data-mitai-add>📌 追加</button></div>';
  }

  // "2026-11-16" → "11/16"
  function md(d) {
    var m = String(d || '').match(/^\d{4}-(\d{2})-(\d{2})/);
    return m ? Number(m[1]) + '/' + Number(m[2]) : '';
  }

  function rowHtml(s) {
    var attrs = ' data-shurui="' + esc(s.shurui) + '" data-name="' + esc(s.name) + '"';
    var sub = s.info ? '📍 ' + s.info.doko : s.done ? s.memo : '🔍 次の18時の回で、あらすじと見られる場所を調べます';
    return '<div class="mitai-item' + (s.done ? ' done' : '') + '"><button class="mitai-name-text" data-mitai-open="' + cur.indexOf(s) + '">' + esc(s.name) +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>' +
      '<button class="mitai-btn" data-mitai-done="' + (s.done ? '0' : '1') + '"' + attrs + '>' + (s.done ? '戻す' : '☐ 見た') + '</button>' +
      '<button class="mitai-btn del" data-mitai-del' + attrs + ' aria-label="' + esc(s.name) + 'を消す">×</button></div>';
  }

  function groupHtml(list) {
    return KINDS.map(function (k) {
      var mine = list.filter(function (s) { return s.shurui === k[0]; });
      if (!mine.length) return '';
      return '<div class="suki-group"><div class="suki-kind-name">' + k[1] + '（' + mine.length + '）</div>' + mine.map(rowHtml).join('') + '</div>';
    }).join('');
  }

  function count(list) {
    return (list || []).filter(function (s) { return !s.done; }).length;
  }

  // 設定タブの箱の中身
  function boxHtml(list) {
    if (!list) return '';
    cur = list;
    var todo = list.filter(function (s) { return !s.done; });
    var done = list.filter(function (s) { return s.done; });
    return '<div class="note">見たい・読みたいと思ったものを入れておく場所です。🎁のカードからも入れられます。ここにある作品は、🎁のおすすめには出しません。</div>' +
      formHtml() +
      (todo.length ? groupHtml(todo) : '<div class="note mitai-empty">まだ何も入っていません。</div>') +
      (done.length ? '<details class="mitai-done"><summary>見終わったもの（' + done.length + '）</summary>' + groupHtml(done) + '</details>' : '');
  }

  function add(form, onChange) {
    var kind = form.querySelector('.mitai-kind').value;
    var input = form.querySelector('.mitai-name');
    var btn = form.querySelector('[data-mitai-add]');
    var name = input.value.trim();
    if (!name) { UI.toast('名前を入れてください'); input.focus(); return; }
    lastKind = kind;
    btn.disabled = true;
    API.call('addMitai', { shurui: kind, name: name }).then(function (res) {
      UI.toast('📌 入れました：' + name);
      onChange(res.mitai);
    }).catch(function (err) { UI.toast(err.message); btn.disabled = false; });
  }

  // 作品を押したら、下から中身を出す（あらすじ・どこで見られる・調べた日）
  function openDetail(s) {
    var i = s.info;
    var kind = (KINDS.filter(function (k) { return k[0] === s.shurui; })[0] || ['', s.shurui])[1];
    UI.openSheet('<div class="kind-line ippon">📌 見たいもの　' + esc(kind) + '</div><h2>' + esc(s.name) + '</h2>' +
      (i ? (i.gaiyou ? '<h3>🎬 どんな作品？</h3><p>' + esc(i.gaiyou) + '</p>' : '') +
        (i.doko ? '<h3>📍 どこで見られる</h3><p>' + esc(i.doko) + '</p>' : '') +
        (i.memo ? '<p class="note">' + esc(i.memo) + '</p>' : '') +
        '<p class="note">' + esc(md(i.date)) + 'に調べた内容です（配信先は変わることがあります・月1回調べ直します）</p>' +
        (i.url ? '<div class="row"><a class="btn wide" href="' + esc(i.url) + '" target="_blank" rel="noopener">見る場所へ</a></div>' : '')
        : '<p>まだ調べていません。次の18時の回で、あらすじと見られる場所を調べます。</p>') +
      (s.memo ? '<p class="note">入れたときのメモ：' + esc(s.memo) + '</p>' : ''));
  }

  // root の中の「追加」「見た」「×」「作品名」を動かす。変わったら onChange(新しい一覧)
  function bind(root, onChange) {
    root.addEventListener('click', function (e) {
      var op = e.target.closest('[data-mitai-open]');
      if (op) { var s = cur[Number(op.dataset.mitaiOpen)]; if (s) openDetail(s); return; }
      var addBtn = e.target.closest('[data-mitai-add]');
      if (addBtn) { add(addBtn.closest('.mitai-form'), onChange); return; }
      var dn = e.target.closest('[data-mitai-done]');
      if (dn) {
        dn.disabled = true;
        var on = dn.dataset.mitaiDone === '1';
        API.call('doneMitai', { shurui: dn.dataset.shurui, name: dn.dataset.name, done: on }).then(function (res) {
          UI.toast(on ? '✅ 見た、にしました' : 'まだ、に戻しました');
          onChange(res.mitai);
        }).catch(function (err) { UI.toast(err.message); dn.disabled = false; });
        return;
      }
      var del = e.target.closest('[data-mitai-del]');
      if (del) {
        if (!confirm('「' + del.dataset.name + '」を見たいものから消しますか？')) return;
        del.disabled = true;
        API.call('delMitai', { shurui: del.dataset.shurui, name: del.dataset.name }).then(function (res) {
          UI.toast('消しました');
          onChange(res.mitai);
        }).catch(function (err) { UI.toast(err.message); del.disabled = false; });
      }
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing || !e.target.classList.contains('mitai-name')) return;
      e.preventDefault();
      add(e.target.closest('.mitai-form'), onChange);
    });
  }

  // 🎁の種類（🎬映画 など）→ 見たいものの種類。デート・曲は入れない
  function kindOf(shurui) {
    var s = String(shurui || '');
    return /ドラマ/.test(s) ? 'ドラマ' : /漫画/.test(s) ? '漫画' : /YouTube/i.test(s) ? 'YouTube' : /映画/.test(s) ? '映画' : 'その他';
  }

  // 🎁カードから入れる。作品名のうしろの（2012年・プライムビデオ）などは外す
  function addFromCard(shurui, title, memo, btn) {
    var name = String(title || '').replace(/^🎮\s*/, '').replace(/[（(][^（）()]*[）)]\s*$/, '').trim() || String(title || '');
    if (btn) btn.disabled = true;
    return API.call('addMitai', { shurui: kindOf(shurui), name: name, memo: memo || '' }).then(function () {
      UI.toast('📌 見たいリストに入れました：' + name);
      if (btn) btn.textContent = '📌 入れました';
    }).catch(function (err) {
      UI.toast(err.message);
      if (btn) btn.disabled = /もう入っています/.test(err.message);
    });
  }

  return { boxHtml: boxHtml, bind: bind, count: count, addFromCard: addFromCard };
})();
