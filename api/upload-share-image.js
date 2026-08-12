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
    const timestamp = Math.floor(Date.now() / 1000);

    // 서명할 파라미터 (알파벳 순서로 정렬)
    const paramsToSign = `folder=ilju_shares&timestamp=${timestamp}`;

    // HMAC-SHA256 대신 SHA1 사용 (Cloudinary 기본)
    const msgBuffer = new TextEncoder().encode(paramsToSign + apiSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // FormData로 전송
    const formData = new FormData();
    formData.append('file', image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', 'ilju_shares');
    formData.append('signature', signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    const data = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error('[Cloudinary 오류]', JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || 'Cloudinary 업로드 실패' });
    }

    return res.status(200).json({ url: data.secure_url });
  } catch (e) {
    console.error('[upload-share-image]', e);
    return res.status(500).json({ error: e.message });
  }
}
