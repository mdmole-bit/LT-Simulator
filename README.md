# 간이식 마취 시뮬레이터 — 배포 가이드

## 폴더 구조

```
/
├── index.html                   ← 시뮬레이터 메인 파일
├── netlify.toml                 ← Netlify 설정
├── package.json                 ← nodemailer 의존성
├── .env.example                 ← 환경변수 참고용 (실제 값은 Netlify 대시보드에 입력)
└── netlify/functions/
    └── sendmail.js              ← 이메일 발송 서버리스 함수
```

## 배포 순서

### 1. Synology Mail Server 준비

Synology DSM → 패키지 센터 → **Mail Server** 설치 후:

1. **발신 계정 생성**: DSM → 제어판 → 사용자 → 새 계정 생성
   - 예: `simulator@your-domain.com`
2. **SMTP 포트 확인**: Mail Server → 설정 → SMTP (587 권장)
3. **외부 접근**: 공유기에서 SMTP 포트 포트포워딩 설정
4. **DDNS**: DSM → 제어판 → 외부 액세스 → DDNS (선택)

### 2. Netlify 배포

1. GitHub에 이 폴더 전체를 push
2. [netlify.com](https://netlify.com) → Add new site → Import from GitHub
3. Build 설정은 비워두고 **Deploy site** 클릭

### 3. 환경변수 설정 (필수)

Netlify 대시보드 → **Site settings → Environment variables** 에 아래 값 입력:

| 변수명 | 예시 값 | 설명 |
|--------|---------|------|
| `SMTP_HOST` | `192.168.1.100` 또는 `your-nas.synology.me` | NAS IP / DDNS |
| `SMTP_PORT` | `587` | SMTP 포트 |
| `SMTP_SECURE` | `false` | 465포트면 `true` |
| `SMTP_USER` | `simulator@your-domain.com` | 발신 계정 |
| `SMTP_PASS` | `your-password` | 계정 비밀번호 |
| `SMTP_FROM_NAME` | `간이식 마취 시뮬레이터` | 발신자 표시명 (선택) |

환경변수 저장 후 → **Trigger deploy** (재배포 필요)

### 4. 동작 확인

시뮬레이터 완료 후 이메일 발송 시 브라우저 개발자 콘솔(F12)에서:
```
[Mail] wrongLog.length: 21
[Mail] percent: 30
```
위와 같이 표시되면 정상. 오류 시 콘솔에 상세 메시지 표시.

## 이메일 발송 구조

```
브라우저 (index.html)
    ↓ POST /.netlify/functions/sendmail
Netlify Function (sendmail.js)
    ↓ SMTP (nodemailer)
Synology NAS Mail Server
    ↓
수련의 이메일 (TO) + 지도교수 (CC: mdmole@chosun.ac.kr)
```

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| 발송 실패 (SMTP 연결 오류) | NAS IP/포트 틀림 | `SMTP_HOST`, `SMTP_PORT` 확인 |
| 인증 실패 (535 오류) | 계정/비밀번호 틀림 | `SMTP_USER`, `SMTP_PASS` 확인 |
| TLS 오류 | 자체서명 인증서 | sendmail.js에 `rejectUnauthorized: false` 이미 설정됨 |
| Function not found | 폴더 구조 오류 | `netlify/functions/sendmail.js` 경로 확인 |
