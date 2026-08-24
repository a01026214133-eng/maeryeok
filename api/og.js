// api/og.js
export const config = { api: { bodyParser: false } };

const CHEON_GAN = ['갑','을','병','정','무','기','경','신','임','계'];
const JI_JI     = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

function julianDay(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + B - 1524;
}
function getDayJu(year, month, day) {
  const jd  = julianDay(year, month, day);
  const idx = ((jd - 2451551) % 60 + 60) % 60;
  return { gan: CHEON_GAN[idx % 10], ji: JI_JI[idx % 12] };
}
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// Cloudinary 텍스트 인코딩 (한글 포함)
function clEnc(str) {
  return encodeURIComponent(str).replace(/%/g, '%25');
}

export default async function handler(req, res) {
  const p     = new URL(req.url, `https://${req.headers.host}`).searchParams;
  const year  = parseInt(p.get('year'))  || 0;
  const month = parseInt(p.get('month')) || 0;
  const day   = parseInt(p.get('day'))   || 0;
  const name  = p.get('name') || '';

  let iljuName = '일주';
  if (year && month && day) {
    const dayJu = getDayJu(year, month, day);
    iljuName = `${dayJu.gan}${dayJu.ji}일주`;
  }

  const siteUrl   = `https://www.obsd-iljutest.co.kr`;
  const resultUrl = `${siteUrl}/manseryeok_result.html?${p.toString()}`;
  const title     = `나는 ${iljuName}구나!`;
  const desc      = `너도 일주를 확인해보자 🍀 obsd-iljutest.co.kr`;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // img 파라미터로 직접 이미지 URL이 넘어온 경우 (링크 복사 시 캡처 이미지)
  const imgParam = p.get('img');
  let ogImageUrl = imgParam
    ? decodeURIComponent(imgParam)
    : `${siteUrl}/favicon.png`;

  if (!imgParam && cloudName) {
    // 레이어 순서 (아래→위):
    // 1) 800x800 어두운 배경
    // 2) '✦ 나의 일주는 ✦' 상단 작은 텍스트
    // 3) 일주 이름 (4글자, 크게) — 폰트 72px로 잘리지 않게
    // 4) 이름 (있을 경우) 하단 작은 텍스트
    // 5) 도메인 최하단
    const layers = [
      `w_1200,h_630,c_fill,b_rgb:1a0e04`,

      // 상단 레이블
      `l_text:NanumGothic_22:%E2%9C%A6%20%EB%82%98%EC%9D%98%20%EC%9D%BC%EC%A3%BC%EB%8A%94%20%E2%9C%A6,co_rgb:DCAF50,g_north,y_120`,

      // 일주 이름 — 가로형이므로 크게 써도 잘 어울림
      `l_text:NanumGothic_96_bold:${clEnc(iljuName)},co_rgb:F5E0A0,g_center,y_0`,

      // 이름 (있을 때)
      ...(name ? [`l_text:NanumGothic_26:${clEnc(name + ' 님의 사주')},co_rgb:DCC882,g_south,y_100`] : []),

      // 도메인
      `l_text:NanumGothic_20:obsd-iljutest.co.kr,co_rgb:887040,g_south,y_50`,

      `v1/oboak_g`,
    ];
    ogImageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${layers.join('/')}`;
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:type"         content="website">
  <meta property="og:url"          content="${esc(resultUrl)}">
  <meta property="og:title"        content="${esc(title)}">
  <meta property="og:description"  content="${esc(desc)}">
  <meta property="og:image"        content="${esc(ogImageUrl)}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type"   content="image/png">
  <meta property="og:site_name"    content="오복신당 일주풀이">
  <meta property="og:locale"       content="ko_KR">
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image"       content="${esc(ogImageUrl)}">
  <title>${esc(title)}</title>
  <script>window.location.replace("${esc(resultUrl)}");</script>
  <meta http-equiv="refresh" content="0;url=${esc(resultUrl)}">
</head>
<body><p>잠시만 기다려주세요... <a href="${esc(resultUrl)}">결과 보기</a></p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
}
