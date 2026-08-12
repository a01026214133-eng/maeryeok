// api/upload-share-image.js
// Vercel Serverless Function — Cloudinary 이미지 업로드

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { image } = req.body;
  if (!image || !image.startsWith('data:image/png;base64,')) {
    return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  try {
    // Cloudinary REST API로 업로드 (SDK 없이 fetch만 사용)
    const formData = new URLSearchParams();
    formData.append('file', image);
    formData.append('upload_preset', 'unsigned_share'); // 아래 설정 참고
    formData.append('folder', 'ilju_shares');

    // ── Signed 업로드 방식 (더 안전) ──
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=ilju_shares&timestamp=${timestamp}`;

    // HMAC-SHA1 서명 생성
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const msgData = encoder.encode(paramsToSign);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signature = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    const body = new URLSearchParams({
      file:      image,
      api_key:   apiKey,
      timestamp: String(timestamp),
      folder:    'ilju_shares',
      signature,
    });

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[Cloudinary 오류]', err);
      return res.status(500).json({ error: 'Cloudinary 업로드 실패' });
    }

    const data = await uploadRes.json();

    // 2시간 후 자동 삭제되도록 invalidate (Cloudinary 무료플랜은 API 삭제 필요)
    // 필요 시 별도 삭제 로직 추가 가능

    return res.status(200).json({ url: data.secure_url });
  } catch (e) {
    console.error('[upload-share-image]', e);
    return res.status(500).json({ error: e.message });
  }
}
