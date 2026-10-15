import React from 'react';
import { MANDATORY_LANGUAGES, AREAS_OF_EXPERTISE } from '../../constants/indianData';

export default function ProfessionalSection({
  languages = [],
  areasOfExpertise = [],
  errors,
  isReadOnly,
  onLanguageToggle,
  onExpertiseToggle
}) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">
        3. Languages &amp; Areas of Expertise
      </h3>

      <div className="mb-4">
        <label className="text-xs font-medium text-slate-700 block mb-2">
          Languages Known <span className="text-red-500">*</span> (Select at least 1)
        </label>
        <div className="flex flex-wrap gap-2">
          {MANDATORY_LANGUAGES.map((lang) => {
            const isChecked = languages.includes(lang);
            return (
              <label
                key={lang}
                className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border ${
                  isChecked
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onLanguageToggle(lang)}
                  disabled={isReadOnly}
                  className="hidden"
                />
                {lang}
              </label>
            );
          })}
        </div>
        {errors.languages && <span className="text-xs text-red-600 mt-1 block">{errors.languages}</span>}
      </div>

      <div>
        <label className="text-xs font-medium text-slate-700 block mb-2">
          Areas of Expertise <span className="text-red-500">*</span> (Choose 1 to 3)
        </label>
        <div className="flex flex-wrap gap-2">
          {AREAS_OF_EXPERTISE.map((area) => {
            const isChecked = areasOfExpertise.includes(area);
            return (
              <label
                key={area}
                className={`inline-flex items-center px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border ${
                  isChecked
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onExpertiseToggle(area)}
                  disabled={isReadOnly}
                  className="hidden"
                />
                {area}
              </label>
            );
          })}
        </div>
        {errors.areas_of_expertise && (
          <span className="text-xs text-red-600 mt-1 block">{errors.areas_of_expertise}</span>
        )}
      </div>
    </div>
  );
}
