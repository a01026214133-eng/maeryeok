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
    const paramsToSign = `folder=ilju_shares&timestamp=${timestamp}`;

    // HMAC-SHA1 서명 생성
    const encoder  = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw', encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(paramsToSign));
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
