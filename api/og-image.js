// api/og-image.js
// Vercel Edge Function — 일주 결과 OG 이미지를 서버에서 직접 생성
// @vercel/og 사용 (ImageResponse)

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// 천간/지지 계산
const CHEON_GAN = ['갑','을','병','정','무','기','경','신','임','계'];
const JI_JI     = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

function julianDay(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524;
}

function getDayJu(year, month, day) {
  const jd  = julianDay(year, month, day);
  const idx = ((jd - 2451551) % 60 + 60) % 60;
  return { gan: CHEON_GAN[idx % 10], ji: JI_JI[idx % 12] };
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const year  = parseInt(searchParams.get('year'))  || 0;
  const month = parseInt(searchParams.get('month')) || 0;
  const day   = parseInt(searchParams.get('day'))   || 0;
  const name  = searchParams.get('name') || '';

  let iljuName = '나의 일주';
  if (year && month && day) {
    const dayJu = getDayJu(year, month, day);
    iljuName = `${dayJu.gan}${dayJu.ji}일주`;
  }

  // 오복신당 로고 이미지 (base64로 embed하거나 URL로 참조)
  const logoUrl = 'https://www.obsd-iljutest.co.kr/logo.png';

  return new ImageResponse(
    (
      <div
        style={{
          width: '800px',
          height: '800px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(150deg, #160c02 0%, #2c1a08 30%, #3e240e 60%, #1a0e04 100%)',
          position: 'relative',
          fontFamily: 'serif',
        }}
      >
        {/* 테두리 장식 */}
        <div style={{
          position: 'absolute', inset: '20px',
          border: '1.5px solid rgba(200,150,50,0.35)',
          borderRadius: '28px',
          display: 'flex',
        }} />

        {/* 상단 코너 장식 */}
        <div style={{
          position: 'absolute', top: '40px', left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '13px', letterSpacing: '8px',
          color: 'rgba(220,175,80,0.65)',
          display: 'flex',
        }}>
          ✦ 오복신당 일주풀이 ✦
        </div>

        {/* 배경 장식 문자 */}
        <div style={{
          position: 'absolute', bottom: '80px', right: '60px',
          fontSize: '180px', color: 'rgba(212,160,64,0.05)',
          lineHeight: 1, display: 'flex',
        }}>
          福
        </div>

        {/* 메인 컨텐츠 */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0px',
        }}>
          {/* 안내 문구 */}
          <div style={{
            fontSize: '20px', color: 'rgba(220,175,80,0.8)',
            letterSpacing: '4px', marginBottom: '24px',
            display: 'flex',
          }}>
            나의 일주는
          </div>

          {/* 구분선 위 */}
          <div style={{
            width: '360px', height: '1px',
            background: 'rgba(200,150,50,0.35)',
            marginBottom: '32px', display: 'flex',
          }} />

          {/* 일주 이름 */}
          <div style={{
            fontSize: '120px', fontWeight: 'bold',
            color: '#f5e0a0',
            lineHeight: 1, marginBottom: '32px',
            display: 'flex',
          }}>
            {iljuName}
          </div>

          {/* 구분선 아래 */}
          <div style={{
            width: '360px', height: '1px',
            background: 'rgba(200,150,50,0.35)',
            marginBottom: '28px', display: 'flex',
          }} />

          {/* 이름 표시 */}
          {name ? (
            <div style={{
              fontSize: '22px', color: 'rgba(220,190,130,0.7)',
              letterSpacing: '2px', marginBottom: '8px',
              display: 'flex',
            }}>
              {decodeURIComponent(name)} 님의 사주
            </div>
          ) : null}

          {/* 하단 문구 */}
          <div style={{
            fontSize: '16px', color: 'rgba(200,160,70,0.45)',
            letterSpacing: '1px', marginTop: name ? '8px' : '0',
            display: 'flex',
          }}>
            obsd-iljutest.co.kr
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 800,
    }
  );
}
