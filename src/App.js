import { useState, useEffect, useRef } from 'react';
import './App.css';
import bgmTitle     from './sound/bgm-title.mp3';
import bgmHome      from './sound/bgm-home.mp3';
import bgmEncounter from './sound/bgm-encounter.mp3';
import bgmBattle    from './sound/bgm-battle.mp3';
import bgmRehab     from './sound/bgm-rehab.mp3';
import bgmFarewell  from './sound/bgm-farewell.mp3';
import bgmSkill     from './sound/bgm-skill.mp3';
import bloomImg   from './images/ブルーム.png';
import lanceImg   from './images/ランス.png';
import mosImg     from './images/モス.png';
import irisImg    from './images/アイリス.png';
import rushImg    from './images/ラッシュ.png';
import slipImg    from './images/スリップ.png';
import sageImg    from './images/セージ.png';
import elderImg   from './images/エルダー.png';
import ghostImg   from './images/ゴースト.png';
import ivyImg     from './images/アイビー.png';
import hazeImg    from './images/ヘイズ.png';
import preachImg  from './images/プリーチ.png';
import pennyImg   from './images/ペニー.png';
import roarImg    from './images/ロアー.png';
import lastImg    from './images/ラスト.png';
import bgTrain from './images/train.png';
import bgOffice from './images/office.png';
import bgConvenience from './images/convenience.png';
import bgIzakaya from './images/izakaya.jpeg';

const LOCATION_BG = {
  train:       bgTrain,
  office:      bgOffice,
  convenience: bgConvenience,
  izakaya:     bgIzakaya,
};

// ===== 定数 =====
const GAUGE_CAP        = { N: 100, R: 160, SR: 240, UR: 360 };
const CAPTURE_TURNS    = { N: 10, R: 7, SR: 3 }; // UR はランダム（1〜3）
const DISSATISFACTION_UP   = { N: 20, R: 35, SR: 50, UR: 70 };
const DISSATISFACTION_DOWN = 10;
const ACTION_MAX           = 5;
const ACTION_RECOVERY_MS   = 12 * 60 * 1000; // 12分

// 場所ごとの生息キャラ
const LOCATION_YOKAI = {
  train:       ['001', '002', '006', '008', '014'],
  office:      ['003', '007', '010', '012', '013'],
  convenience: ['005', '004'],
  izakaya:     ['011', '010', '015'],
};

const LOCATION_TEXT = {
  train:       'ガタンゴトン…混んでいる車内。',
  office:      'コンコン…会議室の扉の向こう。',
  convenience: 'ピピッ…レジが忙しそうだ。',
  izakaya:     'ガヤガヤ…賑やかな店内。',
};

const LOCATION_LABEL = {
  train:       '電車',
  office:      '会社',
  convenience: 'コンビニ',
  izakaya:     '居酒屋',
};

// 妖怪の状態定義
const YOKAI_STATES = [
  {
    id: 'hungry',
    hint: '…なんか食べたい',
    good: ['food'],
    bad: ['talk', 'play', 'praise'],
  },
  {
    id: 'tired',
    hint: '…眠い。そっとして',
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
    hint: '…暇。なんかして',
    good: ['play', 'talk'],
    bad: ['food'],
  },
  {
    id: 'happy',
    hint: '…まあ、悪くない気分',
    good: ['talk', 'food', 'play', 'praise', 'alone'],
    bad: [],
  },
];

// 更生度ティア別リアクション（low: 0-30%, mid: 31-60%, high: 61-100%）
const REACTIONS_TIER = {
  good: {
    low:  ['…別に', 'うるさいな', '…まあいいけど'],
    mid:  ['…悪くないかも', 'まあ、そうかな', '…ちょっとだけ嬉しい'],
    high: ['…ありがとう', 'それ、好きかも', '嬉しい。本当に'],
  },
  bad: {
    low:  ['今はやめて', '触らないでほしい', '…うざい'],
    mid:  ['それは違う', '…ちょっと待って', 'もういいです'],
    high: ['それは違うかな', '…今じゃないかな', 'もう少し考えて'],
  },
  angry: {
    low:  ['もう無理', '帰って', '…限界'],
    mid:  ['やめてって言ってる', '…怒ってるんだけど', 'いい加減にして'],
    high: ['怒ってるよ', 'それはさすがに…', '…ごめんって言って'],
  },
  neutral: {
    low:  ['…', 'そう', '…知らない'],
    mid:  ['まあ', 'そうだね', '…うん'],
    high: ['そうかもね', '…わかった', 'なるほど'],
  },
};

// 突っつきリアクション（ティア別）
const POKE_REACTIONS = {
  low:  ['…なんですか', '触らないで', 'やめて', '…うるさい'],
  mid:  ['なんですか', '…びっくりした', 'やめてください', '…なに？'],
  high: ['もう…', '…なんで突っつくんですか', 'やめてって', '…ちょっと！'],
};

function getTier(pct) {
  if (pct <= 30) return 'low';
  if (pct <= 60) return 'mid';
  return 'high';
}
const rarityLabel = { N: 'ノーマル', R: 'レア', SR: 'スーパーレア', UR: 'ウルトラレア' };

// ===== BGM ファイルマップ =====
const BGM_SRC = {
  title:     bgmTitle,
  home:      bgmHome,
  encounter: bgmEncounter,
  battle:    bgmBattle,
  rehab:     bgmRehab,
  farewell:  bgmFarewell,
  skill:     bgmSkill,
};


// ===== タイプシステム =====
// 三すくみ: 笑→無×2, 無→怒×2, 怒→笑×2（逆は×0.5）
const MAIN_TYPE_CHART = {
  '笑': { '笑': 1.0, '無': 2.0, '怒': 0.5 },
  '無': { '無': 1.0, '怒': 2.0, '笑': 0.5 },
  '怒': { '怒': 1.0, '笑': 2.0, '無': 0.5 },
};

function calcTypeMultiplier(skillType, yokaiMainType, yokaiSubType) {
  let m = MAIN_TYPE_CHART[skillType]?.[yokaiMainType] ?? 1.0;
  // 対立ペア: 陽キャラ×陰技 or 陰キャラ×陽技 → ×1.5
  if (yokaiSubType === '陽' && skillType === '陰') m *= 1.5;
  if (yokaiSubType === '陰' && skillType === '陽') m *= 1.5;
  return m;
}

const TYPE_COLOR = {
  '笑': '#E8874A',
  '無': '#888888',
  '怒': '#cc4444',
  '陽': '#c8820a',
  '陰': '#7b52ab',
};

// 技のベースダメージ範囲
const SKILL_POWER_BASE = {
  '小':   [5,  8],
  '中':   [10, 15],
  '大':   [18, 25],
  '特大': [28, 35],
};

function rollSkillDamage(power) {
  const [min, max] = SKILL_POWER_BASE[power] ?? [15, 25];
  return min + Math.floor(Math.random() * (max - min + 1));
}

// 技の使用回数上限（小・中は無制限）
const SKILL_USE_LIMIT = { '大': 3, '特大': 1 };

const EFFECT_LABELS = {
  'sure_hit': '必中',
  'multi':    '連続',
  'confuse':  '混乱',
  'seal':     '封印',
};

// ===== 技リスト =====
const ALL_SKILLS = [
  // 初期技
  { id: 'spring_breeze',   name: '春風',     type: '笑', power: '小',  effect: null },
  { id: 'margin',          name: '余白',     type: '無', power: '小',  effect: null },
  { id: 'direct_words',    name: '直言',     type: '怒', power: '小',  effect: null },
  // 習得技
  { id: 'sunlight',        name: '陽だまり', type: '笑', power: '中',  effect: null },
  { id: 'observe',         name: '静観',     type: '無', power: '中',  effect: null },
  { id: 'proper_path',     name: '正道',     type: '怒', power: '中',  effect: null },
  { id: 'tone',            name: '音色',     type: '笑', power: '中',  effect: null },
  { id: 'listen',          name: '傾聴',     type: '笑', power: '中',  effect: 'confuse' },
  { id: 'dialogue',        name: '問答',     type: '怒', power: '大',  effect: null },
  { id: 'first_move',      name: '先手',     type: '笑', power: '中',  effect: 'seal' },
  { id: 'response',        name: '応答',     type: '無', power: '大',  effect: 'confuse' },
  { id: 'awakening',       name: '覚醒',     type: '無', power: '中',  effect: 'sure_hit' },
  { id: 'wind_pattern',    name: '風紋',     type: '怒', power: '小',  effect: 'multi' },
  { id: 'proof',           name: '証明',     type: '怒', power: '大',  effect: 'seal' },
  { id: 'silent_pressure', name: '無音の圧', type: '無', power: '特大', effect: 'sure_hit' },
  { id: 'settlement',      name: '清算',     type: '怒', power: '大',  effect: 'sure_hit' },
  { id: 'night_curtain',   name: '夜の帳',   type: '怒', power: '特大', effect: 'seal' },
];

const INITIAL_SKILL_IDS = ['spring_breeze', 'margin', 'direct_words'];

// 更生完了時に習得できる技（yokai.id → skillId）
const YOKAI_SKILL_MAP = {
  '001': 'sunlight',
  '002': 'observe',
  '007': 'proper_path',
  '006': 'tone',
  '010': 'listen',
  '003': 'dialogue',
  '005': 'first_move',
  '012': 'response',
  '008': 'awakening',
  '009': 'wind_pattern',
  '013': 'proof',
  '014': 'silent_pressure',
  '011': 'settlement',
  '015': 'night_curtain',
};

// ===== 技のlocalStorage =====
const ALL_SKILL_IDS = new Set(ALL_SKILLS.map(s => s.id));

// バージョンを変えると旧データを自動リセット
const GAME_DATA_VERSION = '2';

function loadOwnedSkills() {
  try {
    const version = localStorage.getItem('data_version');
    if (version === GAME_DATA_VERSION) {
      const raw = localStorage.getItem('owned_skills');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every(id => ALL_SKILL_IDS.has(id)) &&
          INITIAL_SKILL_IDS.every(id => parsed.includes(id))
        ) {
          return parsed;
        }
      }
    }
  } catch {}
  // 旧バージョン・不正データ → 初期3技にリセット
  localStorage.setItem('data_version', GAME_DATA_VERSION);
  saveOwnedSkills([...INITIAL_SKILL_IDS]);
  return [...INITIAL_SKILL_IDS];
}

function saveOwnedSkills(ids) {
  try {
    localStorage.setItem('owned_skills', JSON.stringify(ids));
  } catch {}
}

// 開発用リセット（コンソールから window.resetGame() で呼ぶ）
window.resetGame = function () {
  ['owned_skills', 'saved_deck', 'mute', 'data_version'].forEach(k => localStorage.removeItem(k));
  window.location.reload();
};

function loadSavedDeck() {
  try {
    const raw = localStorage.getItem('saved_deck');
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids) && ids.length === 3) return ids;
    }
  } catch {}
  return [...INITIAL_SKILL_IDS];
}

function saveDeckToStorage(ids) {
  try {
    localStorage.setItem('saved_deck', JSON.stringify(ids));
  } catch {}
}

// ===== 妖怪リスト =====
const yokaiList = [
  {
    id: '001', name: 'モス', feature: '電車でもたれかかってくる', image: mosImg,
    habitat: '朝の満員電車', rarity: 'N', mainType: '無', subType: '陰',
    subText: '電車でもたれかかってくるモックだ。',
    description: '疲れてしまっているのでしょうか。\nお疲れ様です。私の肩でゆっくりしていて下さい。',
    weakness: { correct: 'じっと見つめる', wrong: ['その場を離れる', '声をかける'] },
    farewell: 'もう誰にももたれないよ。約束する',
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
    id: '002', name: 'アイリス', feature: '電車を降りるときにどかない', image: irisImg,
    habitat: '夕方の急行', rarity: 'N', mainType: '無', subType: '陰',
    subText: '電車を降りるときに全くどかないモックだ。',
    description: '動きたくない気持ち、よくわかります。\n面倒ですもんね。\nちょっと後ろ失礼しますね。',
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
    id: '003', name: 'セージ', feature: '昔の武勇伝を繰り返し語る', image: sageImg,
    habitat: '会社の飲み会', rarity: 'R', mainType: '怒', subType: '陽',
    subText: '昔の武勇伝を繰り返し語るモックだ。',
    description: '昔の話を聞いてほしいのでしょう。\nあなたの話、ちゃんと聞かせてください。\nへ〜、そんなことがあったんですね。',
    weakness: { correct: '話を遮る', wrong: ['うなずき続ける', 'その場を離れる', '声を荒げる'] },
    farewell: '…最近の話も、してみようかな',
    affinity: {
      good: ['talk', 'food'], bad: 'play',
      badReaction: '遊びより話を聞いてほしいんや！',
    },
    reactions: {
      talk:   ['昔ね、聞いてほしいんだけど…', '…最近の話も、悪くないかな'],
      food:   ['こういうの、昔から好きなんです', '…美味しい。ありがとう'],
      play:   ['昔はもっと動いてたんだけど…', '久しぶりに、楽しいかも'],
      praise: ['そうでしょ！わかってくれた？', '…あなたも、悪くないね'],
    },
  },
  {
    id: '004', name: 'ラッシュ', feature: '歩いていて全くどかない', image: rushImg,
    habitat: '駅の通路', rarity: 'N', mainType: '無', subType: '陽',
    subText: '歩いていて全くどかないモックだ。',
    description: '真っすぐ進みたい気持ち、まっすぐですね。\n少しだけ、道を分かち合いましょう。',
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
    id: '005', name: 'スリップ', feature: 'レジや改札で平然と割り込む', image: slipImg,
    habitat: 'コンビニ・駅', rarity: 'N', mainType: '笑', subType: '陰',
    subText: 'レジや改札で平然と割り込むモックだ。',
    description: '急いでいるのでしょうか。\n影が薄くてすみません。\nここにいますよ。気づいてくれると嬉しいです。',
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
    id: '006', name: 'ブルーム', feature: 'イヤホンから音が筒抜け',
    habitat: '電車全般', rarity: 'N', mainType: '笑', subType: '陰',
    image: bloomImg,
    subText: 'イヤホンから音が筒抜けのモックだ。',
    description: '好きな音楽に夢中なのでしょうか。\nその曲、いい曲ですよね。',
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
    id: '007', name: 'エルダー', feature: '誰も求めていない話を会議で延々と語る', image: elderImg,
    habitat: '会社の会議室', rarity: 'R', mainType: '怒', subType: '陽',
    subText: '誰も求めていない話を延々と語るモックだ。',
    description: '伝えたいことがたくさんあるのでしょう。\nその思い、きちんと受け取りたいと思います。',
    weakness: { correct: '議題に戻す', wrong: ['うなずき続ける', 'メモを取る', 'その場を離れる'] },
    farewell: '短く話す。それだけ言っておく',
    affinity: {
      good: ['talk', 'praise'], bad: 'play',
      badReaction: '遊びとは何の関係が…それより話が途中で',
    },
    reactions: {
      talk:   ['昔こんな案件があって、聞いてもいい？', '…短く話すのも大事だね'],
      food:   ['食事中もお伝えしたいことがあって…', '食事は食事として楽しもう'],
      play:   ['遊びにも学びが必要で…', 'たまには何も考えず楽しむか'],
      praise: ['あと一つだけ言っていいですか', 'ありがとう。それだけにしておく'],
    },
  },
  {
    id: '008', name: 'ヘイズ', feature: 'スマホを見ながらふらふら歩く', image: hazeImg,
    habitat: '駅・街中', rarity: 'N', mainType: '無', subType: '陰',
    subText: 'スマホを見ながらふらふら歩くモックだ。',
    description: '大切な相手とのメッセージを見ているのでしょうか。\n足元も、見てあげてくださいね。',
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
    id: '009', name: 'ランス', feature: '歩きながら傘を横に振り回す', image: lanceImg,
    habitat: '雨の日の駅', rarity: 'R', mainType: '怒', subType: '陽',
    subText: '傘を横に振り回しながら歩くモックだ。',
    description: '雨の日は気持ちが弾むのでしょうか。\nその元気、少しだけおさめてくれると助かります。',
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
  {
    id: '010', name: 'プリーチ', feature: '頼んでもいないのに長々と説教してくる', image: preachImg,
    habitat: '会社・居酒屋', rarity: 'SR', mainType: '怒', subType: '陽',
    subText: '頼んでもいないのに説教してくるモックだ。',
    description: '何か伝えたいことがあるのでしょうか。\nはい、ちゃんと聞いています。\nおっしゃる通りです。',
    weakness: { correct: '話を聞いているふりをする', wrong: ['反論する', '話を遮る', '席を立つ'] },
    farewell: '…みんな、ちゃんと聞いてくれてたんだ',
    affinity: { good: ['talk', 'praise'], bad: 'play', badReaction: '遊んでいる場合じゃないんです！' },
    reactions: {
      talk:   ['そうでしょ！だからね…（続く）', '…聞いてくれる人がいたんだ'],
      food:   ['食事中も言わせてほしいんだけど', '美味しい。少し落ち着いた'],
      play:   ['遊んでいる場合か！', '…久しぶりに、無心で遊んだ'],
      praise: ['でしょ！私は正しい！', '…褒められると、少し楽になるな'],
    },
  },
  {
    id: '011', name: 'ペニー', feature: '飲み会で絶対に多く払わない・細かく計算する', image: pennyImg,
    habitat: '居酒屋', rarity: 'SR', mainType: '怒', subType: '陽',
    subText: '飲み会で絶対に多く払わないモックだ。',
    description: '計算が得意なのでしょうか。\n几帳面なんですね、すごいです。\nじゃあ私が払っておきますね。',
    weakness: { correct: '先に支払いを済ませる', wrong: ['計算に付き合う', '割り勘を主張する', '諦める'] },
    farewell: '…次は、ちゃんと払います',
    affinity: { good: ['food', 'praise'], bad: 'play', badReaction: '遊ぶ前に精算してください！' },
    reactions: {
      talk:   ['私は○○円です。計算は正確に', '…少し、気にしすぎかもしれません'],
      food:   ['このメニュー何円？割り勘で何円？', '美味しいですね。今日は割り勘なしで'],
      play:   ['遊びにかかるコストは？', '無邪気に楽しむの、忘れてました'],
      praise: ['そりゃ計算は得意ですよ', '…ありがとうございます。素直に言えた'],
    },
  },
  {
    id: '012', name: 'ゴースト', feature: '重要なLINEを既読スルーし続ける', image: ghostImg,
    habitat: 'SNS・職場', rarity: 'SR', mainType: '無', subType: '陰',
    subText: '重要なLINEを既読スルーし続けるモックだ。',
    description: '忙しいのでしょうか。\n返信しづらいこともありますよね。\n気が向いたら連絡ください。',
    weakness: { correct: '直接話しかける', wrong: ['再送する', 'スタンプを送る', '待ち続ける'] },
    farewell: 'ちゃんと、返信します',
    affinity: { good: ['alone', 'talk'], bad: 'praise', badReaction: '褒めても返信しませんよ…' },
    reactions: {
      talk:   ['…（目を合わせない）', '…直接来てくれると、話しやすいかもしれない'],
      food:   ['（無言で受け取る）', '…ありがとうございます'],
      play:   ['…（しぶしぶ参加）', '意外と、楽しかったです'],
      praise: ['…（既読スルー）', '…ありがとうございます。返信、してみます'],
    },
  },
  {
    id: '013', name: 'アイビー', feature: '他人の仕事の成果を自分のものにする', image: ivyImg,
    habitat: '会社', rarity: 'SR', mainType: '怒', subType: '陽',
    subText: '他人の成果を横取りするモックだ。',
    description: '認められたいのでしょうか。\n頑張っているんですね。\nちゃんと見ていますよ。',
    weakness: { correct: '証拠を残す', wrong: ['黙認する', '直接訴える', '上司に報告する'] },
    farewell: '…自分の力で、やってみます',
    affinity: { good: ['praise', 'talk'], bad: 'food', badReaction: 'ご飯より仕事の評価が大事です！' },
    reactions: {
      talk:   ['これ、私が考えたんですよね…', '…実は、自信がなかっただけです'],
      food:   ['食事より成果を見てほしい', '…食べながら話せるの、久しぶりです'],
      play:   ['遊んでいる場合では…', '…息抜きも、必要なんですね'],
      praise: ['そうです！私がやったんです！', '…自分の仕事を、ちゃんと褒めてもらいたかっただけです'],
    },
  },
  {
    id: '014', name: 'ロアー', feature: '電車内で大声で電話し続ける伝説の存在',
    habitat: '電車', rarity: 'UR', mainType: '怒', subType: '陽', image: roarImg,
    subText: '電車内で大声で電話し続ける伝説のモックだ。',
    description: '大切な電話なのでしょうか。\nお忙しいんですね。',
    weakness: { correct: '静かにプレッシャーをかける', wrong: ['注意する', '車両を移動する', '耳をふさぐ', '車掌に言いに行く'] },
    farewell: '…電車では、静かにします',
    affinity: { good: ['talk', 'praise'], bad: 'alone', badReaction: '（さらに大声になる）' },
    reactions: {
      talk:   ['（電話を続けながら）ちょっと待って！', '…静かに話せることも、あるんですね'],
      food:   ['食べながら電話もできますよ！', '…（口を閉じて食べる）'],
      play:   ['遊びながら電話もできますよ！', '…遊ぶ時は、電話を切ります'],
      praise: ['（大声で）ありがとうございます！', '…（小声で）ありがとう'],
    },
  },
  {
    id: '015', name: 'ラスト', feature: '飲み会を終わらせてくれない・帰らせてくれない', image: lastImg,
    habitat: '居酒屋', rarity: 'UR', mainType: '笑', subType: '陽',
    subText: '飲み会を絶対に終わらせてくれないモックだ。',
    description: 'まだ一緒にいたいのでしょうか。\n楽しい時間はあっという間ですね。\nでは、そろそろ…。',
    weakness: { correct: '終電を理由に席を立つ', wrong: ['もう一杯だけ付き合う', 'トイレを口実にする', '眠いふりをする', '友人への電話を装う'] },
    farewell: '…終電って、大事なんだ',
    affinity: { good: ['food', 'talk'], bad: 'alone', badReaction: 'まだ帰らないでください！' },
    reactions: {
      talk:   ['もっと話しましょうよ！まだ22時ですよ！', '…楽しい時間も、いつか終わりますね'],
      food:   ['もう一杯！あともう一品！', '…美味しかったですね。今日は楽しかった'],
      play:   ['ゲームしましょう！朝まで！', '…遊び疲れましたね。そろそろ帰りましょうか'],
      praise: ['え！もっと言ってください！帰れません！', '…嬉しいです。じゃあ次回また来ましょう'],
    },
  },
];

// ===== ユーティリティ =====
function loadActionData(captureId) {
  try {
    const raw = localStorage.getItem(`rehab_actions_${captureId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: ACTION_MAX, nextRecoveryAt: null };
}

function saveActionData(captureId, data) {
  try {
    localStorage.setItem(`rehab_actions_${captureId}`, JSON.stringify(data));
  } catch {}
}

function clearActionData(captureId) {
  try {
    localStorage.removeItem(`rehab_actions_${captureId}`);
  } catch {}
}

function recoverActions(data) {
  if (!data.nextRecoveryAt || data.count >= ACTION_MAX) {
    return { count: Math.min(ACTION_MAX, Math.max(0, data.count)), nextRecoveryAt: null };
  }
  const now = Date.now();
  let { count, nextRecoveryAt } = data;
  while (now >= nextRecoveryAt && count < ACTION_MAX) {
    count += 1;
    nextRecoveryAt += ACTION_RECOVERY_MS;
  }
  return { count, nextRecoveryAt: count >= ACTION_MAX ? null : nextRecoveryAt };
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getGaugeGood(dissatisfaction) {
  if (dissatisfaction <= 30) return 20;
  if (dissatisfaction <= 60) return 12;
  return 6;
}


// ===== 妖怪画像コンポーネント =====
function YokaiImage({ yokai, size = 'md', className = '' }) {
  const sizeClass = `yokai-img-${size}`;
  if (!yokai.image) {
    return (
      <div className={`yokai-img-placeholder yokai-img-placeholder-${size} ${className}`}>
        <span className="yokai-img-placeholder-icon">👤</span>
        <span className="yokai-img-placeholder-name">{yokai.name}</span>
      </div>
    );
  }
  return (
    <img
      src={yokai.image}
      alt={yokai.name}
      className={`yokai-img ${sizeClass} ${className}`}
      style={{ background: 'transparent' }}
    />
  );
}

// ===== タイトル画面 =====
function TitleScreen({ onStart }) {
  return (
    <div className="screen title-screen" onClick={onStart}>
      <div className="title-bg-deco" aria-hidden="true">
        {['👻','🏮','⛩','🌙','🦊','👺','🎋','🌸'].map((e, i) => (
          <span key={i} className={`title-deco title-deco-${i}`}>{e}</span>
        ))}
      </div>
      <div className="title-content">
        <p className="title-sub">モックを捕まえて、街を平和に</p>
        <h1 className="title-main" aria-label="モックポコ">
          {'モックポコ'.split('').map((ch, i) => (
            <span key={i} className={`title-char title-char-${i}`}>{ch}</span>
          ))}
        </h1>
        <p className="title-tap-hint">タップしてはじめる</p>
      </div>
    </div>
  );
}

// ===== ホーム画面 =====
function HomeScreen({ onSelectLocation, onHallOfFame, onDex, capturedList, onRehab, onDeck }) {
  return (
    <div className="screen home-screen">
      <header className="app-header">
        <h1>モックポコ</h1>
        <p className="app-subtitle">モックを捕まえて、更生させて、街を平和にしよう！</p>
      </header>

      <div className="home-btn-row">
        {capturedList.length > 0 && (
          <button className="btn-primary home-rehab-btn" onClick={onRehab}>
            更生させる（{capturedList.length}体）
          </button>
        )}
        <button className="btn-ghost" onClick={onDex}>図鑑を見る</button>
        <button className="btn-ghost hall-link-btn" onClick={onHallOfFame}>殿堂を見る</button>
        <button className="btn-ghost deck-link-btn" onClick={onDeck}>デッキを編成する</button>
      </div>

      {/* 場所選択 */}
      <section className="location-section">
        <h2 className="location-section-title">どこへ行く？</h2>
        <div className="location-grid">
          {Object.entries(LOCATION_LABEL).map(([key, label]) => (
            <button
              key={key}
              className={`location-btn location-btn-${key}`}
              onClick={() => onSelectLocation(key)}
            >
              <span className="location-btn-icon">{locationIcon(key)}</span>
              <span className="location-btn-label">{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===== モック図鑑画面 =====
function YokaiDexScreen({ encounteredIds, onBack }) {
  return (
    <div className="screen dex-screen">
      <header className="dex-header">
        <button className="btn-ghost dex-back-btn" onClick={onBack}>← もどる</button>
        <h2>モック図鑑</h2>
        <p className="dex-subtitle">{encounteredIds.size} / {yokaiList.length} 捕獲済み</p>
      </header>

      <div className="dex-grid">
        {yokaiList.map((yokai) => {
          const known = encounteredIds.has(yokai.id);
          return (
            <div
              key={yokai.id}
              className={`dex-card rarity-${yokai.rarity} ${known ? 'dex-card-known' : 'dex-card-unknown'}`}
            >
              <div className="dex-card-no">No.{yokai.id}</div>
              {known ? (
                <>
                  <YokaiImage yokai={yokai} size="sm" />
                  <div className="dex-card-name">{yokai.name}</div>
                  <div className="dex-card-feature">{yokai.feature}</div>
                  <div className="dex-card-habitat">生息地：{yokai.habitat}</div>
                  <div className="dex-card-rarity">{rarityLabel[yokai.rarity]}</div>
                </>
              ) : (
                <>
                  <div className="dex-card-silhouette">?</div>
                  <div className="dex-card-name dex-unknown-name">？？？</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function locationIcon(key) {
  const icons = { train: '', office: '', convenience: '', izakaya: '' };
  return icons[key] || '📍';
}

// ===== 場所演出画面 =====
function LocationAtmosphereScreen({ location, onEncounter, onBack }) {
  function handleTap() {
    const yokaiIds = LOCATION_YOKAI[location];
    const randomId = yokaiIds[Math.floor(Math.random() * yokaiIds.length)];
    const yokai = yokaiList.find(y => y.id === randomId);
    onEncounter(yokai);
  }

  const label = LOCATION_LABEL[location];
  const text  = LOCATION_TEXT[location];

  const locationBgStyle = LOCATION_BG[location]
    ? { backgroundImage: `url(${LOCATION_BG[location]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="screen location-atmosphere-screen" style={locationBgStyle}>
      <div className="location-atm-box">
        <p className="location-atm-label">{label}</p>
        <p className="location-atm-text">{text}</p>
        <div className="location-shadow-wrap">
          <div className="location-shadow" />
        </div>
        <button className="btn-primary location-tap-btn" onClick={handleTap}>
          タップして確かめる
        </button>
        <button className="btn-ghost location-back-btn" onClick={onBack}>もどる</button>
      </div>
    </div>
  );
}

// ===== 説明シーン =====
const TYPEWRITER_SPEED = 80;

// ===== キャラ別効果音 =====
const YOKAI_SE = {
  // モス：いびき（低くこもったガーガー）
  'モス': {
    label: 'ガーガー…',
    play(ctx, t) {
      // いびきの1サイクルを2回繰り返す
      [0, 0.55].forEach((delay) => {
        // 低域ノイズ（息の音）
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.45, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf;

        // ローパスで低くこもらせる
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
        // バンドパスでガーガー感を強調
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 180; bp.Q.value = 3;

        // ゲインを振動させてガーガー感を出す
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + delay);
        g.gain.linearRampToValueAtTime(0.8, t + delay + 0.06);
        g.gain.setValueAtTime(0.8, t + delay + 0.18);
        g.gain.linearRampToValueAtTime(0.3, t + delay + 0.24);
        g.gain.linearRampToValueAtTime(0.75, t + delay + 0.30);
        g.gain.linearRampToValueAtTime(0.2, t + delay + 0.36);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.45);

        src.connect(lp); lp.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(t + delay);
      });
    },
  },
  // アイリス：ドンッ（低い衝撃）
  'アイリス': {
    label: 'ドンッ',
    play(ctx, t) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 180;
      const g = ctx.createGain();
      g.gain.setValueAtTime(1.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      src.connect(flt); flt.connect(g); g.connect(ctx.destination);
      src.start(t);
    },
  },
  // ラッシュ：ダダダッ（3連打の突進）
  'ラッシュ': {
    label: 'ダダダッ',
    play(ctx, t) {
      [0, 0.12, 0.22].forEach((delay, i) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 2);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 200 + i * 60;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.9, t + delay);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);
        src.connect(flt); flt.connect(g); g.connect(ctx.destination);
        src.start(t + delay);
      });
    },
  },
  // スリップ：スーッ（高音のフォームフィルタースイープ）
  'スリップ': {
    label: 'スーッ',
    play(ctx, t) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const flt = ctx.createBiquadFilter(); flt.type = 'bandpass';
      flt.frequency.setValueAtTime(1200, t);
      flt.frequency.exponentialRampToValueAtTime(3200, t + 0.7);
      flt.Q.value = 8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      src.connect(flt); flt.connect(g); g.connect(ctx.destination);
      src.start(t);
    },
  },
  // ブルーム：音漏れ（シャカシャカ・ジャッジャッ）
  'ブルーム': {
    label: 'ジャッジャッ…♪',
    play(ctx, t) {
      // シャカシャカの連続パターン（2拍子で刻む）
      const rhythm = [0, 0.18, 0.27, 0.45, 0.54, 0.72];
      rhythm.forEach((delay) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf;

        // 高域ハイパスでシャカシャカ感（実際の音漏れ帯域）
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
        // ピーク帯域で「シャ」感を強調
        const pk = ctx.createBiquadFilter(); pk.type = 'peaking';
        pk.frequency.value = 6000; pk.gain.value = 8; pk.Q.value = 1.5;

        // 強拍（0拍目・3拍目）は少し大きく＝ジャッジャッ感
        const isAccent = delay === 0 || delay === 0.45;
        const vol = isAccent ? 0.55 : 0.3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t + delay);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1);

        src.connect(hp); hp.connect(pk); pk.connect(g); g.connect(ctx.destination);
        src.start(t + delay);
      });
    },
  },
  // ヘイズ：ピロピロ（スマホ通知風）
  'ヘイズ': {
    label: 'ピロピロ…',
    play(ctx, t) {
      [0, 0.18, 0.36].forEach((delay) => {
        const o = ctx.createOscillator(); o.type = 'square';
        o.frequency.setValueAtTime(1200, t + delay);
        o.frequency.setValueAtTime(900, t + delay + 0.09);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, t + delay);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + delay); o.stop(t + delay + 0.16);
      });
    },
  },
  // セージ：ドヤッ（低めのベース感）
  'セージ': {
    label: 'ドヤッ',
    play(ctx, t) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.25);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.4, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(flt); flt.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.5);
    },
  },
  // エルダー：ゴホンッ（咳払い）
  'エルダー': {
    label: 'ゴホンッ',
    play(ctx, t) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const env = Math.pow(1 - i / d.length, 1.5);
        d[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 600; flt.Q.value = 2;
      const g = ctx.createGain(); g.gain.value = 1.0;
      src.connect(flt); flt.connect(g); g.connect(ctx.destination);
      // 少し遅れて2回
      [0, 0.22].forEach((delay) => {
        const s2 = ctx.createBufferSource(); s2.buffer = buf;
        const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 500; f2.Q.value = 2;
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.8, t + delay);
        g2.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.28);
        s2.connect(f2); f2.connect(g2); g2.connect(ctx.destination);
        s2.start(t + delay);
      });
    },
  },
  // ランス：ブンッ（風切り音）
  'ランス': {
    label: 'ブンッ！',
    play(ctx, t) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const flt = ctx.createBiquadFilter(); flt.type = 'bandpass';
      flt.frequency.setValueAtTime(3000, t);
      flt.frequency.exponentialRampToValueAtTime(800, t + 0.18);
      flt.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.7, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      src.connect(flt); flt.connect(g); g.connect(ctx.destination);
      src.start(t);
    },
  },
  // プリーチ：ウンウン（低いうなずき）
  'プリーチ': {
    label: 'ウンウン…',
    play(ctx, t) {
      [0, 0.35].forEach((delay) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(180, t + delay);
        o.frequency.linearRampToValueAtTime(150, t + delay + 0.25);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + delay);
        g.gain.linearRampToValueAtTime(0.3, t + delay + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.28);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + delay); o.stop(t + delay + 0.3);
      });
    },
  },
  // ペニー：カチカチ（電卓・機械音）
  'ペニー': {
    label: 'カチカチ',
    play(ctx, t) {
      [0, 0.14, 0.28, 0.42].forEach((delay) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 2000;
        const g = ctx.createGain(); g.gain.value = 1.5;
        src.connect(flt); flt.connect(g); g.connect(ctx.destination);
        src.start(t + delay);
      });
    },
  },
  // ゴースト：シュン…（既読スルー・消えていく音）
  'ゴースト': {
    label: 'シュン…',
    play(ctx, t) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(1100, t);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.9);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 1.0);
    },
  },
  // アイビー：ニヤリ（ズルい感じ・薄気味悪い上昇音）
  'アイビー': {
    label: 'ニヤリ',
    play(ctx, t) {
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(600, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.1);
      g.gain.setValueAtTime(0.18, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.7);
    },
  },
  // ロアー：ガーッ（大声・歪み感）
  'ロアー': {
    label: 'ガーッ！',
    play(ctx, t) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(120, t);
      o.frequency.linearRampToValueAtTime(160, t + 0.4);
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
      }
      dist.curve = curve;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.05);
      g.gain.setValueAtTime(0.5, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(dist); dist.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.7);
    },
  },
  // ラスト：グビッ（乾杯・液体音）
  'ラスト': {
    label: 'グビッ',
    play(ctx, t) {
      // 液体っぽい音：ピッチが下がるブルブル
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(600, t);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.2);
      const o2 = ctx.createOscillator(); o2.type = 'sine';
      o2.frequency.setValueAtTime(400, t + 0.05);
      o2.frequency.exponentialRampToValueAtTime(150, t + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t + 0.05);
      g2.gain.linearRampToValueAtTime(0.25, t + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(ctx.destination);
      o2.connect(g2); g2.connect(ctx.destination);
      o.start(t); o.stop(t + 0.35);
      o2.start(t + 0.05); o2.stop(t + 0.35);
    },
  },
};

// 全SE共有のAudioContext（毎回newすると上限6個でBGMに干渉するため）
let _seCtx = null;
function getSECtx() {
  try {
    if (!_seCtx || _seCtx.state === 'closed') {
      _seCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_seCtx.state === 'suspended') {
      _seCtx.resume().catch(() => {});
    }
    return _seCtx;
  } catch {
    return null;
  }
}

function playYokaiSound(name) {
  const se = YOKAI_SE[name];
  if (!se) return;
  try {
    const ctx = getSECtx();
    if (!ctx) return;
    const go = () => se.play(ctx, ctx.currentTime);
    ctx.state === 'suspended' ? ctx.resume().then(go) : go();
  } catch {}
}

// ===== 捕獲演出の効果音 =====
function playCaptureSound(type) {
  try {
    const ctx = getSECtx();
    if (!ctx) return;

    const go = () => {
      const t = ctx.currentTime;

      if (type === 'pull') {
        // すいーん：高音から低音へ1.5秒かけてゆっくり下降するサイン波
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 1.5);

        // 軽いビブラートで「引き込まれ感」を出す
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(12, t);
        lfoGain.gain.linearRampToValueAtTime(4, t + 1.5);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.08);
        gain.gain.setValueAtTime(0.20, t + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        lfo.start(t);
        osc.start(t);
        lfo.stop(t + 1.5);
        osc.stop(t + 1.5);

      } else if (type === 'pyon') {
        // ぽん：短くて柔らかい低音の一打（0.15秒）
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.13);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.55, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      }
    };

    ctx.state === 'suspended' ? ctx.resume().then(go) : go();
  } catch {}
}

const TYPEWRITER_SE_SKIP = new Set(['。', '、', '…', '\n', ' ', '　', '・', '！', '？', '〜']);

function playTypewriterSE() {
  try {
    const ctx = getSECtx();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900 + Math.random() * 300, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.008);
    gain.gain.linearRampToValueAtTime(0,    ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch {}
}

function DescriptionScene({ yokai, onDone }) {
  const introText = `${yokai.name}が現れた。`;
  const subText   = yokai.subText ?? '';
  const descText  = yokai.description ?? '';

  const [l1, setL1]                 = useState('');
  const [l2, setL2]                 = useState('');
  const [l3, setL3]                 = useState('');
  const [scenePhase, setScenePhase] = useState('typing_l1');
  const [seLabel, setSeLabel]       = useState('');
  const [seFading, setSeFading]     = useState(false);
  const ivRef    = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // リセット
    setL1('');
    setL2('');
    setL3('');
    setScenePhase('typing_l1');
    setSeLabel('');
    setSeFading(false);

    // 1行目：「〇〇が現れた。」タイプライター
    let i1 = 0;
    ivRef.current = setInterval(() => {
      i1++;
      setL1(introText.slice(0, i1));
      if (!TYPEWRITER_SE_SKIP.has(introText[i1 - 1])) playTypewriterSE();
      if (i1 >= introText.length) {
        clearInterval(ivRef.current);
        timerRef.current = setTimeout(() => {
          // 2行目：特徴説明タイプライター
          setScenePhase('typing_l2');
          let i2 = 0;
          ivRef.current = setInterval(() => {
            i2++;
            setL2(subText.slice(0, i2));
            if (!TYPEWRITER_SE_SKIP.has(subText[i2 - 1])) playTypewriterSE();
            if (i2 >= subText.length) {
              clearInterval(ivRef.current);
              timerRef.current = setTimeout(() => {
                // 3行目：寄り添う文言をタイプライターで表示
                setScenePhase('typing_l3');
                let i3 = 0;
                ivRef.current = setInterval(() => {
                  i3++;
                  setL3(descText.slice(0, i3));
                  if (!TYPEWRITER_SE_SKIP.has(descText[i3 - 1])) playTypewriterSE();
                  if (i3 >= descText.length) {
                    clearInterval(ivRef.current);
                    // タイプ完了後に効果音を再生
                    timerRef.current = setTimeout(() => {
                      playYokaiSound(yokai.name);
                      const label = YOKAI_SE[yokai.name]?.label ?? '';
                      if (label) {
                        setSeLabel(label);
                        setSeFading(false);
                        setTimeout(() => setSeFading(true), 800);
                      }
                      timerRef.current = setTimeout(() => setScenePhase('fadeout'), 1800);
                    }, 400);
                  }
                }, TYPEWRITER_SPEED);
              }, 400);
            }
          }, TYPEWRITER_SPEED);
        }, 350);
      }
    }, TYPEWRITER_SPEED);

    return () => {
      clearInterval(ivRef.current);
      clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yokai.id]);

  useEffect(() => {
    // timerRef.current は第1エフェクトと共有しているため、
    // このエフェクト専用のローカル変数でタイマーを管理する。
    // （共有 ref を使うと、setScenePhase 呼び出し後の cleanup が
    //   第1エフェクトのタイマーを誤ってキャンセルしてしまう）
    let timer = null;
    if (scenePhase === 'fadeout') {
      timer = setTimeout(() => setScenePhase('phrase'), 600);
    } else if (scenePhase === 'phrase') {
      timer = setTimeout(() => onDone(), 2500);
    }
    return () => clearTimeout(timer);
  }, [scenePhase, onDone]);

  if (scenePhase === 'phrase') {
    return (
      <div className="scene-dark scene-phrase-wrap">
        <p className="scene-phrase">・・・・・・捕まえましょうか。</p>
      </div>
    );
  }

  return (
    <div className={`description-scene ${scenePhase === 'fadeout' ? 'fadeout' : ''}`}>
      <div className="description-box">
        {/* 1行目：大きめフォント */}
        <p className="description-intro">{l1}</p>
        {/* 2行目：通常サイズ */}
        {l2 && <p className="description-sub">{l2}</p>}
        {/* 3行目：タイプライター */}
        {l3 && (
          <p className="description-text">
            {l3.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </p>
        )}
      </div>
      {seLabel && (
        <p className={`scene-se-label ${seFading ? 'scene-se-label-fadeout' : ''}`}>
          {seLabel}
        </p>
      )}
    </div>
  );
}

// ===== 捕獲画面 =====
// sealed=trueのとき封印中（特殊状態なし）
function rollSpecialStatus(sealed = false) {
  if (sealed) return null;
  const r = Math.random();
  if (r < 0.05) return 'flee_prep';   // 5%: 逃走準備
  if (r < 0.15) return 'vulnerable';  // 10%: 無防備
  if (r < 0.25) return 'strong';      // 10%: 強がり
  if (r < 0.40) return 'flinching';   // 15%: ひるみ
  return null;                         // 60%: 通常
}

function getCaptureRate(hp) {
  if (hp === 0)   return 0.90;
  if (hp <= 20)   return 0.70;
  if (hp <= 35)   return 0.60;
  if (hp <= 50)   return 0.40;
  if (hp <= 70)   return 0.20;
  return 0.10;
}

function TypeBadge({ type }) {
  return (
    <span
      className="type-badge"
      style={{ background: TYPE_COLOR[type] ?? '#888' }}
    >
      {type}
    </span>
  );
}

function CaptureScreen({ yokai, location, deck, onCaptured, onBack }) {
  const [maxTurns] = useState(() => {
    if (yokai.rarity === 'UR') return 1 + Math.floor(Math.random() * 3);
    return CAPTURE_TURNS[yokai.rarity] ?? 5;
  });
  const showTurns = yokai.rarity !== 'UR';

  const [hp, setHp]                       = useState(100);
  const [turnCount, setTurnCount]         = useState(0);
  const [phase, setPhase]                 = useState('pre_turn');
  const [specialStatus, setSpecialStatus] = useState(() => rollSpecialStatus());
  const [resultMsg, setResultMsg]         = useState('');
  const [resultEffect, setResultEffect]   = useState(''); // '' | 'super' | 'normal' | 'weak'
  const [hitType, setHitType]             = useState('');
  const [skillUseCounts, setSkillUseCounts] = useState(() => {
    const counts = {};
    (deck ?? []).forEach(s => { counts[s.id] = 0; });
    return counts;
  });
  const timerRef     = useRef(null);
  const sealNextRef  = useRef(false); // 封印: 次ターン特殊状態なし
  const willFleeRef  = useRef(false); // 逃走準備: 次ターン逃走

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (phase !== 'pre_turn') return;
    // 逃走準備が発動していたら即逃走
    if (willFleeRef.current) {
      willFleeRef.current = false;
      setPhase('escaped');
      return;
    }
    const t = setTimeout(() => setPhase('action_choice'), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'magic_pull')   playCaptureSound('pull');
    if (phase === 'magic_absorb') playCaptureSound('pyon');
  }, [phase]);

  function advanceTurn(newTurn) {
    if (newTurn >= maxTurns) {
      setPhase('escaped');
      return;
    }
    const sealed = sealNextRef.current;
    sealNextRef.current = false;
    setSpecialStatus(rollSpecialStatus(sealed));
    setPhase('pre_turn');
  }

  function handleCaptureAttempt() {
    const newTurn = turnCount + 1;
    setTurnCount(newTurn);
    willFleeRef.current = false; // 捕獲試みで逃走準備解除
    const baseRate = getCaptureRate(hp);
    const rate = specialStatus === 'vulnerable' ? Math.min(1, baseRate * 2) : baseRate;
    const captureSuccess = Math.random() < rate;

    setPhase('magic_appear');
    timerRef.current = setTimeout(() => {
      setPhase('magic_pull');
      timerRef.current = setTimeout(() => {
        setPhase('magic_absorb');
        timerRef.current = setTimeout(() => {
          if (captureSuccess) {
            setPhase('captured');
          } else {
            setPhase('magic_fail');
            timerRef.current = setTimeout(() => advanceTurn(newTurn), 1500);
          }
        }, 500);
      }, 1500);
    }, 400);
  }

  function handleSkillUse(skill) {
    if (phase !== 'skill_choice') return;
    // 使用回数チェック
    const limit = SKILL_USE_LIMIT[skill.power];
    if (limit !== undefined && (skillUseCounts[skill.id] ?? 0) >= limit) return;
    // 使用回数を消費
    setSkillUseCounts(prev => ({ ...prev, [skill.id]: (prev[skill.id] ?? 0) + 1 }));

    // 逃走準備中に攻撃 → 次ターン逃走（混乱効果で解除可）
    if (specialStatus === 'flee_prep' && skill.effect !== 'confuse') {
      willFleeRef.current = true;
    } else {
      willFleeRef.current = false;
    }

    // 封印効果
    if (skill.effect === 'seal') sealNextRef.current = true;

    // ダメージ計算
    const typeMulti = calcTypeMultiplier(skill.type, yokai.mainType, yokai.subType);
    const isSureHit = skill.effect === 'sure_hit';
    let statusMulti = 1.0;
    if (!isSureHit) {
      if (specialStatus === 'flinching') statusMulti = 2.0;
      if (specialStatus === 'strong')    statusMulti = 0.5;
    }

    let totalDmg;
    if (skill.effect === 'multi') {
      const h1 = Math.floor(rollSkillDamage(skill.power) * 0.5 * typeMulti * statusMulti);
      const h2 = Math.floor(rollSkillDamage(skill.power) * 0.5 * typeMulti * statusMulti);
      totalDmg = h1 + h2;
    } else {
      totalDmg = Math.floor(rollSkillDamage(skill.power) * typeMulti * statusMulti);
    }
    totalDmg = Math.max(1, totalDmg);

    const newHp   = Math.max(0, hp - totalDmg);
    const newTurn = turnCount + 1;
    setHp(newHp);
    setTurnCount(newTurn);

    // タイプ相性メッセージ
    let msg;
    let eff = 'normal';
    if (skill.effect === 'multi') {
      msg = `${skill.name}が2回ヒット！（計-${totalDmg}）`;
    } else if (typeMulti >= 2.0) {
      msg = `効果は抜群だ！（-${totalDmg}）`; eff = 'super';
    } else if (typeMulti >= 1.5) {
      msg = `効果は大きい！（-${totalDmg}）`; eff = 'super';
    } else if (typeMulti <= 0.5) {
      msg = `効果はいまいち…（-${totalDmg}）`; eff = 'weak';
    } else {
      msg = `${skill.name}を使った！（-${totalDmg}）`;
    }
    if (skill.effect === 'confuse' && specialStatus === 'flee_prep') {
      msg += ' 逃走準備が解除された！';
    }

    setResultMsg(msg);
    setResultEffect(eff);
    setHitType(totalDmg >= 30 ? 'big' : 'small');
    setPhase('attack_result');
    timerRef.current = setTimeout(() => advanceTurn(newTurn), 1800);
  }

  const imgShakeClass = hitType === 'big'      ? 'yokai-img-shake-big'
    : hitType === 'small'                      ? 'yokai-img-shake-small'
    : phase === 'magic_pull'                   ? 'yokai-pull-to-circle'
    : phase === 'magic_absorb'                 ? 'yokai-absorb'
    : phase === 'magic_fail'                   ? 'yokai-fail-return'
    : phase === 'magic_appear'                 ? ''
    : 'yokai-float';

  const captureBgStyle = LOCATION_BG[location]
    ? { backgroundImage: `url(${LOCATION_BG[location]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  if (phase === 'captured') {
    return (
      <div className="screen capture-screen" style={captureBgStyle}>
        <div className="capture-success-flash" />
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

  if (phase === 'escaped') {
    return (
      <div className="screen capture-screen" style={captureBgStyle}>
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

  const hpColor = hp <= 29 ? '#cc4444' : hp <= 59 ? '#c8820a' : '#4a9a6a';
  const showTurnsNow = showTurns && phase !== 'attack_result' && !phase.startsWith('magic_');
  const isFleePrepNow = specialStatus === 'flee_prep';

  return (
    <div className="screen capture-screen" style={captureBgStyle}>
      {phase.startsWith('magic_') && (
        <div className="magic-circle-overlay">
          <div className={`magic-circle-body ${
            phase === 'magic_appear'  ? 'magic-body-appear' :
            phase === 'magic_pull'    ? 'magic-body-pull'   :
            phase === 'magic_absorb'  ? 'magic-body-absorb' :
                                        'magic-body-fail'
          }`}>
            <div className="magic-ring-outer" />
            <div className="magic-ring-inner" />
            <div className="magic-glyph magic-glyph-1" />
            <div className="magic-glyph magic-glyph-2" />
            <div className="magic-glyph magic-glyph-3" />
            <div className="magic-center" />
          </div>
        </div>
      )}
      <div className={`capture-box ${phase === 'magic_fail' ? 'shake' : ''}`}>
        <div className="capture-yokai-header">
          <p className="capture-yokai-name-small">{yokai.name}</p>
          <div className="capture-type-badges">
            <TypeBadge type={yokai.mainType} />
            <TypeBadge type={yokai.subType} />
          </div>
        </div>
        <div
          className={`yokai-img-wrap ${imgShakeClass}`}
          onAnimationEnd={() => setHitType('')}
        >
          <YokaiImage yokai={yokai} size="xl" className="capture-yokai-img" />
        </div>

        <div className="capture-hp-wrap">
          <div className="capture-hp-header">
            <span className="capture-hp-label">体力</span>
            <span className="capture-hp-pct" style={{ color: hpColor }}>{hp}</span>
          </div>
          <div className="capture-hp-bg">
            <div className="capture-hp-fill" style={{ width: `${hp}%`, backgroundColor: hpColor }} />
          </div>
        </div>

        {showTurnsNow && (
          <p className="capture-turns-left">残りターン：{maxTurns - turnCount}</p>
        )}

        {phase === 'pre_turn' && (
          <p className={`capture-special-msg${isFleePrepNow ? ' flee-prep-warning' : ''}`}>
            {specialStatus === 'strong'     && 'モックが強がっている！'}
            {specialStatus === 'flinching'  && 'モックがひるんでいる！'}
            {specialStatus === 'vulnerable' && 'モックが無防備になっている！'}
            {specialStatus === 'flee_prep'  && '今すぐ捕獲しないと逃げる！'}
            {!specialStatus                 && '……'}
          </p>
        )}

        {phase === 'action_choice' && (
          <div className="capture-action-choice">
            {isFleePrepNow && (
              <p className="flee-prep-warning">今すぐ捕獲しないと逃げる！</p>
            )}
            {hp === 0 && <p className="capture-chance-msg">今がチャンス！</p>}
            <p className="capture-prompt">どうしますか？</p>
            <div className="capture-choices capture-main-choices">
              {hp > 0 && (
                <button className="capture-choice-btn capture-choice-btn-attack" onClick={() => setPhase('skill_choice')}>
                  技を使う
                </button>
              )}
              <button className="capture-choice-btn capture-choice-btn-capture" onClick={handleCaptureAttempt}>
                捕獲する
              </button>
            </div>
          </div>
        )}

        {phase === 'skill_choice' && (
          <>
            <p className="capture-prompt">どの技を使う？</p>
            <div className="capture-skill-list">
              {(deck ?? []).map((skill) => {
                const tm = calcTypeMultiplier(skill.type, yokai.mainType, yokai.subType);
                const effClass = tm >= 2.0 ? 'skill-eff-super' : tm <= 0.5 ? 'skill-eff-weak' : '';
                const limit = SKILL_USE_LIMIT[skill.power];
                const usedCount = skillUseCounts[skill.id] ?? 0;
                const remaining = limit !== undefined ? limit - usedCount : null;
                const isExhausted = remaining !== null && remaining <= 0;
                return (
                  <button
                    key={skill.id}
                    className={`capture-skill-btn ${effClass}${isExhausted ? ' skill-exhausted' : ''}`}
                    onClick={() => handleSkillUse(skill)}
                    disabled={isExhausted}
                  >
                    <span className="capture-skill-name">{skill.name}</span>
                    <TypeBadge type={skill.type} />
                    <span className="capture-skill-power">{skill.power}</span>
                    {skill.effect && (
                      <span className="capture-skill-effect">{EFFECT_LABELS[skill.effect]}</span>
                    )}
                    {isExhausted
                      ? <span className="skill-use-count skill-use-exhausted">使用済み</span>
                      : remaining !== null
                        ? <span className="skill-use-count">残り{remaining}回</span>
                        : null
                    }
                    {tm >= 2.0 && <span className="eff-label eff-super">抜群</span>}
                    {tm <= 0.5 && <span className="eff-label eff-weak">いまいち</span>}
                  </button>
                );
              })}
            </div>
            <button className="capture-give-up-link" style={{ marginTop: 8 }} onClick={() => setPhase('action_choice')}>
              もどる
            </button>
          </>
        )}

        {phase === 'magic_pull' && (
          <p className="magic-capture-text">引き込んでいる…</p>
        )}

        {phase === 'attack_result' && (
          <p className={`capture-result-msg ${resultEffect === 'super' ? 'result-super' : resultEffect === 'weak' ? 'result-weak' : ''}`}>
            {resultMsg}
          </p>
        )}
        {phase === 'magic_fail' && (
          <p className="capture-result-msg capture-fail-msg">まだ捕まらない！</p>
        )}

        {phase !== 'skill_choice' && (
          <div className="capture-give-up-wrap">
            <button className="capture-give-up-link" onClick={onBack}>諦める</button>
          </div>
        )}
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
        <p className="rehab-list-subtitle">モックを選んでください</p>
      </header>
      <div className="rehab-list-grid">
        {capturedList.map((yokai, index) => (
          <div key={`${yokai.id}-${index}`} className={`rehab-list-card rarity-${yokai.rarity}`}>
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

function RehabScreen({ yokai, onReleased, onBack }) {
  const [gauge, setGauge]                     = useState(0);
  const [dissatisfaction, setDissatisfaction] = useState(0);
  const [currentState, setCurrentState]       = useState(() => pickState());
  const [reaction, setReaction]               = useState('');
  const [reactionKey, setReactionKey]         = useState(0);
  const [reactionType, setReactionType]       = useState('good');
  const [released, setReleased]               = useState(false);
  // 突っつきアニメーション
  const [isPoking, setIsPoking]               = useState(false);
  // 解放アニメーション（キャラが飛び上がって消える）
  const [isReleasing, setIsReleasing]         = useState(false);

  const captureId = yokai.captureId;
  const [actionData, setActionData] = useState(() =>
    recoverActions(loadActionData(captureId))
  );
  const [tickNow, setTickNow] = useState(Date.now);

  useEffect(() => {
    const t = setInterval(() => {
      const ts = Date.now();
      setTickNow(ts);
      setActionData(prev => {
        if (!prev.nextRecoveryAt || ts < prev.nextRecoveryAt) return prev;
        const updated = recoverActions(prev);
        saveActionData(captureId, updated);
        return updated;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [captureId]);

  const gaugeCap     = GAUGE_CAP[yokai.rarity];
  const gaugePercent = Math.min(100, Math.round((gauge / gaugeCap) * 100));
  const isMax        = gauge >= gaugeCap;

  const actionsLeft = actionData.count;
  const canAct      = actionsLeft > 0 && !isMax;
  const countdown   = actionData.nextRecoveryAt
    ? Math.max(0, actionData.nextRecoveryAt - tickNow)
    : null;

  function consumeAction() {
    setActionData(prev => {
      const newCount  = prev.count - 1;
      const nextRecov = prev.nextRecoveryAt ?? (Date.now() + ACTION_RECOVERY_MS);
      const updated   = { count: newCount, nextRecoveryAt: newCount >= ACTION_MAX ? null : nextRecov };
      saveActionData(captureId, updated);
      return updated;
    });
  }

  function applyAction(actionKey) {
    if (!canAct) return;
    consumeAction();

    const tier   = getTier(gaugePercent);
    const isGood = currentState.good.includes(actionKey);
    const isBad  = currentState.bad.includes(actionKey);
    let text, type;

    if (isGood) {
      const rawBonus = getGaugeGood(dissatisfaction);
      setGauge((g) => Math.min(gaugeCap, g + rawBonus));
      setDissatisfaction((d) => Math.max(0, d - DISSATISFACTION_DOWN));
      text = pickFrom(REACTIONS_TIER.good[tier]);
      type = 'good';
    } else if (isBad) {
      const newDis = Math.min(100, dissatisfaction + DISSATISFACTION_UP[yokai.rarity]);
      setDissatisfaction(newDis);
      text = newDis >= 61
        ? pickFrom(REACTIONS_TIER.angry[tier])
        : pickFrom(REACTIONS_TIER.bad[tier]);
      type = 'bad';
    } else {
      text = pickFrom(REACTIONS_TIER.neutral[tier]);
      type = 'neutral';
    }

    setReaction(text);
    setReactionKey((k) => k + 1);
    setReactionType(type);
    setCurrentState(pickState());
  }

  function handlePoke() {
    if (!yokai.image || isPoking) return;
    const tier = getTier(gaugePercent);
    setIsPoking(true);
    setReaction(pickFrom(POKE_REACTIONS[tier]));
    setReactionKey((k) => k + 1);
    setReactionType('neutral');
  }

  function handleRelease() {
    clearActionData(captureId);
    setIsReleasing(true);
    setTimeout(() => {
      setReleased(true);
      setTimeout(() => onReleased(yokai), 2000);
    }, 1300);
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
        <div className="rehab-header">
          <button className="btn-ghost rehab-back-btn" onClick={onBack}>← 一覧へ</button>
        </div>

        {/* キャラ名（小）→ 画像（大・タップ可）*/}
        <p className="rehab-yokai-name-small">{yokai.name}</p>
        <div
          className={`yokai-img-wrap ${
            isReleasing  ? 'yokai-release-anim' :
            isPoking     ? 'yokai-img-poke'      :
                           'yokai-rehab-sway'
          }`}
          onClick={isPoking || isReleasing ? undefined : handlePoke}
          onAnimationEnd={() => { if (isPoking) setIsPoking(false); }}
          style={{ cursor: (yokai.image && !isPoking && !isReleasing) ? 'pointer' : 'default' }}
        >
          <YokaiImage yokai={yokai} size="xl" className="rehab-yokai-img" />
        </div>
        {yokai.image && !isMax && !isReleasing && (
          <p className="rehab-poke-hint">タップして突っつく</p>
        )}

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
            <p className="rehab-rarity-hint">レアモック：更生に時間がかかります</p>
          )}
        </div>

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

        {!isMax && (
          <p className="rehab-hint">「{currentState.hint}」</p>
        )}

        <div className="rehab-reaction-area">
          {reaction && (
            <p key={reactionKey} className={`rehab-reaction ${reactionType === 'bad' ? 'bad' : ''}`}>
              「{reaction}」
            </p>
          )}
        </div>

        {!isMax && (
          <div className="rehab-actions-meta">
            <span className="rehab-actions-count">残りアクション：{actionsLeft}/{ACTION_MAX}</span>
            {countdown !== null && (
              <span className="rehab-actions-countdown">次回回復まで {formatCountdown(countdown)}</span>
            )}
          </div>
        )}

        {!isMax && canAct && (
          <div className="rehab-actions">
            <button className="rehab-action-btn rehab-action-talk" onClick={() => applyAction('talk')}>
              会話する
            </button>
            <button className="rehab-action-btn rehab-action-food" onClick={() => applyAction('food')}>
              ご飯をあげる
            </button>
            <button className="rehab-action-btn rehab-action-play" onClick={() => applyAction('play')}>
              一緒に遊ぶ
            </button>
            <button className="rehab-action-btn rehab-action-praise" onClick={() => applyAction('praise')}>
              褒める
            </button>
            {currentState.id === 'alone' && (
              <button className="rehab-action-btn rehab-action-alone" onClick={() => applyAction('alone')}>
                そっとしておく
              </button>
            )}
          </div>
        )}

        {!isMax && !canAct && (
          <div className="rehab-actions-depleted">
            <p className="rehab-actions-depleted-msg">アクションを回復中です…</p>
            {countdown !== null && (
              <p className="rehab-actions-depleted-countdown">
                次回回復まで {formatCountdown(countdown)}
              </p>
            )}
          </div>
        )}

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
        <p className="hall-subtitle">更生して旅立った元モックたち</p>
      </header>

      {releasedList.length === 0 ? (
        <p className="hall-empty">まだ更生したモックはいません</p>
      ) : (
        <div className="hall-grid">
          {releasedList.map((yokai, index) => (
            <div key={`${yokai.id}-${index}`} className={`hall-card rarity-${yokai.rarity}`}>
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

// ===== 技習得通知画面 =====
function SkillLearnedScreen({ yokai, skill, onHome }) {
  return (
    <div className="screen skill-learned-screen">
      <div className="skill-learned-box">
        <p className="skill-learned-from">
          <span className="skill-learned-from-name">{yokai.name}</span>から<br />技を受け継いだ！
        </p>
        <div className="skill-learned-card-large">
          <TypeBadge type={skill.type} />
          <span className="skill-learned-name-large">{skill.name}</span>
          <span className="skill-learned-power-large">{skill.power}</span>
          {skill.effect && (
            <span className="skill-learned-effect-large">{EFFECT_LABELS[skill.effect]}</span>
          )}
        </div>
        <button className="btn-primary skill-learned-ok-btn" onClick={onHome}>OK</button>
      </div>
    </div>
  );
}

// ===== デッキ編成画面 =====
function DeckBuildingScreen({ ownedSkillIds, onSave, onBack }) {
  const ownedSkills = ALL_SKILLS.filter(s => ownedSkillIds.includes(s.id));
  const [selected, setSelected] = useState(() => {
    const saved = loadSavedDeck();
    return saved.filter(id => ownedSkillIds.includes(id));
  });
  const [saved, setSaved] = useState(false);

  function toggleSkill(skillId) {
    setSaved(false);
    setSelected(prev => {
      if (prev.includes(skillId)) return prev.filter(id => id !== skillId);
      if (prev.length >= 3) return prev;
      return [...prev, skillId];
    });
  }

  function handleSave() {
    saveDeckToStorage(selected);
    setSaved(true);
    onSave();
  }

  return (
    <div className="screen deck-building-screen">
      <header className="deck-header">
        <button className="btn-ghost deck-back-btn" onClick={onBack}>← もどる</button>
        <h2>デッキ編成</h2>
        <p className="deck-subtitle">バトルで使う3つの技を選ぶ</p>
      </header>

      <div className="deck-skill-list">
        {ownedSkills.map(skill => {
          const isSelected = selected.includes(skill.id);
          return (
            <div
              key={skill.id}
              className={`deck-skill-card ${isSelected ? 'deck-skill-selected' : ''} ${!isSelected && selected.length >= 3 ? 'deck-skill-disabled' : ''}`}
              onClick={() => toggleSkill(skill.id)}
            >
              <div className="deck-skill-card-main">
                <TypeBadge type={skill.type} />
                <span className="deck-skill-name">{skill.name}</span>
                {isSelected && <span className="deck-skill-check">✓</span>}
              </div>
              <div className="deck-skill-card-sub">
                <span className="deck-skill-power">{skill.power}</span>
                {skill.effect && (
                  <span className="deck-skill-effect">{EFFECT_LABELS[skill.effect]}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="deck-footer">
        <p className="deck-count">{selected.length} / 3 選択中</p>
        <button
          className="btn-primary deck-confirm-btn"
          disabled={selected.length !== 3}
          onClick={handleSave}
        >
          {saved ? '保存しました！' : '保存する'}
        </button>
      </div>
    </div>
  );
}

// ===== App =====
function App() {
  const [capturedList, setCapturedList]     = useState([]);
  const [releasedList, setReleasedList]     = useState([]);
  const [encounteredIds, setEncounteredIds] = useState(new Set());
  const [screen, setScreen]                 = useState('title');
  const [selectedYokai, setSelectedYokai]   = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [ownedSkillIds, setOwnedSkillIds]   = useState(() => loadOwnedSkills());
  const [selectedDeck, setSelectedDeck]     = useState(null);
  const [pendingLearnedSkill, setPendingLearnedSkill] = useState(null);

  // ===== BGM 管理 =====
  const audioRef       = useRef(null);
  const currentBGMRef  = useRef(null);
  const isMutedRef     = useRef(localStorage.getItem('bgm_muted') === 'true');
  const [muted, setMuted] = useState(isMutedRef.current);
  const fadeTimerRef   = useRef(null); // フェードアウトタイマー
  const fadeInTimerRef = useRef(null); // フェードインタイマー（ref管理で確実にクリアできるように）

  // フェード付きで新しいBGMを再生する（src: BGM_SRC[key]）
  function playBGM(src) {
    if (currentBGMRef.current === src) return; // 同じBGMは継続
    currentBGMRef.current = src;

    // 進行中のフェードインを停止
    clearInterval(fadeInTimerRef.current);
    fadeInTimerRef.current = null;

    // 前のBGMをフェードアウトして停止
    const prev = audioRef.current;
    if (prev) {
      clearInterval(fadeTimerRef.current);
      const startVol = prev.volume;
      const steps = 20;
      let step = 0;
      fadeTimerRef.current = setInterval(() => {
        step++;
        prev.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
          prev.pause();
        }
      }, 25);
    }

    if (isMutedRef.current) return;

    // 新しいBGMをフェードイン
    const audio = new Audio(src);
    audio.loop   = true;
    audio.volume = 0;
    audioRef.current = audio;
    audio.play().catch(e => console.log('BGM error:', e));

    let step = 0;
    const steps = 20;
    fadeInTimerRef.current = setInterval(() => {
      step++;
      audio.volume = Math.min(0.3, 0.3 * (step / steps));
      if (step >= steps) {
        clearInterval(fadeInTimerRef.current);
        fadeInTimerRef.current = null;
        audio.volume = 0.3;
      }
    }, 25);
  }

  function stopBGM() {
    currentBGMRef.current = null;
    clearInterval(fadeInTimerRef.current);
    fadeInTimerRef.current = null;
    const prev = audioRef.current;
    if (!prev) return;
    clearInterval(fadeTimerRef.current);
    const startVol = prev.volume;
    const steps = 20;
    let step = 0;
    fadeTimerRef.current = setInterval(() => {
      step++;
      prev.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        prev.pause();
        if (audioRef.current === prev) audioRef.current = null;
      }
    }, 25);
  }

  function playBGMOnce(src, volume) {
    clearInterval(fadeInTimerRef.current);
    fadeInTimerRef.current = null;
    currentBGMRef.current = src;
    const prev = audioRef.current;
    if (prev) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
      prev.pause();
      audioRef.current = null;
    }
    if (isMutedRef.current) return;
    const audio = new Audio(src);
    audio.loop = false;
    audio.volume = volume;
    audioRef.current = audio;
    audio.play().catch(e => console.log('BGM error:', e));
  }

  function toggleMute() {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setMuted(next);
    localStorage.setItem('bgm_muted', next);
    if (next) {
      // ミュートON → 再生中のBGMを停止
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      // ミュートOFF → 現在の画面のBGMを再開
      if (currentBGMRef.current) {
        const src = currentBGMRef.current;
        currentBGMRef.current = null; // 強制再生させるためにリセット
        playBGM(src);
      }
    }
  }

  // タイトル画面タップ → タイトルBGM開始 → ホームへ
  function handleTitleStart() {
    playBGM(BGM_SRC.title);
    setScreen('home');
  }

  function handleSelectLocation(location) {
    setSelectedLocation(location);
    playBGM(BGM_SRC.encounter);
    setScreen('location_atmosphere');
  }

  function handleEncounterFromLocation(yokai) {
    setSelectedYokai(yokai);
    stopBGM();
    setScreen('description');
  }

  function handleDescriptionDone() {
    const deckIds = loadSavedDeck();
    const ownedIds = loadOwnedSkills();
    const validIds = deckIds.filter(id => ownedIds.includes(id));
    const finalIds = validIds.length === 3 ? validIds : [...INITIAL_SKILL_IDS];
    setSelectedDeck(finalIds.map(id => ALL_SKILLS.find(s => s.id === id)));
    playBGM(BGM_SRC.battle);
    setScreen('capture');
  }

  function handleCaptured() {
    const captureId = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setCapturedList((prev) => [...prev, { ...selectedYokai, captureId }]);
    setEncounteredIds((prev) => new Set([...prev, selectedYokai.id]));
    setSelectedDeck(null);
    playBGM(BGM_SRC.home);
    setScreen('home');
  }

  function handleSelectRehab(index) {
    setSelectedYokai({ ...capturedList[index], captureIndex: index });
    // rehab BGM 継続
    setScreen('rehab');
  }

  function handleReleased(yokai) {
    setCapturedList((prev) => {
      const next = [...prev];
      next.splice(yokai.captureIndex, 1);
      return next;
    });
    setReleasedList((prev) => [...prev, yokai]);

    // 技習得チェック（50%の確率）
    let learnedSkill = null;
    const skillId = YOKAI_SKILL_MAP[yokai.id];
    const rand = Math.random();
    console.log('[技習得] yokai:', yokai.id, yokai.name);
    console.log('[技習得] skillId:', skillId ?? 'なし（このモックは技を持たない）');
    console.log('[技習得] 習得済み:', ownedSkillIds.includes(skillId));
    console.log('[技習得] rand:', rand.toFixed(3), '→', rand < 0.5 ? '習得判定成功' : '習得判定失敗');
    if (skillId && !ownedSkillIds.includes(skillId) && rand < 0.5) {
      const skill = ALL_SKILLS.find(s => s.id === skillId);
      if (skill) {
        const newIds = [...ownedSkillIds, skillId];
        setOwnedSkillIds(newIds);
        saveOwnedSkills(newIds);
        learnedSkill = skill;
        console.log('[技習得] 技を習得！:', skill.name);
      }
    }

    if (learnedSkill) {
      playBGMOnce(BGM_SRC.skill, 0.5);
      setPendingLearnedSkill(learnedSkill);
      setScreen('skill_learned');
    } else {
      console.log('[技習得] 画面遷移: home（技習得なし）');
      playBGM(BGM_SRC.home);
      setScreen('home');
    }
  }

  return (
    <div className="App">
      {/* ミュートボタン（タイトル以外の全画面に表示） */}
      {screen !== 'title' && (
        <button
          className="bgm-mute-btn"
          onClick={toggleMute}
          title={muted ? 'BGMをオンにする' : 'BGMをオフにする'}
          aria-label={muted ? 'BGMをオンにする' : 'BGMをオフにする'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      )}

      {screen === 'title' && (
        <TitleScreen onStart={handleTitleStart} />
      )}
      {screen === 'home' && (
        <HomeScreen
          onSelectLocation={handleSelectLocation}
          onHallOfFame={() => { playBGM(BGM_SRC.farewell); setScreen('hall'); }}
          onDex={() => { playBGM(BGM_SRC.home); setScreen('dex'); }}
          capturedList={capturedList}
          onRehab={() => { playBGM(BGM_SRC.rehab); setScreen('rehab_list'); }}
          onDeck={() => { setScreen('deck'); }}
        />
      )}
      {screen === 'location_atmosphere' && (
        <LocationAtmosphereScreen
          location={selectedLocation}
          onEncounter={handleEncounterFromLocation}
          onBack={() => { playBGM(BGM_SRC.home); setScreen('home'); }}
        />
      )}
      {screen === 'dex' && (
        <YokaiDexScreen
          encounteredIds={encounteredIds}
          onBack={() => { playBGM(BGM_SRC.home); setScreen('home'); }}
        />
      )}
      {screen === 'hall' && (
        <HallOfFameScreen
          releasedList={releasedList}
          onBack={() => { playBGM(BGM_SRC.home); setScreen('home'); }}
        />
      )}
      {screen === 'description' && (
        <DescriptionScene
          yokai={selectedYokai}
          onDone={handleDescriptionDone}
        />
      )}
      {screen === 'deck' && (
        <DeckBuildingScreen
          ownedSkillIds={ownedSkillIds}
          onSave={() => { setScreen('home'); }}
          onBack={() => { setScreen('home'); }}
        />
      )}
      {screen === 'capture' && (
        <CaptureScreen
          yokai={selectedYokai}
          location={selectedLocation}
          deck={selectedDeck}
          onCaptured={handleCaptured}
          onBack={() => { playBGM(BGM_SRC.home); setScreen('home'); }}
        />
      )}
      {screen === 'rehab_list' && (
        <RehabListScreen
          capturedList={capturedList}
          onSelect={handleSelectRehab}
          onBack={() => { playBGM(BGM_SRC.home); setScreen('home'); }}
        />
      )}
      {screen === 'rehab' && (
        <RehabScreen
          yokai={selectedYokai}
          onReleased={handleReleased}
          onBack={() => { playBGM(BGM_SRC.rehab); setScreen('rehab_list'); }}
        />
      )}
      {screen === 'skill_learned' && pendingLearnedSkill && (
        <SkillLearnedScreen
          yokai={selectedYokai}
          skill={pendingLearnedSkill}
          onHome={() => { setPendingLearnedSkill(null); playBGM(BGM_SRC.home); setScreen('home'); }}
        />
      )}
    </div>
  );
}

export default App;
