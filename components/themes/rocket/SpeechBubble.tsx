'use client'

export function SpeechBubble({ revealed, onToggle }: { revealed: boolean; onToggle: () => void }) {
  return (
    <>
      <style>{`
        @keyframes bubbleFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-4px) rotate(-0.5deg)} }
        .stt-bubble::after {
          content:''; position:absolute; bottom:-18px; left:24px;
          border:9px solid transparent; border-top-color:${revealed ? '#b84000' : '#1a1000'};
        }
        .stt-bubble::before {
          content:''; position:absolute; bottom:-14px; left:27px;
          border:6px solid transparent; border-top-color:${revealed ? '#e65100' : '#fffde7'}; z-index:1;
        }
      `}</style>
      <div
        onClick={onToggle}
        style={{
          position: 'fixed', bottom: 28, left: 20, zIndex: 200,
          pointerEvents: 'auto', cursor: 'pointer',
          animation: 'bubbleFloat 3.5s ease-in-out infinite',
        }}
      >
        <div className="stt-bubble" style={{
          background: revealed ? '#e65100' : '#fffde7',
          border: `3px solid ${revealed ? '#b84000' : '#1a1000'}`,
          padding: '13px 19px', maxWidth: 315, position: 'relative',
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: '1.08rem',
          lineHeight: 1.6,
          color: revealed ? '#fffde7' : '#1a1000',
          boxShadow: `4px 4px 0 ${revealed ? '#b84000' : '#1a1000'}`,
          transition: 'background 0.25s, color 0.25s, border-color 0.25s',
        }}>
          {revealed ? '✓ 揭曉！（再點一次隱藏）' : '試著把地圖拼圖拼起來選擇地區！什麼？不知道縣市的形狀嗎？我跟你說答案吧！'}
        </div>
      </div>
    </>
  )
}
