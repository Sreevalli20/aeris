/**
 * AERIS-1 Engineering & Mission Validation Workbench
 * Autonomous Environmental Intelligence & Recovery System
 * NAT-004: Energy & Sustainable Technology & Environment
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AerisProjectData, TelemetryPacket, MissionState } from './types/aeris';
import { loadProjectData, saveProjectData, resetProjectData } from './engine/storage';
import { evaluateAllRequirements } from './engine/validation';
import { MissionSimulator } from './simulator/missionSimulator';
import { TopNavigation, NavSection } from './components/Navigation';

// Module Components
import { EngineeringOverview } from './components/EngineeringOverview';
import { RequirementsMatrix } from './components/RequirementsMatrix';
import { MassBudget } from './components/MassBudget';
import { ParachuteDescent } from './components/ParachuteDescent';
import { PowerEnergyBudget } from './components/PowerEnergyBudget';
import { RfLinkBudget } from './components/RfLinkBudget';
import { TelemetryPacketEngine } from './components/TelemetryPacketEngine';
import { MissionSimulatorView } from './components/MissionSimulatorView';
import { EnvironmentalDashboard } from './components/EnvironmentalDashboard';
import { GroundStationConsole } from './components/GroundStationConsole';
import { HardwareConfigurator } from './components/HardwareConfigurator';
import { SystemArchitectureDiagram } from './components/SystemArchitectureDiagram';
import { LandingRecoverySubsystem } from './components/LandingRecoverySubsystem';
import { TestValidationManager } from './components/TestValidationManager';
import { RiskRegisterView } from './components/RiskRegisterView';
import { ReportGeneratorView } from './components/ReportGeneratorView';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [projectData, setProjectData] = useState<AerisProjectData>(() => {
    const raw = loadProjectData();
    // Dynamically evaluate requirements based on current calculations
    return {
      ...raw,
      requirements: evaluateAllRequirements(raw),
    };
  });

  // Simulator instance
  const simulatorRef = useRef<MissionSimulator>(new MissionSimulator());
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);
  const [groundPackets, setGroundPackets] = useState<TelemetryPacket[]>([]);
  const [onboardPackets, setOnboardPackets] = useState<TelemetryPacket[]>([]);
  const [currentMissionState, setCurrentMissionState] = useState<MissionState>('SAFE_OFF');

  // Sync state changes and auto-evaluate requirements
  const updateProjectData = (updater: (prev: AerisProjectData) => AerisProjectData) => {
    setProjectData((prev) => {
      const updated = updater(prev);
      const evaluated = {
        ...updated,
        requirements: evaluateAllRequirements(updated),
      };
      saveProjectData(evaluated);
      return evaluated;
    });
  };

  const handleResetProject = () => {
    const fresh = resetProjectData();
    const evaluated = {
      ...fresh,
      requirements: evaluateAllRequirements(fresh),
    };
    setProjectData(evaluated);
    simulatorRef.current.reset();
    setGroundPackets([]);
    setOnboardPackets([]);
    setCurrentMissionState('SAFE_OFF');
  };

  const handlePacketGenerated = (packet: TelemetryPacket, groundReceived: boolean) => {
    setOnboardPackets((prev) => [...prev, packet]);
    if (groundReceived) {
      setGroundPackets((prev) => [...prev, packet]);
    }
    setCurrentMissionState(packet.missionState);
  };

  const handleResetSimulation = () => {
    simulatorRef.current.reset();
    setGroundPackets([]);
    setOnboardPackets([]);
    setCurrentMissionState('SAFE_OFF');
  };

  // Generate a complete deterministic nominal 500m AGL descent profile for initial inspection
  const handleGenerateSampleDataset = () => {
    const sim = new MissionSimulator({
      deploymentAltitudeM: 500,
      descentVelocityMs: 6.12,
      packetDropRatePct: 2, // 2% realistic loss
      seed: 104,
    });

    sim.setState('ARMED');
    const newGround: TelemetryPacket[] = [];
    const newOnboard: TelemetryPacket[] = [];

    // Simulate 90 seconds (drone release, parachute descent, landing touchdown, and recovery)
    for (let t = 0; t < 95; t++) {
      if (t === 2) sim.setState('DEPLOYMENT_DETECTED');
      const { packet, groundReceived } = sim.step();
      newOnboard.push(packet);
      if (groundReceived) {
        newGround.push(packet);
      }
    }

    setOnboardPackets(newOnboard);
    setGroundPackets(newGround);
    setCurrentMissionState(newOnboard[newOnboard.length - 1].missionState);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* 3-Zone Top Navigation Contract */}
      <TopNavigation
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onQuickSimulate={() => setActiveSection('simulator')}
        activeMissionState={currentMissionState}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {activeSection === 'overview' && (
          <EngineeringOverview
            projectData={projectData}
            onNavigate={setActiveSection}
            activeMissionState={currentMissionState}
          />
        )}

        {activeSection === 'requirements' && (
          <RequirementsMatrix
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'mass' && (
          <MassBudget
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'power' && (
          <PowerEnergyBudget
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'parachute' && (
          <ParachuteDescent
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'rf' && (
          <RfLinkBudget
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'telemetry' && (
          <TelemetryPacketEngine
            onboardPackets={onboardPackets}
            groundPackets={groundPackets}
          />
        )}

        {activeSection === 'simulator' && (
          <MissionSimulatorView
            simulator={simulatorRef.current}
            onPacketGenerated={handlePacketGenerated}
            onResetSimulation={handleResetSimulation}
          />
        )}

        {activeSection === 'environment' && (
          <EnvironmentalDashboard
            packets={groundPackets.length > 0 ? groundPackets : onboardPackets}
            onGenerateSampleDataset={handleGenerateSampleDataset}
          />
        )}

        {activeSection === 'groundstation' && (
          <GroundStationConsole
            packets={groundPackets}
            isSimulating={isSimRunning}
            onClearPackets={() => setGroundPackets([])}
          />
        )}

        {activeSection === 'hardware' && (
          <HardwareConfigurator
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'recovery' && (
          <LandingRecoverySubsystem
            projectData={projectData}
            onUpdateData={updateProjectData}
            activeMissionState={currentMissionState}
          />
        )}

        {activeSection === 'testing' && (
          <TestValidationManager
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'risks' && (
          <RiskRegisterView
            projectData={projectData}
            onUpdateData={updateProjectData}
          />
        )}

        {activeSection === 'reports' && (
          <ReportGeneratorView
            projectData={projectData}
            onUpdateData={updateProjectData}
            onResetProject={handleResetProject}
          />
        )}
      </main>

      {/* Clean Engineering Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500 font-mono print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>AERIS-1 Autonomous Environmental Intelligence & Recovery System</span>
            <span>·</span>
            <span>NAT-004</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Local Engineering Workbench · No External API Dependency · SI Standards
          </div>
        </div>
      </footer>
    </div>
  );
}
