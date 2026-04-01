// ═══════════════════════════════════════════════════════
//  sendmail.js — Netlify Serverless Function
//  Gmail SMTP를 통해 결과 이메일 발송
//  환경변수: Netlify > Site settings > Environment variables
// ═══════════════════════════════════════════════════════

const nodemailer = require('nodemailer');

const GRADE_EMOJI = {
  'S — Outstanding':  '🏆',
  'A — Excellent':    '🥇',
  'B — Good':         '👍',
  'C — Needs Review': '📖',
};

exports.handler = async function(event) {

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 환경변수
  const GMAIL_USER = process.env.GMAIL_USER; // yourname@gmail.com
  const GMAIL_PASS = process.env.GMAIL_PASS; // 앱 비밀번호 16자리

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('Missing GMAIL_USER or GMAIL_PASS');
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: '환경변수 GMAIL_USER / GMAIL_PASS 가 설정되지 않았습니다.' }),
    };
  }

  // 요청 파싱
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: '잘못된 요청 형식' }),
    };
  }

  // Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });

  const gradeEmoji = GRADE_EMOJI[data.grade] || '📋';
  const subject = '[간이식 마취 시뮬레이터] ' + data.user_name + ' 결과 — ' + data.score + '/' + data.total + '점 (' + data.percent + '%)';

  const mailOptions = {
    from:    '"간이식 마취 시뮬레이터" <' + GMAIL_USER + '>',
    to:      data.to_email,
    cc:      data.supervisor_email,
    subject: subject,
    text:    buildPlainText(data, gradeEmoji),
    html:    buildHtmlBody(data, gradeEmoji),
  };

  // 발송
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Mail sent:', info.messageId, '->', data.to_email, 'CC:', data.supervisor_email);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, messageId: info.messageId }),
    };
  } catch (err) {
    console.error('Mail send error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};

// Plain-text 본문
function buildPlainText(d, emoji) {
  var sep = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  var out = '';
  out += d.user_name + ' 선생님 (' + d.user_year + ', ' + d.user_institution + ')\n';
  out += '시뮬레이션 결과를 안내드립니다.\n\n';
  out += '■ 점수:    ' + d.score + ' / ' + d.total + '\n';
  out += '■ 정답률:  ' + d.percent + '%\n';
  out += '■ 등급:    ' + emoji + ' ' + d.grade + '\n';
  out += '■ 케이스:  ' + d.case_info + '\n';
  out += '■ 시행:    ' + d.timestamp + '\n\n';
  out += sep + '\n';
  out += ' 틀린 문제 해설 (' + d.wrong_count + '개)\n';
  out += sep + '\n';
  out += (d.wrong_summary || '(없음)') + '\n\n';
  out += sep + '\n';
  out += ' 분기 포인트 결과\n';
  out += sep + '\n';
  out += (d.branch_summary || '') + '\n\n';
  out += '──\n';
  out += '간이식 마취 시뮬레이터 | 조선대병원 마취통증의학과';
  return out;
}

// HTML 본문
function buildHtmlBody(d, emoji) {
  var wrongHtml = (d.wrong_summary || '(없음)')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  var branchHtml = (d.branch_summary || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  var html = '';
  html += '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">';
  html += '<style>';
  html += 'body{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:14px;color:#1a2635;background:#f0f4f8;margin:0;padding:20px;}';
  html += '.wrap{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);}';
  html += '.hdr{background:linear-gradient(135deg,#1a5fd4,#1450b8);color:#fff;padding:24px 28px;}';
  html += '.hdr-sub{font-size:11px;letter-spacing:0.12em;opacity:0.7;margin-bottom:6px;}';
  html += '.hdr-name{font-size:22px;font-weight:700;margin-bottom:4px;}';
  html += '.hdr-info{font-size:13px;opacity:0.75;}';
  html += '.body{padding:24px 28px;}';
  html += '.score-box{background:#f7f9fc;border:1px solid #d8e2ee;border-radius:10px;padding:18px 22px;margin-bottom:22px;display:flex;gap:24px;flex-wrap:wrap;}';
  html += '.sc .lbl{font-size:10px;color:#6b849e;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;}';
  html += '.sc .val{font-size:20px;font-weight:700;color:#1a2635;}';
  html += '.sc .val.sm{font-size:14px;}';
  html += '.sec-title{font-size:11px;letter-spacing:0.12em;color:#6b849e;text-transform:uppercase;border-bottom:1px solid #d8e2ee;padding-bottom:6px;margin:0 0 12px;}';
  html += '.sec{margin-bottom:22px;}';
  html += '.wrong-box{background:#f7f9fc;border:1px solid #d8e2ee;border-radius:8px;padding:14px 16px;font-size:13px;line-height:1.9;}';
  html += '.branch-box{font-size:13px;line-height:2.1;}';
  html += '.ftr{background:#f0f4f8;border-top:1px solid #d8e2ee;padding:13px 28px;font-size:11px;color:#98afc4;}';
  html += '</style></head><body>';
  html += '<div class="wrap">';
  html += '<div class="hdr">';
  html += '<div class="hdr-sub">간이식 마취 시뮬레이터 | 조선대병원 마취통증의학과</div>';
  html += '<div class="hdr-name">' + d.user_name + ' 선생님</div>';
  html += '<div class="hdr-info">' + d.user_year + ' · ' + d.user_institution + '</div>';
  html += '</div>';
  html += '<div class="body">';
  html += '<div class="score-box">';
  html += '<div class="sc"><div class="lbl">점수</div><div class="val">' + d.score + '<span style="font-size:14px;color:#6b849e;font-weight:400;"> / ' + d.total + '</span></div></div>';
  html += '<div class="sc"><div class="lbl">정답률</div><div class="val">' + d.percent + '%</div></div>';
  html += '<div class="sc"><div class="lbl">등급</div><div class="val sm">' + emoji + ' ' + d.grade + '</div></div>';
  html += '<div class="sc"><div class="lbl">케이스</div><div class="val sm">' + d.case_info + '</div></div>';
  html += '<div class="sc"><div class="lbl">시행일시</div><div class="val sm">' + d.timestamp + '</div></div>';
  html += '</div>';
  html += '<div class="sec"><div class="sec-title">틀린 문제 해설 (' + d.wrong_count + '개)</div>';
  html += '<div class="wrong-box">' + wrongHtml + '</div></div>';
  html += '<div class="sec"><div class="sec-title">분기 포인트 결과</div>';
  html += '<div class="branch-box">' + branchHtml + '</div></div>';
  html += '</div>';
  html += '<div class="ftr">간이식 마취 시뮬레이터 · 조선대병원 마취통증의학과 · ' + d.timestamp + '</div>';
  html += '</div></body></html>';
  return html;
}
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('Missing GMAIL_USER or GMAIL_PASS');
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: '환경변수 GMAIL_USER / GMAIL_PASS 가 설정되지 않았습니다.' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: '잘못된 요청 형식' }),
    };
  }

  // Gmail SMTP: smtp.gmail.com / 465 / secure:true
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,  // 반드시 앱 비밀번호 (16자리), 일반 비밀번호 X
    },
  });

  const gradeEmoji = GRADE_EMOJI[data.grade] || '📋';
  const subject    = `[간이식 마취 시뮬레이터] ${data.user_name} 결과 — ${data.score}/${data.total}점 (${data.percent}%)`;

  const mailOptions = {
    from:    `"간이식 마취 시뮬레이터" <${GMAIL_USER}>`,
    to:      data.to_email,
    cc:      data.supervisor_email,
    subject: subject,
    text:    buildPlainText(data, gradeEmoji),
    html:    buildHtmlBody(data, gradeEmoji),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Mail sent:', info.messageId, '→', data.to_email, 'CC:', data.supervisor_email);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, messageId: info.messageId }),
    };
  } catch (err) {
    console.error('Mail send error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};

function buildPlainText(d, emoji) {
  const sep = '━'.repeat(44);
  return `
${d.user_name} 선생님 (${d.user_year}, ${d.user_institution})
시뮬레이션 결과를 안내드립니다.

■ 점수:    ${d.score} / ${d.total}
■ 정답률:  ${d.percent}%
■ 등급:    ${emoji} ${d.grade}
■ 케이스:  ${d.case_info}
■ 시행:    ${d.timestamp}

${sep}
 틀린 문제 해설 (${d.wrong_count}개)
${sep}
${d.wrong_summary || '(없음)'}

${sep}
 분기 포인트 결과
${sep}
${d.branch_summary}

──
간이식 마취 시뮬레이터 | 조선대병원 마취통증의학과
  `.trim();
}

function buildHtmlBody(d, emoji) {
  const wrongHtml = (d.wrong_summary || '(없음)')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  const branchHtml = (d.branch_summary || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1a2635;background:#f0f4f8;margin:0;padding:20px;}
  .wrap{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);}
  .hdr{background:linear-gradient(135deg,#1a5fd4,#1450b8);color:#fff;padding:24px 28px;}
  .hdr-sub{font-size:11px;letter-spacing:0.12em;opacity:0.7;margin-bottom:6px;}
  .hdr-name{font-size:22px;font-weight:700;margin-bottom:4px;}
  .hdr-info{font-size:13px;opacity:0.75;}
  .body{padding:24px 28px;}
  .score-box{background:#f7f9fc;border:1px solid #d8e2ee;border-radius:10px;padding:18px 22px;margin-bottom:22px;display:flex;gap:24px;flex-wrap:wrap;}
  .sc .lbl{font-size:10px;color:#6b849e;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;}
  .sc .val{font-size:20px;font-weight:700;color:#1a2635;}
  .sc .val.sm{font-size:14px;}
  .sec-title{font-size:11px;letter-spacing:0.12em;color:#6b849e;text-transform:uppercase;border-bottom:1px solid #d8e2ee;padding-bottom:6px;margin:0 0 12px;}
  .sec{margin-bottom:22px;}
  .wrong-box{background:#f7f9fc;border:1px solid #d8e2ee;border-radius:8px;padding:14px 16px;font-size:13px;line-height:1.9;}
  .branch-box{font-size:13px;line-height:2.1;}
  .ftr{background:#f0f4f8;border-top:1px solid #d8e2ee;padding:13px 28px;font-size:11px;color:#98afc4;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-sub">간이식 마취 시뮬레이터 | 조선대병원 마취통증의학과</div>
    <div class="hdr-name">${d.user_name} 선생님</div>
    <div class="hdr-info">${d.user_year} · ${d.user_institution}</div>
  </div>
  <div class="body">
    <div class="score-box">
      <div class="sc"><div class="lbl">점수</div><div class="val">${d.score}<span style="font-size:14px;color:#6b849e;font-weight:400;"> / ${d.total}</span></div></div>
      <div class="sc"><div class="lbl">정답률</div><div class="val">${d.percent}%</div></div>
      <div class="sc"><div class="lbl">등급</div><div class="val sm">${emoji} ${d.grade}</div></div>
      <div class="sc"><div class="lbl">케이스</div><div class="val sm">${d.case_info}</div></div>
      <div class="sc"><div class="lbl">시행일시</div><div class="val sm">${d.timestamp}</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">틀린 문제 해설 (${d.wrong_count}개)</div>
      <div class="wrong-box">${wrongHtml}</div>
    </div>
    <div class="sec">
      <div class="sec-title">분기 포인트 결과</div>
      <div class="branch-box">${branchHtml}</div>
    </div>
  </div>
  <div class="ftr">간이식 마취 시뮬레이터 · 조선대병원 마취통증의학과 · ${d.timestamp}</div>
</div>
</body>
</html>`;
}
  const NAVER_PASS = process.env.NAVER_PASS; // 네이버 로그인 비밀번호

  if (!NAVER_USER || !NAVER_PASS) {
    console.error('Missing NAVER_USER or NAVER_PASS');
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: '환경변수 NAVER_USER / NAVER_PASS 가 설정되지 않았습니다.' }),
    };
  }

  // ── 요청 파싱
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: '잘못된 요청 형식' }),
    };
  }

  // ── 네이버 SMTP 설정
  //    host: smtp.naver.com  /  port: 465  /  secure: true (SSL)
  const transporter = nodemailer.createTransport({
    host:   'smtp.naver.com',
    port:   465,
    secure: true,
    auth: {
      user: NAVER_USER,
      pass: NAVER_PASS,
    },
  });

  // ── 메일 옵션
  const gradeEmoji = GRADE_EMOJI[data.grade] || '📋';
  const subject    = `[간이식 마취 시뮬레이터] ${data.user_name} 결과 — ${data.score}/${data.total}점 (${data.percent}%)`;

  const mailOptions = {
    from:    `"간이식 마취 시뮬레이터" <${NAVER_USER}>`,
    to:      data.to_email,
    cc:      data.supervisor_email,
    subject: subject,
    text:    buildPlainText(data, gradeEmoji),
    html:    buildHtmlBody(data, gradeEmoji),
  };

  // ── 발송
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Mail sent:', info.messageId, '→', data.to_email, 'CC:', data.supervisor_email);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, messageId: info.messageId }),
    };
  } catch (err) {
    console.error('Mail send error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};

function buildPlainText(d, emoji) {
  const sep = '━'.repeat(44);
  return `
${d.user_name} 선생님 (${d.user_year}, ${d.user_institution})
시뮬레이션 결과를 안내드립니다.

■ 점수:    ${d.score} / ${d.total}
■ 정답률:  ${d.percent}%
■ 등급:    ${emoji} ${d.grade}
■ 케이스:  ${d.case_info}
■ 시행:    ${d.timestamp}

${sep}
 틀린 문제 해설 (${d.wrong_count}개)
${sep}
${d.wrong_summary || '(없음)'}

${sep}
 분기 포인트 결과
${sep}
${d.branch_summary}

──
간이식 마취 시뮬레이터 | 조선대병원 마취통증의학과
  `.trim();
}

function buildHtmlBody(d, emoji) {
  const wrongHtml = (d.wrong_summary || '(없음)')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  const branchHtml = (d.branch_summary || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:14px;color:#1a2635;background:#f0f4f8;margin:0;padding:20px;}
  .wrap{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);}
  .hdr{background:linear-gradient(135deg,#1a5fd4,#1450b8);color:#fff;padding:24px 28px;}
  .hdr-sub{font-size:11px;letter-spacing:0.12em;opacity:0.7;margin-bottom:6px;}
  .hdr-name{font-size:22px;font-weight:700;margin-bottom:4px;}
  .hdr-info{font-size:13px;opacity:0.75;}
  .body{padding:24px 28px;}
  .score-box{background:#f7f9fc;border:1px solid #d8e2ee;border-radius:10px;padding:18px 22px;margin-bottom:22px;display:flex;gap:24px;flex-wrap:wrap;}
  .sc .lbl{font-size:10px;color:#6b849e;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;}
  .sc .val{font-size:20px;font-weight:700;color:#1a2635;}
  .sc .val.sm{font-size:14px;}
  .sec-title{font-size:11px;letter-spacing:0.12em;color:#6b849e;text-transform:uppercase;border-bottom:1px solid #d8e2ee;padding-bottom:6px;margin:0 0 12px;}
  .sec{margin-bottom:22px;}
  .wrong-box{background:#f7f9fc;border:1px solid #d8e2ee;border-radius:8px;padding:14px 16px;font-size:13px;line-height:1.9;}
  .branch-box{font-size:13px;line-height:2.1;}
  .ftr{background:#f0f4f8;border-top:1px solid #d8e2ee;padding:13px 28px;font-size:11px;color:#98afc4;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-sub">간이식 마취 시뮬레이터 | 조선대병원 마취통증의학과</div>
    <div class="hdr-name">${d.user_name} 선생님</div>
    <div class="hdr-info">${d.user_year} · ${d.user_institution}</div>
  </div>
  <div class="body">
    <div class="score-box">
      <div class="sc"><div class="lbl">점수</div><div class="val">${d.score}<span style="font-size:14px;color:#6b849e;font-weight:400;"> / ${d.total}</span></div></div>
      <div class="sc"><div class="lbl">정답률</div><div class="val">${d.percent}%</div></div>
      <div class="sc"><div class="lbl">등급</div><div class="val sm">${emoji} ${d.grade}</div></div>
      <div class="sc"><div class="lbl">케이스</div><div class="val sm">${d.case_info}</div></div>
      <div class="sc"><div class="lbl">시행일시</div><div class="val sm">${d.timestamp}</div></div>
    </div>
    <div class="sec">
      <div class="sec-title">틀린 문제 해설 (${d.wrong_count}개)</div>
      <div class="wrong-box">${wrongHtml}</div>
    </div>
    <div class="sec">
      <div class="sec-title">분기 포인트 결과</div>
      <div class="branch-box">${branchHtml}</div>
    </div>
  </div>
  <div class="ftr">간이식 마취 시뮬레이터 · 조선대병원 마취통증의학과 · ${d.timestamp}</div>
</div>
</body>
</html>`;
}
