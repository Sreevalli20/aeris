import React, { useState } from 'react';
import { AerisProjectData, TestEntry, VerificationStatus } from '../types/aeris';
import { TestTube2, Plus, Edit3, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { exportTableToCsv } from '../engine/storage';

interface Props {
  projectData: AerisProjectData;
  onUpdateData: (updater: (prev: AerisProjectData) => AerisProjectData) => void;
}

const TEST_CATEGORIES = [
  'Sensor calibration',
  'Mass verification',
  'Battery testing',
  'RF testing',
  'Telemetry rate',
  'Packet loss',
  'Storage integrity',
  'Parachute deployment',
  'Descent rate',
  'Landing detection',
  'Structural integrity',
  'Recovery beacon',
  'End-to-end mission simulation',
];

export const TestValidationManager: React.FC<Props> = ({ projectData, onUpdateData }) => {
  const [editingTest, setEditingTest] = useState<TestEntry | null>(null);
  const [isAddingTest, setIsAddingTest] = useState<boolean>(false);

  const [newTest, setNewTest] = useState<TestEntry>({
    id: `TEST-${String(projectData.tests.length + 1).padStart(2, '0')}`,
    category: 'Structural integrity',
    name: '',
    procedure: '',
    preconditions: '',
    expectedResult: '',
    actualResult: '',
    status: 'IN_PROGRESS',
    date: new Date().toISOString().split('T')[0],
    operator: 'Systems Engineer',
    evidenceRef: '',
    linkedRequirementId: 'REQ-14',
  });

  const handleSaveEdit = () => {
    if (!editingTest) return;
    onUpdateData((prev) => {
      const updatedTests = prev.tests.map((t) => (t.id === editingTest.id ? editingTest : t));
      // Auto-update linked requirement if test passes or fails
      const updatedReqs: typeof prev.requirements = prev.requirements.map((r) => {
        if (r.id === editingTest.linkedRequirementId) {
          return {
            ...r,
            status: editingTest.status,
            evidenceRef: editingTest.evidenceRef || r.evidenceRef,
          };
        }
        return r;
      });

      return {
        ...prev,
        tests: updatedTests,
        requirements: updatedReqs,
      };
    });
    setEditingTest(null);
  };

  const handleAddTest = () => {
    if (!newTest.name.trim()) return;
    onUpdateData((prev) => {
      const updatedTests = [...prev.tests, newTest];
      const updatedReqs: typeof prev.requirements = prev.requirements.map((r) => {
        if (r.id === newTest.linkedRequirementId && newTest.status === 'PASS') {
          return {
            ...r,
            status: 'PASS' as VerificationStatus,
            evidenceRef: newTest.evidenceRef || r.evidenceRef,
          };
        }
        return r;
      });
      return {
        ...prev,
        tests: updatedTests,
        requirements: updatedReqs,
      };
    });
    setIsAddingTest(false);
  };

  const handleDeleteTest = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      tests: prev.tests.filter((t) => t.id !== id),
    }));
  };

  const handleExportCsv = () => {
    const headers = [
      'Test ID',
      'Category',
      'Name',
      'Linked REQ',
      'Procedure',
      'Expected Result',
      'Actual Result',
      'Status',
      'Evidence Ref',
      'Date',
      'Operator',
    ];
    const rows = projectData.tests.map((t) => [
      t.id,
      t.category,
      t.name,
      t.linkedRequirementId,
      t.procedure,
      t.expectedResult,
      t.actualResult,
      t.status,
      t.evidenceRef,
      t.date,
      t.operator,
    ]);
    exportTableToCsv('AERIS1_Engineering_Test_Records.csv', headers, rows);
  };

  const passCount = projectData.tests.filter((t) => t.status === 'PASS').length;
  const inProgressCount = projectData.tests.filter((t) => t.status === 'IN_PROGRESS').length;
  const failCount = projectData.tests.filter((t) => t.status === 'FAIL').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <TestTube2 className="w-5 h-5 text-cyan-400" />
            Validation Testing & Evidence Management
          </h2>
          <p className="text-xs text-slate-400">
            Formal verification records across 13 engineering categories with bidirectional requirement traceability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingTest(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Test Record</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Test Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Validated & Passed</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{passCount}</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">In Progress / Pending Retest</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{inProgressCount}</div>
          </div>
          <Clock className="w-8 h-8 text-amber-500/40" />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Failed Verification</div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{failCount}</div>
          </div>
          <XCircle className="w-8 h-8 text-rose-500/40" />
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Test ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 min-w-[200px]">Test Name & Procedure</th>
                <th className="py-2.5 px-3">Linked REQ</th>
                <th className="py-2.5 px-3">Expected Result</th>
                <th className="py-2.5 px-3">Actual Result</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Evidence Ref</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {projectData.tests.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{t.id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{t.category}</td>
                  <td className="py-2.5 px-3 text-slate-200">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{t.procedure}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-cyan-300 font-semibold">{t.linkedRequirementId}</td>
                  <td className="py-2.5 px-3 text-slate-300 text-[11px]">{t.expectedResult}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-mono text-[11px] font-semibold">{t.actualResult}</td>
                  <td className="py-2.5 px-3 font-mono">
                    {t.status === 'PASS' ? (
                      <span className="text-emerald-400 font-bold">PASS</span>
                    ) : t.status === 'FAIL' ? (
                      <span className="text-rose-400 font-bold">FAIL</span>
                    ) : (
                      <span className="text-amber-400 font-bold">IN PROGRESS</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{t.evidenceRef || 'None'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingTest(t)}
                        className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTest(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Test Modal */}
      {editingTest && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Edit Test Record {editingTest.id}</span>
              <button onClick={() => setEditingTest(null)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Test Name</label>
                <input
                  type="text"
                  value={editingTest.name}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={editingTest.category}
                    onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    {TEST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={editingTest.status}
                    onChange={(e) => setEditingTest({ ...editingTest, status: e.target.value as VerificationStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="PASS">PASS</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="NOT_TESTED">NOT_TESTED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Actual Measured Result</label>
                <input
                  type="text"
                  value={editingTest.actualResult}
                  onChange={(e) => setEditingTest({ ...editingTest, actualResult: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Evidence Reference</label>
                  <input
                    type="text"
                    value={editingTest.evidenceRef}
                    onChange={(e) => setEditingTest({ ...editingTest, evidenceRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Linked Requirement</label>
                  <select
                    value={editingTest.linkedRequirementId}
                    onChange={(e) => setEditingTest({ ...editingTest, linkedRequirementId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    {projectData.requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}: {r.category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingTest(null)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Test Modal */}
      {isAddingTest && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">Add New Test Record</span>
              <button onClick={() => setIsAddingTest(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Test Name</label>
                <input
                  type="text"
                  placeholder="e.g. 30G Mechanical Shock Test"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={newTest.category}
                    onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  >
                    {TEST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={newTest.status}
                    onChange={(e) => setNewTest({ ...newTest, status: e.target.value as VerificationStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="PASS">PASS</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="NOT_TESTED">NOT_TESTED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Procedure Description</label>
                <textarea
                  value={newTest.procedure}
                  onChange={(e) => setNewTest({ ...newTest, procedure: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-sans"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Expected Result</label>
                  <input
                    type="text"
                    value={newTest.expectedResult}
                    onChange={(e) => setNewTest({ ...newTest, expectedResult: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Actual Result</label>
                  <input
                    type="text"
                    value={newTest.actualResult}
                    onChange={(e) => setNewTest({ ...newTest, actualResult: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Evidence Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. LAB_REPORT_04.pdf"
                    value={newTest.evidenceRef}
                    onChange={(e) => setNewTest({ ...newTest, evidenceRef: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Linked Requirement</label>
                  <select
                    value={newTest.linkedRequirementId}
                    onChange={(e) => setNewTest({ ...newTest, linkedRequirementId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    {projectData.requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}: {r.category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingTest(false)}
                className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTest}
                className="px-3 py-1.5 text-xs bg-cyan-400 text-slate-950 font-semibold rounded hover:bg-cyan-300"
              >
                Add Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
