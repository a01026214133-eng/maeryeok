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
    return res.status(200).json({ url: data.secure_url });
  } catch (e) {
    console.error('[upload-share-image]', e);
    return res.status(500).json({ error: e.message });
  }
}
