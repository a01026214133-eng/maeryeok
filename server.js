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

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
