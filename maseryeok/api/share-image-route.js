// ────────────────────────────────────────────
// 기존 Express 앱에 아래 내용을 붙여넣으세요
// ────────────────────────────────────────────

const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

// 1) 임시 이미지 저장 폴더 생성
const TMP_DIR = path.join(__dirname, 'tmp_shares');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// 2) tmp_shares 폴더를 정적 파일로 서빙
//    app.use(express.json({ limit: '10mb' })); 도 추가 필요
app.use('/tmp_shares', express.static(TMP_DIR));

// 3) 업로드 엔드포인트
app.post('/api/upload-share-image', (req, res) => {
  try {
    const { image } = req.body;
    if (!image || !image.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }

    const base64Data = image.replace(/^data:image\/png;base64,/, '');
    const fileName   = crypto.randomBytes(16).toString('hex') + '.png';
    const filePath   = path.join(TMP_DIR, fileName);
    fs.writeFileSync(filePath, base64Data, 'base64');

    // 10분 후 자동 삭제
    setTimeout(() => { try { fs.unlinkSync(filePath); } catch {} }, 10 * 60 * 1000);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host     = req.headers['x-forwarded-host']  || req.get('host');
    const imageUrl = `${protocol}://${host}/tmp_shares/${fileName}`;

    res.json({ url: imageUrl });
  } catch (e) {
    console.error('[upload-share-image]', e);
    res.status(500).json({ error: '업로드 실패' });
  }
});
