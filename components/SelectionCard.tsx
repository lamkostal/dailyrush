
import React, { useState, useEffect } from 'react';

interface SelectionCardProps {
  onSelect: (value: number) => void;
  currentSelection?: number;
  minValue: number;
  maxValue: number;
}

const getMidpoint = (minValue: number, maxValue: number) => Math.round((minValue + maxValue) / 2);

const SelectionCard: React.FC<SelectionCardProps> = ({ onSelect, currentSelection, minValue, maxValue }) => {
  const [sliderValue, setSliderValue] = useState<number>(currentSelection ?? getMidpoint(minValue, maxValue));
  const [isDragging, setIsDragging] = useState(false);
  const rangeSpan = Math.max(maxValue - minValue, 1);

  useEffect(() => {
    setSliderValue(currentSelection ?? getMidpoint(minValue, maxValue));
  }, [currentSelection, minValue, maxValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderValue(val);
    onSelect(val);
  };

  const jumpTo = (val: number) => {
    setSliderValue(val);
    onSelect(val);
  };

  const getRatio = (val: number) => (val - minValue) / rangeSpan;

  const getThemeColor = (val: number) => {
    const ratio = getRatio(val);
    if (ratio <= 0.3) return "rgb(249, 115, 22)"; // Orange-500
    if (ratio <= 0.7) return "rgb(79, 70, 229)"; // Indigo-600
    return "rgb(34, 197, 94)"; // Green-500
  };

  const getMoodLabel = (val: number) => {
    const ratio = getRatio(val);
    if (ratio <= 0.2) return "Low";
    if (ratio <= 0.4) return "Building";
    if (ratio <= 0.6) return "Steady";
    if (ratio <= 0.8) return "Strong";
    return "Peak";
  };

  const getColorClass = (val: number) => {
    const ratio = getRatio(val);
    if (ratio <= 0.3) return "text-orange-600";
    if (ratio <= 0.7) return "text-indigo-600";
    return "text-green-600";
  };

  const tickCount = maxValue - minValue + 1;
  const ticks = tickCount <= 12
    ? Array.from({ length: tickCount }, (_, index) => minValue + index)
    : Array.from(
        new Set(Array.from({ length: 6 }, (_, index) => Math.round(minValue + (rangeSpan * index) / 5)))
      );

  return (
    <div className="w-full py-2 select-none">
      {/* Big Visual Indicator */}
      <div className="flex flex-col items-center mb-5">
        <div 
          className="relative group cursor-default"
          style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div 
            className={`
              w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-2xl transition-all duration-500
              ${isDragging ? 'scale-110 rotate-3' : 'scale-100'}
            `}
            style={{ backgroundColor: getThemeColor(sliderValue) }}
          >
            {sliderValue}
          </div>
          {/* Subtle glow effect */}
          <div 
            className="absolute inset-0 rounded-[2rem] blur-xl opacity-30 -z-10 transition-all duration-500"
            style={{ backgroundColor: getThemeColor(sliderValue) }}
          />
        </div>
        <div className="mt-3 h-5">
          <span className={`text-sm font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${getColorClass(sliderValue)}`}>
            {getMoodLabel(sliderValue)}
          </span>
        </div>
      </div>

      <div className="relative pt-4 pb-6 px-4">
        {/* The Slider Track Background */}
        <div className="absolute top-[26px] left-6 right-6 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div 
            className="h-full transition-all duration-500 ease-out opacity-30"
            style={{ 
              width: `${getRatio(sliderValue) * 100}%`,
              backgroundColor: getThemeColor(sliderValue)
            }}
          />
        </div>

        {/* The Native Slider Input (Hidden but Functional) */}
        <input
          type="range"
          min={minValue}
          max={maxValue}
          step="1"
          value={sliderValue}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="relative w-full h-8 bg-transparent appearance-none cursor-grab active:cursor-grabbing z-20 focus:outline-none
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-10 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
            [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-current
            [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:active:scale-110
            [&::-moz-range-thumb]:w-10 [&::-moz-range-thumb]:h-10 [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 
            [&::-moz-range-thumb]:border-current [&::-moz-range-thumb]:shadow-xl border-none"
          style={{ color: getThemeColor(sliderValue) }}
        />

        {/* Tapable Tick Marks & Numbers */}
        <div className="flex justify-between mt-3 relative z-10">
          {ticks.map((tick) => (
            <button
              key={tick}
              onClick={() => jumpTo(tick)}
              className="group flex flex-col items-center outline-none"
            >
              {/* Vertical Tick */}
              <div 
                className={`w-0.5 h-3 rounded-full mb-3 transition-all duration-300 ${
                  sliderValue === tick 
                    ? 'h-5 opacity-100' 
                    : 'opacity-20 group-hover:opacity-60 bg-slate-400'
                }`}
                style={{ backgroundColor: sliderValue === tick ? getThemeColor(sliderValue) : undefined }}
              />
              {/* Number Label */}
              <span 
                className={`
                  text-xs font-black transition-all duration-300 transform
                  ${sliderValue === tick 
                    ? 'scale-150 -translate-y-1' 
                    : 'text-slate-300 group-hover:text-slate-500 group-hover:scale-110'}
                `}
                style={{ color: sliderValue === tick ? getThemeColor(sliderValue) : undefined }}
              >
                {tick}
              </span>
            </button>
          ))}
        </div>
        
        {/* Intuitive help text */}
        <div className="flex justify-between mt-1 px-1 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default SelectionCard;
