// api/og.js
// 링크 공유 시 OG 태그 + 미리보기 이미지가 포함된 HTML 반환

export const config = { api: { bodyParser: false } };

// 천간/지지 계산 (manseryeok_result.html 과 동일 로직)
const CHEON_GAN = ['갑','을','병','정','무','기','경','신','임','계'];
const JI_JI     = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

function julianDay(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + B - 1524;
}

function getDayJu(year, month, day) {
  const jd   = julianDay(year, month, day);
  const BASE = 2451551;
  const idx  = ((jd - BASE) % 60 + 60) % 60;
  return {
    gan: CHEON_GAN[idx % 10],
    ji:  JI_JI[idx % 12],
  };
}

export default async function handler(req, res) {
  const p     = new URL(req.url, `https://${req.headers.host}`).searchParams;
  const year  = parseInt(p.get('year'))  || 0;
  const month = parseInt(p.get('month')) || 0;
  const day   = parseInt(p.get('day'))   || 0;
  const name  = p.get('name') || '';

  // 일주 계산
  let iljuName = '일주';
  if (year && month && day) {
    const dayJu = getDayJu(year, month, day);
    iljuName = `${dayJu.gan}${dayJu.ji}일주`;
  }

  const title       = `나는 ${iljuName}구나!`;
  const description = `너도 일주를 확인해보자 🍀 obsd-iljutest.co.kr`;
  const siteUrl     = `https://www.obsd-iljutest.co.kr`;
  const resultUrl   = `${siteUrl}/manseryeok_result.html?${p.toString()}`;

  // Cloudinary에서 일주 이미지 가져오기 (이미 업로드된 최신 이미지)
  // 없으면 기본 파비콘 사용
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'qhcnrrfu';
  const imageUrl  = `https://res.cloudinary.com/${cloudName}/image/upload/w_480,h_480,c_fill/ilju_shares/${iljuName}.png`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 기본 OG -->
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="${resultUrl}">
  <meta property="og:title"       content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image"       content="${imageUrl}">
  <meta property="og:image:width" content="480">
  <meta property="og:image:height"content="480">
  <meta property="og:site_name"   content="오복신당 일주풀이">
  <meta property="og:locale"      content="ko_KR">

  <!-- 트위터 카드 -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image"       content="${imageUrl}">

  <!-- 카카오톡은 og 태그 읽음 -->
  <title>${title}</title>

  <!-- 바로 결과 페이지로 리다이렉트 -->
  <script>window.location.replace("${resultUrl}");</script>
  <meta http-equiv="refresh" content="0;url=${resultUrl}">
</head>
<body>
  <p>잠시만 기다려주세요... <a href="${resultUrl}">결과 보기</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(html);
}
