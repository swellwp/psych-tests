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
      items: (function () {
        const arr = [];
        for (let i = 1; i <= 90; i++) arr.push('第 ' + i + ' 题');
        return arr;
      })(),
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mountTopBar(); window.app.init(); });
  else { mountTopBar(); window.app.init(); }
})();
