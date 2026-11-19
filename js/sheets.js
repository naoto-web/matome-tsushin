// sheets.js — 下から出るシート：⭐🐟🎁の中身／👍👎・見た/やめたの送信
var Sheets = (function () {
  var esc = UI.esc;

  function lines(v) {
    if (Array.isArray(v)) return v;
    return String(v || '').split('\n').filter(function (s) { return s.trim(); });
  }

  function linkify(s) {
    return esc(s).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>'; });
  }

  // ⭐：📝3行で言うと／🔍ちなみに／🗣クロコのコメント／元の記事（💬雑談ネタは11/12廃止＝古い記事だけ出る）　🐟：💡なぜ？／💬雑談で使うなら／📚出典
  function detail(it, onClose) {
    var b = it.body || {};
    var g = UI.genre(it.genre);
    var html;
    if (it.kind === '⭐') {
      html = '<div class="kind-line">⭐ クロコのイチオシ　' + esc(g.emoji + ' ' + g.name) + (it.followup ? '　🔁続報' : '') + '</div>' +
        '<h2>' + esc(it.title) + '</h2>' +
        (b.sanko ? '<h3>📝 3行で言うと</h3><ul>' + lines(b.sanko).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
        (b.zatsudan ? '<h3>💬 雑談ネタ</h3><p>' + esc(b.zatsudan) + '</p>' : '') +
        (b.chinami ? '<h3>🔍 ちなみに</h3><p>' + esc(b.chinami) + '</p>' : '') +
        (b.comment ? '<h3>🗣 クロコのコメント</h3><p>' + esc(b.comment) + '</p>' : '');
    } else if (it.kind === '🦁') {
      // 🦁学長ライブ（11/19〜）：🗣一言で使うなら／📝今日のまとめ／💰税金の話（全部）／📌そのほか大事な話／ほかに出た話（見出しだけ）
      // 1件＝{t:"12:29", q:"質問・話題", a:"学長の答え"}。t を押すと動画のその場面へ（アーカイブは5日で消える）
      var qa = function (list) {
        return [].concat(list || []).map(function (x) {
          var sec = 0;
          String(x.t || '').split(':').forEach(function (n) { sec = sec * 60 + (Number(n) || 0); });
          var at = x.t ? (it.url ? '<a href="' + esc(it.url + (it.url.indexOf('?') < 0 ? '?' : '&') + 't=' + sec + 's') + '" target="_blank" rel="noopener">▶' + esc(x.t) + '</a>' : esc(x.t)) : '';
          return '<div class="qa"><div class="q">' + esc(x.q || '') + (at ? '　<span class="at">' + at + '</span>' : '') + '</div>' +
            lines(x.a).map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') + '</div>';
        }).join('');
      };
      var zei = [].concat(b.zei || []);
      html = '<div class="kind-line gakucho">🦁 学長ライブ</div>' +
        '<h2>' + esc(it.title) + '</h2>' +
        (b.hitokoto ? '<h3>🗣 一言で使うなら</h3><p>' + esc(b.hitokoto) + '</p>' : '') +
        (b.matome ? '<h3>📝 今日のまとめ</h3><ul>' + lines(b.matome).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
        '<h3>💰 税金の話（' + zei.length + '件）</h3>' + (zei.length ? qa(zei) : '<p class="note">この日は税金の話は出ませんでした。</p>') +
        ([].concat(b.daiji || []).length ? '<h3>📌 そのほか大事な話</h3>' + qa(b.daiji) : '') +
        ([].concat(b.hoka || []).length ? '<h3>💬 ほかに出た話（見出しだけ）</h3><ul>' + [].concat(b.hoka).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
        '<div class="note">自動の字幕から書いた要約です（聞き違いが入ることがあります）。大事な話は▶の場面で確かめる。アーカイブは5日で消えます。</div>';
    } else if (it.kind === '🎁') {
      // 🎁：どんな作品？／なぜ合いそう？／最初の一歩／どこで見る＋下に控え2本（軽め・🔥か📼）
      var d = it.done || {};
      // 💑デートの週＝行き先＋ご飯屋さん（gohan）／🎵今週の1曲。見出しとボタンの文字だけ変える
      var date = /デート/.test(b.shurui || '');
      var song = UI.ipponWaku(it) === '曲';
      var gohan = b.gohan || null;
      var did = UI.ipponDid(it);
      var didBtn = (date ? '👣 ' : song ? '🎧 ' : '👀 ') + did;
      var placeLink = date ? '場所のページへ' : song ? '聴く場所へ' : '見る場所へ';
      var doneBtns = function (w, small) {
        return '<div class="row' + (small ? ' small' : '') + '">' +
          '<button class="btn sub' + (d[w] === '見た' ? ' on' : '') + '" data-done="見た" data-w="' + w + '">' + didBtn + '</button>' +
          '<button class="btn sub' + (d[w] === 'やめた' ? ' on' : '') + '" data-done="やめた" data-w="' + w + '">🙅 やめた</button></div>';
      };
      // 📌見たいリストに入れる（mitai.js・11/16）＝デートと曲のカードには出さない
      var mitaiBtn = function (w, small) {
        if (date || song) return '';
        return '<div class="row' + (small ? ' small' : '') + '"><button class="btn sub wide" data-mitai-card="' + w + '">📌 見たいリストに入れる（あとで見る用）</button></div>';
      };
      var hikae = [].concat(b.hikae || []).slice(0, 2);
      html = '<div class="kind-line ippon">' + esc(UI.ipponLabel(it)) + '　' + esc(b.shurui || '') + '</div>' +
        '<h2>' + esc(it.title) + '</h2>' +
        (b.naiyou ? '<h3>' + (date ? '🗺 どんな場所？' : song ? '🎵 どんな曲？' : '🎬 どんな作品？') + '</h3><ul>' + lines(b.naiyou).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '') +
        (b.naze ? '<h3>🎯 なぜNaotoに合いそう？</h3><p>' + esc(b.naze) + '</p>' : '') +
        (b.ippo ? '<h3>🚪 最初の一歩</h3><p>' + esc(b.ippo) + '</p>' : '') +
        (b.doko ? '<h3>' + (date ? '🚃 行き方' : song ? '📍 どこで聴く' : '📍 どこで見る') + '</h3><p>' + esc(b.doko) + '</p>' : '') +
        (b.yomikata ? '<h3>📱 読み方</h3><p>' + esc(b.yomikata) + '</p>' : '') +
        (b.tsuzuki ? '<h3>📖 続きを読みたくなったら</h3><p>' + esc(b.tsuzuki) + '</p>' : '') +
        (gohan && gohan.name ? '<h3>🍽 セットのご飯屋さん</h3><p><b>' + esc(gohan.name) + '</b>' +
          (gohan.genre || gohan.yosan ? '（' + esc([gohan.genre, gohan.yosan].filter(Boolean).join('・')) + '）' : '') + '</p>' +
          (gohan.naze ? '<p>' + esc(gohan.naze) + '</p>' : '') +
          '<p class="note">' + esc(gohan.eigyo || '') + (gohan.url ? '　<a href="' + esc(gohan.url) + '" target="_blank" rel="noopener">お店のページへ</a>' : '') + '</p>' : '') +
        (b.hyoi ? '<h3>👫 ひょいと</h3><p>' + esc(b.hyoi) + '</p>' : '') +
        '<div class="note">合わなかったら、途中でやめてOK。「やめた」も次の1本選びの材料になります。</div>' +
        doneBtns('0') + mitaiBtn('0', false) +
        (hikae.length ? '<h3>🔁 気分じゃなければ、こっち</h3>' + hikae.map(function (h, i) {
          return '<div class="hikae">' +
            '<div class="hk-head">' + (h.label ? '<span class="tag">' + esc(h.label) + '</span>' : '') + '<b>' + esc(h.title || '') + '</b></div>' +
            (h.naiyou ? '<p>' + esc(h.naiyou) + '</p>' : '') +
            (h.doko ? '<p class="note">📍 ' + esc(h.doko) + (h.url ? '　<a href="' + esc(h.url) + '" target="_blank" rel="noopener">' + placeLink + '</a>' : '') + '</p>' : '') +
            (h.gohan ? '<p class="note">🍽 ' + esc(h.gohan) + (h.gohanUrl ? '　<a href="' + esc(h.gohanUrl) + '" target="_blank" rel="noopener">お店のページへ</a>' : '') + '</p>' : '') +
            (h.tsuzuki ? '<p class="note">📖 続き：' + esc(h.tsuzuki) + '</p>' : '') +
            doneBtns(String(i + 1), true) + mitaiBtn(String(i + 1), true) + '</div>';
        }).join('') : '');
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
      (it.url ? '<a class="btn wide" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + (it.kind === '🎁' ? placeLink : it.kind === '🦁' ? 'ライブのアーカイブへ' : '元の記事へ') + '</a>' : '') +
      '<button class="btn sub' + (it.fb === 'good' ? ' on' : '') + '" data-fb="good">👍</button>' +
      '<button class="btn sub' + (it.fb === 'bad' ? ' on' : '') + '" data-fb="bad">👎</button></div>';
    // 🎁（デート以外）の一番下＝読んでいて「これも好きだった」と思い出したとき用の入口（suki.js）
    var sukiKind = '';
    if (it.kind === '🎁' && UI.ipponWaku(it) !== 'デート') {
      var sr = String((it.body || {}).shurui || '');
      sukiKind = UI.ipponWaku(it) === '曲' ? '歌手' : /ドラマ/.test(sr) ? 'ドラマ' : /漫画/.test(sr) ? '漫画' : /YouTube/.test(sr) ? 'YouTube' : '映画';
      html += '<div class="row"><button class="btn sub wide" data-suki-open>💗 好きなものを思い出したら足す</button></div>';
    }
    var sh = UI.openSheet(html, onClose);
    var sukiBtn = sh.querySelector('[data-suki-open]');
    if (sukiBtn) sukiBtn.addEventListener('click', function () {
      UI.closeSheet();
      Suki.openAdd(sukiKind);
    });
    sh.querySelectorAll('[data-mitai-card]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var w = btn.dataset.mitaiCard;
        var bb = it.body || {};
        var h = w === '0' ? null : [].concat(bb.hikae || [])[Number(w) - 1];
        var title = h ? h.title : it.title;
        // 🎮流行りの遊びは「その他」に入れる
        Mitai.addFromCard(/^🎮/.test(title || '') ? '🎮' : bb.shurui, title, h ? h.doko : bb.doko, btn);
      });
    });
    sh.querySelectorAll('[data-fb]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var good = btn.dataset.fb === 'good';
        UI.closeSheet();
        feedback(it, good);
      });
    });
    sh.querySelectorAll('[data-done]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var w = btn.dataset.w || '0';
        var result = btn.dataset.done;
        var h = w === '0' ? null : [].concat((it.body || {}).hikae || [])[Number(w) - 1];
        it.done = it.done || {};
        it.done[w] = result;
        UI.closeSheet();
        document.querySelectorAll('.card[data-id="' + String(it.id).replace(/"/g, '') + '"] .state').forEach(function (s) { s.textContent = UI.ipponState(it); });
        // 本命か控えに「見た」／本命に「やめた」＝ホームから外す（アーカイブには残る・11/16）
        var gone = UI.ipponFinished(it.done);
        var homeIt = gone ? Home.lookup(it.id) : null;
        if (homeIt) Home.remove(homeIt, document.querySelector('#timeline .card[data-id="' + String(it.id).replace(/"/g, '') + '"]'));
        UI.toast((result === '見た' ? didBtn : '🙅 やめた') + '、を記録しました' + (homeIt ? '（ホームから外しました）' : ''));
        API.call('ippon', { id: it.id, result: result, w: Number(w), title: h ? h.title : '' }).catch(function (err) { UI.toast('送れませんでした：' + err.message); });
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
