// suki.js — 💗好きなもの（🎁今週の1本を選ぶ材料）
//   設定タブの「🎁おすすめ」の箱の中（一覧＋足す・消す）と、🎁カードを開いた下の「好きなものを思い出したら足す」で使う
//   シート「好きなもの」に入る → 次の18時の回から、クロコが選ぶ材料にする（ここにある作品そのものは出ない）
var Suki = (function () {
  var esc = UI.esc;
  // 値はシートの「種類」の列にそのまま入る（GASの SUKI_KINDS と同じ並び）
  var KINDS = [['映画', '🎬 映画'], ['ドラマ', '📺 ドラマ'], ['漫画', '📚 漫画'], ['YouTube', '▶️ YouTube'], ['歌手', '🎵 歌手・曲'], ['バラエティ', '😆 バラエティ'], ['その他', '📌 その他']];
  // 足したあとに描き直しても、選んでいた種類が元に戻らないように覚えておく
  var lastKind = '映画';

  function formHtml(kind) {
    var cur = kind || lastKind;
    return '<div class="form suki-form"><div class="suki-row"><select class="suki-kind" aria-label="種類">' +
      KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (k[0] === cur ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') +
      '</select><input type="text" class="suki-name" placeholder="名前（例：カイジ）" maxlength="60" enterkeyhint="done"></div>' +
      '<button class="btn" data-suki-add>💗 追加</button></div>';
  }

  function listHtml(list) {
    if (!list.length) return '<div class="note">まだ何も入っていません。</div>';
    return KINDS.map(function (k) {
      var mine = list.filter(function (s) { return s.shurui === k[0]; });
      if (!mine.length) return '';
      return '<div class="suki-group"><div class="suki-kind-name">' + k[1] + '（' + mine.length + '）</div><div class="suki-chips">' +
        mine.map(function (s) {
          return '<span class="suki-chip">' + esc(s.name) + '<button data-suki-del data-shurui="' + esc(s.shurui) + '" data-name="' + esc(s.name) + '" aria-label="' + esc(s.name) + 'を消す">×</button></span>';
        }).join('') + '</div></div>';
    }).join('');
  }

  // 設定タブの箱の中に入れるかたまり
  function boxHtml(list) {
    if (!list) return '';
    return '<h3 class="plan-head">💗 好きなもの</h3>' +
      '<div class="note">「これも好きだった」と思い出したら足してください。次の18時の回から、選ぶ材料に使います（ここにある作品そのものは出しません）。</div>' +
      formHtml() + listHtml(list);
  }

  function add(form, onChange) {
    var kind = form.querySelector('.suki-kind').value;
    var input = form.querySelector('.suki-name');
    var btn = form.querySelector('[data-suki-add]');
    var name = input.value.trim();
    if (!name) { UI.toast('名前を入れてください'); input.focus(); return; }
    lastKind = kind;
    btn.disabled = true;
    API.call('addSuki', { shurui: kind, name: name }).then(function (res) {
      UI.toast('💗 足しました：' + name);
      input.value = '';
      btn.disabled = false;
      onChange(res.suki);
    }).catch(function (err) { UI.toast(err.message); btn.disabled = false; });
  }

  // root の中の「追加」「×」を動かす。変わったら onChange(新しい一覧)
  function bind(root, onChange) {
    root.addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-suki-add]');
      if (addBtn) { add(addBtn.closest('.suki-form'), onChange); return; }
      var del = e.target.closest('[data-suki-del]');
      if (del) {
        if (!confirm('「' + del.dataset.name + '」を好きなものから消しますか？')) return;
        del.disabled = true;
        API.call('delSuki', { shurui: del.dataset.shurui, name: del.dataset.name }).then(function (res) {
          UI.toast('消しました');
          onChange(res.suki);
        }).catch(function (err) { UI.toast(err.message); del.disabled = false; });
      }
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing || !e.target.classList.contains('suki-name')) return;
      e.preventDefault();
      add(e.target.closest('.suki-form'), onChange);
    });
  }

  // 🎁カードから開く小さなシート。足しても閉じない（続けて何個か足せる）
  function openAdd(kind) {
    UI.openSheet('<h2>💗 好きなものを足す</h2>' +
      '<div class="note">次の18時の回から、選ぶ材料に使います。一覧を見る・消すのは、設定タブの「🎁おすすめ」の箱の中です。</div>' +
      formHtml(kind) + '<div class="suki-added"></div>');
  }

  // シートは使い回しなので、最初に1回だけつなぐ
  bind(document.getElementById('sheet'), function () {
    var box = document.querySelector('#sheet .suki-added');
    if (box) box.innerHTML = '<div class="note">足しました。続けて足せます（終わったら右上の × で閉じる）。</div>';
  });

  return { boxHtml: boxHtml, bind: bind, openAdd: openAdd };
})();
