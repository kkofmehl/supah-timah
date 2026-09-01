const PRESET_COLORS = [
  '#E74C3C',
  '#E67E22',
  '#F1C40F',
  '#2ECC71',
  '#1ABC9C',
  '#3498DB',
  '#4A90D9',
  '#9B59B6',
  '#E91E63',
  '#607D8B',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-8 h-8 rounded-full border-2 transition-transform active:scale-95"
          style={{
            backgroundColor: color,
            borderColor: value === color ? '#fff' : 'transparent',
          }}
          aria-label={`Color ${color}`}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
        aria-label="Custom color"
      />
    </div>
  );
}

export { PRESET_COLORS };
