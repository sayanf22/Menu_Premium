export const OrderAnimation = () => {
  return (
    <div className="relative w-32 h-32 mx-auto">
      <style>{`
        @keyframes cookerShake {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.02); }
        }
        @keyframes valveBounce {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-3px) translateX(-50%); }
        }
        @keyframes steamRise {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
      
      {/* Pressure Cooker Body */}
      <div
        className="absolute bottom-0 left-1/2 w-24 h-20 bg-gradient-to-b from-gray-300 to-gray-400 rounded-b-xl"
        style={{ animation: 'cookerShake 1s ease-in-out infinite' }}
      >
        {/* Cooker Handle */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-500 rounded-t-lg" />
        
        {/* Pressure Valve */}
        <div
          className="absolute -top-6 left-1/2 w-3 h-4 bg-gray-600 rounded-t"
          style={{ animation: 'valveBounce 0.5s ease-in-out infinite' }}
        />
      </div>

      {/* Steam Animation */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white/60 rounded-full"
          style={{
            left: `${40 + i * 10}%`,
            bottom: '80px',
            animation: `steamRise 2s ease-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Heating Element Glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-2 bg-orange-500/50 rounded-full blur-sm"
        style={{ animation: 'glowPulse 1.5s ease-in-out infinite' }}
      />
    </div>
  );
};
