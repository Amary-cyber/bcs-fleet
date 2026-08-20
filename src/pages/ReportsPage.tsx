import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { exportToPdf, exportToExcel, exportToCsv } from '../utils/exportEngine';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Table as TableIcon,
  Calendar,
  Filter,
  Car,
  CheckCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { vehicles } = useFleet();
  const [reportType, setReportType] = useState<string>('MILEAGE');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [period, setPeriod] = useState<string>('THIS_WEEK');

  // Computed Real Report Rows
  const getMileageReportData = () => {
    return vehicles.map((v) => ({
      vehicle: v.name,
      plate: v.plate_number,
      driver: v.driver_name || 'Non assigné',
      distance: (v.odometer_km || 0).toFixed(1) + ' km',
      odometer: (v.odometer_km || 0).toFixed(1) + ' km',
    }));
  };

  const getSpeedReportData = () => {
    return vehicles.map((v) => ({
      vehicle: v.name,
      plate: v.plate_number,
      avgSpeed: (v.current_speed || 0).toFixed(1) + ' km/h',
      maxSpeed: (v.current_speed || 0).toFixed(1) + ' km/h',
      violationsCount: v.status === 'ALERT' ? 1 : 0,
    }));
  };

  const getActivityReportData = () => {
    return vehicles.map((v) => ({
      vehicle: v.name,
      plate: v.plate_number,
      movingTime: v.status === 'MOVING' ? 'Actif' : '0m',
      stoppedTime: v.status === 'STOPPED' ? 'À l\'arrêt' : '0m',
      offlineTime: v.status === 'OFFLINE' ? 'Hors ligne' : '0m',
    }));
  };

  const handleExportPdf = () => {
    if (reportType === 'MILEAGE') {
      const rows = getMileageReportData().map((r) => [r.vehicle, r.plate, r.driver, r.distance, r.odometer]);
      exportToPdf('Rapport Kilométrique', ['Véhicule', 'Immatriculation', 'Chauffeur', 'Distance Parcourue', 'Odomètre Total'], rows);
    } else if (reportType === 'SPEED') {
      const rows = getSpeedReportData().map((r) => [r.vehicle, r.plate, r.avgSpeed, r.maxSpeed, r.violationsCount]);
      exportToPdf('Rapport de Vitesse & Infractions', ['Véhicule', 'Immatriculation', 'Vitesse Moyenne', 'Vitesse Maximale', 'Excès Détectés'], rows);
    } else {
      const rows = getActivityReportData().map((r) => [r.vehicle, r.plate, r.movingTime, r.stoppedTime, r.offlineTime]);
      exportToPdf('Rapport d\'Activité Flotte', ['Véhicule', 'Immatriculation', 'Temps Mouvement', 'Temps à l\'Arrêt', 'Temps Hors Ligne'], rows);
    }
  };

  const handleExportExcel = () => {
    const data =
      reportType === 'MILEAGE'
        ? getMileageReportData()
        : reportType === 'SPEED'
        ? getSpeedReportData()
        : getActivityReportData();

    exportToExcel(`Rapport_${reportType}`, data);
  };

  const handleExportCsv = () => {
    if (reportType === 'MILEAGE') {
      const rows = getMileageReportData().map((r) => [r.vehicle, r.plate, r.driver, r.distance, r.odometer]);
      exportToCsv('rapport_kilometrique', ['Véhicule', 'Plaque', 'Chauffeur', 'Distance', 'Odomètre'], rows);
    } else {
      const rows = getSpeedReportData().map((r) => [r.vehicle, r.plate, r.avgSpeed, r.maxSpeed, r.violationsCount]);
      exportToCsv('rapport_vitesse', ['Véhicule', 'Plaque', 'VitesseMoyenne', 'VitesseMax', 'Infractions'], rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            RAPPORTS &amp; EXPORTS ANALYTIQUES
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Génération de rapports d'activité, bilans kilométriques et synthèses des vitesses au format PDF, Excel et CSV.
          </p>
        </div>

        {/* Export Buttons Group */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <TableIcon className="w-4 h-4" /> Export Excel
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Report Selector & Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        {/* Report Type Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {[
            { id: 'MILEAGE', label: '📊 Rapport Kilométrique' },
            { id: 'SPEED', label: '⚡ Rapport de Vitesse' },
            { id: 'ACTIVITY', label: '⏱️ Rapport d\'Activité' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                reportType === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Véhicule Cible</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            >
              <option value="ALL">Tous les véhicules ({vehicles.length})</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Période Temporelle</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            >
              <option value="TODAY">Aujourd'hui</option>
              <option value="YESTERDAY">Hier</option>
              <option value="THIS_WEEK">Cette semaine</option>
              <option value="THIS_MONTH">Ce mois-ci</option>
              <option value="CUSTOM">Période personnalisée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generated Report Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-white font-mono uppercase">
            Aperçu des Données du Rapport ({reportType})
          </div>
          <div className="text-[11px] text-slate-400">Standard BCS Fleet Dakar</div>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'MILEAGE' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Véhicule</th>
                  <th className="p-4">Immatriculation</th>
                  <th className="p-4">Chauffeur</th>
                  <th className="p-4">Distance Parcourue</th>
                  <th className="p-4 text-right">Odomètre Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {getMileageReportData().map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-white">{row.vehicle}</td>
                    <td className="p-4 font-mono text-cyan-400 font-bold">{row.plate}</td>
                    <td className="p-4">{row.driver}</td>
                    <td className="p-4 text-emerald-400 font-mono font-bold">{row.distance}</td>
                    <td className="p-4 text-right font-mono text-slate-200">{row.odometer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'SPEED' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Véhicule</th>
                  <th className="p-4">Immatriculation</th>
                  <th className="p-4">Vitesse Moyenne</th>
                  <th className="p-4">Vitesse Max</th>
                  <th className="p-4 text-right">Infractions Détectées</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {getSpeedReportData().map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-white">{row.vehicle}</td>
                    <td className="p-4 font-mono text-cyan-400 font-bold">{row.plate}</td>
                    <td className="p-4 font-mono">{row.avgSpeed}</td>
                    <td className="p-4 font-mono text-rose-400 font-bold">{row.maxSpeed}</td>
                    <td className="p-4 text-right font-mono font-bold">
                      {row.violationsCount > 0 ? (
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {row.violationsCount} excès
                        </span>
                      ) : (
                        <span className="text-emerald-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'ACTIVITY' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Véhicule</th>
                  <th className="p-4">Immatriculation</th>
                  <th className="p-4">Temps Mouvement</th>
                  <th className="p-4">Temps à l'Arrêt</th>
                  <th className="p-4 text-right">Temps Hors Ligne</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {getActivityReportData().map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-white">{row.vehicle}</td>
                    <td className="p-4 font-mono text-cyan-400 font-bold">{row.plate}</td>
                    <td className="p-4 font-mono text-emerald-400 font-bold">{row.movingTime}</td>
                    <td className="p-4 font-mono text-amber-400">{row.stoppedTime}</td>
                    <td className="p-4 text-right font-mono text-slate-400">{row.offlineTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
