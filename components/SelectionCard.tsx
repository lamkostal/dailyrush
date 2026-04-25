
import React, { useState, useEffect } from 'react';
import { NumberRange } from '../types';

interface SelectionCardProps {
  onSelect: (value: NumberRange) => void;
  currentSelection?: NumberRange;
}

const SelectionCard: React.FC<SelectionCardProps> = ({ onSelect, currentSelection }) => {
  const [sliderValue, setSliderValue] = useState<number>(currentSelection || 5);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (currentSelection !== undefined) {
      setSliderValue(currentSelection);
    }
  }, [currentSelection]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) as NumberRange;
    setSliderValue(val);
    onSelect(val);
  };

  const jumpTo = (val: number) => {
    setSliderValue(val);
    onSelect(val as NumberRange);
  };

  const getThemeColor = (val: number) => {
    if (val <= 3) return "rgb(249, 115, 22)"; // Orange-500
    if (val <= 7) return "rgb(79, 70, 229)"; // Indigo-600
    return "rgb(34, 197, 94)"; // Green-500
  };

  const getMoodLabel = (val: number) => {
    if (val <= 2) return "Struggling";
    if (val <= 4) return "Manageable";
    if (val <= 6) return "Doing Well";
    if (val <= 8) return "Feeling Great";
    return "Outstanding!";
  };

  const getColorClass = (val: number) => {
    if (val <= 3) return "text-orange-600";
    if (val <= 7) return "text-indigo-600";
    return "text-green-600";
  };

  return (
    <div className="w-full py-4 select-none">
      {/* Big Visual Indicator */}
      <div className="flex flex-col items-center mb-8">
        <div 
          className="relative group cursor-default"
          style={{ transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div 
            className={`
              w-24 h-24 rounded-[2rem] flex items-center justify-center text-5xl font-black text-white shadow-2xl transition-all duration-500
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
        <div className="mt-4 h-6">
          <span className={`text-sm font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${getColorClass(sliderValue)}`}>
            {getMoodLabel(sliderValue)}
          </span>
        </div>
      </div>

      <div className="relative pt-6 pb-10 px-4">
        {/* The Slider Track Background */}
        <div className="absolute top-[34px] left-6 right-6 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div 
            className="h-full transition-all duration-500 ease-out opacity-30"
            style={{ 
              width: `${((sliderValue - 1) / 9) * 100}%`,
              backgroundColor: getThemeColor(sliderValue)
            }}
          />
        </div>

        {/* The Native Slider Input (Hidden but Functional) */}
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={sliderValue}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="relative w-full h-10 bg-transparent appearance-none cursor-grab active:cursor-grabbing z-20 focus:outline-none 
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
        <div className="flex justify-between mt-4 relative z-10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
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
        <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default SelectionCard;
