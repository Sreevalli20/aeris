import React from 'react';
import { DataClassification } from '../../types/aeris';

interface Props {
  classification: DataClassification;
}

export const DataClassificationBadge: React.FC<Props> = ({ classification }) => {
  switch (classification) {
    case 'physically_tested':
      return (
        <span className="text-xs font-mono text-emerald-400">
          [Tested · Bench/Field]
        </span>
      );
    case 'analytical_estimate':
      return (
        <span className="text-xs font-mono text-cyan-400">
          [Analytical Model]
        </span>
      );
    case 'simulated_measurement':
      return (
        <span className="text-xs font-mono text-amber-400">
          [Simulated Data]
        </span>
      );
    case 'imported_measurement':
      return (
        <span className="text-xs font-mono text-indigo-400">
          [Imported Log]
        </span>
      );
    case 'independently_verified':
      return (
        <span className="text-xs font-mono text-teal-400">
          [Verified · External]
        </span>
      );
    case 'user_design':
    default:
      return (
        <span className="text-xs font-mono text-slate-400">
          [Design Parameter]
        </span>
      );
  }
};
