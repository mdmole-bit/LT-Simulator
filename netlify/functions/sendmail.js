// ═══════════════════════════════════════════════════════
//  sendmail.js — Netlify Serverless Function
//  Synology NAS Mail Server를 통해 결과 이메일 발송
//  환경변수는 Netlify 대시보드 > Site settings > Environment variables 에 설정
// ═══════════════════════════════════════════════════════

const nodemailer = require('nodemailer');

// 등급별 이모지
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

  // ── 환경변수 확인
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,         // '465'포트면 'true', 587이면 비워두거나 'false'
    SMTP_FROM_NAME,      // 선택 — 기본: "간이식 마취 시뮬레이터"
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('Missing SMTP environment variables');
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: 'SMTP 환경변수가 설정되지 않았습니다.' }),
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

  const port   = parseInt(SMTP_PORT || '587');
  const secure = SMTP_SECURE === 'true' || port === 465;

  // ── SMTP 연결
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   port,
    secure: secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,   // Synology 자체서명 인증서 허용
    },
  });

  // ── 이메일 본문 구성
  const gradeEmoji = GRADE_EMOJI[data.grade] || '📋';
  const fromName   = SMTP_FROM_NAME || '간이식 마취 시뮬레이터';
  const subject    = `[간이식 마취 시뮬레이터] ${data.user_name} 결과 — ${data.score}/${data.total}점 (${data.percent}%)`;

  const textBody = buildPlainText(data, gradeEmoji);
  const htmlBody = buildHtmlBody(data, gradeEmoji);

  const mailOptions = {
    from:    `"${fromName}" <${SMTP_USER}>`,
    to:      data.to_email,
    cc:      data.supervisor_email,          // 지도교수 CC
    subject: subject,
    text:    textBody,
    html:    htmlBody,
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

// ═══════════════════════════════════════════════════════
//  Plain-text 본문
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  HTML 본문
// ═══════════════════════════════════════════════════════
function buildHtmlBody(d, emoji) {
  // wrong_summary의 줄바꿈을 <br>로 변환
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
  body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 14px; color: #1a2635; background: #f0f4f8; margin: 0; padding: 20px; }
  .wrap { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
  .hdr  { background: linear-gradient(135deg, #1a5fd4, #1450b8); color: #fff; padding: 24px 28px; }
  .hdr-title { font-size: 11px; letter-spacing: 0.15em; opacity: 0.7; margin-bottom: 6px; }
  .hdr-name  { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .hdr-sub   { font-size: 13px; opacity: 0.75; }
  .body { padding: 24px 28px; }
  .score-box { background: #f7f9fc; border: 1px solid #d8e2ee; border-radius: 10px; padding: 18px 22px; margin-bottom: 20px; display: flex; gap: 28px; flex-wrap: wrap; }
  .sc-item .label { font-size: 10px; color: #6b849e; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
  .sc-item .value { font-size: 20px; font-weight: 700; color: #1a2635; }
  .sc-item .value.grade { font-size: 15px; }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11px; letter-spacing: 0.12em; color: #6b849e; text-transform: uppercase; border-bottom: 1px solid #d8e2ee; padding-bottom: 6px; margin-bottom: 12px; }
  .wrong-box { background: #f7f9fc; border: 1px solid #d8e2ee; border-radius: 8px; padding: 14px 16px; font-size: 13px; line-height: 1.9; white-space: pre-wrap; word-break: break-word; font-family: 'Malgun Gothic', monospace; }
  .branch-box { font-size: 13px; line-height: 2.0; }
  .ftr { background: #f0f4f8; border-top: 1px solid #d8e2ee; padding: 14px 28px; font-size: 11px; color: #98afc4; letter-spacing: 0.06em; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-title">간이식 마취 시뮬레이터 | 조선대병원 마취통증의학과</div>
    <div class="hdr-name">${d.user_name} 선생님</div>
    <div class="hdr-sub">${d.user_year} · ${d.user_institution}</div>
  </div>
  <div class="body">
    <div class="score-box">
      <div class="sc-item">
        <div class="label">점수</div>
        <div class="value">${d.score} <span style="font-size:14px;color:#6b849e;">/ ${d.total}</span></div>
      </div>
      <div class="sc-item">
        <div class="label">정답률</div>
        <div class="value">${d.percent}%</div>
      </div>
      <div class="sc-item">
        <div class="label">등급</div>
        <div class="value grade">${emoji} ${d.grade}</div>
      </div>
      <div class="sc-item">
        <div class="label">케이스</div>
        <div class="value" style="font-size:13px;">${d.case_info}</div>
      </div>
      <div class="sc-item">
        <div class="label">시행일시</div>
        <div class="value" style="font-size:13px;">${d.timestamp}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">틀린 문제 해설 (${d.wrong_count}개)</div>
      <div class="wrong-box">${wrongHtml}</div>
    </div>

    <div class="section">
      <div class="section-title">분기 포인트 결과</div>
      <div class="branch-box">${branchHtml}</div>
    </div>
  </div>
  <div class="ftr">간이식 마취 시뮬레이터 · 조선대병원 마취통증의학과 · ${d.timestamp}</div>
</div>
</body>
</html>`;
}
