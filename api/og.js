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
  const desc      = `MBTI보다 정확한 일주테스트, 내 일주 알아보기`;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'qhcnrrfu';

  // 오복할머니 이미지를 고정 OG 이미지로 사용
  const ogImageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v1/%EC%98%A4%EB%B3%B5%ED%95%A0%EB%A8%B8%EB%8B%88`;

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
