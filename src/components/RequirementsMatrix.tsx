import React, { useState } from 'react';
import { AerisProjectData, RequirementItem, VerificationStatus, RequirementCategory } from '../types/aeris';
import { exportTableToCsv } from '../engine/storage';
import { Plus, Download, Edit3, CheckCircle2, XCircle, AlertTriangle, Clock, Ban, Filter } from 'lucide-react';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

export const RequirementsMatrix: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingReq, setEditingReq] = useState<RequirementItem | null>(null);
  const [isAddingReq, setIsAddingReq] = useState<boolean>(false);

  // New requirement draft state
  const [newReq, setNewReq] = useState<RequirementItem>({
    id: `REQ-${String(projectData.requirements.length + 1).padStart(2, '0')}`,
    description: '',
    category: 'MASS_STRUCTURE',
    target: '',
    measuredOrCalcValue: '',
    unit: '',
    verificationMethod: 'Laboratory Test',
    evidenceRef: '',
    status: 'NOT_TESTED',
    notes: '',
    correctiveAction: '',
  });

  const filteredRequirements = projectData.requirements.filter((req) => {
    const matchesCategory = filterCategory === 'ALL' || req.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;
    const matchesSearch =
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.evidenceRef.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const handleSaveEdit = () => {
    if (!editingReq) return;
    onUpdateData((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) => (r.id === editingReq.id ? editingReq : r)),
    }));
    setEditingReq(null);
  };

  const handleAddRequirement = () => {
    if (!newReq.description.trim()) return;
    onUpdateData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, newReq],
    }));
    setIsAddingReq(false);
    setNewReq({
      id: `REQ-${String(projectData.requirements.length + 2).padStart(2, '0')}`,
      description: '',
      category: 'MASS_STRUCTURE',
      target: '',
      measuredOrCalcValue: '',
      unit: '',
      verificationMethod: 'Laboratory Test',
      evidenceRef: '',
      status: 'NOT_TESTED',
      notes: '',
      correctiveAction: '',
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Requirement ID',
      'Category',
      'Description',
      'Target',
      'Measured / Calculated',
      'Unit',
      'Verification Method',
      'Status',
      'Evidence Reference',
      'Notes',
      'Corrective Action',
    ];
    const rows = projectData.requirements.map((r) => [
      r.id,
      r.category,
      r.description,
      r.target,
      r.measuredOrCalcValue,
      r.unit,
      r.verificationMethod,
      r.status,
      r.evidenceRef,
      r.notes,
      r.correctiveAction,
    ]);
    exportTableToCsv('AERIS1_Requirements_Traceability_Matrix.csv', headers, rows);
  };

  // Rubric calculation
  const totalRubricWeight = projectData.rubric.reduce((acc, c) => acc + c.weight, 0);
  const currentProvisionalScore = projectData.rubric.reduce(
    (acc, c) => acc + Math.max(0, c.score - c.unverifiedDeduction),
    0
  );

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="flex items-center gap-1 font-mono text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="flex items-center gap-1 font-mono text-xs text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            FAIL
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="flex items-center gap-1 font-mono text-xs text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            IN PROGRESS
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="flex items-center gap-1 font-mono text-xs text-purple-400">
            <Ban className="w-3.5 h-3.5" />
            BLOCKED
          </span>
        );
      case 'NOT_TESTED':
      default:
        return (
          <span className="flex items-center gap-1 font-mono text-xs text-slate-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            NOT TESTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Requirements Traceability Matrix (RTM)
          </h2>
          <p className="text-xs text-slate-400">
            Traceability matrix mapping mission specifications to analytical evaluations and physical test evidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingReq(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Requirement</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export RTM CSV</span>
          </button>
        </div>
      </div>

      {/* Provisional Scoring Notice Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase text-cyan-400 mb-0.5">
              Provisional Engineering Assessment — Total Rubric Weight: {totalRubricWeight} pts
            </div>
            <div className="text-xs text-slate-300">
              Score: <span className="font-mono font-bold text-emerald-400 text-sm">{currentProvisionalScore.toFixed(1)} / {totalRubricWeight} pts</span>
              <span className="text-slate-400 ml-2">
                (Unverified physical requirements carry deductions until validated test logs are attached)
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-sans max-w-sm italic">
            Notice: Official competition rubric has not been released. This 200-point rubric is a provisional systems engineering assessment.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by ID, keyword, evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Categories</option>
            <option value="MASS_STRUCTURE">Mass & Structure</option>
            <option value="DEPLOYMENT_DESCENT">Deployment & Descent</option>
            <option value="TELEMETRY_RF">Telemetry & RF</option>
            <option value="POWER_ENERGY">Power & Energy</option>
            <option value="SENSING_ENVIRONMENT">Sensing & Environment</option>
            <option value="LANDING_RECOVERY">Landing & Recovery</option>
            <option value="DATA_INTEGRITY">Data Integrity</option>
            <option value="REGULATORY">Regulatory</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="NOT_TESTED">Not Tested</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </div>

      {/* Traceability Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">REQ ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 min-w-[220px]">Description</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Current / Calc</th>
                <th className="py-2.5 px-3">Verification</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Evidence Ref</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRequirements.map((req) => (
                <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                    {req.id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {req.category.replace('_', ' ')}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    <div>{req.description}</div>
                    {req.notes && (
                      <div className="text-[11px] text-slate-400 mt-0.5 italic">
                        Notes: {req.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                    {req.target} {req.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-200 font-semibold whitespace-nowrap">
                    {req.measuredOrCalcValue}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {req.verificationMethod}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                    {req.evidenceRef || 'None'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setEditingReq(req)}
                      className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800"
                      title="Edit Requirement"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisional Rubric Breakdown (200 pts) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Provisional Engineering Assessment Rubric (200 Points Allocation)
            </h3>
            <p className="text-xs text-slate-400">
              Configurable scoring criteria mapped to NAT-004 aerospace benchmarks. Update points and deductions as evidence is recorded.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-base font-bold text-cyan-400">
              {currentProvisionalScore} / {totalRubricWeight}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projectData.rubric.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950 p-3 rounded border border-slate-800/80 text-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between font-mono mb-1">
                  <span className="text-cyan-400 font-semibold">{item.name}</span>
                  <span className="text-slate-400">[{item.weight} pts]</span>
                </div>
                <p className="text-[11px] text-slate-400">{item.notes}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-2 font-mono">
                <span className="text-slate-500 text-[10px]">Net Score:</span>
                <span className="text-emerald-400 font-bold">
                  {Math.max(0, item.score - item.unverifiedDeduction)} / {item.weight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Requirement Modal */}
      {editingReq && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">
                Edit Requirement {editingReq.id}
              </span>
              <button
                onClick={() => setEditingReq(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  value={editingReq.description}
                  onChange={(e) => setEditingReq({ ...editingReq, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-sans"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target</label>
                  <input
                    type="text"
                    value={editingReq.target}
                    onChange={(e) => setEditingReq({ ...editingReq, target: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Measured / Calculated</label>
                  <input
                    type="text"
                    value={editingReq.measuredOrCalcValue}
                    onChange={(e) => setEditingReq({ ...editingReq, measuredOrCalcValue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={editingReq.status}
                    onChange={(e) => setEditingReq({ ...editingReq, status: e.target.value as VerificationStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="NOT_TESTED">NOT_TESTED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Evidence Reference</label>
                  <input
                    type="text"
                    value={editingReq.evidenceRef}
                    onChange={(e) => setEditingReq({ ...editingReq, evidenceRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Observations</label>
                <input
                  type="text"
                  value={editingReq.notes}
                  onChange={(e) => setEditingReq({ ...editingReq, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Corrective Action</label>
                <input
                  type="text"
                  value={editingReq.correctiveAction}
                  onChange={(e) => setEditingReq({ ...editingReq, correctiveAction: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingReq(null)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Requirement Modal */}
      {isAddingReq && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Add New Requirement</span>
              <button
                onClick={() => setIsAddingReq(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Requirement ID</label>
                  <input
                    type="text"
                    value={newReq.id}
                    onChange={(e) => setNewReq({ ...newReq, id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={newReq.category}
                    onChange={(e) => setNewReq({ ...newReq, category: e.target.value as RequirementCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="MASS_STRUCTURE">MASS_STRUCTURE</option>
                    <option value="DEPLOYMENT_DESCENT">DEPLOYMENT_DESCENT</option>
                    <option value="TELEMETRY_RF">TELEMETRY_RF</option>
                    <option value="POWER_ENERGY">POWER_ENERGY</option>
                    <option value="SENSING_ENVIRONMENT">SENSING_ENVIRONMENT</option>
                    <option value="LANDING_RECOVERY">LANDING_RECOVERY</option>
                    <option value="DATA_INTEGRITY">DATA_INTEGRITY</option>
                    <option value="REGULATORY">REGULATORY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  value={newReq.description}
                  onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
                  placeholder="Enter explicit engineering requirement statement..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-sans"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Specification</label>
                  <input
                    type="text"
                    value={newReq.target}
                    onChange={(e) => setNewReq({ ...newReq, target: e.target.value })}
                    placeholder="e.g. ≤ 700.0"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Unit</label>
                  <input
                    type="text"
                    value={newReq.unit}
                    onChange={(e) => setNewReq({ ...newReq, unit: e.target.value })}
                    placeholder="e.g. g, m/s, Hz"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Verification Method</label>
                  <select
                    value={newReq.verificationMethod}
                    onChange={(e) => setNewReq({ ...newReq, verificationMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="Analysis">Analysis</option>
                    <option value="Laboratory Test">Laboratory Test</option>
                    <option value="Drop Test">Drop Test</option>
                    <option value="Hardware Simulation">Hardware Simulation</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Evidence Reference</label>
                  <input
                    type="text"
                    value={newReq.evidenceRef}
                    onChange={(e) => setNewReq({ ...newReq, evidenceRef: e.target.value })}
                    placeholder="e.g. TEST-01 / LAB-LOG"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingReq(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRequirement}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Add Requirement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
