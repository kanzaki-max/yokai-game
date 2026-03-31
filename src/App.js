import { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';

// ===== 定数 =====
const ENCOUNTER_RATE   = { N: 0.70, R: 0.25 };
const GAUGE_CAP        = { N: 100, R: 160 }; // N=5回, R=8回で完了 (×20)
const CAPTURE_MAX_TURNS    = 5;
const DISSATISFACTION_UP   = { N: 20, R: 35 };
const DISSATISFACTION_DOWN = 10;

// 妖怪の状態定義
const YOKAI_STATES = [
  {
    id: 'hungry',
    hint: 'なんかええ匂いせえへんか…',
    good: ['food'],
    bad: ['talk', 'play', 'praise'],
  },
  {
    id: 'tired',
    hint: 'ちょっと休ませてくれんか…',
    good: ['praise', 'talk'],
    bad: ['play'],
  },
  {
    id: 'alone',
    hint: '…（無言でそっぽを向いている）',
    good: ['alone'],
    bad: ['talk', 'praise'],
  },
  {
    id: 'bored',
    hint: 'ヒマじゃのう、なんかないんか',
    good: ['play', 'talk'],
    bad: ['food'],
  },
  {
    id: 'happy',
    hint: 'まあ、悪い気はせんな',
    good: ['talk', 'food', 'play', 'praise', 'alone'],
    bad: [],
  },
];

const REACTIONS_GOOD    = ['…ありがとな', 'ええのう', '悪くないな', 'まあ、そうやな', 'それはええな'];
const REACTIONS_BAD     = ['今はそれじゃない…', 'ほっといてくれ', 'なんか違う', 'それはちょっと…'];
const REACTIONS_ANGRY   = ['…もうほっといてくれ', 'なんでそんなことするんや', 'いい加減にしてくれ…'];
const REACTIONS_NEUTRAL = ['…まあええか', 'ふん…', 'そうか'];
const PEACE_PER_RELEASE = Math.round(100 / 9);

const rarityLabel = { N: 'ノーマル', R: 'レア' };

// ===== 妖怪リスト =====
const yokaiList = [
  {
    id: '001', name: 'もたれ小僧', feature: '電車でもたれかかってくる',
    habitat: '朝の満員電車', rarity: 'N',
    description: 'この妖怪はもたれ小僧。\n疲れてしまっているのでしょうか。\nお疲れ様です。私の肩でゆっくりしていて下さい。',
    weakness: { correct: 'じっと見つめる', wrong: ['その場を離れる', '声をかける'] },
    farewell: 'もう誰にももたれかからへんで。約束や',
    affinity: {
      good: ['talk', 'praise'], bad: 'play',
      badReaction: '遊ぶ元気、今はないんです…',
    },
    reactions: {
      talk:   ['え…なんで話しかけるんですか', '…話すのも、悪くないですね'],
      food:   ['…（もぐもぐ）', 'ありがとう、少し元気が出ました'],
      play:   ['遊ぶって、どうやって…？', 'ふふ、楽しいかもしれません'],
      praise: ['べ、別に嬉しくないですよ', '…ありがとう。素直にそう言えます'],
    },
  },
  {
    id: '002', name: '降車拒否霊', feature: '電車を降りるときにどかない',
    habitat: '夕方の急行', rarity: 'N',
    description: 'この妖怪は降車拒否霊。\n動きたくない気持ち、よくわかります。\n面倒ですもんね。\nちょっと後ろ失礼しますね。',
    weakness: { correct: '「すみません」と声をかける', wrong: ['じっと見つめる', '先に降りる'] },
    farewell: '次の停車駅で、ちゃんと降ります',
    affinity: {
      good: ['food', 'talk'], bad: 'praise',
      badReaction: 'ほめられると逆に落ち着きません…',
    },
    reactions: {
      talk:   ['降りたくないんです、まだ', '…少し、外が気になってきました'],
      food:   ['食べたら降りないといけないですよね', '美味しいです。ありがとう'],
      play:   ['電車の中でどう遊ぶんですか', '次は駅の外で遊びたいです'],
      praise: ['ほめないでください、恥ずかしい', '…もっとほめてもいいですよ？'],
    },
  },
  {
    id: '003', name: '武勇伝おじ', feature: '昔の武勇伝を繰り返し語る',
    habitat: '会社の飲み会', rarity: 'R',
    description: 'この妖怪は武勇伝おじ。\n昔の話を聞いてほしいのでしょう。\nあなたの話、ちゃんと聞かせてください。\nへ〜、そんなことがあったんですね。',
    weakness: { correct: '話を遮る', wrong: ['うなずき続ける', 'その場を離れる', '声を荒げる'] },
    farewell: '…最近の話も、してみようかな',
    affinity: {
      good: ['talk', 'food'], bad: 'play',
      badReaction: '遊びより話を聞いてほしいんや！',
    },
    reactions: {
      talk:   ['そういえば昔こんなことがあってな…', '…最近の話もたまには面白いな'],
      food:   ['こういう食べ物は昔からな…（始まった）', '美味いな。ありがとうよ'],
      play:   ['ワシの若い頃はもっと体を動かして…', '久しぶりに楽しいわ'],
      praise: ['そうやろ！ワシはすごいんじゃ！', '…お前もたいしたもんや'],
    },
  },
  {
    id: '004', name: '直進タックル鬼', feature: '歩いていて全くどかない',
    habitat: '駅の通路', rarity: 'N',
    description: 'この妖怪は直進タックル鬼。\n真っすぐ進みたい気持ち、まっすぐですね。\n少しだけ、道を分かち合いましょう。',
    weakness: { correct: '絶対に動かない', wrong: ['大きく避ける', '立ち止まる'] },
    farewell: '道は…みんなのものだったな',
    affinity: {
      good: ['play', 'praise'], bad: 'talk',
      badReaction: '…（さらにそっぽを向く）',
    },
    reactions: {
      talk:   ['…（無言でにらむ）', '…少し、話せそうな気がする'],
      food:   ['（黙って受け取る）', '……うまい'],
      play:   ['遊ぶ？俺が？', '…楽しいな、これ'],
      praise: ['（反応なし）', '……悪くない'],
    },
  },
  {
    id: '005', name: '割り込み忍者', feature: 'レジや改札で平然と割り込む',
    habitat: 'コンビニ・駅', rarity: 'N',
    description: 'この妖怪は割り込み忍者。\n急いでいるのでしょうか。\n影が薄くてすみません。\nここにいますよ。気づいてくれると嬉しいです。',
    weakness: { correct: '先に並ぶ', wrong: ['声をかける', '見て見ぬふりをする'] },
    farewell: '列の後ろに並ぶの、悪くないですね',
    affinity: {
      good: ['praise', 'talk'], bad: 'food',
      badReaction: 'そういうのいいんで、時間の方が大事です',
    },
    reactions: {
      talk:   ['急いでるので手短に', '…ちゃんと聞いてくれるんですね'],
      food:   ['あ、それ先に取らせて……って、ごめんなさい', 'ちゃんと順番で受け取ります'],
      play:   ['時間がもったいない！', '…たまにはいいか'],
      praise: ['お世辞はいいです', '…ありがとうございます'],
    },
  },
  {
    id: '006', name: '音漏れ大魔王', feature: 'イヤホンから音が筒抜け',
    habitat: '電車全般', rarity: 'N',
    description: 'この妖怪は音漏れ大魔王。\n好きな音楽に夢中なのでしょうか。\nその曲、いい曲ですよね。',
    weakness: { correct: '視線を送る', wrong: ['耳をふさぐ', 'その場を離れる'] },
    farewell: '音量、下げます。約束します',
    affinity: {
      good: ['food', 'play'], bad: 'praise',
      badReaction: 'え？（ボリューム上げる）聞こえませんでした！',
    },
    reactions: {
      talk:   ['（イヤホンを外さず）え？何か言いましたか？', 'あ、聞こえてました。ごめんなさい'],
      food:   ['（音楽聴きながら食べる）', 'あ、これおいしい。音楽止めて食べよっと'],
      play:   ['ゲームするの？音量大きくしていいですか？', '音量、気にするようになりました'],
      praise: ['え？私ですか？（大声）あ、すみません', 'ありがとうございます。静かに言えました'],
    },
  },
  {
    id: '007', name: '会議長老', feature: '誰も求めていない話を会議で延々と語る',
    habitat: '会社の会議室', rarity: 'R',
    description: 'この妖怪は会議長老。\n伝えたいことがたくさんあるのでしょう。\nその思い、きちんと受け取りたいと思います。',
    weakness: { correct: '議題に戻す', wrong: ['うなずき続ける', 'メモを取る', 'その場を離れる'] },
    farewell: '短く話す。それだけ言っておく',
    affinity: {
      good: ['talk', 'praise'], bad: 'play',
      badReaction: '遊びとは何の関係が…それより話が途中で',
    },
    reactions: {
      talk:   ['そういえば昔こんな案件があってな…', '…短く話すのも大事だな'],
      food:   ['食事中もお伝えしたいことがあって…', '食事は食事として楽しもう'],
      play:   ['遊びにも学びが必要で…', 'たまには何も考えず楽しむか'],
      praise: ['それはそれとして、もうひとつ言わせてほしいのだが', 'ありがとう。それだけにしておく'],
    },
  },
  {
    id: '008', name: 'スマホ歩き亡霊', feature: 'スマホを見ながらふらふら歩く',
    habitat: '駅・街中', rarity: 'N',
    description: 'この妖怪はスマホ歩き亡霊。\n大切な相手とのメッセージを見ているのでしょうか。\n足元も、見てあげてくださいね。',
    weakness: { correct: '前に立ち止まる', wrong: ['大きく避ける', '声をかける'] },
    farewell: 'スマホより、目の前が大事でした',
    affinity: {
      good: ['play', 'talk'], bad: 'food',
      badReaction: '食べながらスマホ見ていいですか？',
    },
    reactions: {
      talk:   ['（スマホから目を離さず）あ、はい…', 'スマホ、しまいますね'],
      food:   ['写真撮っていいですか？（スマホ出す）', '食べる間はスマホ置いときます'],
      play:   ['スマホゲームのことですか？', 'スマホ以外の遊びも楽しいんですね'],
      praise: ['ちょっと待って、今いいとこで…', 'ありがとうございます！顔上げて言えた'],
    },
  },
  {
    id: '009', name: '傘ぶんぶん侍', feature: '歩きながら傘を横に振り回す',
    habitat: '雨の日の駅', rarity: 'R',
    description: 'この妖怪は傘ぶんぶん侍。\n雨の日は気持ちが弾むのでしょうか。\nその元気、少しだけおさめてくれると助かります。',
    weakness: { correct: '距離を取る', wrong: ['じっと見つめる', '声をかける', '走って逃げる'] },
    farewell: '傘は…たたんで歩きます',
    affinity: {
      good: ['praise', 'food'], bad: 'talk',
      badReaction: '（話の途中も傘をぶんぶんする）',
    },
    reactions: {
      talk:   ['（傘を振り回しながら）何か用ですか？', '傘、ちゃんとたたんで話します'],
      food:   ['傘持ったまま食べていいですか？', '傘はそこに置いておきます'],
      play:   ['傘で何か遊べますか？', '傘なしでも楽しめるんですね'],
      praise: ['（傘をぶんぶんして喜ぶ）', 'ありがとう。落ち着いて受け取ります'],
    },
  },
];

// ===== ユーティリティ =====
function getGaugeGood(dissatisfaction) {
  if (dissatisfaction <= 30) return 20;
  if (dissatisfaction <= 60) return 12;
  return 6;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPeaceStatus(pct) {
  if (pct <= 20) return { label: '街は混乱しています…', color: '#cc4444' };
  if (pct <= 50) return { label: '少しずつ平和になってきました', color: '#c8820a' };
  if (pct <= 80) return { label: '街に笑顔が増えてきました！', color: '#4a9a6a' };
  return { label: '完全平和！妖怪ゼロの街が実現しました', color: '#2a7ab5' };
}

// ===== ホーム画面 =====
function HomeScreen({ peace, onEncounter, onHallOfFame, capturedList, onRehab }) {
  const status = getPeaceStatus(peace);
  return (
    <div className="screen home-screen">
      <header className="app-header">
        <h1>日常妖怪ハンター</h1>
        <p className="app-subtitle">妖怪を捕まえて、更生させて、街を平和にしよう！</p>
      </header>

      <div className="peace-meter">
        <div className="peace-header">
          <span className="peace-title">街の平和度</span>
          <span className="peace-pct" style={{ color: status.color }}>{peace}%</span>
        </div>
        <div className="peace-bar-bg">
          <div className="peace-bar-fill" style={{ width: `${peace}%` }} />
        </div>
        <div className="peace-comment" style={{ color: status.color }}>{status.label}</div>
      </div>

      {capturedList.length > 0 && (
        <div className="home-rehab-banner">
          <span className="home-rehab-count">捕獲済み：{capturedList.length}体</span>
          <button className="btn-primary home-rehab-btn" onClick={onRehab}>更生させる</button>
        </div>
      )}

      <section className="yokai-section">
        <div className="home-section-header">
          <h2>妖怪一覧</h2>
          <button className="btn-ghost hall-link-btn" onClick={onHallOfFame}>殿堂を見る</button>
        </div>
        <div className="yokai-grid">
          {yokaiList.map((yokai) => (
            <div key={yokai.id} className={`yokai-card rarity-${yokai.rarity}`}>
              <div className="yokai-id">#{yokai.id}</div>
              <div className="yokai-name">{yokai.name}</div>
              <div className="yokai-feature">{yokai.feature}</div>
              <div className="yokai-habitat">生息地：{yokai.habitat}</div>
              <div className="yokai-rarity">{rarityLabel[yokai.rarity]}</div>
              <button className="btn-primary" onClick={() => onEncounter(yokai)}>
                遭遇する
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===== 見つからなかった画面 =====
function MissedScreen({ yokai, onBack }) {
  useEffect(() => {
    const t = setTimeout(onBack, 2500);
    return () => clearTimeout(t);
  }, [onBack]);

  return (
    <div className="screen missed-screen">
      <div className="missed-box">
        <p className="missed-name">{yokai.name}</p>
        <p className="missed-msg">今は見つかりませんでした…</p>
        <p className="missed-hint">{yokai.rarity === 'R' ? 'レア妖怪はなかなか現れません' : 'もう一度試してみましょう'}</p>
      </div>
    </div>
  );
}

// ===== 遭遇画面 =====
function EncounterScreen({ yokai, onGo, onBack }) {
  return (
    <div className="screen encounter-screen">
      <div className="encounter-box">
        <p className="encounter-report">目撃情報が入りました！</p>
        <p className="encounter-location">「{yokai.habitat}」</p>
        <p className="encounter-yokai-name">{yokai.name}</p>
        <p className="encounter-question">現場に向かいますか？</p>
        <div className="encounter-actions">
          <button className="btn-primary" onClick={onGo}>向かう</button>
          <button className="btn-ghost" onClick={onBack}>もどる</button>
        </div>
      </div>
    </div>
  );
}

// ===== 説明シーン =====
const TYPEWRITER_SPEED = 80;

function DescriptionScene({ yokai, onDone }) {
  const fullText = yokai.description;
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState('typing');
  const timerRef = useRef(null);

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    setPhase('typing');

    timerRef.current = setInterval(() => {
      i += 1;
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(timerRef.current);
        timerRef.current = setTimeout(() => setPhase('fadeout'), 3000);
      }
    }, TYPEWRITER_SPEED);

    return () => clearInterval(timerRef.current);
  }, [fullText]);

  useEffect(() => {
    if (phase === 'fadeout') {
      timerRef.current = setTimeout(() => setPhase('dark'), 800);
    } else if (phase === 'dark') {
      timerRef.current = setTimeout(() => setPhase('phrase'), 500);
    } else if (phase === 'phrase') {
      timerRef.current = setTimeout(() => onDone(), 2500);
    }
    return () => clearTimeout(timerRef.current);
  }, [phase, onDone]);

  if (phase === 'dark') return <div className="scene-dark" />;

  if (phase === 'phrase') {
    return (
      <div className="scene-dark scene-phrase-wrap">
        <p className="scene-phrase">……。捕まえましょうか。</p>
      </div>
    );
  }

  return (
    <div className={`description-scene ${phase === 'fadeout' ? 'fadeout' : ''}`}>
      <div className="description-box">
        <p className="description-text">
          {displayed.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </p>
      </div>
    </div>
  );
}

// ===== 捕獲画面 =====
function rollSpecialStatus() {
  const r = Math.random();
  if (r < 0.10) return 'strong';    // ダメージ半減
  if (r < 0.20) return 'flinching'; // ダメージ2倍
  return null;
}

function getCaptureRate(hp) {
  if (hp === 0)   return 0.90;
  if (hp <= 25)   return 0.70;
  if (hp <= 50)   return 0.40;
  return 0.10;
}

function CaptureScreen({ yokai, onCaptured, onBack }) {
  const choices = useMemo(
    () => shuffle([yokai.weakness.correct, ...yokai.weakness.wrong]),
    [yokai]
  );
  const isRare = yokai.rarity === 'R';

  // phases: pre_turn | action_choice | weakness_choice | attack_result | capture_fail | captured | escaped
  const [hp, setHp]                       = useState(100);
  const [turnCount, setTurnCount]         = useState(0);
  const [phase, setPhase]                 = useState('pre_turn');
  const [specialStatus, setSpecialStatus] = useState(() => rollSpecialStatus());
  const [resultMsg, setResultMsg]         = useState('');
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // pre_turn → action_choice の自動遷移
  useEffect(() => {
    if (phase !== 'pre_turn') return;
    const t = setTimeout(() => setPhase('action_choice'), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  // ターン終了処理（攻撃・捕獲失敗共通）
  function advanceTurn(newTurn) {
    if (isRare && newTurn >= CAPTURE_MAX_TURNS) {
      setPhase('escaped');
    } else {
      setSpecialStatus(rollSpecialStatus());
      setPhase('pre_turn');
    }
  }

  // 攻撃する → 弱点選択肢へ
  function handleAttack() {
    setPhase('weakness_choice');
  }

  // 捕獲する → 捕獲判定
  function handleCaptureAttempt() {
    const newTurn = turnCount + 1;
    setTurnCount(newTurn);
    if (Math.random() < getCaptureRate(hp)) {
      setPhase('captured');
    } else {
      setResultMsg('まだ捕まらない！');
      setPhase('capture_fail');
      timerRef.current = setTimeout(() => advanceTurn(newTurn), 1500);
    }
  }

  // 弱点選択肢を選んだ
  function handleWeaknessChoice(choice) {
    if (phase !== 'weakness_choice') return;

    const isCorrect = choice === yokai.weakness.correct;
    let damage = isCorrect
      ? 20 + Math.floor(Math.random() * 16)  // 20〜35
      : 5  + Math.floor(Math.random() * 11); // 5〜15

    if (specialStatus === 'strong')    damage = Math.floor(damage / 2);
    if (specialStatus === 'flinching') damage = damage * 2;

    const newHp   = Math.max(0, hp - damage);
    const newTurn = turnCount + 1;

    setHp(newHp);
    setTurnCount(newTurn);
    setResultMsg(isCorrect ? `効果があった！（-${damage}）` : `ダメージを与えた。（-${damage}）`);
    setPhase('attack_result');

    timerRef.current = setTimeout(() => advanceTurn(newTurn), 1500);
  }

  // 捕獲成功
  if (phase === 'captured') {
    return (
      <div className="screen capture-screen">
        <div className="capture-box">
          <p className="capture-hint">捕まえた！</p>
          <p className="capture-yokai-name capture-shrink">{yokai.name}</p>
          <p className="capture-success-msg">
            {yokai.name}はひるんだ。<br />優しく捕まえましょう。
          </p>
          <button className="btn-primary capture-next-btn" onClick={onCaptured}>
            ホームへもどる
          </button>
        </div>
      </div>
    );
  }

  // 逃げられた（R 専用）
  if (phase === 'escaped') {
    return (
      <div className="screen capture-screen">
        <div className="capture-box">
          <p className="capture-escaped-label">逃げられた…</p>
          <p className="capture-yokai-name">{yokai.name}</p>
          <p className="capture-escaped-msg">
            {yokai.name}は逃げてしまいました。<br />また出会える日を待ちましょう。
          </p>
          <button className="btn-ghost capture-next-btn" onClick={onBack}>
            ホームにもどる
          </button>
        </div>
      </div>
    );
  }

  const hpColor = hp <= 25 ? '#cc4444' : hp <= 50 ? '#c8820a' : '#4a9a6a';
  const showTurns = isRare && phase !== 'attack_result' && phase !== 'capture_fail';

  return (
    <div className="screen capture-screen">
      <div className="capture-box">
        <p className="capture-yokai-name">{yokai.name}</p>

        {/* 体力バー */}
        <div className="capture-hp-wrap">
          <div className="capture-hp-header">
            <span className="capture-hp-label">体力</span>
            <span className="capture-hp-pct" style={{ color: hpColor }}>{hp}</span>
          </div>
          <div className="capture-hp-bg">
            <div
              className="capture-hp-fill"
              style={{ width: `${hp}%`, backgroundColor: hpColor }}
            />
          </div>
        </div>

        {/* R：残りターン数 */}
        {showTurns && (
          <p className="capture-turns-left">残りターン：{CAPTURE_MAX_TURNS - turnCount}</p>
        )}

        {/* 特殊状態アナウンス（pre_turn） */}
        {phase === 'pre_turn' && (
          <p className="capture-special-msg">
            {specialStatus === 'strong'    && '妖怪が強がっている！'}
            {specialStatus === 'flinching' && '妖怪がひるんでいる！'}
            {!specialStatus                && '……'}
          </p>
        )}

        {/* 行動選択：攻撃する／捕獲する */}
        {phase === 'action_choice' && (
          <div className="capture-action-choice">
            <p className="capture-prompt">どうしますか？</p>
            <div className="capture-choices">
              <button className="capture-choice-btn" onClick={handleAttack}>攻撃する</button>
              <button className="capture-choice-btn" onClick={handleCaptureAttempt}>捕獲する</button>
            </div>
          </div>
        )}

        {/* 弱点選択肢 */}
        {phase === 'weakness_choice' && (
          <>
            <p className="capture-prompt">どうやって対処しますか？</p>
            <div className="capture-choices">
              {choices.map((choice) => (
                <button
                  key={choice}
                  className="capture-choice-btn"
                  onClick={() => handleWeaknessChoice(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 結果メッセージ */}
        {(phase === 'attack_result' || phase === 'capture_fail') && (
          <p className="capture-result-msg">{resultMsg}</p>
        )}

        <div className="capture-give-up-wrap">
          <button className="capture-give-up-link" onClick={onBack}>諦める</button>
        </div>
      </div>
    </div>
  );
}

// ===== 更生画面 =====
function pickState() {
  return YOKAI_STATES[Math.floor(Math.random() * YOKAI_STATES.length)];
}

function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== 更生リスト画面 =====
function RehabListScreen({ capturedList, onSelect, onBack }) {
  return (
    <div className="screen rehab-list-screen">
      <header className="rehab-list-header">
        <button className="btn-ghost rehab-list-back-btn" onClick={onBack}>← もどる</button>
        <h2>更生させる</h2>
        <p className="rehab-list-subtitle">妖怪を選んでください</p>
      </header>
      <div className="rehab-list-grid">
        {capturedList.map((yokai, index) => (
          <div key={`${yokai.id}-${index}`} className={`rehab-list-card rarity-${yokai.rarity}`}>
            <div className="rehab-list-card-id">#{yokai.id}</div>
            <div className="rehab-list-card-name">{yokai.name}</div>
            <div className="rehab-list-card-feature">{yokai.feature}</div>
            <div className="rehab-list-card-rarity">{rarityLabel[yokai.rarity]}</div>
            <button className="btn-primary rehab-list-select-btn" onClick={() => onSelect(index)}>
              更生させる
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RehabScreen({ yokai, onReleased }) {
  const [gauge, setGauge]                     = useState(0);
  const [dissatisfaction, setDissatisfaction] = useState(0);
  const [currentState, setCurrentState]       = useState(() => pickState());
  const [reaction, setReaction]               = useState('');
  const [reactionKey, setReactionKey]         = useState(0);
  const [reactionType, setReactionType]       = useState('good');
  const [released, setReleased]               = useState(false);

  const gaugeCap     = GAUGE_CAP[yokai.rarity];
  const gaugePercent = Math.min(100, Math.round((gauge / gaugeCap) * 100));
  const isMax        = gauge >= gaugeCap;

  function applyAction(actionKey) {
    const isGood = currentState.good.includes(actionKey);
    const isBad  = currentState.bad.includes(actionKey);
    let text, type;

    if (isGood) {
      const rawBonus = getGaugeGood(dissatisfaction);
      setGauge((g) => Math.min(gaugeCap, g + rawBonus));
      setDissatisfaction((d) => Math.max(0, d - DISSATISFACTION_DOWN));
      text = pickFrom(REACTIONS_GOOD);
      type = 'good';
    } else if (isBad) {
      const newDis = Math.min(100, dissatisfaction + DISSATISFACTION_UP[yokai.rarity]);
      setDissatisfaction(newDis);
      text = newDis >= 61 ? pickFrom(REACTIONS_ANGRY) : pickFrom(REACTIONS_BAD);
      type = 'bad';
    } else {
      text = pickFrom(REACTIONS_NEUTRAL);
      type = 'neutral';
    }

    setReaction(text);
    setReactionKey((k) => k + 1);
    setReactionType(type);
    setCurrentState(pickState());
  }

  function handleRelease() {
    setReleased(true);
    setTimeout(() => onReleased(yokai), 2000);
  }

  if (released) {
    return (
      <div className="screen rehab-screen">
        <div className="rehab-box">
          <p className="rehab-release-msg">
            {yokai.name}が旅立ちました。<br />ありがとう、またね。
          </p>
        </div>
      </div>
    );
  }

  const disColor = dissatisfaction >= 61 ? '#cc4444' : dissatisfaction >= 31 ? '#c8820a' : '#9E8272';

  return (
    <div className="screen rehab-screen">
      <div className="rehab-box">
        <p className="rehab-yokai-name">{yokai.name}</p>

        {/* 更生度ゲージ */}
        <div className="rehab-gauge-wrap">
          <div className="rehab-gauge-header">
            <span className="rehab-gauge-label">更生度</span>
            <span className="rehab-gauge-pct">{gaugePercent}%</span>
          </div>
          <div className="rehab-gauge-bg">
            <div
              className={`rehab-gauge-fill ${isMax ? 'max' : ''}`}
              style={{ width: `${gaugePercent}%` }}
            />
          </div>
          {yokai.rarity === 'R' && (
            <p className="rehab-rarity-hint">レア妖怪：更生に時間がかかります</p>
          )}
        </div>

        {/* 不満度ゲージ */}
        {!isMax && (
          <div className="rehab-dissatisfaction-wrap">
            <div className="rehab-dissatisfaction-header">
              <span className="rehab-dissatisfaction-label">不満度</span>
              <span className="rehab-dissatisfaction-pct" style={{ color: disColor }}>
                {dissatisfaction}%
              </span>
            </div>
            <div className="rehab-dissatisfaction-bg">
              <div
                className="rehab-dissatisfaction-fill"
                style={{ width: `${dissatisfaction}%`, backgroundColor: disColor }}
              />
            </div>
          </div>
        )}

        {/* ヒントセリフ（現在の状態） */}
        {!isMax && (
          <p className="rehab-hint">「{currentState.hint}」</p>
        )}

        {/* リアクション（アクション後） */}
        <div className="rehab-reaction-area">
          {reaction && (
            <p key={reactionKey} className={`rehab-reaction ${reactionType === 'bad' ? 'bad' : ''}`}>
              「{reaction}」
            </p>
          )}
        </div>

        {/* アクションボタン */}
        {!isMax && (
          <div className="rehab-actions">
            <button className="rehab-action-btn" onClick={() => applyAction('talk')}>
              会話する
            </button>
            <button className="rehab-action-btn" onClick={() => applyAction('food')}>
              ご飯をあげる
            </button>
            <button className="rehab-action-btn" onClick={() => applyAction('play')}>
              一緒に遊ぶ
            </button>
            <button className="rehab-action-btn" onClick={() => applyAction('praise')}>
              褒める
            </button>
            {currentState.id === 'alone' && (
              <button className="rehab-action-btn rehab-action-alone" onClick={() => applyAction('alone')}>
                そっとしておく
              </button>
            )}
          </div>
        )}

        {/* 解放ボタン */}
        {isMax && (
          <div className="rehab-release-area">
            <p className="rehab-complete-msg">
              更生完了！<br />{yokai.name}はもう大丈夫そうです。
            </p>
            <button className="btn-primary rehab-release-btn" onClick={handleRelease}>
              解放する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 殿堂画面 =====
function HallOfFameScreen({ releasedList, onBack }) {
  return (
    <div className="screen hall-screen">
      <header className="hall-header">
        <button className="btn-ghost hall-back-btn" onClick={onBack}>← もどる</button>
        <h2>殿堂</h2>
        <p className="hall-subtitle">更生して旅立った元妖怪たち</p>
      </header>

      {releasedList.length === 0 ? (
        <p className="hall-empty">まだ更生した妖怪はいません</p>
      ) : (
        <div className="hall-grid">
          {releasedList.map((yokai, index) => (
            <div key={`${yokai.id}-${index}`} className={`hall-card rarity-${yokai.rarity}`}>
              <div className="hall-card-id">#{yokai.id}</div>
              <div className="hall-card-name">{yokai.name}</div>
              <div className="hall-card-farewell">「{yokai.farewell}」</div>
              <div className="hall-card-rarity">{rarityLabel[yokai.rarity]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== App =====
function App() {
  const [capturedList, setCapturedList]   = useState([]);
  const [releasedList, setReleasedList]   = useState([]);
  const [screen, setScreen]               = useState('home');
  const [selectedYokai, setSelectedYokai] = useState(null);

  const peace = Math.min(100, releasedList.length * PEACE_PER_RELEASE);

  function handleEncounterAttempt(yokai) {
    const rate = ENCOUNTER_RATE[yokai.rarity];
    setSelectedYokai(yokai);
    if (Math.random() < rate) {
      setScreen('encounter');
    } else {
      setScreen('missed');
    }
  }

  // 捕獲成功 → capturedList に追加してホームへ
  function handleCaptured() {
    setCapturedList((prev) => [...prev, selectedYokai]);
    setScreen('home');
  }

  // 更生リストから妖怪を選択
  function handleSelectRehab(index) {
    setSelectedYokai({ ...capturedList[index], captureIndex: index });
    setScreen('rehab');
  }

  // 更生・解放完了 → capturedList から除去して releasedList へ
  function handleReleased(yokai) {
    setCapturedList((prev) => {
      const next = [...prev];
      next.splice(yokai.captureIndex, 1);
      return next;
    });
    setReleasedList((prev) => [...prev, yokai]);
    setScreen('home');
  }

  return (
    <div className="App">
      {screen === 'home' && (
        <HomeScreen
          peace={peace}
          onEncounter={handleEncounterAttempt}
          onHallOfFame={() => setScreen('hall')}
          capturedList={capturedList}
          onRehab={() => setScreen('rehab_list')}
        />
      )}
      {screen === 'missed' && (
        <MissedScreen
          yokai={selectedYokai}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'hall' && (
        <HallOfFameScreen
          releasedList={releasedList}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'encounter' && (
        <EncounterScreen
          yokai={selectedYokai}
          onGo={() => setScreen('description')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'description' && (
        <DescriptionScene
          yokai={selectedYokai}
          onDone={() => setScreen('capture')}
        />
      )}
      {screen === 'capture' && (
        <CaptureScreen
          yokai={selectedYokai}
          onCaptured={handleCaptured}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'rehab_list' && (
        <RehabListScreen
          capturedList={capturedList}
          onSelect={handleSelectRehab}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'rehab' && (
        <RehabScreen
          yokai={selectedYokai}
          onReleased={handleReleased}
        />
      )}
    </div>
  );
}

export default App;
