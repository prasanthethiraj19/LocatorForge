import type { FrameworkId } from '../lib/locators/types';
import { FRAMEWORKS } from '../lib/locators/frameworks';

interface Props {
  value: FrameworkId;
  onChange: (id: FrameworkId) => void;
}

export function FrameworkPicker({ value, onChange }: Props) {
  return (
    <div className="qlc-fwpicker">
      <label htmlFor="qlc-fwsel" className="qlc-fwpicker-label">Framework</label>
      <select
        id="qlc-fwsel"
        value={value}
        onChange={(e) => onChange(e.target.value as FrameworkId)}
        className="qlc-fwpicker-select"
      >
        <optgroup label="Playwright">
          {FRAMEWORKS.filter((f) => f.family === 'playwright').map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </optgroup>
        <optgroup label="Selenium">
          {FRAMEWORKS.filter((f) => f.family === 'selenium').map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </optgroup>
        <optgroup label="Other">
          {FRAMEWORKS.filter((f) => f.family !== 'playwright' && f.family !== 'selenium').map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
