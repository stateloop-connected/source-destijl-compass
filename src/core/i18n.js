/** Bilingual UI strings. `t(key)` reads from the active language. */

const STRINGS = {
  zh: {
    'brand.name': '几何构成',
    'brand.sub': 'De Stijl · 三维尺规作图',
    'home.tagline': '以圆规与直尺，构造蒙德里安的秩序',
    'home.progress': '进度',
    'home.levels': '关卡',
    'home.sandbox': '自由作图',
    'home.sandbox.desc': '不限目标，随意构造',
    'home.help': '玩法说明',
    'home.clear': '清除进度',
    'home.cleared': '进度已清除',
    'home.stars': '星',
    'home.locked': '未解锁',
    'home.achievements': '成就',
    'home.lang': 'EN',
    'home.sound': '音效',
    'home.on': '开',
    'home.off': '关',

    'play.level': '关卡',
    'play.sandbox': '自由作图',
    'play.ops': '步骤',
    'play.par': '标准',
    'play.time': '用时',
    'play.undo': '撤销',
    'play.redo': '重做',
    'play.reset': '重置',
    'play.home': '主菜单',
    'play.hint': '提示',
    'play.hint.show': '显示提示',
    'play.hint.hide': '收起提示',
    'play.camtip': '拖动旋转 · 右键或方向键平移 · 滚轮缩放 · F 复位视角',

    'tool.point': '点',
    'tool.segment': '线段',
    'tool.circle': '圆',
    'tool.sphere': '球',
    'tool.move': '移动',

    'solved.title': '构成完成',
    'solved.replay': '重玩',
    'solved.next': '下一关',
    'solved.finish': '返回主菜单',
    'solved.ops': '用了 {n} 步',
    'solved.par': '标准 {n} 步',
    'solved.stars': '获得 {n} 星',
    'solved.perfect': '完美！达到标准步数',
    'solved.sandbox.title': '自由作图',
    'solved.sandbox.msg': '随意构造几何图形，探索尺规的世界',

    'help.title': '玩法说明',
    'help.tools.h': '作图工具',
    'help.tools.p': '<b>点</b>：在桌面空白处放置自由点。<br><b>线段</b>：依次点击两点连成线段。<br><b>圆</b>：先点圆心，再点半径端点。<br><b>球</b>：三维圆规——以圆心与半径点作出球面。<br><b>移动</b>：拖动自由点，所有派生交点实时重算。',
    'help.auto.h': '自动求交',
    'help.auto.p': '任意两条线段、圆或球相交时，交点/交线会<b>自动生成</b>并保持联动。拖动自由点时，全部派生对象同步更新。球与球相交得到圆，圆与桌面相交得到点——这正是三维作图的钥匙。',
    'help.keys.h': '快捷键',
    'help.keys.p': '<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd><kbd>5</kbd> 切换工具<br><kbd>Esc</kbd> 取消选择<br><kbd>Ctrl</kbd>+<kbd>Z</kbd> 撤销<br><kbd>R</kbd> 重置本关<br><kbd>←↑↓→</kbd> 平移视角<br><kbd>H</kbd> 提示　<kbd>F</kbd> 复位视角　<kbd>L</kbd> 切换语言',
    'help.score.h': '星级评价',
    'help.score.p': '以<b>标准步数</b>完成可得三星，多两步以内两星。步骤越少，构造越优雅——这正是尺规作图的精神。',
    'help.camera.h': '观察视角',
    'help.camera.p': '可以 360° 自由旋转视角：拖动旋转，滚轮缩放，右键拖动或<kbd>方向键</kbd>平移，按 <kbd>F</kbd> 回到默认视角。三维构造会浮出桌面，转动视角即可看清立体关系。',

    'toast.locked': '先完成前一关',
    'toast.undo.empty': '没有可撤销的操作',
    'toast.ach': '成就解锁：{n}',
    'toast.sphere.tip': '球与桌面相交自动生成圆',

    'ach.first': '第一次构造',
    'ach.three': '首个三星',
    'ach.all': '全部通关',
    'ach.sphere': '三维圆规',
    'ach.perfect5': '五个标准步数',
    'ach.sandbox': '自由探索',

    'level.stars.none': '未完成',
    'level.stars.done': '已完成'
  },
  en: {
    'brand.name': 'GEOMETRIC COMPOSITION',
    'brand.sub': 'De Stijl · 3D Straightedge & Compass',
    'home.tagline': 'Compass and straightedge, in Mondrian\u2019s order',
    'home.progress': 'Progress',
    'home.levels': 'Levels',
    'home.sandbox': 'Free Play',
    'home.sandbox.desc': 'No goal — just construct',
    'home.help': 'How to Play',
    'home.clear': 'Reset Progress',
    'home.cleared': 'Progress cleared',
    'home.stars': 'stars',
    'home.locked': 'Locked',
    'home.achievements': 'Achievements',
    'home.lang': '中',
    'home.sound': 'Sound',
    'home.on': 'On',
    'home.off': 'Off',

    'play.level': 'Level',
    'play.sandbox': 'Free Play',
    'play.ops': 'Steps',
    'play.par': 'Par',
    'play.time': 'Time',
    'play.undo': 'Undo',
    'play.redo': 'Redo',
    'play.reset': 'Reset',
    'play.home': 'Menu',
    'play.hint': 'Hint',
    'play.hint.show': 'Show hint',
    'play.hint.hide': 'Hide hint',
    'play.camtip': 'Drag to orbit · right-drag or arrow keys to pan · scroll to zoom · F to reset view',

    'tool.point': 'Point',
    'tool.segment': 'Segment',
    'tool.circle': 'Circle',
    'tool.sphere': 'Sphere',
    'tool.move': 'Move',

    'solved.title': 'Composition Complete',
    'solved.replay': 'Replay',
    'solved.next': 'Next Level',
    'solved.finish': 'Back to Menu',
    'solved.ops': 'Solved in {n} steps',
    'solved.par': 'Par is {n} steps',
    'solved.stars': 'Earned {n} star(s)',
    'solved.perfect': 'Perfect — you matched par',
    'solved.sandbox.title': 'Free Play',
    'solved.sandbox.msg': 'Construct whatever you like and explore the compass',

    'help.title': 'How to Play',
    'help.tools.h': 'Construction Tools',
    'help.tools.p': '<b>Point</b>: drop a free point on the table.<br><b>Segment</b>: click two points to join them.<br><b>Circle</b>: click centre, then a radius point.<br><b>Sphere</b>: the 3D compass \u2014 centre plus radius point.<br><b>Move</b>: drag free points; every derived object follows.',
    'help.auto.h': 'Automatic Intersections',
    'help.auto.p': 'Any two segments, circles or spheres that meet produce <b>automatic</b> intersections that stay linked. Drag a free point and every derived object updates. Sphere \u2229 sphere gives a circle, circle \u2229 table gives points \u2014 that is the key to 3D construction.',
    'help.keys.h': 'Shortcuts',
    'help.keys.p': '<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd><kbd>5</kbd> switch tool<br><kbd>Esc</kbd> cancel<br><kbd>Ctrl</kbd>+<kbd>Z</kbd> undo<br><kbd>R</kbd> reset level<br><kbd>←↑↓→</kbd> pan the view<br><kbd>H</kbd> hint &nbsp; <kbd>F</kbd> reset view &nbsp; <kbd>L</kbd> language',
    'help.score.h': 'Star Rating',
    'help.score.p': 'Match the <b>par</b> step count for three stars, or come within two steps for two. Fewer steps means a more elegant construction \u2014 the whole point of classical geometry.',
    'help.camera.h': 'Camera',
    'help.camera.p': 'Orbit a full 360°: drag to rotate, scroll to zoom, right-drag or use the arrow keys to pan, press <kbd>F</kbd> to return to the default view. 3D constructions rise off the table \u2014 rotate to read the solid relationships.',

    'toast.locked': 'Finish the previous level first',
    'toast.undo.empty': 'Nothing to undo',
    'toast.ach': 'Achievement: {n}',
    'toast.sphere.tip': 'Sphere \u2229 table creates a circle automatically',

    'ach.first': 'First construction',
    'ach.three': 'First three-star',
    'ach.all': 'All levels complete',
    'ach.sphere': '3D compass',
    'ach.perfect5': 'Five par solves',
    'ach.sandbox': 'Free explorer',

    'level.stars.none': 'Incomplete',
    'level.stars.done': 'Complete'
  }
};

let lang = 'zh';

export function setLang(l) { lang = l === 'en' ? 'en' : 'zh'; }
export function getLang() { return lang; }

export function t(key, vars) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.zh[key] || key);
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

/** Pick the right side of a bilingual field ({zh, en}). */
export function pick(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[lang] ?? field.zh ?? field.en ?? '';
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const [attr, key] = el.dataset.i18nAttr.split(':');
    el.setAttribute(attr, t(key));
  });
}
