// api/og.js
// 링크 공유 시 OG 태그 HTML 반환
// og:image = Cloudinary 동적 텍스트 오버레이 URL (서버리스, 업로드 불필요)

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

  // ── Cloudinary 동적 이미지 URL ──────────────────────────────────
  // 배경: 어두운 갈색 800x800 이미지 (oboad_g.png를 배경으로 사용)
  // 텍스트 오버레이로 일주 이름을 넣음
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  let ogImageUrl = `${siteUrl}/favicon.png`; // 폴백

  if (cloudName) {
    // URL 인코딩: Cloudinary 텍스트 오버레이는 쉼표/슬래시를 %2C/%2F로
    const encText = encodeURIComponent(iljuName).replace(/%/g, '%25');
    const nameLine = name
      ? `,l_text:NanumGothic_28_bold:${encodeURIComponent(name + ' 님의 사주').replace(/%/g,'%25')},co_rgb:DCC882,g_south,y_120`
      : '';

    // oboak_g.png 를 Cloudinary에 미리 업로드해두고 public_id를 'oboak_g'로 지정했다고 가정
    // 배경은 단색(#1a0e04)으로 생성, 텍스트 두 줄 오버레이
    ogImageUrl = [
      `https://res.cloudinary.com/${cloudName}/image/upload`,
      `w_800,h_800,c_fill,b_rgb:1a0e04`,                                          // 배경 800x800 어두운 갈색
      `l_text:NanumGothic_90_bold:${encText},co_rgb:F5E0A0,g_center,y_-40`,       // 일주 이름 중앙
      `l_text:NanumGothic_24:%EB%82%98%EC%9D%98%20%EC%9D%BC%EC%A3%BC%EB%8A%94,co_rgb:DCAF50,g_center,y_-160`, // '나의 일주는'
      `l_text:NanumGothic_18:obsd-iljutest.co.kr,co_rgb:887040,g_south,y_60`      // 하단 도메인
      + nameLine,
      `v1/oboak_g`                                                                  // 배경 이미지 (public_id)
    ].join('/');
  }
  // ──────────────────────────────────────────────────────────────

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
  <meta property="og:image:width"  content="800">
  <meta property="og:image:height" content="800">
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
