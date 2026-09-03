/* 精神科心理测评 · 纯前端单页应用
 * 量表数据 / 计分引擎 / 移动端交互 / 可分享报告 / 本机归档
 * 无后端，全部在浏览器本地完成。
 */
(function () {
  'use strict';

  /* ---------------- 工具：base64（兼容中文、浏览器与 node） ---------------- */
  function b64encode(obj) {
    const json = JSON.stringify(obj);
    if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(json)));
    return Buffer.from(json, 'utf-8').toString('base64');
  }
  function b64decode(str) {
    try {
      const json = (typeof atob === 'function')
        ? decodeURIComponent(escape(atob(str)))
        : Buffer.from(str, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  /* ---------------- 本机归档 ---------------- */
  const ARCHIVE_KEY = 'psychtests_archive_v1';
  function loadArchive() {
    try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveArchive(list) {
    try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }

  /* ---------------- 量表定义 ---------------- */
  // 选项等级通用定义
  const L04 = [
    { v: 0, t: '完全没有' }, { v: 1, t: '好几天' }, { v: 2, t: '一半以上时间' }, { v: 3, t: '几乎每天' }
  ];
  const L04gad = L04;
  const L14 = [
    { v: 1, t: '很少或没有' }, { v: 2, t: '有时' }, { v: 3, t: '经常' }, { v: 4, t: '绝大部分时间' }
  ];
  const L15 = [
    { v: 1, t: '没有' }, { v: 2, t: '很轻' }, { v: 3, t: '中等' }, { v: 4, t: '偏重' }, { v: 5, t: '严重' }
  ];
  const L04p = [
    { v: 0, t: '无' }, { v: 1, t: '偶尔(<1次/周)' }, { v: 2, t: '有时(1-2次/周)' }, { v: 3, t: '经常(≥3次/周)' }
  ];
  const L04pss = [
    { v: 0, t: '从不' }, { v: 1, t: '偶尔' }, { v: 2, t: '有时' }, { v: 3, t: '经常' }, { v: 4, t: '总是' }
  ];
  const LYN = [
    { v: 1, t: '是' }, { v: 0, t: '否' }
  ];
  const LMDQ15 = [
    { v: 0, t: '没有造成麻烦' }, { v: 1, t: '轻微' }, { v: 2, t: '中等' }, { v: 3, t: '严重' }
  ];
  const L17BPRS = [
    { v: 1, t: '1 无' }, { v: 2, t: '2 很轻/可疑' }, { v: 3, t: '3 轻度' }, { v: 4, t: '4 中度' },
    { v: 5, t: '5 偏重' }, { v: 6, t: '6 重度' }, { v: 7, t: '7 极重' }
  ];

  // 等级→颜色
  const LEVEL_COLOR = {
    normal: '#1f9d55', mild: '#e08600', moderate: '#d9730d', severe: '#c0392b',
    positive: '#c0392b', negative: '#1f9d55', low: '#1f9d55', high: '#c0392b'
  };

  const SCALES = [
    /* ===== PHQ-9 ===== */
    {
      id: 'phq9', name: 'PHQ-9 抑郁筛查', short: 'PHQ-9', group: '焦虑/抑郁筛查',
      intro: '在过去两周内，您有多少时间受到以下问题的困扰？',
      options: L04,
      items: [
        '做事时提不起劲或没有兴趣', '感到心情低落、沮丧或绝望', '入睡困难、睡不安稳或睡眠过多',
        '感觉疲倦或没有活力', '食欲不振或吃太多', '觉得自己很糟，或觉得自己很失败，或让家人失望',
        '对事情专注有困难（如看报纸或看电视）', '动作/说话缓慢到别人已察觉，或正好相反——烦躁坐立不安',
        '有不如死掉或用某种方式伤害自己的念头'
      ],
      compute(a) {
        let total = 0; a.forEach(x => total += (+x || 0));
        let level, levelText, note;
        if (total <= 4) { level = 'normal'; levelText = '无明显抑郁'; note = '目前量表提示无明显抑郁症状，可保持关注。'; }
        else if (total <= 9) { level = 'mild'; levelText = '轻度抑郁'; note = '提示轻度抑郁，建议关注情绪变化，必要时心理咨询。'; }
        else if (total <= 14) { level = 'moderate'; levelText = '中度抑郁'; note = '提示中度抑郁，建议寻求专业心理评估与干预。'; }
        else if (total <= 19) { level = 'severe'; levelText = '中重度抑郁'; note = '提示中重度抑郁，建议尽快到精神科/心理科就诊。'; }
        else { level = 'severe'; levelText = '重度抑郁'; note = '提示重度抑郁，建议尽快到精神科/心理科就诊。'; }
        const notes = [note];
        if ((+a[8] || 0) >= 1) notes.push('⚠️ 第 9 题提示存在自伤/自杀念头，请务必进一步评估，必要时紧急处理。');
        return {
          level, levelText,
          sections: [{ title: '得分', rows: [{ label: 'PHQ-9 总分', value: total, of: 27 }] }],
          notes
        };
      }
    },

    /* ===== GAD-7 ===== */
    {
      id: 'gad7', name: 'GAD-7 焦虑筛查', short: 'GAD-7', group: '焦虑/抑郁筛查',
      intro: '在过去两周内，您有多少时间受到以下问题的困扰？',
      options: L04gad,
      items: [
        '感到紧张、焦虑或急切', '不能够停止或控制担忧', '对各种各样的事情担忧过多',
        '很难放松下来', '由于不安而难以静坐', '变得容易烦恼或急躁', '感到似乎将有可怕的事情发生而害怕'
      ],
      compute(a) {
        let total = 0; a.forEach(x => total += (+x || 0));
        let level, levelText, note;
        if (total <= 4) { level = 'normal'; levelText = '无明显焦虑'; note = '目前量表提示无明显焦虑症状。'; }
        else if (total <= 9) { level = 'mild'; levelText = '轻度焦虑'; note = '提示轻度焦虑，建议关注并自我调节。'; }
        else if (total <= 14) { level = 'moderate'; levelText = '中度焦虑'; note = '提示中度焦虑，建议寻求专业心理评估。'; }
        else { level = 'severe'; levelText = '重度焦虑'; note = '提示重度焦虑，建议尽快到精神科/心理科就诊。'; }
        return { level, levelText, sections: [{ title: '得分', rows: [{ label: 'GAD-7 总分', value: total, of: 21 }] }], notes: [note] };
      }
    },

    /* ===== SAS 焦虑自评 ===== */
    {
      id: 'sas', name: 'SAS 焦虑自评量表', short: 'SAS', group: '焦虑/抑郁筛查',
      intro: '下面是一些关于您近期情绪的描述，请选择符合您的频率。',
      options: L14,
      reverse: [4, 8, 12, 16, 18], // 0-based：第5、9、13、17、19题反向计分
      items: [
        '我觉得比平时容易紧张和着急', '我无缘无故地感到害怕', '我容易心里烦乱或觉得惊恐', '我觉得我可能将要发疯',
        '我觉得一切都很好，也不会发生什么不幸（反向）', '我手脚发抖打颤', '我因为头痛、颈痛和背痛而苦恼',
        '我感觉容易衰弱和疲乏', '我觉得心平气和，并且容易安静坐着（反向）', '我觉得心跳很快',
        '我因为一阵阵头晕而苦恼', '我有晕倒发作或觉得要晕倒似的', '我吸气呼气都感到很容易（反向）',
        '我的手脚麻木和刺痛', '我因为胃痛和消化不良而苦恼', '我常常要小便',
        '我的手常常是干燥温暖的（反向）', '我脸红发热', '我容易入睡并且一夜睡得很好（反向）', '我做恶梦'
      ],
      compute(a) {
        let raw = 0; const n = this.items.length;
        for (let i = 0; i < n; i++) { let r = +a[i] || 1; if (this.reverse.includes(i)) r = 5 - r; raw += r; }
        const std = Math.round(raw * 1.25);
        let level, levelText, note;
        if (std < 50) { level = 'normal'; levelText = '正常范围'; note = '量表标准分在正常范围，未见明显焦虑倾向。'; }
        else if (std < 60) { level = 'mild'; levelText = '轻度焦虑'; note = '提示轻度焦虑，建议结合自身情况观察，必要时心理咨询。'; }
        else if (std < 70) { level = 'moderate'; levelText = '中度焦虑'; note = '提示中度焦虑，建议寻求专业心理评估与干预。'; }
        else { level = 'severe'; levelText = '重度焦虑'; note = '提示重度焦虑，建议尽快到精神科/心理科就诊。'; }
        return {
          level, levelText,
          sections: [{ title: '计分', rows: [{ label: '原始分', value: raw, of: 80 }, { label: '标准分', value: std, of: 100 }] }],
          notes: [note]
        };
      }
    },

    /* ===== SDS 抑郁自评 ===== */
    {
      id: 'sds', name: 'SDS 抑郁自评量表', short: 'SDS', group: '焦虑/抑郁筛查',
      intro: '下面是一些关于您近期情绪的描述，请选择符合您的频率。',
      options: L14,
      reverse: [1, 4, 5, 10, 11, 13, 15, 16, 17, 19], // 0-based：第2、5、6、11、12、14、16、17、18、20题反向
      items: [
        '我感到情绪沮丧，郁闷', '我感到早晨心情最好（反向）', '我要哭或想哭', '我夜间睡眠不好',
        '我吃饭像平时一样多（反向）', '我的性功能正常（反向）', '我感到体重减轻', '我为便秘烦恼',
        '我的心跳比平时快', '我无故感到疲劳', '我的头脑像往常一样清楚（反向）', '我做事情像平时一样不感到困难（反向）',
        '我坐卧不安，难以保持平静', '我对未来感到有希望（反向）', '我比平时更容易激怒', '我觉得决定什么事很容易（反向）',
        '我感到自己是有用的和不可缺少的人（反向）', '我的生活很有意义（反向）',
        '假若我死了别人会过得更好', '我仍旧喜爱自己平时喜爱的东西（反向）'
      ],
      compute(a) {
        let raw = 0; const n = this.items.length;
        for (let i = 0; i < n; i++) { let r = +a[i] || 1; if (this.reverse.includes(i)) r = 5 - r; raw += r; }
        const std = Math.round(raw * 1.25);
        let level, levelText, note;
        if (std < 53) { level = 'normal'; levelText = '正常范围'; note = '量表标准分在正常范围，未见明显抑郁倾向。'; }
        else if (std < 63) { level = 'mild'; levelText = '轻度抑郁'; note = '提示轻度抑郁，建议结合自身情况观察，必要时心理咨询。'; }
        else if (std < 73) { level = 'moderate'; levelText = '中度抑郁'; note = '提示中度抑郁，建议寻求专业心理评估与干预。'; }
        else { level = 'severe'; levelText = '重度抑郁'; note = '提示重度抑郁，建议尽快到精神科/心理科就诊。'; }
        return {
          level, levelText,
          sections: [{ title: '计分', rows: [{ label: '原始分', value: raw, of: 80 }, { label: '标准分', value: std, of: 100 }] }],
          notes: [note]
        };
      }
    },

    /* ===== Y-BOCS 耶鲁-布朗强迫 ===== */
    {
      id: 'ybocs', name: 'Y-BOCS 强迫量表', short: 'Y-BOCS', group: '强迫/其他专项',
      intro: '请根据最近一周的情况评估（0=无，4=极重）。',
      options: [
        { v: 0, t: '无' }, { v: 1, t: '轻' }, { v: 2, t: '中' }, { v: 3, t: '重' }, { v: 4, t: '极重' }
      ],
      items: [
        '强迫思维：占用的时间', '强迫思维：干扰程度', '强迫思维：痛苦程度', '强迫思维：抵抗程度', '强迫思维：控制能力',
        '强迫行为：占用的时间', '强迫行为：干扰程度', '强迫行为：痛苦程度', '强迫行为：抵抗程度', '强迫行为：控制能力'
      ],
      compute(a) {
        let obs = 0, comp = 0;
        for (let i = 0; i < 5; i++) obs += (+a[i] || 0);
        for (let i = 5; i < 10; i++) comp += (+a[i] || 0);
        const total = obs + comp;
        let level, levelText, note;
        if (total <= 7) { level = 'normal'; levelText = '亚临床/无'; note = '未见明显强迫症状。'; }
        else if (total <= 15) { level = 'mild'; levelText = '轻度'; note = '轻度强迫，可观察并适当心理干预。'; }
        else if (total <= 23) { level = 'moderate'; levelText = '中度'; note = '中度强迫，建议专业评估与 CBT 等干预。'; }
        else if (total <= 31) { level = 'severe'; levelText = '重度'; note = '重度强迫，建议积极药物/心理治疗。'; }
        else { level = 'severe'; levelText = '极重度'; note = '极重度强迫，建议尽快系统治疗。'; }
        return {
          level, levelText,
          sections: [
            { title: '强迫思维', rows: [{ label: '小计', value: obs, of: 20 }] },
            { title: '强迫行为', rows: [{ label: '小计', value: comp, of: 20 }] },
            { title: '合计', rows: [{ label: '总分', value: total, of: 40 }] }
          ],
          notes: [note]
        };
      }
    },

    /* ===== PSS-10 知觉压力 ===== */
    {
      id: 'pss', name: 'PSS-10 知觉压力', short: 'PSS', group: '睡眠/压力',
      intro: '在过去一个月里，您有多少时候觉得以下情况发生？',
      options: L04pss,
      reverse: [3, 4, 6, 7], // 0-based：第4、5、7、8题反向
      items: [
        '因为一些意料之外的事情而感到心烦意乱', '觉得无法掌控生活中的重要事情', '感到紧张和压力',
        '对自己能够处理个人问题的能力感到有信心（反向）', '觉得事情都按自己的意愿发展（反向）',
        '发现自己无法应付所有必须要做的事', '能够驾驭生活中的烦心事（反向）', '觉得自己能掌控全局、游刃有余（反向）',
        '因为一些自己控制不了的事而生气', '觉得困难一件接一件，根本应付不过来'
      ],
      compute(a) {
        let total = 0; const n = this.items.length;
        for (let i = 0; i < n; i++) { let r = +a[i] || 0; if (this.reverse.includes(i)) r = 4 - r; total += r; }
        let level, levelText, note;
        if (total <= 13) { level = 'low'; levelText = '低压力'; note = '压力水平较低。'; }
        else if (total <= 26) { level = 'moderate'; levelText = '中等压力'; note = '压力处于中等水平，注意调节与休息。'; }
        else { level = 'high'; levelText = '高压力'; note = '压力水平偏高，建议关注身心状态，必要时寻求支持。'; }
        return {
          level, levelText,
          sections: [{ title: '得分', rows: [{ label: '压力总分', value: total, of: 40 }] }],
          notes: [note]
        };
      }
    },

    /* ===== PSQI 匹兹堡睡眠质量 ===== */
    {
      id: 'psqi', name: 'PSQI 睡眠质量指数', short: 'PSQI', group: '睡眠/压力',
      intro: '请根据最近一个月的通常情况填写。',
      options: L04p,
      // 特殊题型：time=时分, num=数字
      items: [
        { t: '上床睡觉时间', type: 'time' },
        { t: '通常多久能入睡（分钟）', type: 'num', min: 0, max: 600, unit: '分钟' },
        { t: '入睡困难（上床后很久睡不着）的频率', type: 'likert' },
        { t: '夜间醒来或早醒的频率', type: 'likert' },
        { t: '起夜上厕所的频率', type: 'likert' },
        { t: '呼吸不畅的频率', type: 'likert' },
        { t: '咳嗽或打鼾的频率', type: 'likert' },
        { t: '感觉冷的频率', type: 'likert' },
        { t: '感觉热的频率', type: 'likert' },
        { t: '做噩梦的频率', type: 'likert' },
        { t: '因疼痛影响睡眠的频率', type: 'likert' },
        { t: '其他影响睡眠的事情的频率', type: 'likert' },
        { t: '总体睡眠质量评价', type: 'likert' },
        { t: '服用助眠药物的频率', type: 'likert' },
        { t: '白天困倦、精力不足的频率', type: 'likert' },
        { t: '白天做事缺乏兴趣/精力的频率', type: 'likert' },
        { t: '平均每晚实际睡眠小时数', type: 'num', min: 0, max: 24, step: 0.5, unit: '小时' },
        { t: '起床时间', type: 'time' }
      ],
      compute(a) {
        const num = v => parseFloat(v);
        // C1 主观睡眠质量
        const c1 = +a[12] || 0;
        // C2 入睡时间
        const lat = num(a[1]) || 0;
        const L = lat <= 15 ? 0 : lat <= 30 ? 1 : lat <= 60 ? 2 : 3;
        const onset = +a[2] || 0;
        const c2raw = L + onset;
        const c2 = c2raw <= 0 ? 0 : c2raw <= 2 ? 1 : c2raw <= 4 ? 2 : 3;
        // C3 睡眠时间
        const hrs = num(a[16]) || 0;
        const c3 = hrs >= 7 ? 0 : hrs >= 6 ? 1 : hrs >= 5 ? 2 : 3;
        // C4 睡眠效率
        const bedMin = timeToMin(a[0]), upMin = timeToMin(a[17]);
        let tib = upMin - bedMin; if (tib <= 0) tib += 1440;
        const eff = tib > 0 ? (hrs * 60 / tib) * 100 : 0;
        const c4 = eff >= 85 ? 0 : eff >= 75 ? 1 : eff >= 65 ? 2 : 3;
        // C5 睡眠障碍
        const dist = [3, 4, 5, 6, 7, 8, 9, 10, 11].reduce((s, i) => s + (+a[i] || 0), 0);
        const c5 = dist <= 0 ? 0 : dist <= 9 ? 1 : dist <= 18 ? 2 : 3;
        // C6 药物
        const c6 = +a[13] || 0;
        // C7 白天功能障碍
        const day = (+a[14] || 0) + (+a[15] || 0);
        const c7 = day <= 0 ? 0 : day <= 2 ? 1 : day <= 4 ? 2 : 3;
        const comps = [c1, c2, c3, c4, c5, c6, c7];
        const total = comps.reduce((s, x) => s + x, 0);
        const compNames = ['主观睡眠质量', '入睡时间', '睡眠时间', '睡眠效率', '睡眠障碍', '催眠药物', '日间功能障碍'];
        const rows = comps.map((v, i) => ({ label: compNames[i], value: v, of: 3 }));
        rows.push({ label: 'PSQI 总分', value: total, of: 21 });
        const poor = total > 7;
        const level = poor ? 'positive' : 'negative';
        const levelText = poor ? '睡眠质量差' : '睡眠质量尚可';
        const note = poor
          ? 'PSQI 总分 > 7，提示近期睡眠质量较差，建议进一步评估睡眠问题。'
          : 'PSQI 总分 ≤ 7，提示近期睡眠质量在可接受范围。';
        return { level, levelText, sections: [{ title: '7 个成分分', rows }], notes: [note] };
      }
    },

    /* ===== SCL-90 症状自评 ===== */
    {
      id: 'scl90', name: 'SCL-90 症状自评', short: 'SCL-90', group: '综合症状 SCL-90',
      intro: '请根据最近一周的实际感觉，评定每个条目的困扰程度（1=没有，5=严重）。',
      options: L15,
      factorDefs: [
        { name: '躯体化', idx: [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58] },
        { name: '强迫症状', idx: [3, 9, 10, 28, 38, 45, 46, 51, 55, 65] },
        { name: '人际敏感', idx: [6, 21, 34, 36, 37, 41, 61, 69, 73] },
        { name: '抑郁', idx: [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 71, 79] },
        { name: '焦虑', idx: [2, 17, 23, 33, 39, 57, 72, 78, 80, 86] },
        { name: '敌对', idx: [11, 24, 63, 67, 74, 81] },
        { name: '恐怖', idx: [13, 25, 47, 50, 70, 75, 82] },
        { name: '偏执', idx: [8, 18, 43, 68, 76, 83] },
        { name: '精神病性', idx: [7, 16, 35, 62, 77, 84, 85, 87, 88, 90] },
        { name: '其他', idx: [19, 44, 59, 60, 64, 66, 89] }
      ],
      items: [
        '头痛',
        '神经过敏，心中不踏实',
        '头脑中有不必要的想法或字句盘旋',
        '头晕和晕倒',
        '对异性的兴趣减退',
        '对旁人责备求全',
        '感到别人能控制您的思想',
        '责怪别人制造麻烦',
        '忘性大',
        '担心自己的衣饰整齐及仪态的端正',
        '容易烦恼和激动',
        '胸痛',
        '害怕空旷的场所或街道',
        '感到自己的精力下降，活动减慢',
        '想结束自己的生命',
        '听到旁人听不到的声音',
        '发抖',
        '感到大多数人都不可信任',
        '胃口不好',
        '容易哭泣',
        '同异性相处时感到害羞不自在',
        '感到受骗，中了圈套或有人想抓住您',
        '无缘无故地突然感到害怕',
        '自己不能控制地大发脾气',
        '怕单独出门',
        '经常责怪自己',
        '腰痛',
        '感到难以完成任务',
        '感到孤独',
        '感到苦闷',
        '过分担忧',
        '对事物不感兴趣',
        '感到害怕',
        '您的感情容易受到伤害',
        '旁人能知道您的私下想法',
        '感到别人不理解您、不同情您',
        '感到人们对您不友好，不喜欢您',
        '做事必须做得很慢以保证做得正确',
        '心跳得很厉害',
        '恶心或胃部不舒服',
        '感到比不上他人',
        '肌肉酸痛',
        '感到有人在监视您、谈论您',
        '难以入睡',
        '做事必须反复检查',
        '难以作出决定',
        '怕乘电车、公共汽车、地铁或火车',
        '呼吸有困难',
        '一阵阵发冷或发热',
        '因为感到害怕而避开某些东西、场合或活动',
        '脑子变空了',
        '身体发麻或刺痛',
        '喉咙有梗塞感',
        '感到前途没有希望',
        '不能集中注意',
        '感到身体的某一部分软弱无力',
        '感到紧张或容易紧张',
        '感到手或脚沉重',
        '想到死亡的事',
        '吃得太多',
        '当别人看着您或谈论您时感到不自在',
        '有一些不属于您自己的想法',
        '有想打人或伤害他人的冲动',
        '醒得太早',
        '必须反复洗手、点数目或触摸某些东西',
        '睡得不稳不深',
        '有想摔坏或破坏东西的想法',
        '有一些别人没有的想法或念头',
        '感到对别人神经过敏',
        '在商店或电影院等人多的地方感到不自在',
        '感到任何事情都很困难',
        '一阵阵恐惧或惊恐',
        '感到在公共场合吃东西很不舒服',
        '经常与人争论',
        '单独一人时神经很紧张',
        '别人对您的成绩没有作出恰当的评价',
        '即使和别人在一起也感到孤单',
        '感到坐立不安、心神不定',
        '感到自己没有什么价值',
        '感到熟悉的东西变成陌生或不像是真的',
        '大叫或摔东西',
        '害怕会在公共场合晕倒',
        '感到别人想占您的便宜',
        '为一些有关性的想法而很苦恼',
        '您认为应该因为自己的过错而受到惩罚',
        '感到要赶快把事情做完',
        '感到自己的身体有严重问题',
        '从未感到和其他人很亲近',
        '感到自己有罪',
        '感到自己的脑子有毛病'
      ],
      compute(a) {
        let total = 0, positive = 0;
        a.forEach(x => { const v = +x || 0; total += v; if (v >= 2) positive++; });
        const mean = total / 90;
        const factorRows = this.factorDefs.map(f => {
          let s = 0; f.idx.forEach(n => s += (+a[n - 1] || 0));
          const m = s / f.idx.length;
          let note = '正常';
          if (m > 3) note = '明显'; else if (m > 2) note = '偏高';
          return { label: f.name, value: m.toFixed(2), note };
        });
        const screen = (total > 160) || (positive > 43) || factorRows.some(r => parseFloat(r.value) > 2);
        const level = screen ? 'positive' : 'negative';
        const levelText = screen ? '筛查阳性' : '筛查阴性';
        const note = screen
          ? '总分、阳性项目数或因子分达到筛查阳性标准，提示可能存在明显心理症状，建议进一步临床评估。'
          : '各项指标未达筛查阳性标准，未见明显症状聚集。';
        return {
          level, levelText,
          sections: [
            { title: '总分', rows: [{ label: '总分', value: total, of: 450 }, { label: '总均分', value: mean.toFixed(2), of: 5 }, { label: '阳性项目数(≥2分)', value: positive, of: 90 }] },
            { title: '9 个因子均分', rows: factorRows }
          ],
          notes: [note]
        };
      }
    },

    /* ===== MDQ 心境障碍问卷（双相筛查） ===== */
    {
      id: 'mdq', name: 'MDQ 心境障碍问卷（双相筛查）', short: 'MDQ', group: '双相/精神病性',
      intro: '请回想您一生中精力最旺盛、情绪最好或最易激惹的一段时期（持续至少数天），然后回答下面的问题。',
      options: LYN,
      items: [
        '那段时间里，您感到精力特别充沛或特别亢奋（几乎不觉得累）吗？',
        '那段时间里，您比平时更爱发脾气或更易激惹吗？',
        '您比平时自信得多，觉得自己特别能干或特别重要吗？',
        '您睡得比平时少很多，却不觉得困、精力照样充沛吗？',
        '您比平时话多，或者说话又快又滔滔不绝吗？',
        '您觉得脑子转得特别快，想法一个接一个吗？',
        '您很容易被外界事情分心，一件事没做完就转向另一件吗？',
        '您的活动比平时多得多（工作、社交、学习、出行等）吗？',
        '您变得特别爱交际、待人过分热情或主动联络很多人吗？',
        '您做过平时不会做的冒险的事吗（乱花钱、轻率投资、危险驾驶、轻率的性行为等）？',
        '您的性欲或对性的关注比平时明显增强吗？',
        '您的行为在旁人看来夸张、出格，或明显不像平时的您吗？',
        '您与人交往时过分随便、过分亲密，让别人觉得奇怪吗？',
        { t: '上面这些情况中，是否有几种在同一时期一起出现？', options: LYN },
        { t: '这些问题给您（或家人）造成的麻烦或影响有多大？', options: LMDQ15 }
      ],
      compute(a) {
        let sym = 0;
        for (let i = 0; i < 13; i++) sym += (+a[i] || 0);
        const same = (+a[13] || 0) === 1;
        const imp = +a[14] || 0;
        const impText = ['没有造成麻烦', '轻微', '中等', '严重'][imp] || '未答';
        const positive = (sym >= 7) && same && (imp >= 2);
        const level = positive ? 'positive' : 'negative';
        const levelText = positive ? '筛查阳性' : '筛查阴性';
        const note = positive
          ? 'MDQ 筛查阳性（症状≥7项、同一时期出现、影响达中等以上）：提示可能存在双相障碍（轻躁狂/躁狂发作）史，建议到精神科做进一步临床访谈（如 SCID-MD、HCL-32）评估，切勿仅凭此结果诊断。'
          : '未达 MDQ 筛查阳性标准，目前不支持双相障碍的筛查提示；如临床仍高度怀疑，请结合访谈进一步评估。';
        const notes = [note];
        if (same && sym >= 7 && imp < 2) notes.push('症状数目与同期发作达到标准，但造成的困扰程度未达中等，未判为筛查阳性，请结合临床判断。');
        if (sym >= 7 && !same) notes.push('症状数目达标，但否认同一时期集中出现，需注意回忆偏差，建议访谈核实。');
        return {
          level, levelText,
          sections: [{
            title: '得分',
            rows: [
              { label: '症状条目数（≥7 为症状达标）', value: sym, of: 13 },
              { label: '症状是否同一时期出现', value: same ? '是' : '否' },
              { label: '造成麻烦的程度', value: impText },
              { label: '筛查结论', value: positive ? '阳性' : '阴性' }
            ]
          }],
          notes
        };
      }
    },

    /* ===== BPRS 简明精神病量表（医师评定） ===== */
    {
      id: 'bprs', name: 'BPRS 简明精神病量表（医师评定）', short: 'BPRS', group: '双相/精神病性',
      role: 'clinician', optsCls: 'cols1',
      intro: '⚠️ 医师评定量表：请由经过训练的精神科专业人员，依据最近一周的观察与交谈情况逐项评分（1=无症状 … 7=极重）。主要适用于精神分裂症等精神病性症状的严重程度评定。',
      options: L17BPRS,
      items: [
        '1. 关心身体健康（对自身健康的过分关心）',
        '2. 焦虑（精神性焦虑：对当前及未来的担心、恐惧）',
        '3. 情感交流障碍（与检查者之间存在隔膜感）',
        '4. 概念紊乱（联想散漫、零乱和解体的程度）',
        '5. 罪恶观念（对以往言行的过分内疚与悔恨）',
        '6. 紧张（焦虑性运动表现：颤抖、坐立不安）',
        '7. 装相和作态（不寻常或不自然的运动性行为）',
        '8. 夸大（过分自负，确信有超常的才能和权力）',
        '9. 心境抑郁（悲伤、沮丧、情绪低落的程度）',
        '10. 敌对性（对他人的仇恨、敌对和蔑视）',
        '11. 猜疑（认为有人正在或曾经恶意对待他）',
        '12. 幻觉（没有相应外界刺激的感知）',
        '13. 动作迟缓（言语、动作和行为的减少与缓慢）',
        '14. 不合作（会谈时对立、不友好、不合作）',
        '15. 不寻常思维内容（荒谬古怪的思维内容）',
        '16. 情感平淡（情感基调低，缺乏正常情感反应）',
        '17. 兴奋（情感基调增高、激动、对外界反应增强）',
        '18. 定向障碍（对人物、地点或时间分辨不清）'
      ],
      compute(a) {
        const v = a.map(x => +x || 0);
        const total = v.reduce((s, x) => s + x, 0);
        const F = {
          '焦虑忧郁': [0, 1, 4, 8],
          '缺乏活力': [2, 12, 15, 17],
          '思维障碍': [3, 7, 11, 14],
          '激活性': [5, 6, 16],
          '敌对猜疑': [9, 10, 13]
        };
        const rows = Object.keys(F).map(k => {
          const s = F[k].reduce((t, i) => t + v[i], 0);
          const m = s / F[k].length;
          let note = '';
          if (m >= 5) note = '明显';
          else if (m >= 4) note = '中度';
          else if (m >= 3) note = '轻度';
          return { label: k + '（因子分）', value: m.toFixed(2), of: 7, note };
        });
        // 单项高分警示（≥5 偏重）
        const high = [];
        v.forEach((x, i) => { if (x >= 5) high.push((i + 1)); });
        const level = total > 35 ? 'positive' : 'negative';
        const levelText = total > 35 ? '超过临床界限（>35）' : '未超临床界限（≤35）';
        const note = total > 35
          ? '总分超过临床界限 35 分，反映精神病性症状整体较重，建议结合临床进一步评估与治疗调整。'
          : '总分未超过临床界限（总分越高病情越重；35 分为常用临床界限）。';
        const notes = [note];
        if (high.length) notes.push('⚠️ 偏重及以上（≥5分）的项目：第 ' + high.join('、') + ' 项，为当前主要靶症状。');
        rows.push({ label: 'BPRS 总分', value: total, of: 126 });
        return { level, levelText, sections: [{ title: '因子分与总分', rows }], notes };
      }
    },

    /* ===== HCL-32 轻躁狂症状清单（自评·双相筛查） ===== */
    {
      id: 'hcl32', name: 'HCL-32 轻躁狂症状清单', short: 'HCL-32', group: '双相/精神病性',
      intro: '请回顾您一生中情绪最积极、精力最旺盛或最易激惹的一段时期（即使当时未被诊断）。以下哪些描述符合您当时的状态？请勾选所有符合的项。',
      options: [{ v: 1, t: '是' }, { v: 0, t: '否' }],
      items: [
        '我需要睡眠的时间比平时少',
        '我感觉精力充沛或活动增多',
        '我更加自信',
        '我更加喜欢我的工作',
        '我更加喜欢交往（打更多电话、外出更频繁）',
        '我喜欢旅行并且确实旅行了很多',
        '当时喜欢开快车或在驾驶中更加不顾风险',
        '我会花比较多的钱或很多的金钱',
        '在我的日常生活中更加冒险',
        '我的活动量会增多（如花较多时间体育运动）',
        '我计划了更多的活动和方案',
        '我有很多的想法，我更加才思敏捷',
        '我不再害羞，不再前怕狼后怕虎',
        '我穿的衣服更加鲜艳/打扮更加时髦',
        '我希望接触很多人，和/或的确结识了更多的人',
        '我对性更加感兴趣，和/或性欲明显增加',
        '我表现得更加轻浮，或性行为比过去多',
        '我更加健谈',
        '我思维更加敏捷',
        '当我讲话时我更喜欢开玩笑或说俏皮话',
        '我比较容易分心',
        '我从事很多新奇的事情',
        '我的思维经常从一个话题跳到另一个话题',
        '我感到做事更加迅速和/或更加容易',
        '我更加没有耐心，和/或更容易对别人发怒',
        '我常常令他人疲惫不堪或恼怒',
        '我经常与人争吵',
        '我的情绪激昂，更加乐观',
        '我喝更多的咖啡或茶',
        '我抽更多的烟',
        '我喝更多的酒',
        '我吃更多的药物（镇静药、抗焦虑药、兴奋药、安眠药等）'
      ],
      compute(a) {
        let sum = 0;
        for (let i = 0; i < 32; i++) sum += (+a[i] || 0);
        const act = [0, 1, 2, 3, 4, 5, 6].some(i => (+a[i] || 0) === 1);
        const positive = sum >= 14 && act;
        const level = positive ? 'positive' : 'negative';
        const levelText = positive ? '筛查阳性' : '筛查阴性';
        const note = positive
          ? 'HCL-32 筛查阳性（"是"≥14 项，且激活簇〈前 7 题〉至少 1 项阳性）：提示既往可能存在轻躁狂/躁狂发作，建议结合 MDQ、YMRS 及临床访谈（如 SCID）进一步评估，切勿单凭此结果诊断。'
          : '未达 HCL-32 阳性标准（需"是"≥14 项且激活簇至少 1 项阳性）。若临床仍高度怀疑双相障碍，请结合其他评估。';
        return {
          level, levelText,
          sections: [{
            title: '得分',
            rows: [
              { label: '"是"的条目数（≥14 为症状达标）', value: sum, of: 32 },
              { label: '激活簇（前 7 题）是否至少 1 项"是"', value: act ? '是' : '否' },
              { label: '筛查结论', value: positive ? '阳性' : '阴性' }
            ]
          }],
          notes: [note]
        };
      }
    },

    /* ===== YMRS 杨氏躁狂评定量表（医师评定） ===== */
    {
      id: 'ymrs', name: 'YMRS 杨氏躁狂评定量表（医师评定）', short: 'YMRS', group: '双相/精神病性',
      role: 'clinician', optsCls: 'cols1',
      intro: '⚠️ 医师评定量表：请由经过训练的精神科专业人员，依据最近一周的观察与交谈逐项评分。第 5、6、8、9 项为 0–8 分，其余为 0–4 分，总分 0–60。',
      options: [{ v: 0, t: '0 无' }, { v: 1, t: '1' }, { v: 2, t: '2' }, { v: 3, t: '3' }, { v: 4, t: '4 极重' }],
      items: [
        { t: '1. 心境高涨' },
        { t: '2. 活动与精力增加' },
        { t: '3. 性兴趣' },
        { t: '4. 睡眠减少' },
        { t: '5. 易激惹', options: [{ v: 0, t: '0 无' }, { v: 2, t: '2 稍易激惹，能控制' }, { v: 4, t: '4 明显易激惹，时有不耐烦' }, { v: 6, t: '6 经常易激惹，回答生硬' }, { v: 8, t: '8 敌意、不合作' }] },
        { t: '6. 言语（速度与数量）', options: [{ v: 0, t: '0 无' }, { v: 2, t: '2 话较多' }, { v: 4, t: '4 语速/量时增、啰嗦' }, { v: 6, t: '6 紧迫、持续增加、难打断' }, { v: 8, t: '8 说个不停、无法打断' }] },
        { t: '7. 语言-思维形式障碍' },
        { t: '8. 思维内容', options: [{ v: 0, t: '0 正常' }, { v: 2, t: '2 可疑设想/新兴趣' }, { v: 4, t: '4 特殊计划/超宗教' }, { v: 6, t: '6 夸大/偏执观念' }, { v: 8, t: '8 幻觉或妄想' }] },
        { t: '9. 破坏-攻击行为', options: [{ v: 0, t: '0 无' }, { v: 2, t: '2 偶发怒、好讥讽' }, { v: 4, t: '4 时常易怒、威胁喊叫' }, { v: 6, t: '6 威胁性行为、可安抚' }, { v: 8, t: '8 狂暴、破坏、无法检查' }] },
        { t: '10. 外表' },
        { t: '11. 自知力' }
      ],
      compute(a) {
        const v = a.map(x => +x || 0);
        const total = v.reduce((s, x) => s + x, 0);
        let level, levelText, note;
        if (total <= 8) { level = 'normal'; levelText = '无明显躁狂'; note = '总分 ≤8，无明显躁狂症状。'; }
        else if (total <= 20) { level = 'mild'; levelText = '轻度躁狂'; note = '轻度躁狂（9–20 分），建议密切随访与临床评估。'; }
        else if (total <= 30) { level = 'moderate'; levelText = '中度躁狂'; note = '中度躁狂（21–30 分），建议积极干预。'; }
        else { level = 'severe'; levelText = '重度躁狂'; note = '重度躁狂（>30 分），建议尽快系统治疗与监测。'; }
        return {
          level, levelText,
          sections: [{ title: '得分', rows: [{ label: 'YMRS 总分', value: total, of: 60 }] }],
          notes: [note]
        };
      }
    },

    /* ===== MADRS 蒙哥马利抑郁评定量表（医师评定） ===== */
    {
      id: 'madrs', name: 'MADRS 蒙哥马利抑郁评定量表（医师评定）', short: 'MADRS', group: '双相/精神病性',
      role: 'clinician', optsCls: 'cols1',
      intro: '⚠️ 医师评定量表：请由经过训练的精神科专业人员，依据最近一周的观察与交谈，按 0–6 分评定（总分 0–60）。',
      options: [{ v: 0, t: '0' }, { v: 1, t: '1' }, { v: 2, t: '2' }, { v: 3, t: '3' }, { v: 4, t: '4' }, { v: 5, t: '5' }, { v: 6, t: '6 极重' }],
      items: [
        '1. 观察到的悲伤（0 无；2 偶发可疑；4 明显不持久；6 持续自发）',
        '2. 自述悲伤（0 无；2 难过偶发；4 难受持久；6 极度难以安慰）',
        '3. 内心紧张（0 无；2 偶发紧张；4 经常可缓解；6 持续极度）',
        '4. 睡眠减少（0 正常；2 轻度减少；4 明显减少；6 几乎不眠）',
        '5. 食欲下降（0 正常；2 轻度；4 明显；6 拒食）',
        '6. 注意集中困难（0 无；2 轻度；4 明显需努力；6 严重无法）',
        '7. 乏力/无活力（0 无；2 易疲劳；4 经常乏力；6 极度无法活动）',
        '8. 不能感受/情感迟钝（0 能感受；2 兴趣稍减；4 明显迟钝；6 完全不能感受快乐）',
        '9. 悲观想法（0 无；2 偶尔；4 经常悲观；6 绝望无价值）',
        '10. 自杀想法（0 无；2 闪现；4 经常无计划；6 有计划/企图）'
      ],
      compute(a) {
        const v = a.map(x => +x || 0);
        const total = v.reduce((s, x) => s + x, 0);
        let level, levelText, note;
        if (total <= 6) { level = 'normal'; levelText = '正常/缓解'; note = '总分 ≤6，处于正常或临床缓解范围。'; }
        else if (total <= 19) { level = 'mild'; levelText = '轻度抑郁'; note = '轻度抑郁（7–19 分）。'; }
        else if (total <= 34) { level = 'moderate'; levelText = '中度抑郁'; note = '中度抑郁（20–34 分），建议积极评估与干预。'; }
        else { level = 'severe'; levelText = '重度抑郁'; note = '重度抑郁（≥35 分），建议尽快系统治疗，注意自杀风险。'; }
        const notes = [note];
        if (v[9] >= 4) notes.push('⚠️ 自杀想法条目 ≥4 分，提示自杀风险，须优先评估与干预。');
        return {
          level, levelText,
          sections: [{ title: '得分', rows: [{ label: 'MADRS 总分', value: total, of: 60 }] }],
          notes
        };
      }
    },

    /* ===== OCI-R 强迫量表修订版（自评） ===== */
    {
      id: 'ocir', name: 'OCI-R 强迫量表修订版', short: 'OCI-R', group: '强迫/其他专项',
      intro: '请根据过去一个月的情况，选择各项经验对您造成困扰或烦恼的程度（0=完全没有，4=极重度）。',
      options: [{ v: 0, t: '0 无' }, { v: 1, t: '1 轻' }, { v: 2, t: '2 中' }, { v: 3, t: '3 重' }, { v: 4, t: '4 极重' }],
      items: [
        '我储存了太多东西，多到妨碍了我的生活空间',
        '我会过度频繁地检查事物，超出必要的程度',
        '如果物品没有被妥善排列整齐，我就感到心烦意乱',
        '我在做事情时，会感到有股冲动必须计数',
        '当我知道某物体曾被陌生人或特定人士碰过，我就很难再去触碰它',
        '我发现很难控制自己的想法',
        '我会收集一些我并不需要的东西',
        '我会反复检查门、窗、抽屉等',
        '如果别人改变了我安排事物的方式，我就感到心烦',
        '我觉得我必须重复某些特定的数字',
        '有时候我只是因为觉得自己被污染了，就必须清洗自己',
        '脑海中会不受控制地浮现一些不愉快的想法，这让我很困扰',
        '我会避免丢弃东西，因为害怕以后可能还需要它们',
        '关掉瓦斯、水龙头或电灯开关后，我会反复检查确认',
        '我需要将物品按照特定的顺序排列',
        '我觉得世界上有好数字跟坏数字之分',
        '我洗手的次数比一般人多，时间也更长',
        '我经常会有一些不好的念头，并且很难摆脱它们'
      ],
      compute(a) {
        const F = {
          '洗涤': [4, 10, 16], '强迫思维': [5, 11, 17], '囤积': [0, 6, 12],
          '排序': [2, 8, 14], '检查': [1, 7, 13], '中和': [3, 9, 15]
        };
        const sub = {};
        let total = 0;
        for (let i = 0; i < 18; i++) total += (+a[i] || 0);
        const rows = Object.keys(F).map(k => {
          const s = F[k].reduce((t, i) => t + (+a[i] || 0), 0);
          return { label: k + '（维度分）', value: s, of: 12 };
        });
        rows.push({ label: 'OCI-R 总分', value: total, of: 72 });
        let level, levelText, note;
        if (total <= 12) { level = 'normal'; levelText = '无明显'; note = '总分 ≤12，未见明显强迫症状。'; }
        else if (total <= 23) { level = 'mild'; levelText = '轻度'; note = '轻度强迫症状（13–23 分），可观察。'; }
        else if (total <= 35) { level = 'moderate'; levelText = '中度'; note = '中度强迫症状（24–35 分），建议专业评估与 CBT 等干预。'; }
        else { level = 'severe'; levelText = '重度'; note = '重度强迫症状（≥36 分），建议积极药物/心理治疗。'; }
        const notes = [note];
        const prom = Object.keys(F).filter(k => F[k].reduce((t, i) => t + (+a[i] || 0), 0) >= 8);
        if (prom.length) notes.push('突出维度（≥8 分）：' + prom.join('、') + '，为当前主要靶症状。');
        return { level, levelText, sections: [{ title: '六维度分与总分', rows }], notes };
      }
    },

    /* ===== CY-BOCS 儿童耶鲁-布朗强迫量表（医师评定） ===== */
    {
      id: 'cybocs', name: 'CY-BOCS 儿童耶鲁-布朗强迫量表（医师评定）', short: 'CY-BOCS', group: '强迫/其他专项',
      role: 'clinician', optsCls: 'cols1',
      intro: '⚠️ 医师评定量表（儿童版）：请由经过训练的精神科专业人员，向儿童及其家长询问后，依据最近一周评定（0=无，4=极重，总分 0–40）。适用于 17 岁及以下儿童青少年强迫症严重度评估。',
      options: [{ v: 0, t: '无' }, { v: 1, t: '轻' }, { v: 2, t: '中' }, { v: 3, t: '重' }, { v: 4, t: '极重' }],
      items: [
        '强迫思维：每天占用的时间', '强迫思维：对日常活动的干扰程度', '强迫思维：带来的痛苦/烦恼程度', '强迫思维：试图抵抗的程度', '强迫思维：主观上能控制/摆脱的程度',
        '强迫行为：每天占用的时间', '强迫行为：对日常活动的干扰程度', '强迫行为：带来的痛苦/烦恼程度', '强迫行为：试图抵抗的程度', '强迫行为：主观上能控制/摆脱的程度'
      ],
      compute(a) {
        let obs = 0, comp = 0;
        for (let i = 0; i < 5; i++) obs += (+a[i] || 0);
        for (let i = 5; i < 10; i++) comp += (+a[i] || 0);
        const total = obs + comp;
        let level, levelText, note;
        if (total <= 7) { level = 'normal'; levelText = '亚临床/无'; note = '未见明显强迫症状。'; }
        else if (total <= 15) { level = 'mild'; levelText = '轻度'; note = '轻度强迫，可观察并适当心理干预。'; }
        else if (total <= 23) { level = 'moderate'; levelText = '中度'; note = '中度强迫，建议专业评估与 CBT 等干预。'; }
        else if (total <= 31) { level = 'severe'; levelText = '重度'; note = '重度强迫，建议积极药物/心理治疗。'; }
        else { level = 'severe'; levelText = '极重度'; note = '极重度强迫，建议尽快系统治疗。'; }
        return {
          level, levelText,
          sections: [
            { title: '强迫思维', rows: [{ label: '小计', value: obs, of: 20 }] },
            { title: '强迫行为', rows: [{ label: '小计', value: comp, of: 20 }] },
            { title: '合计', rows: [{ label: '总分', value: total, of: 40 }] }
          ],
          notes: [note]
        };
      }
    }
  ];

  /* ===== EPQ 艾森克人格问卷（成人/儿童） ===== */
  // 记分键与常模依公开通行资料整理；正式临床应用请与龚耀先修订版手册核对。
  const EPQ_DIM_INFO = {
    P: { name: 'P 精神质', high: '孤独、不关心他人、难以适应环境、感觉迟钝、不顾危险', low: '温和、善感、能与人较好相处' },
    E: { name: 'E 内外向', high: '人格外向：好交际、渴望刺激与冒险、情感易外露', low: '人格内向：好静、富于内省、不喜欢刺激、情绪较稳定' },
    N: { name: 'N 神经质', high: '情绪不稳定：焦虑、担心、郁郁不乐、情绪反应强烈', low: '情绪稳定：反应平缓、易恢复平静' },
    L: { name: 'L 掩饰性', high: '掩饰/假托倾向，测评结果效度可能受影响', low: '回答较朴实坦率' }
  };
  function epqT(raw, m, s) { return Math.round((50 + 10 * (raw - m) / s) * 10) / 10; }
  function epqType(t) {
    if (t < 38.5) return { k: 'typelow', text: '典型' };
    if (t < 43.3) return { k: 'tendlow', text: '倾向' };
    if (t <= 56.7) return { k: 'mid', text: '中间型' };
    if (t <= 61.5) return { k: 'tendhigh', text: '倾向' };
    return { k: 'typicalhigh', text: '典型' };
  }
  function makeEPQ(id, name, group, intro, items, keys, norm, verNote) {
    return {
      id, name, short: name.indexOf('成人') >= 0 ? 'EPQ 成人' : 'EPQ 儿童', group,
      intro: intro + ' 每题选「是」或「否」，凭第一印象快速作答，不要反复琢磨。',
      options: LYN,
      items: [{ t: '请选择您的性别（用于常模换算）', type: 'sex' }].concat(items),
      compute(a) {
        const sex = (a[0] === 'M') ? 'M' : 'F';
        const dims = ['P', 'E', 'N', 'L'];
        const raw = {}, T = {};
        dims.forEach(d => {
          let s = 0;
          keys[d].pos.forEach(n => { if (+a[n] === 1) s++; });
          keys[d].neg.forEach(n => { if (+a[n] === 0) s++; });
          raw[d] = s;
          T[d] = epqT(s, norm[sex][d].m, norm[sex][d].s);
        });
        // 总体色标以 N（情绪稳定性）为准
        let level = 'normal', levelText = '情绪稳定 / 中间型';
        if (T.N > 61.5) { level = 'severe'; levelText = '情绪不稳定（典型）'; }
        else if (T.N > 56.7) { level = 'moderate'; levelText = '情绪欠稳定（倾向）'; }
        else if (T.N < 38.5) { level = 'mild'; levelText = '情绪高度稳定'; }
        const rows = dims.map(d => {
          const info = EPQ_DIM_INFO[d];
          const ty = epqType(T[d]);
          const how = (d === 'E') ? (T[d] > 56.7 ? '外向' : (T[d] < 43.3 ? '内向' : '中间')) : '';
          const howN = (d === 'N') ? (T[d] > 56.7 ? '不稳定' : (T[d] < 43.3 ? '稳定' : '中间')) : '';
          return {
            label: info.name,
            value: raw[d] + '/' + (keys[d].pos.length + keys[d].neg.length) + ' · T=' + T[d],
            note: ty.text + how + howN
          };
        });
        const notes = [];
        dims.forEach(d => {
          const ty = epqType(T[d]);
          const info = EPQ_DIM_INFO[d];
          if (d === 'L') {
            if (T[d] >= 60) notes.push('⚠️ L（掩饰）量表 T 分≥60：存在明显掩饰或幼稚倾向，本次测评效度存疑，解释需谨慎。');
            return;
          }
          if (ty.k === 'typicalhigh') notes.push(info.name + '典型高分：' + info.high + '。');
          else if (ty.k === 'typelow') notes.push(info.name + '典型低分：' + info.low + '。');
        });
        notes.push('各量表 T 分：43.3～56.7 为中间型；38.5～43.3 或 56.7～61.5 为倾向型；<38.5 或 >61.5 为典型。' + verNote);
        return { level, levelText, sections: [{ title: '四个维度（粗分 · T 分）', rows }], notes };
      }
    };
  }

  const EPQ_ADULT_ALL = [
    '你是否有许多不同的业余爱好？',
    '你是否在做任何事情以前都要停下来仔细思考？',
    '你的心境是否常有起伏？',
    '你曾有过明知不是自己的功劳而去领受奖励的事吗？',
    '你是否健谈？',
    '欠债会使你不安吗？',
    '你曾无缘无故觉得"真是难受"吗？',
    '你曾贪图过分外之物吗？',
    '你是否在晚上小心翼翼地锁好门？',
    '你是否比较活泼？',
    '你在见到一个小孩或一只动物受折磨时，是否会感到非常难过？',
    '你是否常常为将来忧虑？',
    '你是否喜欢参加各种集体活动？',
    '你喜欢忙忙碌碌和热热闹闹地过日子吗？',
    '你曾有过一阵情绪特别低落吗？',
    '你曾拿过别人的东西吗（哪怕是一针一线）？',
    '你是否话很多（多嘴多舌）？',
    '你是个讲究信用、说到做到的人吗？',
    '你是否常常感到心情烦乱？',
    '你的习惯是否都很好？',
    '你更喜欢安静独处，而不愿参加热闹的活动吗？',
    '你通常愿意原谅别人的过失吗？',
    '你是否经常感到紧张不安？',
    '你曾将不属于自己的东西拿来自己用吗？',
    '你是一个容易激动、激情来得快的人吗？',
    '你曾故意捉弄过别人取乐吗？',
    '你是否常为一些小事担忧？',
    '你曾有过不守信用的事吗？',
    '你在初次见面的场合是否拘谨害羞？',
    '你曾故意损坏过公物或别人的东西吗？',
    '你的情绪是否容易受到打击？',
    '你对人是否总是很友好？',
    '你在聚会或联欢中是否常是活跃分子？',
    '你听到或看到悲惨的事情时很少为之难过吗？',
    '你是否常有莫名其妙的烦恼？',
    '你是否从来没有说过谎？',
    '你敢于当众表达自己的观点吗？',
    '借了别人的东西，你总是及时归还吗？',
    '你是否容易心烦意乱？',
    '你曾说过别人的坏话或下流话吗？',
    '你在热闹的场合能应付自如吗？',
    '你能遵守纪律和公共规则吗？',
    '你是否常感到疲乏无力？',
    '你曾和人斤斤计较过吗？',
    '你通常喜欢独自做事，而不愿很多人一起吗？',
    '你喜欢看打斗或暴力场面的影视吗？',
    '你是否常为自己的健康担忧？',
    '你曾为自己做错的事找过借口吗？',
    '你和陌生人交谈会感到轻松自然吗？',
    '你曾欺负过比你弱小的人吗？',
    '你是否常感到忧心忡忡？',
    '你曾有过想占别人便宜的事吗？',
    '你喜欢外出游玩吗？',
    '你曾违背过自己的诺言吗？',
    '你在集体活动中常是带头活跃的人吗？',
    '你答应别人的事都会尽力做到吗？',
    '你是否常感到坐立不安？',
    '你做事总是很有条理吗？',
    '你容易感到灰心丧气吗？',
    '你曾错过重要的约定或时间吗？',
    '你是个当机立断的人吗？',
    '你做错了事会感到后悔吗？',
    '你的心情是否容易变坏？',
    '你曾嫉妒过别人的成就吗？',
    '你喜欢热闹、人多的场合吗？',
    '你看到感人的事情也很少动感情吗？',
    '你是否常常失眠或睡不好？',
    '你曾做过让别人感到害怕的事吗？',
    '你是否常为小事发脾气？',
    '你曾看不起不如你的人吗？',
    '你交朋友是否很快？',
    '你会为别人陷入困境而感到难过吗？',
    '你是否常常多愁善感？',
    '你是否常常感到孤独？',
    '你曾虐待或弄伤过小动物吗？',
    '你做了让别人不高兴的事，也很少感到内疚吗？',
    '你是否常感到焦虑不安？',
    '你遇事是否容易悲观？',
    '你曾把事情弄得一团糟吗？',
    '你喜欢快节奏、说干就干吗？',
    '你曾做过别人认为古怪的事吗？',
    '你是否常有莫名的不安全感？',
    '你经常感到幸福和愉快吗？',
    '你做事往往不先想一想、说干就干吗？',
    '你认为自己是一个无忧无虑、满不在乎的人吗？',
    '你常需要热心的朋友与你在一起使你高兴吗？',
    '你曾经损坏或遗失过别人的东西吗？',
    '你会为一动物落入圈套被捉拿而感到很难过吗？'
  ];

  const EPQ_ADULT_KEYS = {
    P: { pos: [26, 30, 34, 46, 50, 66, 68, 75, 76, 81, 85], neg: [2, 6, 9, 11, 18, 22, 38, 42, 56, 62, 72, 88] },
    E: { pos: [1, 5, 10, 13, 14, 17, 25, 33, 37, 41, 49, 53, 55, 61, 65, 71, 80, 84], neg: [21, 29, 45] },
    N: { pos: [3, 7, 12, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 57, 59, 63, 67, 69, 73, 74, 77, 78, 82, 86], neg: [] },
    L: { pos: [20, 32, 36, 58, 87], neg: [4, 8, 16, 24, 28, 40, 44, 48, 52, 54, 60, 64, 70, 79, 83] }
  };
  const EPQ_ADULT_NORM = {
    M: { P: { m: 6.08, s: 3.22 }, E: { m: 9.93, s: 4.37 }, N: { m: 10.06, s: 4.62 }, L: { m: 13.30, s: 3.85 } },
    F: { P: { m: 5.34, s: 2.95 }, E: { m: 9.03, s: 4.16 }, N: { m: 11.07, s: 4.75 }, L: { m: 14.09, s: 3.32 } }
  };

  const EPQ_CHILD_ITEMS = [
    '你喜欢周围有许多使你高兴的事情吗？',
    '你爱生气吗？',
    '你喜欢伤害你喜欢的人吗？',
    '你贪图过别人的便宜吗？',
    '与别人交谈时，你几乎总是很快地回答别人的问题吗？',
    '你很容易感到厌烦吗？',
    '有时你喜欢开一些的确使人伤心的玩笑吗？',
    '你总是立即按别人的吩咐去做吗？',
    '你宁愿单独一人，而不愿和其他小朋友一起玩吗？',
    '有很多念头占据你的头脑，使你不能入睡吗？',
    '你在学校曾违反过规章吗？',
    '你喜欢其他小朋友怕你吗？',
    '你很活泼吗？',
    '有许多事情使你烦恼吗？',
    '在上生物课时你喜欢杀动物吗？',
    '你曾拿过别人的东西（甚至一个大头针、一粒钮扣）吗？',
    '你有许多朋友吗？',
    '你无缘无故地觉得"真是难受"吗？',
    '有时你喜欢逗弄动物吗？',
    '别人叫你时，你有过装作没听见的事吗？',
    '你喜欢在古老的闹鬼的岩洞中探险吗？',
    '你常感觉生活非常无味吗？',
    '你比大多数小孩更爱吵嘴打架吗？',
    '你总是完成家庭作业后才去玩耍吗？',
    '你喜欢做一些动作要快的事情吗？',
    '你担心会发生一些可怕的事情吗？',
    '当听到别的孩子骂怪话时，你会制止他们吗？',
    '你能使一个晚会顺利开下去吗？',
    '当人们发现你的错误或你做事中的缺点时，你容易伤心吗？',
    '看见一只刚辗死的小狗你会难过吗？',
    '当你粗鲁失礼时，总要向别人道歉吗？',
    '是不是有人认为你做了对他们不起的事，他们一直想报复你吗？',
    '你认为滑雪好玩吗？',
    '你常无缘无故觉得疲乏吗？',
    '你很喜欢取笑其他的小朋友吗？',
    '成年人谈话时，你总是保持安静吗？',
    '交新朋友时，通常是你采取主动吗？',
    '你为某些事情发脾气吗？',
    '你常打架吗？',
    '你说过别人的坏话或下流话吗？',
    '你喜欢给你的朋友讲笑话或滑稽故事吗？',
    '你有一阵阵头晕的感觉吗？',
    '在学校里，你比大多数儿童更易受罚吗？',
    '通常你会拾起别人扔在教室地板上的废纸和垃圾吗？',
    '你有许多课余爱好和娱乐吗？',
    '你的感情很脆弱吗？',
    '你喜欢捉弄人吗？',
    '你总要在饭前洗手吗？',
    '在文娱活动中，你宁愿坐着看，而不愿亲自参加吗？',
    '你常常感到厌倦吗？',
    '有时遇到一伙人取笑或欺侮一个小孩时，你感到很好玩吗？',
    '课堂上你常保持安静，甚至老师不在教室也如此吗？',
    '你喜欢干点吓唬人的事吗？',
    '你有时不安，以致不能在椅子上静静地坐一会儿吗？',
    '你愿意单独上月球去吗？',
    '开会时别人唱歌，你也总是一道唱吗？',
    '你喜欢与别的小孩合群吗？',
    '你做许多恶梦吗？',
    '你的父母对你非常严厉吗？',
    '你喜欢不告诉任何人，独自离家到外面去漫游吗？',
    '你喜欢跳降落伞吗？',
    '你如果觉得自己干了件蠢事，会后悔很久吗？',
    '吃饭时摆在桌上的食物，你常常样样都吃吗？',
    '在热闹的晚会上，你能主动参加并尽情玩耍吗？',
    '有时你觉得不值得活下去吗？',
    '你会为落入猎人陷井的动物难过吗？',
    '你有不尊重父母的行为吗？',
    '你常常突然下决心要干很多事情吗？',
    '做作业时，你思想开小差吗？',
    '当别的孩子对你吼叫时，你也用吼叫来回报他们吗？',
    '你喜欢潜水或跳水吗？',
    '夜间你因为一些事情苦恼而有过失眠吗？',
    '你在学校或图书馆的书上乱写乱画吗？',
    '你在家中是否好象老是感到苦恼？',
    '别人认为你很活泼吗？',
    '你常觉得孤单吗？',
    '你对别人的东西总是特别小心爱护吗？',
    '你总是将自己的全部糖果与别人分着吃吗？',
    '你很喜欢外出玩耍吗？',
    '你在游戏中有过弄虚作假吗？',
    '有时你无缘无故感到特别高兴，有时又无缘无故感到特别悲伤吗？',
    '找不到废纸筐时，你把废纸扔在地上吗？',
    '你经常感到幸福和愉快吗？',
    '你做事情往往不先想一想吗？',
    '你认为自己是一个无忧无虑的人吗？',
    '你常需要热心的朋友与你在一起使你高兴吗？',
    '你曾经损坏或遗失过别人的东西吗？',
    '你喜欢乘坐开得很快的摩托车吗？'
  ];
  const EPQ_CHILD_KEYS = {
    P: { pos: [3, 7, 12, 15, 19, 23, 32, 35, 39, 43, 47, 51, 53, 59, 60], neg: [30, 66, 77] },
    E: { pos: [1, 5, 13, 17, 21, 25, 28, 33, 37, 41, 45, 55, 56, 57, 61, 64, 68, 71, 75, 79, 84, 88], neg: [9, 49, 52] },
    N: { pos: [2, 6, 10, 14, 18, 22, 26, 29, 34, 38, 42, 46, 50, 54, 58, 62, 65, 72, 74, 76, 81, 86], neg: [83] },
    L: { pos: [8, 24, 27, 31, 36, 44, 48, 63, 78, 85], neg: [4, 11, 16, 20, 40, 67, 69, 70, 73, 80, 82, 87] }
  };
  const EPQ_CHILD_NORM = {
    M: { P: { m: 4.02, s: 2.75 }, E: { m: 13.49, s: 3.02 }, N: { m: 5.98, s: 3.51 }, L: { m: 12.48, s: 3.35 } },
    F: { P: { m: 3.08, s: 2.27 }, E: { m: 12.43, s: 3.45 }, N: { m: 6.08, s: 3.80 }, L: { m: 13.52, s: 3.32 } }
  };

  SCALES.push(
    makeEPQ('epqA', 'EPQ 艾森克人格问卷（成人）', '人格测评',
      '本问卷共 88 题，适用于 16 岁以上成人，测量 P（精神质）、E（内外向）、N（神经质/情绪稳定性）、L（掩饰性）四个人格维度。',
      EPQ_ADULT_ALL, EPQ_ADULT_KEYS, EPQ_ADULT_NORM,
      '成人版常模依通行中国常模整理（按性别换算）。'),
    makeEPQ('epqC', 'EPQ 艾森克人格问卷（儿童）', '人格测评',
      '本问卷共 88 题，适用于 7～15 岁儿童（可由儿童自答，或家长按孩子日常表现代答），测量 P、E、N、L 四个人格维度。',
      EPQ_CHILD_ITEMS, EPQ_CHILD_KEYS, EPQ_CHILD_NORM,
      '儿童版（7~15 岁）常模依通行中国常模整理（按性别换算）。')
  );

  /* ===== 16PF 卡特尔十六种人格因素问卷（187 题） ===== */
  // 题干、计分键依《卡特尔16pf性格测试-187题》文档整理；原始分→标准分换算采用通行中国成人常模表。
  const PF16_ITEMS = [
    ["我很明了本测验的说明：", ["是的", "不一定", "不是的"]],
    ["我对本测验的每一个问题，都能做到诚实地回答：", ["是的", "不一定", "不同意"]],
    ["如果我有机会的话，我愿意：", ["到一个繁华的城市去旅行", "介于A、C之间", "浏览清静的山区"]],
    ["我有能力应付各种困难：", ["是的", "不一定", "不是的"]],
    ["即使是关在铁笼里的猛兽，我见了也会感到惴惴不安：", ["是的", "不一定", "不是的"]],
    ["我总是不敢大胆批评别人的言行：", ["是的", "有时如此", "不是的"]],
    ["我的思想似乎：", ["比较先进", "一般", "比较保守"]],
    ["我不擅长说笑话、讲有趣的事：", ["是的", "介于A、C之间", "不是的"]],
    ["当我见到亲友或邻居争吵时，我总是：", ["任其自己解决", "介于A、C之间", "予以劝解"]],
    ["在群众集会中，我：", ["谈吐自如", "介于A、C之间", "保持沉默"]],
    ["我愿做一个：", ["建筑工程师", "不确定", "社会科学研究者"]],
    ["阅读时，我喜欢选读：", ["自然科学书籍", "不确定", "政治理论书籍"]],
    ["我认为很多人都有些心理不正常，只是他们不愿意承认：", ["是的", "介于A、C之间", "不是的"]],
    ["我希望我的爱人擅长交际，无须具有文艺才能：", ["是的", "不一定", "不是的"]],
    ["对于性情急躁、爱发脾气的人，我仍能以礼相待", ["是的", "介于A、C之间", "不是的"]],
    ["受人侍奉时我常常局促不安：", ["是的", "介于A、C之间", "不是的"]],
    ["在从事体力或脑力劳动之后，我总是需要比别人更多的休息时间，才能保持工作效率：", ["是的", "介于A、C之间", "不是的"]],
    ["半夜醒来，我常常为种种不安而不能再入睡：", ["常常如此", "有时如此", "极少如此"]],
    ["事情进行得不顺利时：我常常急得涕泪交流：", ["从不如此", "有时如此", "极少如此"]],
    ["我认为只要双方同意可离婚，可以不受传统观念的束缚：", ["是的", "介于A、C之间", "不是的"]],
    ["我对人或物的兴趣都很容易改变：", ["是的", "介于A、C之间", "不是的"]],
    ["工作中，我愿意：", ["和别人合作", "不确定", "自己单独进行"]],
    ["我常常会无缘无故地自言自语：", ["常常如此", "偶然如此", "从不如此"]],
    ["无论是工作、饮食或外出游览，我总是：", ["匆匆忙忙，不能尽兴", "介于A、C之间", "从容不迫"]],
    ["有时我怀疑别人是否对我的言行真正有兴趣：", ["是的", "介于A、C之间", "不是的"]],
    ["如果我在工厂里工作，我愿做：", ["技术科的工作", "介于A、C之间", "宣传科的工作"]],
    ["在阅读时，我愿阅读：", ["有关太空旅行的书籍", "不太确定", "有关家庭教育的书籍"]],
    ["本题后面列出三个词，哪个与其他两个词不同类：", ["狗", "石头", "牛"]],
    ["如果我能到一个新的环境，我要：", ["把生活安排得和从前不一样", "不确定", "和从前相仿"]],
    ["在一生中，我总觉得我能达到我所预期的目标：", ["是的", "不一定", "不是的"]],
    ["当我说谎时，总觉得内心羞愧，不敢正视对方：", ["是的", "不一定", "不是的"]],
    ["假使我手里拿着一把装有子弹的手枪，我必须把子弹取出来才能安心：", ["是的", "介于A、C之间", "不是的"]],
    ["多数人认为我是一个说话风趣的人：", ["是的", "不一定", "不是的"]],
    ["如果人们知道我内心的成见，他们会大吃一惊：", ["是的", "不一定", "不是的"]],
    ["在公共场合，如果我突然成为大家注意的中心，就会感到局促不安：", ["是的", "介于A、C之间", "不是的"]],
    ["我总喜欢参加规模庞大的晚会或集会：", ["是的", "介于A、C之间", "不是的"]],
    ["在学科中，我喜欢：", ["音乐", "不一定", "手工劳动"]],
    ["我常常怀疑那些出乎我意料的对我过于友善的人的动机是否诚实：", ["是的", "介于A、C之间", "不是的"]],
    ["我愿意把我的生活安排得像一个：", ["艺术家", "不确定", "会计师"]],
    ["我认为目前所需要的是：", ["多出现一些改造世界的理想家", "不确定", "脚踏实地的实干家"]],
    ["有时候我觉得我需要剧烈的体力劳动：", ["是的", "介于A、C之间", "不是的"]],
    ["我愿意跟有教养的人来往而不愿意同鲁莽的人交往：", ["是的", "介于A、C之间", "不是的"]],
    ["在处理一些必须凭借智慧的事务中：", ["我的亲人表现得比一般人差", "普通", "我的亲人表现得超人一等"]],
    ["当领导召见我时，我：", ["觉得可以趁机提出建议", "介于A、C之间", "总怀疑自己做错了事"]],
    ["如果待遇优厚，我愿意做护理精神病人的工作：", ["是的", "介于A、C之间", "不是的"]],
    ["读报时，我喜欢读：", ["当今世界的基本问题", "介于A、C之间", "地方新闻"]],
    ["在接受困难任务时，我总是：", ["有独立完成的信心", "不确定", "希望有别人帮助和指导"]],
    ["在游览时，我宁愿观看一个画家的写生，也不愿听大家的辩论：", ["是的", "不一定", "不是的"]],
    ["我的神经脆弱，稍有点刺激就会战栗：", ["时常如此", "有时如此，", "从不如此"]],
    ["早晨起来，常常感到疲惫不堪：", ["是的", "介于A、C之间", "不是的"]],
    ["如果待遇相向，我愿选做：", ["森林管理员", "不一定", "中小学教员"]],
    ["每逢过年过节或亲友结婚时，我：", ["喜欢赠送礼品", "不太确定", "不愿相互送礼"]],
    ["本题后列有三个数字中，哪个数字与其他两个数字不同类：", ["5", "2", "7"]],
    ["猫和鱼就像牛和：", ["牛奶", "牧草", "盐"]],
    ["我在小学时敬佩的教师，到现在仍然值得我敬佩：", ["是的", "不一定", "不是的"]],
    ["我觉得我确实有一些别人所不及的优良品质：", ["是的", "不一定", "不是的"]],
    ["根据我的能力，即使让我做一些平凡的工作，我也会安心的：", ["是的", "不太确定", "不是的"]],
    ["我喜欢看电影或参加其他娱乐活动的次数：", ["比一般人多", "和一般人相同", "比一般人少"]],
    ["我喜欢从事需要精密技术的工作：", ["是的", "介于A、C之间", "不是的"]],
    ["在有威望、有地位的人面前，我总是较为局促、谨慎：", ["是的", "介于A、C之间", "不是的"]],
    ["对于我来说在大众面前演讲或表演，是一件难事：", ["是的", "介于A、C之间", "不是的"]],
    ["我愿意：", ["指挥几个人工作", "不确定", "和同志们一起工作"]],
    ["即使我做了一件让别人笑话的事，我也能坦然处之：", ["是的", "介于A、C之间", "不是的"]],
    ["我认为没有人会幸灾乐祸地希望我遇到困难：", ["是的", "不确定", "不是的"]],
    ["一个人应该：", ["考虑人生的真正意义", "不确定", "不是的"]],
    ["我喜欢去处理被别人弄得一塌糊涂的工作：", ["是的", "介于A、c之间", "不是的"]],
    ["当我非常高兴时，总有一种“好景不长”的感觉：", ["是的", "介于A、C之间", "不是的"]],
    ["在一般困难情境中，我总能保持乐观：", ["是的", "不一定", "不是的"]],
    ["迁居是一件极不愉快的事：", ["是的", "介于A、C之间", "不是的"]],
    ["在年轻的时候，当我和父母的意见不同时：", ["保留自己的意见", "介于A、C之间", "接受父母的意见"]],
    ["我希望把我的家庭：", ["建设成适合自身活动和娱乐的地方", "介于A、C之间", "成为邻里交往活动的一部分"]],
    ["我解决问题时，多借助于：", ["个人独立思考", "介于A、C之间", "和别人互相讨论"]],
    ["在需要当机立断时，我总是：", ["镇静地运用理智", "介于A、C之间", "常常紧张兴奋"]],
    ["最近在一两件事情上，我觉得我是无辜受累的：", ["是的", "介于A、C之间", "不是的"]],
    ["我善于控制我的表情：", ["是的", "介于A、C之间", "不是的"]],
    ["如果待遇相同，我愿做一个：", ["化学研究工作者", "不确定", "旅行社经理"]],
    ["以“惊讶”与“新奇”搭配为例，认为“惧怕”与：", ["勇敢", "焦虑", "恐怖搭配"]],
    ["本题后面列出3个分数，哪一个数与其他两个分数不同类：", ["3／7", "3／9", "3／11"]],
    ["不知为什么，有些人总是回避或冷淡我：", ["是的", "不一定", "不是的"]],
    ["我虽然好意待人，但常常得不到好报，", ["是的", "不一定", "不是的"]],
    ["我不喜欢争强好胜的人：", ["是的", "介于A、C之间", "不是的"]],
    ["和一般人相比，我的朋友的确太少：", ["是的", "介于A、C之间", "不是的"]],
    ["不在万不得已的情况下，我总是回避参加应酬性的活动：", ["是的", "不一定", "不是的"]],
    ["我认为对领导逢迎得当比工作表现更重要：", ["是的", "介于A、C之间", "不是的"]],
    ["参加竞赛时，我总是着重于竞赛的过程，而不计较成败：", ["总是如此", "一般如此", "偶然如此"]],
    ["按照我个人的意愿，我希望做的工作是：", ["有固定可靠的工资收入", "介于A、C之间", "工资高低应随我的工作表现而随时调整"]],
    ["我愿意阅读：", ["军事与政治的实事记载", "不一定", "富有情感的幻想的作品"]],
    ["我认为有许多人之所以不敢犯罪，其主要原因是怕被惩罚：", ["是的", "介于A, C之间", "不是的"]],
    ["我的父母从来不严格要求我事事顺从：", ["是的", "不一定", "不是的"]],
    ["“百折不挠，再接再厉”的精神常常被人们所忽略：", ["是的", "不一定", "不是的"]],
    ["当有人对我发火时，我总是：", ["设法使他镇静下来", "不太确定", "自己也会发起火来"]],
    ["我希望：", ["人们都要友好相处", "不一定", "不是的"]],
    ["不论是在极高的屋顶上，还是在极深的隧道中，我很少感到胆怯不安：", ["是的", "介于A、C之间", "不是的"]],
    ["只要没有过错，不管别人怎样说，我总能心安理得：", ["是的", "不一定", "不是的"]],
    ["我认为凡是无法用理智来解决的问题，有时就不得不靠强权处理：", ["是的", "介于A、C之间", "不是的"]],
    ["我在年轻的时候，和异性朋友交往：", ["较多", "介于A、C之间", "较别人少"]],
    ["我在社团活动中，是一个活跃分子：", ["是的", "介于A、C之间", "不是的"]],
    ["在人声嘴杂中，我仍能不受干扰，专心工作：", ["是的", "介于A、C之间", "不足的"]],
    ["在某些心境 因为困惑陷入空想而将工作搁置下来：", ["是的", "介于A、C之间", "不是的"]],
    ["我很少用难堪的语言去刺伤别人的感情：", ["是的", "不太确定", "不是的"]],
    ["如果让我选择，我宁愿选做：", ["列车员", "不确定", "描图员"]],
    ["“理不胜词”的意思是：", ["理不如词", "理多而词少", "辞藻华丽而理不足"]],
    ["以 “铁锹”与“挖掘”搭配为例，我认为“刀子”与：", ["琢磨", "切割", "铲除搭配"]],
    ["我在大街上，常常避开我所不愿意打招呼的人：", ["一般如此", "偶然如此", "有时如此"]],
    ["当我聚精会神地听音乐时，假使有人在旁边高谈阔论：", ["我仍能专心听音乐", "介于A、C之间", "不能专心而感到恼怒"]],
    ["在课堂上，如果我的意见与老师不同，我常常：", ["保持沉默", "不一定", "表明自己的看法"]],
    ["我单独跟异性谈话时，总显得不自然：", ["是的", "介于A、C之间", "不是的"]],
    ["我在待人接物方面，的确不太成功：", ["是的", "不完全这样", "不是的"]],
    ["每当做一件困难的工作时，我总是：", ["预先做好准备", "介于A、C之间", "相信到时候总会有办法解决的"]],
    ["在我结交的朋友中，男女各占一半：", ["是的", "介于A、C之间", "不是的"]],
    ["我在结交的朋友方面：", ["结识很多的人", "不一定", "维持几个深交的朋友"]],
    ["我愿意做一名社会科学家，而不愿做一名机械工程师：", ["是的", "不确定", "不是的"]],
    ["如果我发现了别人的缺点，我常常不顾一切地提出指责", ["是的", "介于A、C之间", "不是的"]],
    ["我喜欢设法影响和我一起工作的同志，使他们能协助我实现我所计划的目标：", ["是的", "介于A、C之间", "不是的"]],
    ["我喜欢做音乐、或歌舞或新闻采访等工作：", ["是的", "不一定", "不是的"]],
    ["当人们表扬我的时候，我总觉得羞愧窘促：", ["是的", "介于A、C之间", "不是的"]],
    ["我认为一个国家最需要解决的问题是：", ["政治问题", "不太确定", "道德问题"]],
    ["有时我会无故地产生一种面临大祸的恐惧：", ["是的", "有时如此", "不是的"]],
    ["我在童年时，害怕黑暗的次数：", ["极多", "不太多", "几乎没有"]],
    ["在闲暇的时候，我喜欢：", ["看一部历史性的探险电影", "不一定", "读一本科学性的幻想小说"]],
    ["当人们批评我古怪不正常时，我：", ["非常气恼", "有些气恼", "无所谓"]],
    ["当来到一个新城市里找地址时，我常常：", ["找人问路", "介于A、C之间", "参考地图"]],
    ["当朋友声明他要在家休息时，我总是设法怂勇他同我一起到外面去游览：", ["是的", "不一定", "不是的"]],
    ["在就寝时，我常常：", ["不易入睡", "介于A、C之间", "极易入睡"]],
    ["有人烦扰我时，我：", ["能不落声色", "介于A、C之间", "总要说给别人听，以泄气愤"]],
    ["如果待遇相同，我愿做一个：", ["律师", "不确定", "航海员"]],
    ["“时间变成了永恒”这是比喻", ["时间过得快", "忘了时间", "光阴一去不复返"]],
    ["本题后的哪一项应接在“x0000x  x00xxx”的后面：", ["“xox”", "“00x”", "“0xx”"]],
    ["不论到什么地方，我都能清楚地辨别方向：", ["是的", "介于A、C之间", "不是的"]],
    ["我热爱我所学的专业和所从事的工作：", ["是的", "不一定", "不是的"]],
    ["如果我急于想借朋友的东西，而朋友又不在家时，我认为不告而取也没有关系：", ["是的", "介于A、C之间", "不是的"]],
    ["我喜欢向朋友讲述一些我个人的有趣经历：", ["是的", "介于A、C之间", "不是的"]],
    ["我宁愿做一个：", ["演员", "不确定", "建筑师"]],
    ["业余时间，我总是做好安排，以免浪费时间：", ["是的", "介于A、C之间", "不是的"]],
    ["在和别人交往中，我常常会无缘无故地产生一种自卑感：", ["是的", "介于A、C之间", "不是的"]],
    ["和不熟识的人交谈，对我来说：", ["毫不困难", "介于A、C之间", "是一件难事"]],
    ["我所喜欢的音乐是：", ["轻松活泼的", "介于A、C之间", "富有感情的"]],
    ["我爱想入非非：", ["是的", "不一定", "不是的"]],
    ["我认为未来20年的世界局势，定将好转：", ["是的", "不一定", "不是的"]],
    ["在童年时，我喜欢阅读：", ["神话幻想故事", "不确定", "战争故事"]],
    ["我向来对机械、汽车等有兴趣：", ["是的", "介于A、C之间", "不是的"]],
    ["即使管理一个缓刑释放的罪犯，我也会把工作搞得较好：", ["是的", "介于A C之间", "不是的"]],
    ["我仅仅被认为是一个能够苦干而稍有成就的人而已：", ["是的", "介于A、C之间", "不是的"]],
    ["就是在不顺利的情况下，我仍能保持精神振奋：", ["是的", "介于A、C之间", "不是的"]],
    ["我认为节制生育是解决经济与和平问题的重要条件：", ["是的", "不太确定", "不是的"]],
    ["在工作中，我喜欢独自筹划，不愿受别人干涉：", ["是的", "介于A、C之间", "不是的"]],
    ["尽管有的同志和我的意见不和，但仍能跟他搞好团结：", ["是的", "介于A、C之间", "不是的"]],
    ["我在工作和学习上，总是使自己不粗心大意、不忽略细节：", ["是的", "介于A、C之间", "不是的"]],
    ["在和人争辨或险遭事故后，我常常表现出震颤、精疲力竭、不能安心工作：", ["是的", "介于A、C之间", "不是的"]],
    ["未经医生诊断，我是从不乱吃药的：", ["是的", "介于A, C之间", "不是的"]],
    ["根据我个人的兴趣，我愿参加：", ["摄影组织活动", "不确定", "文娱队活动"]],
    ["以“星火”与“燎原”搭配为例，我认为“姑息”与____ 搭配。", ["同情", "养奸", "纵容"]],
    ["“钟表”与“时间”的关系犹如“裁缝”与：", ["服装", "剪刀", "布料的关系"]],
    ["生动的梦境，常常干扰我的睡眠：", ["经常如此", "偶然如此", "从不如此"]],
    ["我爱打抱不平：", ["是的", "介于A、C之间", "不是的"]],
    ["如果我要到一个新城市，我将要：", ["到处闲逛", "不确定", "避免去不安全的地方"]],
    ["我爱穿朴素的衣服，不愿穿华丽的服装：", ["是的", "不太确定", "不是的"]],
    ["我认为安静的娱乐远远胜过热闹的宴会：", ["是的", "不太确定", "不是的"]],
    ["我明知自己有缺点，但不愿接受别人的批评：", ["偶然如此", "极少如此", "从不如此"]],
    ["我总是把“是、非、善、恶”作为处理问题的原则：", ["是的", "介于A、C之间", "不是的"]],
    ["当我工作时，我不喜欢有许多人在旁边参观：", ["是的", "介于A、C之间", "不是的"]],
    ["我认为，侮辱那些即使有错误但有文化教养的人，如医生、教师等也是不应该的：", ["是的", "介于A、C之间", "不是的"]],
    ["在各种课程中，我喜欢：", ["语文", "不确定", "数学"]],
    ["那些自以为是、道貌岸然的人使我生气：", ["是的", "介于A、C之间", "不是的"]],
    ["和循规蹈矩的人交谈：", ["很有兴趣，并有所得", "介于A、C之间", "他们的思想简单，使我太厌烦"]],
    ["我喜欢：", ["有几个有时对我很苛刻但富有感情的朋友", "介于A、C之间", "不受别人的干涉"]],
    ["如果征求我的意见，我赞同：", ["切实制止精神病患者和智能低下的人生育", "不确定", "杀人犯必须判处死刑"]],
    ["有时我会无缘无故地感到沮丧、痛苦：", ["是的", "介于A、C之间", "不是的"]],
    ["当和立场相反的人争辩时，我主张：", ["尽量找出基本概念的差异", "不一定", "彼此让步"]],
    ["我一向重感情而不重理智，因而我的观点常常动摇不定：", ["是的", "不一定", "不是的"]],
    ["我的学习多赖于：", ["阅读书刊", "介于A、C之间", "参加集体讨论"]],
    ["我宁愿选择一个工资较高的工作，不在乎是否有保障，而不愿做工资低但固定的工作：", ["是的", "不太确定", "不是的"]],
    ["在参加讨论时，我总是能把握自己的立场：", ["经常如此", "一般如此", "必要时才如此"]],
    ["我常常被一些无所谓的小事所烦扰：", ["是的", "介于A、C之间", "不是的"]],
    ["我宁愿住在嘈杂的闹市区，而不愿住在僻静的郊区：", ["是的", "不太确定", "不是的"]],
    ["下列工作如果任我挑选的话，我愿做：", ["少先队辅导员", "不太确定", "修表工作"]],
    ["一人     事，人人受累。", ["偾", "愤", "喷"]],
    ["望子成龙的家长往往___苗助长。", ["揠", "堰", "偃"]],
    ["气候的变化并不影响我的情绪：", ["是的", "介于A、C之间", "不是的"]],
    ["因为我对一切问题都有一些见解，所以大家都认为我是一个有头脑的人：", ["是的", "介于A、C之间", "不是的"]],
    ["我讲话的声音：", ["洪亮", "介于A、C之间", "低沉"]],
    ["一般人都认为我是一个活跃热情的人：", ["是的", "介于A、c之间", "不是的"]],
    ["我喜欢做出差机会较多的工作：", ["是的", "介于A、C之间", "不是的"]],
    ["我做事严格，力求把事情办得尽善尽美：", ["是的", "介于A、C之间", "不是的"]],
    ["在取回或归还所借的东西时，我总是仔细检查，看是否保持原样：", ["是的", "介于A、C之间", "不是的"]],
    ["我通常总是精力充沛，忙碌多事：", ["足的", "不一定", "不是的"]],
    ["我确信我没有遗漏或漫不经心地回答上面的任何问题：", ["是的", "不确定", "不是的"]]
  ];
  const PF16_FAC = {"A": [3, 26, 27, 51, 52, 76, 101, 126, 151, 176], "B": [28, 53, 54, 77, 78, 102, 103, 127, 128, 152, 153, 177, 178], "C": [4, 5, 29, 30, 55, 79, 80, 104, 105, 129, 130, 154, 179], "E": [6, 7, 31, 32, 56, 57, 81, 106, 131, 155, 156, 180, 181], "F": [8, 33, 58, 82, 83, 107, 108, 132, 133, 157, 158, 182, 183], "G": [9, 34, 59, 84, 109, 134, 159, 160, 184, 185], "H": [10, 35, 36, 60, 61, 85, 86, 110, 111, 135, 136, 161, 186], "I": [11, 12, 37, 62, 87, 112, 137, 138, 162, 163], "L": [13, 38, 63, 64, 88, 89, 113, 114, 139, 164], "M": [14, 15, 39, 40, 65, 90, 91, 115, 116, 140, 141, 165, 166], "N": [16, 17, 41, 42, 66, 67, 92, 117, 142, 167], "O": [18, 19, 43, 44, 68, 69, 93, 94, 118, 119, 143, 144, 168], "Q1": [20, 21, 45, 46, 70, 95, 120, 145, 169, 170], "Q2": [22, 47, 71, 72, 96, 97, 121, 122, 146, 171], "Q3": [23, 24, 48, 73, 98, 123, 147, 148, 172, 173], "Q4": [25, 49, 50, 74, 75, 99, 100, 124, 125, 149, 150, 174, 175]};
  const PF16_KEY2 = {"3": 0, "4": 0, "5": 2, "6": 2, "7": 0, "8": 2, "9": 2, "10": 0, "11": 2, "12": 2, "13": 0, "14": 2, "15": 2, "16": 2, "17": 0, "18": 0, "19": 2, "20": 0, "21": 0, "22": 2, "23": 2, "24": 2, "25": 0, "26": 2, "27": 2, "29": 2, "30": 0, "31": 2, "32": 2, "33": 0, "34": 2, "35": 2, "36": 0, "37": 0, "38": 0, "39": 0, "40": 0, "41": 2, "42": 0, "43": 0, "44": 2, "45": 2, "46": 0, "47": 0, "48": 0, "49": 0, "50": 0, "51": 2, "52": 0, "55": 0, "56": 0, "57": 2, "58": 0, "59": 0, "60": 2, "61": 2, "62": 2, "63": 2, "64": 2, "65": 0, "66": 2, "67": 2, "68": 2, "69": 0, "70": 0, "71": 0, "72": 0, "73": 0, "74": 0, "75": 2, "76": 2, "79": 2, "80": 2, "81": 2, "82": 2, "83": 2, "84": 2, "85": 2, "86": 2, "87": 2, "88": 0, "89": 2, "90": 2, "91": 0, "92": 2, "93": 2, "94": 2, "95": 2, "96": 2, "97": 2, "98": 0, "99": 0, "100": 2, "101": 0, "104": 0, "105": 0, "106": 2, "107": 2, "108": 2, "109": 0, "110": 0, "111": 0, "112": 0, "113": 0, "114": 0, "115": 0, "116": 0, "117": 0, "118": 0, "119": 0, "120": 2, "121": 2, "122": 2, "123": 2, "124": 0, "125": 2, "126": 0, "129": 0, "130": 0, "131": 0, "132": 0, "133": 0, "134": 0, "135": 2, "136": 0, "137": 2, "138": 0, "139": 2, "140": 0, "141": 2, "142": 0, "143": 0, "144": 2, "145": 0, "146": 0, "147": 0, "148": 0, "149": 0, "150": 0, "151": 2, "154": 2, "155": 0, "156": 0, "157": 2, "158": 2, "159": 2, "160": 0, "161": 2, "162": 2, "163": 0, "164": 0, "165": 2, "166": 2, "167": 0, "168": 0, "169": 0, "170": 2, "171": 0, "172": 2, "173": 0, "174": 0, "175": 2, "176": 0, "179": 0, "180": 0, "181": 0, "182": 0, "183": 0, "184": 0, "185": 0, "186": 0};
  const PF16_KEYB = {"28": 1, "53": 1, "54": 1, "77": 2, "78": 1, "102": 2, "103": 1, "127": 2, "128": 1, "152": 1, "153": 2, "177": 0, "178": 0};
  const PF16_STEN = {"A": [[0, 1], [2, 3], [4, 5], [6, 6], [7, 8], [9, 11], [12, 13], [14, 14], [15, 16], [17, 20]], "B": [[0, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10], [11, 11], [12, 13]], "C": [[0, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 16], [17, 18], [19, 20], [21, 22], [23, 26]], "E": [[0, 2], [3, 4], [5, 5], [6, 7], [8, 9], [10, 12], [13, 14], [15, 16], [17, 18], [19, 26]], "F": [[0, 3], [4, 4], [5, 6], [7, 7], [8, 9], [10, 12], [13, 14], [15, 16], [17, 18], [19, 26]], "G": [[0, 5], [6, 7], [8, 9], [10, 10], [11, 12], [13, 14], [15, 16], [17, 17], [18, 18], [19, 20]], "H": [[0, 1], [2, 2], [3, 3], [4, 6], [7, 8], [9, 11], [12, 14], [15, 16], [17, 19], [20, 26]], "I": [[0, 5], [6, 6], [7, 8], [9, 9], [10, 11], [12, 13], [14, 14], [15, 16], [17, 17], [18, 20]], "L": [[0, 3], [4, 5], [6, 6], [7, 8], [9, 10], [11, 12], [13, 13], [14, 15], [16, 16], [17, 20]], "M": [[0, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 19], [20, 20], [21, 26]], "N": [[0, 2], [3, 3], [4, 4], [5, 6], [7, 8], [9, 10], [11, 11], [12, 13], [14, 14], [15, 20]], "O": [[0, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 26]], "Q1": [[0, 4], [5, 5], [6, 7], [8, 8], [9, 10], [11, 12], [13, 13], [14, 14], [15, 15], [16, 20]], "Q2": [[0, 5], [6, 7], [8, 8], [9, 10], [11, 12], [13, 14], [15, 15], [16, 17], [18, 18], [19, 20]], "Q3": [[0, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 15], [16, 17], [18, 18], [19, 20]], "Q4": [[0, 2], [3, 4], [5, 6], [7, 8], [9, 11], [12, 14], [15, 16], [17, 19], [20, 21], [22, 26]]};
  const PF16_MAX = {"A": 20, "B": 13, "C": 26, "E": 26, "F": 26, "G": 20, "H": 26, "I": 20, "L": 20, "M": 26, "N": 20, "O": 26, "Q1": 20, "Q2": 20, "Q3": 20, "Q4": 26};
  const PF16_INFO = {"A": {"n": "乐群性", "lo": "缄默、孤独、冷漠", "hi": "外向、热情、乐群"}, "B": {"n": "智慧性", "lo": "迟钝、学识浅薄", "hi": "聪明、富有才识"}, "C": {"n": "稳定性", "lo": "情绪激动、易波动", "hi": "情绪稳定而成熟"}, "E": {"n": "恃强性", "lo": "谦虚、顺从", "hi": "好强固执、支配攻击"}, "F": {"n": "兴奋性", "lo": "严肃审慎、沉默寡言", "hi": "轻松兴奋、逍遥放纵"}, "G": {"n": "有恒性", "lo": "权宜敷衍、原则性差", "hi": "有恒负责、重良心"}, "H": {"n": "敢为性", "lo": "害羞畏缩、退却", "hi": "冒险敢为、少有顾忌"}, "I": {"n": "敏感性", "lo": "粗心、理智、着重实际", "hi": "细心、敏感、好感情用事"}, "L": {"n": "怀疑性", "lo": "真诚合作、宽容信赖", "hi": "怀疑刚愎、固执己见"}, "M": {"n": "幻想性", "lo": "现实、脚踏实地", "hi": "富于想像、狂放不羁"}, "N": {"n": "世故性", "lo": "坦诚直率、天真", "hi": "精明世故、人情练达"}, "O": {"n": "忧虑性", "lo": "安详沉着、有自信心", "hi": "忧虑抑郁、沮丧悲观"}, "Q1": {"n": "变革性", "lo": "保守、循规蹈矩", "hi": "自由开放、批评激进"}, "Q2": {"n": "独立性", "lo": "依赖、随群附众", "hi": "自立自强、当机立断"}, "Q3": {"n": "自律性", "lo": "不能自制、松懈随心", "hi": "知己知彼、自律谨严"}, "Q4": {"n": "紧张性", "lo": "心平气和、镇静自若", "hi": "紧张困扰、激动挣扎"}};
  function pf16sten(f, raw) {
    const t = PF16_STEN[f];
    for (let i = 0; i < t.length; i++) if (raw >= t[i][0] && raw <= t[i][1]) return i + 1;
    return raw < 0 ? 1 : 10;
  }
  SCALES.push({
    id: 'pf16', name: '16PF 卡特尔十六种人格问卷', short: '16PF', group: '人格测评',
    intro: '共 187 题，每题三个选项。请按自己的实际情况尽快作答，凭第一印象选择，尽量少选中间（B）选项。第 1、2、187 题为效度题（不计分）。完成约需 25～40 分钟。',
    items: PF16_ITEMS.map(x => ({ t: x[0], options: [{ v: 0, t: x[1][0] }, { v: 1, t: x[1][1] }, { v: 2, t: x[1][2] }] })),
    compute(a) {
      const raw = {}, st = {};
      Object.keys(PF16_FAC).forEach(f => {
        let r = 0;
        PF16_FAC[f].forEach(n => {
          const v = a[n - 1];
          if (v === undefined || v === null || v === '') return;
          const ans = +v;
          if (PF16_KEYB[n] !== undefined) {
            if (ans === PF16_KEYB[n]) r += 1;
          } else if (ans === PF16_KEY2[n]) r += 2;
          else if (ans === 1) r += 1;
        });
        raw[f] = r; st[f] = pf16sten(f, r);
      });
      const S = st;
      const rows16 = Object.keys(PF16_FAC).map(f => {
        const info = PF16_INFO[f];
        const v = st[f];
        const note = v >= 8 ? ('偏高：' + info.hi) : (v <= 3 ? ('偏低：' + info.lo) : '中等');
        return { label: f + ' ' + info.n, value: raw[f] + '/' + PF16_MAX[f] + ' · 标准分 ' + v, of: PF16_MAX[f], note: note };
      });
      // 次级人格因素（一阶标准分加权回归方程）
      const X1 = (38 + 2 * S.L + 3 * S.O + 4 * S.Q4 - 2 * S.C - 2 * S.H - 2 * S.Q3) / 10;
      const X2 = (2 * S.A + 3 * S.E + 4 * S.F + 5 * S.H - 2 * S.Q2 - 11) / 10;
      const X3 = (77 + 2 * S.C + 2 * S.E + 2 * S.F + 2 * S.N - 4 * S.A - 6 * S.I - 2 * S.M) / 10;
      const X4 = (4 * S.E + 3 * S.M + 4 * S.Q1 + 4 * S.Q2 - 3 * S.A - 2 * S.G) / 10;
      const sec = [
        { label: 'X1 适应与焦虑型', value: X1.toFixed(1), note: X1 <= 4 ? ('偏低：' + '生活适应顺利、心满意足；极端低分可能缺乏毅力') : (X1 >= 7 ? '偏高：易激动焦虑、对境遇常感不满，可影响效率与健康' : '中等') },
        { label: 'X2 内向与外向型', value: X2.toFixed(1), note: X2 <= 4 ? '偏低：偏内倾，胆小自足、克制冷静，利于精细工作' : (X2 >= 7 ? '偏高：偏外倾，开朗善交际、不拘小节，利于贸易交往类工作' : '中等') },
        { label: 'X3 感情用事与安详机警型', value: X3.toFixed(1), note: X3 <= 4 ? '偏低：感情丰富而困扰不安，含蓄敏感、顾虑较多' : (X3 >= 7 ? '偏高：安详警觉、果断刚毅、进取，但常忽视细节、易贸然行事' : '中等') },
        { label: 'X4 怯懦与果敢型', value: X4.toFixed(1), note: X4 <= 4 ? '偏低：怯懦顺从、依赖、优柔寡断' : (X4 >= 7 ? '偏高：独立果敢、锋芒毕露、有气魄' : '中等') }
      ];
      // 综合应用（预测性人格因素）
      const MH = S.C + S.F + (11 - S.O) + (11 - S.Q4);
      const ACH = 2 * S.Q3 + 2 * S.G + 2 * S.C + S.E + S.N + S.Q2 + S.Q1;
      const CRE = 2 * (11 - S.A) + 2 * S.B + S.E + 2 * (11 - S.F) + S.H + 2 * S.I + S.M + (11 - S.N) + S.Q1 + 2 * S.Q2;
      const GRO = S.B + S.G + S.Q3 + (11 - S.F);
      const app = [
        { label: '心理健康者的人格因素', value: MH + '（0~40，均值22）', note: MH < 12 ? '低于 12：情绪很不稳定，约占人群 10%，建议关注情绪与压力管理' : (MH >= 22 ? '在平均及以上水平' : '略低于平均水平') },
        { label: '专业有成就者的人格因素', value: ACH + '（10~100，均值55）', note: ACH >= 67 ? '≥67：一般应有较好成就' : (ACH >= 55 ? '达到平均水平' : '低于平均水平') },
        { label: '创造力强者的人格因素', value: CRE + '', note: CRE >= 88 ? '创造力较强' : (CRE >= 75 ? '创造力中上' : '创造力一般水平') },
        { label: '新环境成长能力', value: GRO + '（4~40，均值22）', note: GRO < 17 ? '低于 17：约 10% 的人不太适应新环境' : (GRO >= 27 ? '≥27：在新环境中有成功希望' : '中等水平') }
      ];
      // 效度检查（第 1、2、187 题）
      const v1 = +(a[0] === undefined ? -1 : a[0]), v2 = +(a[1] === undefined ? -1 : a[1]), v187 = +(a[186] === undefined ? -1 : a[186]);
      const val = [
        { label: '第 1 题（是否明了测验说明）', value: v1 === 0 ? '是' : (v1 === 1 ? '不一定' : (v1 === 2 ? '不是的' : '未答')), note: v1 === 2 ? '提示：作答者表示未明了测验说明，结果解释需谨慎' : '正常' },
        { label: '第 2 题（是否诚实作答）', value: v2 === 0 ? '是' : (v2 === 1 ? '不一定' : (v2 === 2 ? '不同意' : '未答')), note: v2 !== 0 ? '提示：未明确表示诚实作答，结果解释需谨慎' : '正常' },
        { label: '第 187 题（是否认真作答）', value: v187 === 0 ? '是' : (v187 === 1 ? '不确定' : (v187 === 2 ? '不是的' : '未答')), note: v187 !== 0 ? '提示：作答者承认可能有遗漏或漫不经心的回答，建议复核' : '正常' }
      ];
      const level = MH < 12 ? 'severe' : (MH < 18 ? 'mild' : 'negative');
      const levelText = MH < 12 ? '心理健康因素偏低' : (MH < 18 ? '心理健康因素略低' : '心理健康因素在平均范围');
      const hiF = [], loF = [];
      Object.keys(PF16_FAC).forEach(f => {
        const v = st[f], info = PF16_INFO[f];
        if (v >= 8) hiF.push(f + '（' + info.n + '）标准分 ' + v + '：' + info.hi);
        if (v <= 3) loF.push(f + '（' + info.n + '）标准分 ' + v + '：' + info.lo);
      });
      const notes = [];
      if (hiF.length) notes.push('高分因素：' + hiF.join('；') + '。');
      if (loF.length) notes.push('低分因素：' + loF.join('；') + '。');
      if (!hiF.length && !loF.length) notes.push('各因素标准分多在 4~7 的中间区间，人格剖面较平缓，无特别突出或明显偏低的因素。');
      notes.push('标准分 1~10 分：≤3 为低分，4~7 为中间，≥8 为高分。次级因素 X1~X4 由一阶因素标准分按回归方程推算（参考范围约 1~10，两端 ±2 以外为明显倾向）。');
      notes.push('计分键与常模依用户提供的《卡特尔16pf性格测试-187题》文档及通行中国成人常模表整理，正式临床应用请与修订版手册（华东师大 16PF 修订版）核对。16PF 描述的是人格特质倾向，不构成疾病诊断。');
      return {
        level, levelText,
        sections: [
          { title: '十六种人格因素（原始分 / 标准分）', rows: rows16 },
          { title: '次级人格因素', rows: sec },
          { title: '综合应用（预测性人格因素）', rows: app },
          { title: '效度检查', rows: val }
        ],
        notes
      };
    }
  });

  // PSQI 时间解析辅助
  function timeToMin(v) {
    if (!v || typeof v !== 'string') return 0;
    const m = v.match(/(\d{1,2}):(\d{2})/);
    if (!m) return 0;
    return (+m[1]) * 60 + (+m[2]);
  }

  function getScale(id) { return SCALES.find(s => s.id === id); }

  /* ---------------- 状态 ---------------- */
  const state = { scale: null, answers: [], mode: 'test' };

  /* ---------------- DOM 辅助 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function show(id) {
    ['home', 'test', 'result', 'report', 'archive'].forEach(p => {
      const n = document.getElementById(p);
      if (n) n.style.display = (p === id) ? 'block' : 'none';
    });
    if (id === 'home') renderHome();
    if (id === 'archive') renderArchive();
    window.scrollTo(0, 0);
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    const root = $('#home');
    root.innerHTML = '';
    const pushed = state.pushIds;
    root.appendChild(el('div', 'hero',
      '<h1>心理测评</h1><p>' +
      (pushed
        ? '医生为您安排了 ' + pushed.length + ' 项测评 · 完成后可分享给医生'
        : '手机即可完成 · 当场出结果 · 可分享给医生') + '</p>'));
    const list = pushed ? SCALES.filter(s => pushed.indexOf(s.id) >= 0) : SCALES;
    if (!list.length) { root.appendChild(el('p', 'empty', '推送链接无效或量表不存在，请向医生索取新链接。')); return; }
    // 按 group 分组
    const groups = [];
    list.forEach(s => { if (!groups.includes(s.group)) groups.push(s.group); });
    groups.forEach(g => {
      const sec = el('div', 'group');
      sec.appendChild(el('h2', null, g));
      const grid = el('div', 'cards');
      list.filter(s => s.group === g).forEach(s => {
        const card = el('button', 'card');
        card.innerHTML = '<span class="card-name">' + s.name + (s.role === 'clinician' ? '<span class="card-cli">医师评定</span>' : '') + '</span><span class="card-meta">' +
          (s.items.length || (s.factorDefs ? 90 : 0)) + ' 题 · 点击开始</span>';
        card.onclick = () => startTest(s.id);
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      root.appendChild(sec);
    });
    if (!pushed) {
      const pushBtn = el('button', 'btn ghost push-entry', '医生专用：定向推送指定量表给被测者 →');
      pushBtn.onclick = openPushModal;
      root.appendChild(pushBtn);
      root.appendChild(el('p', 'foot', '本工具结果仅为量表筛查，不能替代临床诊断。'));
    } else {
      root.appendChild(el('p', 'foot', '本页面只包含医生安排的测评项目。'));
    }
  }

  /* ---------------- 医生：定向推送 ---------------- */
  function openPushModal() {
    const wrap = el('div', 'modal-mask');
    const box = el('div', 'modal');
    box.innerHTML = '<div class="modal-t">定向推送测评</div>' +
      '<p class="modal-p">勾选需要被测者完成的量表，生成本次专属链接/二维码。对方打开后只会看到勾选的量表，答完仍可一键分享结果给您。医师评定量表（BPRS）不参与推送。</p>';
    const scroll = el('div', 'modal-scroll');
    SCALES.filter(s => s.role !== 'clinician').forEach(s => {
      const lab = el('label', 'pick');
      lab.innerHTML = '<input type="checkbox" value="' + s.id + '"><span>' + s.name +
        ' <em>' + s.items.length + '题</em></span>';
      scroll.appendChild(lab);
    });
    box.appendChild(scroll);
    const row = el('div', 'acts');
    const gen = el('button', 'btn primary', '生成推送链接');
    const close = el('button', 'btn ghost', '关闭');
    close.onclick = () => wrap.remove();
    gen.onclick = () => {
      const ids = Array.from(box.querySelectorAll('input:checked')).map(i => i.value);
      if (!ids.length) { alert('请至少勾选一个量表。'); return; }
      const url = location.origin + location.pathname + '#s=' + ids.join(',');
      box.innerHTML = '<div class="modal-t">推送链接已生成</div>' +
        '<p class="modal-p">把这个链接发给被测者（微信/短信均可），或让对方直接扫码。对方只会看到勾选的 ' + ids.length + ' 个量表。</p>';
      const link = el('input', 'share-link'); link.readOnly = true; link.value = url;
      box.appendChild(link);
      const qrBox = el('div', 'qr');
      try {
        const qr = qrcode(0, 'M');
        qr.addData(url); qr.make();
        qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8 });
      } catch (e) { qrBox.textContent = '（二维码生成失败，可复制链接）'; }
      box.appendChild(qrBox);
      const r2 = el('div', 'acts');
      const copy = el('button', 'btn primary', '复制链接');
      copy.onclick = () => { link.select(); try { document.execCommand('copy'); copy.textContent = '已复制 ✓'; } catch (e) { alert('请手动复制链接'); } };
      const done = el('button', 'btn ghost', '关闭');
      done.onclick = () => wrap.remove();
      r2.appendChild(copy); r2.appendChild(done);
      box.appendChild(r2);
    };
    row.appendChild(gen); row.appendChild(close);
    box.appendChild(row);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
  }

  /* ---------------- 答题 ---------------- */
  function startTest(id) {
    const s = getScale(id);
    state.scale = s; state.answers = new Array(s.items.length).fill(undefined); state.mode = 'test';
    renderTest();
    show('test');
  }

  function renderTest() {
    const s = state.scale;
    const root = $('#test');
    root.innerHTML = '';
    // 顶部
    const top = el('div', 'test-top');
    top.innerHTML = '<button class="back" onclick="location.hash=\'\';app.goHome()">← 返回</button>' +
      '<div class="test-title">' + s.name + '</div>' +
      '<div class="progress" id="progress"></div>';
    root.appendChild(top);
    if (s.intro) root.appendChild(el('p', 'intro', s.intro));
    const form = el('div', 'form');
    s.items.forEach((it, i) => {
      const item = (typeof it === 'string') ? { t: it } : it;
      const q = el('div', 'q');
      q.appendChild(el('div', 'q-t', (i + 1) + '. ' + item.t));
      if (item.type === 'sex') {
        const opts = el('div', 'opts');
        [{ v: 'M', t: '男' }, { v: 'F', t: '女' }].forEach(o => {
          const b = el('button', 'opt');
          b.type = 'button';
          b.textContent = o.t;
          b.dataset.val = o.v;
          b.onclick = () => {
            state.answers[i] = o.v;
            Array.from(opts.children).forEach(c => c.classList.remove('on'));
            b.classList.add('on');
            updateProgress();
          };
          opts.appendChild(b);
        });
        q.appendChild(opts);
      } else if (item.type === 'time' || item.type === 'num') {
        const inp = document.createElement('input');
        inp.type = (item.type === 'time') ? 'time' : 'number';
        if (item.type === 'num') { if (item.min != null) inp.min = item.min; if (item.max != null) inp.max = item.max; if (item.step) inp.step = item.step; }
        inp.className = 'num-inp';
        inp.dataset.idx = i;
        if (item.unit) inp.setAttribute('aria-label', item.t + '（' + item.unit + '）');
        inp.oninput = () => { state.answers[i] = inp.value; updateProgress(); };
        q.appendChild(inp);
      } else {
        const opts = el('div', 'opts' + (s.optsCls ? ' ' + s.optsCls : ''));
        (item.options || s.options).forEach(o => {
          const b = el('button', 'opt');
          b.type = 'button';
          b.textContent = o.t;
          b.dataset.val = o.v;
          b.onclick = () => {
            state.answers[i] = o.v;
            Array.from(opts.children).forEach(c => c.classList.remove('on'));
            b.classList.add('on');
            updateProgress();
          };
          opts.appendChild(b);
        });
        q.appendChild(opts);
      }
      form.appendChild(q);
    });
    root.appendChild(form);
    const bar = el('div', 'submitbar');
    const btn = el('button', 'submit-btn', '提交并出结果');
    btn.onclick = submitTest;
    bar.appendChild(btn);
    root.appendChild(bar);
    updateProgress();
  }

  function isAnswered(s, i) {
    const v = state.answers[i];
    return v !== undefined && v !== null && String(v).trim() !== '';
  }
  function updateProgress() {
    const s = state.scale;
    let done = 0;
    for (let i = 0; i < s.items.length; i++) if (isAnswered(s, i)) done++;
    const p = $('#progress');
    if (p) p.textContent = '已答 ' + done + ' / ' + s.items.length;
  }

  function submitTest() {
    const s = state.scale;
    const missing = [];
    for (let i = 0; i < s.items.length; i++) if (!isAnswered(s, i)) missing.push(i + 1);
    if (missing.length) {
      if (!confirm('还有 ' + missing.length + ' 题未作答（第 ' + missing.slice(0, 8).join('、') + (missing.length > 8 ? '…' : '') + ' 题）。\n确定要提交吗？未答题目将按 0/无 计。')) {
        // 跳到第一道未答题
        const first = document.querySelectorAll('.q')[missing[0] - 1];
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      // 未答按 0 计（likert 0 / num 0 / time 空）
      for (let i = 0; i < s.items.length; i++) if (!isAnswered(s, i)) {
        const item = (typeof s.items[i] === 'string') ? { t: s.items[i] } : s.items[i];
        state.answers[i] = (item.type === 'time') ? '' : 0;
      }
    }
    const result = s.compute(state.answers);
    state.result = result;
    renderResult(result, s, false);
    show('result');
  }

  /* ---------------- 结果页 ---------------- */
  function buildReportPayload(s, result) {
    return {
      v: 1, s: s.id, n: s.name, t: new Date().toISOString(), r: result
    };
  }
  function renderResult(result, s, isReport) {
    const root = $('#' + (isReport ? 'report' : 'result'));
    root.innerHTML = '';
    const head = el('div', 'res-head');
    head.style.borderColor = LEVEL_COLOR[result.level] || '#888';
    head.innerHTML = '<div class="res-name">' + s.name + '</div>' +
      '<div class="res-level" style="color:' + (LEVEL_COLOR[result.level] || '#888') + '">' + result.levelText + '</div>' +
      (isReport ? '<div class="res-time">测评时间：' + fmtTime(buildReportTime(s)) + '</div>' : '');
    root.appendChild(head);

    result.sections.forEach(sec => {
      const box = el('div', 'sec');
      box.appendChild(el('div', 'sec-t', sec.title));
      const tb = el('div', 'tb');
      sec.rows.forEach(rw => {
        const row = el('div', 'tb-row');
        let right = (rw.of != null) ? (rw.value + ' <span class="of">/ ' + rw.of + '</span>') : rw.value;
        row.innerHTML = '<span class="tb-k">' + rw.label + '</span><span class="tb-v">' + right +
          (rw.note ? ' <span class="tb-note">' + rw.note + '</span>' : '') + '</span>';
        tb.appendChild(row);
      });
      box.appendChild(tb);
      root.appendChild(box);
    });

    if (result.notes && result.notes.length) {
      const notes = el('div', 'notes');
      result.notes.forEach(n => notes.appendChild(el('p', null, n)));
      root.appendChild(notes);
    }
    root.appendChild(el('p', 'disclaimer', '说明：以上为量表自评筛查结果，仅供参考，不能替代专业诊断。'));

    // 操作区
    const acts = el('div', 'acts');
    if (!isReport) {
      const save = el('button', 'btn', '保存到本机');
      save.onclick = () => saveToArchive(buildReportPayload(s, result));
      const share = el('button', 'btn primary', '分享给医生');
      share.onclick = () => openShare(s, result);
      const home = el('button', 'btn ghost', '返回首页');
      home.onclick = () => show('home');
      acts.appendChild(save); acts.appendChild(share); acts.appendChild(home);
    } else {
      const save = el('button', 'btn', '保存到本机');
      save.onclick = () => saveToArchive(state.reportPayload);
      const home = el('button', 'btn ghost', '返回首页');
      home.onclick = () => show('home');
      acts.appendChild(save); acts.appendChild(home);
    }
    root.appendChild(acts);
  }
  function buildReportTime(s) { return state.reportPayload ? state.reportPayload.t : new Date().toISOString(); }
  function fmtTime(iso) {
    try { const d = new Date(iso); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    catch (e) { return iso; }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------------- 分享 ---------------- */
  function openShare(s, result) {
    const payload = buildReportPayload(s, result);
    const url = location.origin + location.pathname + '#r=' + b64encode(payload);
    const wrap = el('div', 'modal-mask');
    const box = el('div', 'modal');
    box.innerHTML = '<div class="modal-t">分享给医生</div>' +
      '<p class="modal-p">把下面的链接发给医生（微信/短信均可），医生点开即可查看结果；也可让医生扫码。</p>';
    const link = el('input', 'share-link'); link.readOnly = true; link.value = url;
    box.appendChild(link);
    const qrBox = el('div', 'qr');
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url); qr.make();
      qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8 });
    } catch (e) { qrBox.textContent = '（二维码生成失败，可复制链接）'; }
    box.appendChild(qrBox);
    const row = el('div', 'acts');
    const copy = el('button', 'btn primary', '复制链接');
    copy.onclick = () => { link.select(); try { document.execCommand('copy'); copy.textContent = '已复制 ✓'; } catch (e) { alert('请手动复制链接'); } };
    const close = el('button', 'btn ghost', '关闭');
    close.onclick = () => wrap.remove();
    row.appendChild(copy); row.appendChild(close);
    box.appendChild(row);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    setTimeout(() => { link.focus(); link.select(); }, 50);
  }

  /* ---------------- 归档 ---------------- */
  function saveToArchive(payload) {
    const list = loadArchive();
    payload.id = 'r' + Date.now();
    list.unshift(payload);
    if (saveArchive(list)) alert('已保存到本机，可在首页「我的归档」中查看。');
    else alert('保存失败：本机存储不可用。');
  }
  function renderArchive() {
    const root = $('#archive');
    root.innerHTML = '';
    root.appendChild(el('div', 'test-top',
      '<button class="back" onclick="app.goHome()">← 返回</button><div class="test-title">我的归档</div><div></div>'));
    const list = loadArchive();
    if (!list.length) { root.appendChild(el('p', 'empty', '暂无保存的测评记录。')); return; }
    const wrap = el('div', 'arc-list');
    list.forEach(rec => {
      const card = el('div', 'arc-card');
      const s = getScale(rec.s);
      const lv = rec.r && rec.r.level;
      const dot = LEVEL_COLOR[lv] || '#888';
      card.innerHTML = '<div class="arc-dot" style="background:' + dot + '"></div>' +
        '<div class="arc-main"><div class="arc-name">' + (rec.n || rec.s) + '</div>' +
        '<div class="arc-sub">' + fmtTime(rec.t) + ' · ' + (rec.r ? rec.r.levelText : '') + '</div></div>' +
        '<div class="arc-act">查看</div>';
      card.onclick = () => viewArchive(rec);
      wrap.appendChild(card);
    });
    root.appendChild(wrap);
  }
  function viewArchive(rec) {
    state.reportPayload = rec;
    const s = getScale(rec.s) || { name: rec.n || rec.s, items: [] };
    renderResult(rec.r, s, true);
    show('report');
  }

  /* ---------------- 路由：来自分享链接 / 推送链接 ---------------- */
  function handleHash() {
    const h = location.hash || '';
    const m = h.match(/#r=([^&]+)/);
    if (m) {
      const payload = b64decode(m[1]);
      if (payload && payload.r) {
        state.reportPayload = payload;
        const s = getScale(payload.s) || { name: payload.n || payload.s, items: [] };
        renderResult(payload.r, s, true);
        show('report');
        return true;
      }
    }
    // 医生定向推送：#s=id1,id2 → 首页只显示指定量表
    const ms = h.match(/#s=([a-zA-Z0-9_,]+)/);
    if (ms) {
      const ids = ms[1].split(',').filter(x => getScale(x));
      state.pushIds = ids.length ? ids : [];
    }
    return false;
  }

  /* ---------------- 暴露 ---------------- */
  window.app = {
    goHome() { location.hash = ''; show('home'); },
    init() {
      if (handleHash()) return;
      show('home');
    }
  };
  // 测试/调试钩子（本地工具，无妨）
  window.PsychTest = { SCALES, getScale, b64encode, b64decode, loadArchive, saveArchive, saveToArchive, timeToMin };

  // 顶部归档入口
  function mountTopBar() {
    const bar = el('div', 'topbar');
    bar.innerHTML = '<span class="brand">心理测评</span>';
    const arc = el('button', 'top-arc', '我的归档');
    arc.onclick = () => show('archive');
    bar.appendChild(arc);
    document.body.insertBefore(bar, document.body.firstChild);
  }

// 仅在首页环境初始化 UI；paper.html 等独立页面只暴露 PsychTest
if (document.getElementById('home')) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mountTopBar(); window.app.init(); });
  else { mountTopBar(); window.app.init(); }
}
})();
