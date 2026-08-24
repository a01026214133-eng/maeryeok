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
// GET /api/og
// 카카오톡/메신저가 링크 미리보기를 만들 때 긁어가는 OG 태그 페이지
// 쿼리: 원래 결과 파라미터들 + img=<이미지URL(인코딩)>
// ──────────────────────────────────────────
app.get('/api/og', (req, res) => {
  const { img, name, year, month, day, hour, gender } = req.query;
  const imageUrl = img || '';

  // 결과 페이지 URL (OG 태그 클릭 시 이동할 곳)
  const protocol   = req.headers['x-forwarded-proto'] || req.protocol;
  const host       = req.headers['x-forwarded-host']  || req.get('host');
  const baseUrl    = `${protocol}://${host}`;
  const params     = new URLSearchParams(req.query);
  params.delete('img'); // img는 결과 페이지 파라미터에서 제외
  const resultUrl  = `${baseUrl}/manseryeok_result.html?${params.toString()}`;

  const title       = name ? `${name}의 사주 일주 결과` : '나의 사주 일주 결과';
  const description = '오복신당에서 나의 일주를 확인해보세요 🍀';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 카카오톡 캐시 갱신을 위해 캐시 짧게 설정
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta property="og:type"        content="website">
  <meta property="og:title"       content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url"         content="${escapeHtml(resultUrl)}">
  ${imageUrl ? `
  <meta property="og:image"        content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width"  content="960">
  <meta property="og:image:height" content="960">
  <meta property="og:image:type"   content="image/png">` : ''}
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}
  <!-- 즉시 결과 페이지로 리다이렉트 -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(resultUrl)}">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <a href="${escapeHtml(resultUrl)}">결과 페이지로 이동</a>
</body>
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
