const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 임시 이미지 저장 폴더
const TMP_DIR = path.join(__dirname, 'tmp_shares');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// ── multer: 메모리에서 받아서 직접 저장 (base64 JSON 방식)
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // index.html, manseryeok_result.html 서빙

// ── 임시 이미지 파일을 외부에서 접근 가능하게 서빙
app.use('/tmp_shares', express.static(TMP_DIR));

// ──────────────────────────────────────────
// POST /api/upload-share-image
// body: { image: "data:image/png;base64,..." }
// 반환: { url: "https://your-domain.com/tmp_shares/xxxx.png" }
// ──────────────────────────────────────────
app.post('/api/upload-share-image', (req, res) => {
  try {
    const { image } = req.body;
    if (!image || !image.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }

    // base64 → 파일 저장
    const base64Data = image.replace(/^data:image\/png;base64,/, '');
    const fileName   = crypto.randomBytes(16).toString('hex') + '.png';
    const filePath   = path.join(TMP_DIR, fileName);
    fs.writeFileSync(filePath, base64Data, 'base64');

    // 10분 후 자동 삭제
    setTimeout(() => {
      try { fs.unlinkSync(filePath); } catch {}
    }, 10 * 60 * 1000);

    // 공개 URL 반환 (서버 도메인으로 자동 구성)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host     = req.headers['x-forwarded-host']  || req.get('host');
    const imageUrl = `${protocol}://${host}/tmp_shares/${fileName}`;

    res.json({ url: imageUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '업로드 실패' });
  }
});

// ──────────────────────────────────────────
// GET /api/og-image  → SVG를 sharp로 PNG 변환해서 직접 응답
// 쿼리: name, ilju (일주 이름, e.g. "갑자일주")
// ──────────────────────────────────────────
const sharp = require('sharp');

app.get('/api/og-image', async (req, res) => {
  const { name, ilju } = req.query;
  const nameText = name  ? decodeURIComponent(name)  : '';
  const iljuText = ilju  ? decodeURIComponent(ilju)  : '나의 일주';

  // 한글은 서버 폰트 의존 → 유니코드 그대로 SVG에 embed
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#160c02"/>
      <stop offset="50%"  stop-color="#2c1a08"/>
      <stop offset="100%" stop-color="#1a0e04"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#f0c060"/>
      <stop offset="100%" stop-color="#e08030"/>
    </linearGradient>
  </defs>

  <!-- 배경 -->
  <rect width="800" height="800" fill="url(#bg)"/>

  <!-- 테두리 -->
  <rect x="24" y="24" width="752" height="752" rx="32" ry="32"
        fill="none" stroke="rgba(200,150,50,0.35)" stroke-width="1.5"/>

  <!-- 장식 문자 -->
  <text x="680" y="200" font-size="160" fill="rgba(212,160,64,0.07)"
        font-family="serif" text-anchor="middle">☰</text>

  <!-- 상단 레이블 -->
  <text x="400" y="290" font-size="22" fill="rgba(220,175,80,0.75)"
        font-family="sans-serif" text-anchor="middle" letter-spacing="6">
    ✦ 나의 일주는 ✦
  </text>

  <!-- 구분선 -->
  <line x1="180" y1="320" x2="620" y2="320"
        stroke="rgba(200,150,50,0.3)" stroke-width="1"/>

  <!-- 일주 이름 크게 -->
  <text x="400" y="460" font-size="110" font-weight="bold"
        fill="#f5e0a0" font-family="serif" text-anchor="middle">
    ${escapeHtml(iljuText)}
  </text>

  <!-- 구분선 -->
  <line x1="180" y1="500" x2="620" y2="500"
        stroke="rgba(200,150,50,0.3)" stroke-width="1"/>

  <!-- 이름 표시 -->
  ${nameText ? `<text x="400" y="560" font-size="22" fill="rgba(220,190,130,0.65)"
        font-family="sans-serif" text-anchor="middle">
    ${escapeHtml(nameText)} 님의 사주
  </text>` : ''}

  <!-- 하단 도메인 -->
  <text x="400" y="${nameText ? 620 : 580}" font-size="18"
        fill="rgba(200,160,70,0.4)" font-family="sans-serif" text-anchor="middle">
    obsd-iljutest.co.kr
  </text>
</svg>`;

  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(png);
  } catch(e) {
    console.error('/api/og-image 오류:', e);
    res.status(500).send('이미지 생성 실패');
  }
});

// ──────────────────────────────────────────
// GET /api/og  → OG 태그 페이지 (카카오톡이 긁어가는 곳)
// ──────────────────────────────────────────
app.get('/api/og', (req, res) => {
  const { name, ilju } = req.query;

  const protocol  = req.headers['x-forwarded-proto'] || req.protocol;
  const host      = req.headers['x-forwarded-host']  || req.get('host');
  const baseUrl   = `${protocol}://${host}`;

  // 결과 페이지 URL
  const params = new URLSearchParams(req.query);
  const resultUrl = `${baseUrl}/manseryeok_result.html?${params.toString()}`;

  // OG 이미지 URL — 서버가 직접 생성, 파일 저장 불필요
  const imgParams = new URLSearchParams();
  if (name) imgParams.set('name', name);
  if (ilju) imgParams.set('ilju', ilju);
  const ogImageUrl = `${baseUrl}/api/og-image?${imgParams.toString()}`;

  const nameText  = name ? decodeURIComponent(name) : '';
  const title     = nameText ? `${nameText}의 사주 일주 결과` : '나의 사주 일주 결과';
  const desc      = '오복신당에서 나의 일주를 확인해보세요 🍀';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta property="og:type"         content="website">
  <meta property="og:title"        content="${escapeHtml(title)}">
  <meta property="og:description"  content="${escapeHtml(desc)}">
  <meta property="og:url"          content="${escapeHtml(resultUrl)}">
  <meta property="og:image"        content="${escapeHtml(ogImageUrl)}">
  <meta property="og:image:width"  content="800">
  <meta property="og:image:height" content="800">
  <meta property="og:image:type"   content="image/png">
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <meta name="twitter:image"       content="${escapeHtml(ogImageUrl)}">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(resultUrl)}">
  <title>${escapeHtml(title)}</title>
</head>
<body><a href="${escapeHtml(resultUrl)}">결과 페이지로 이동</a></body>
</html>`);
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
