'use client'

export function SpeechBubble() {
  return (
    <>
      <style>{`
        @keyframes bubbleFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-4px) rotate(-0.5deg)} }
        .stt-bubble::after {
          content:''; position:absolute; bottom:-13px; left:18px;
          border:7px solid transparent; border-top-color:#1a1000;
        }
        .stt-bubble::before {
          content:''; position:absolute; bottom:-10px; left:20px;
          border:5px solid transparent; border-top-color:#fffde7; z-index:1;
        }
      `}</style>
      <div style={{ position: 'fixed', bottom: 28, left: 20, zIndex: 200, pointerEvents: 'none', animation: 'bubbleFloat 3.5s ease-in-out infinite' }}>
        <div className="stt-bubble" style={{
          background: '#fffde7', border: '2px solid #1a1000',
          padding: '9px 13px', maxWidth: 210, position: 'relative',
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: '0.72rem',
          lineHeight: 1.6, color: '#1a1000', boxShadow: '3px 3px 0 #1a1000',
        }}>
          什麼？不知道縣市的形狀嗎？我跟你說答案吧！
        </div>
      </div>
    </>
  )
}
