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
    }
  ];

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
    root.appendChild(el('div', 'hero',
      '<h1>心理测评</h1><p>手机即可完成 · 当场出结果 · 可分享给医生</p>'));
    // 按 group 分组
    const groups = [];
    SCALES.forEach(s => { if (!groups.includes(s.group)) groups.push(s.group); });
    groups.forEach(g => {
      const sec = el('div', 'group');
      sec.appendChild(el('h2', null, g));
      const grid = el('div', 'cards');
      SCALES.filter(s => s.group === g).forEach(s => {
        const card = el('button', 'card');
        card.innerHTML = '<span class="card-name">' + s.name + '</span><span class="card-meta">' +
          (s.items.length || (s.factorDefs ? 90 : 0)) + ' 题 · 点击开始</span>';
        card.onclick = () => startTest(s.id);
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      root.appendChild(sec);
    });
    root.appendChild(el('p', 'foot', '本工具结果仅为量表筛查，不能替代临床诊断。'));
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
      if (item.type === 'time' || item.type === 'num') {
        const inp = document.createElement('input');
        inp.type = (item.type === 'time') ? 'time' : 'number';
        if (item.type === 'num') { if (item.min != null) inp.min = item.min; if (item.max != null) inp.max = item.max; if (item.step) inp.step = item.step; }
        inp.className = 'num-inp';
        inp.dataset.idx = i;
        if (item.unit) inp.setAttribute('aria-label', item.t + '（' + item.unit + '）');
        inp.oninput = () => { state.answers[i] = inp.value; updateProgress(); };
        q.appendChild(inp);
      } else {
        const opts = el('div', 'opts');
        (s.options).forEach(o => {
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

  /* ---------------- 路由：来自分享链接 ---------------- */
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
