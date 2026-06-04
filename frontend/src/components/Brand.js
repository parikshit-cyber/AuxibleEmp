export function Equalizer({ active = true, className = "" }) {
  const delays = ["0s", "0.2s", "0.4s", "0.15s", "0.3s"];
  return (
    <div className={`flex items-end gap-[2px] h-4 ${className}`}>
      {delays.map((d, i) => (
        <span
          key={i}
          className="eq-bar"
          style={{
            animationDelay: d,
            animationPlayState: active ? "running" : "paused",
            height: active ? undefined : "30%",
          }}
        />
      ))}
    </div>
  );
}

export function BrandMark({ size = "h-10 w-10" }) {
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8a6d1b] grid place-items-center shrink-0 glow-gold`}>
      <span className="font-heading font-black text-black text-lg leading-none">A</span>
    </div>
  );
}
