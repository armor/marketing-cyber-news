interface SeverityFilterProps {
  selected: string | null;
  onSelect: (severity: string | null) => void;
}

const severities = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'info', label: 'Info', color: 'bg-blue-500' },
];

export function SeverityFilter({ selected, onSelect }: SeverityFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Severity:</span>
      <div className="flex gap-1">
        <button
          onClick={() => onSelect(null)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            selected === null
              ? 'bg-gray-600 text-white'
              : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {severities.map((sev) => (
          <button
            key={sev.value}
            onClick={() => onSelect(sev.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selected === sev.value
                ? `${sev.color} text-white`
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            {sev.label}
          </button>
        ))}
      </div>
    </div>
  );
}
