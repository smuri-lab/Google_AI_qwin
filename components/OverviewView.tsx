import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { TimeEntry, Customer, Activity, UserAccount, Employee, AbsenceRequest, Holiday, CompanySettings, HolidaysByYear, TimeBalanceAdjustment, WeeklySchedule } from '../types';
import { Card } from './ui/Card';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { TimesheetExportModal } from './admin/TimesheetExportModal';
import { formatHoursAndMinutes, exportTimesheet, calculateBalance, getContractDetailsForDate, calculateAbsenceDaysInMonth, exportTimesheetAsPdf, calculateMonthlyBreakdown } from './utils';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { Button } from './ui/Button';
import { ConfirmModal } from './ui/ConfirmModal';
import { AbsenceType, TargetHoursModel } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface OverviewViewProps {
  currentUser: Employee;
  timeEntries: TimeEntry[];
  customers: Customer[];
  activities: Activity[];
  userAccount: UserAccount;
  absenceRequests: AbsenceRequest[];
  holidaysByYear: HolidaysByYear;
  selectedState: string;
  companySettings: CompanySettings;
  timeBalanceAdjustments: TimeBalanceAdjustment[];
  onRetractAbsenceRequest: (id: number) => void;
  onEnsureHolidaysForYear: (year: number) => void;
}

const getStatusChip = (status: AbsenceRequest['status']) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Ausstehend</span>;
      case 'approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Genehmigt</span>;
      case 'rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Abgelehnt</span>;
    }
};
const getAbsenceStyle = (type: AbsenceType) => {
    const styles = {
        [AbsenceType.Vacation]: { label: 'Urlaub' },
        [AbsenceType.SickLeave]: { label: 'Krank' },
        [AbsenceType.TimeOff]: { label: 'Frei' },
    };
    return styles[type] || { label: 'Abwesenheit' };
};

export const OverviewView: React.FC<OverviewViewProps> = (props) => {
    const { currentUser, userAccount, absenceRequests, timeEntries, timeBalanceAdjustments, holidaysByYear, companySettings, onRetractAbsenceRequest, onEnsureHolidaysForYear, customers, activities, selectedState } = props;
    
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [balanceDate, setBalanceDate] = useState(new Date(2026, 0, 1)); // Start in mock year for consistency
    const [requestToRetract, setRequestToRetract] = useState<AbsenceRequest | null>(null);
    const [isVacationOpen, setIsVacationOpen] = useState(true);
    const [isTimeBalanceOpen, setIsTimeBalanceOpen] = useState(true);
    const [isRequestsOpen, setIsRequestsOpen] = useState(() => absenceRequests.some(req => req.status === 'pending'));
    
    const swipeContainerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const timeFormat = companySettings.employeeTimeFormat || 'hoursMinutes';
    
    const changeBalanceMonth = useCallback((offset: number) => {
        setBalanceDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    }, []);
    
     useEffect(() => {
        const node = swipeContainerRef.current;
        if (!node) return;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (touchStartX.current === null || touchStartY.current === null) return;
            const deltaX = e.touches[0].clientX - touchStartX.current;
            const deltaY = e.touches[0].clientY - touchStartY.current;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (e.cancelable) e.preventDefault();
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (touchStartX.current === null || touchStartY.current === null) return;
            
            const deltaX = e.changedTouches[0].clientX - touchStartX.current;
            const deltaY = e.changedTouches[0].clientY - touchStartY.current;
            const SWIPE_THRESHOLD = 50;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
                if (deltaX > 0) changeBalanceMonth(-1); // Swipe right
                else changeBalanceMonth(1); // Swipe left
            }

            touchStartX.current = null;
            touchStartY.current = null;
        };

        node.addEventListener('touchstart', handleTouchStart, { passive: true });
        node.addEventListener('touchmove', handleTouchMove, { passive: false });
        node.addEventListener('touchend', handleTouchEnd, { passive: true });
        node.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            node.removeEventListener('touchstart', handleTouchStart);
            node.removeEventListener('touchmove', handleTouchMove);
            node.removeEventListener('touchend', handleTouchEnd);
            node.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [changeBalanceMonth]);

    
    const monthlyVacationDetails = useMemo(() => {
        const year = balanceDate.getFullYear();
        const month = balanceDate.getMonth();
        onEnsureHolidaysForYear(year);

        const holidaysForYear = holidaysByYear[year] || [];
        
        // Dynamically calculate entitlement and carryover based on the view's current date state
        const contractForYear = getContractDetailsForDate(currentUser, new Date(year, 6, 1)); // Mid-year for safety
        const annualEntitlement = contractForYear.vacationDays;

        const previousYear = year - 1;
        const carryover = currentUser.vacationCarryover?.[previousYear] || 0;
        
        const totalAvailable = annualEntitlement + carryover;

        let vacationTakenBeforeThisMonth = 0;
        for (let i = 0; i < month; i++) {
            const monthAbsences = calculateAbsenceDaysInMonth(currentUser.id, absenceRequests.filter(r => r.type === AbsenceType.Vacation && r.status === 'approved'), year, i, holidaysForYear);
            vacationTakenBeforeThisMonth += monthAbsences.vacationDays;
        }

        const thisMonthApprovedAbsences = calculateAbsenceDaysInMonth(currentUser.id, absenceRequests.filter(r => r.type === AbsenceType.Vacation && r.status === 'approved'), year, month, holidaysForYear);
        const vacationTakenThisMonth = thisMonthApprovedAbsences.vacationDays;

        const thisMonthPendingAbsences = calculateAbsenceDaysInMonth(currentUser.id, absenceRequests.filter(r => r.type === AbsenceType.Vacation && r.status === 'pending'), year, month, holidaysForYear);
        const pendingThisMonth = thisMonthPendingAbsences.vacationDays;

        const remainingAtEndOfMonth = totalAvailable - vacationTakenBeforeThisMonth - vacationTakenThisMonth;

        return {
            annualEntitlement,
            carryover,
            totalAvailable,
            vacationTakenBeforeThisMonth,
            vacationTakenThisMonth,
            pendingThisMonth,
            remainingAtEndOfMonth,
        };
    }, [balanceDate, currentUser, absenceRequests, holidaysByYear, onEnsureHolidaysForYear]);


    const monthlyBalanceDetails = useMemo(() => {
        const year = balanceDate.getFullYear();
        const month = balanceDate.getMonth();
        onEnsureHolidaysForYear(year);
        if (month === 0) onEnsureHolidaysForYear(year - 1);
        
        return calculateMonthlyBreakdown(
            currentUser,
            year,
            month,
            timeEntries,
            absenceRequests,
            timeBalanceAdjustments,
            holidaysByYear
        );
    }, [balanceDate, currentUser, timeEntries, absenceRequests, timeBalanceAdjustments, holidaysByYear, onEnsureHolidaysForYear]);

    const handleConfirmExport = (selectedEmployees: Employee[], year: number, selectedMonths: number[], format: 'excel' | 'pdf') => {
      selectedMonths.forEach(month => {
          const exportParams = {
              employee: currentUser, year, month,
              allTimeEntries: timeEntries,
              allAbsenceRequests: absenceRequests,
              customers, activities,
              selectedState,
              companySettings,
              holidays: holidaysByYear[year] || [],
              timeFormat,
          };
          if (format === 'pdf') {
            exportTimesheetAsPdf(exportParams);
          } else {
            exportTimesheet(exportParams);
          }
      });
      setIsExportModalOpen(false);
    };
    
    const groupedRequests = useMemo(() => {
        const groups: { [year: string]: AbsenceRequest[] } = {};
        const sorted = [...absenceRequests].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        for (const req of sorted) {
            const year = new Date(req.startDate).getFullYear().toString();
            if (!groups[year]) groups[year] = [];
            groups[year].push(req);
        }
        return groups;
    }, [absenceRequests]);
    const sortedYears = Object.keys(groupedRequests).sort((a, b) => Number(b) - Number(a));

    return (
        <div ref={swipeContainerRef} className="space-y-6 max-w-2xl mx-auto">
             <div className="flex justify-between items-center bg-white p-2 sm:p-4 rounded-lg shadow-lg">
                <button onClick={() => changeBalanceMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5"/></button>
                <h2 className="text-xl font-bold text-center">Übersicht {balanceDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeBalanceMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="h-5 w-5"/></button>
            </div>

            <Card>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsTimeBalanceOpen(!isTimeBalanceOpen)} aria-expanded={isTimeBalanceOpen} aria-controls="time-balance-details">
                    <h2 className="text-xl font-bold">Stundenkonto</h2>
                    <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${isTimeBalanceOpen ? 'rotate-180' : ''}`} />
                </div>
                <div id="time-balance-details" className={`transition-all duration-300 ease-in-out overflow-hidden ${isTimeBalanceOpen ? 'max-h-[500px] mt-4' : 'max-h-0 mt-0'}`}>
                    <div className="space-y-2 text-sm">
                        {/* --- Monthly Calculation --- */}
                        <div className="flex justify-between"><span className="text-gray-600">Gearbeitete Stunden</span><span>{formatHoursAndMinutes(monthlyBalanceDetails.workedHours, timeFormat)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Gutschrift (Urlaub, Krank, Feiertag)</span><span>{formatHoursAndMinutes(monthlyBalanceDetails.absenceHolidayCredit, timeFormat)}</span></div>
                        {monthlyBalanceDetails.adjustments !== 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Korrekturen/Auszahlungen</span>
                                <span className={`${monthlyBalanceDetails.adjustments > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatHoursAndMinutes(monthlyBalanceDetails.adjustments, timeFormat)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t pt-2 mt-2"><span className="font-semibold">Gesamtstunden (Plus)</span><span className="font-semibold">{formatHoursAndMinutes(monthlyBalanceDetails.totalCredited, timeFormat)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Soll-Stunden</span><span>{formatHoursAndMinutes(monthlyBalanceDetails.targetHours, timeFormat)}</span></div>
                        
                        {/* --- Balance Summary --- */}
                        <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="font-bold">Monatssaldo</span>
                            <span className={`font-bold ${monthlyBalanceDetails.monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatHoursAndMinutes(monthlyBalanceDetails.monthlyBalance, timeFormat)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Übertrag Vormonat</span>
                            <span className="font-semibold">{formatHoursAndMinutes(monthlyBalanceDetails.previousBalance, timeFormat)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="font-bold text-lg">Saldo Monatsende</span>
                            <span className={`font-bold text-lg ${monthlyBalanceDetails.endOfMonthBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                {formatHoursAndMinutes(monthlyBalanceDetails.endOfMonthBalance, timeFormat)}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsVacationOpen(!isVacationOpen)} aria-expanded={isVacationOpen} aria-controls="vacation-details">
                    <h2 className="text-xl font-bold">Urlaubsübersicht</h2>
                    <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${isVacationOpen ? 'rotate-180' : ''}`} />
                </div>
                <div id="vacation-details" className={`transition-all duration-300 ease-in-out overflow-hidden ${isVacationOpen ? 'max-h-[500px] mt-4' : 'max-h-0 mt-0'}`}>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Jahresanspruch</span><span className="font-semibold">{monthlyVacationDetails.annualEntitlement} Tage</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Resturlaub Vorjahr</span><span className="font-semibold">{monthlyVacationDetails.carryover} Tage</span></div>
                        <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold">Gesamt verfügbar</span><span className="font-bold">{monthlyVacationDetails.totalAvailable} Tage</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Genommen (bis Vormonat)</span><span className="font-semibold">{monthlyVacationDetails.vacationTakenBeforeThisMonth > 0 && '- '}{monthlyVacationDetails.vacationTakenBeforeThisMonth} Tage</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Genommen (diesen Monat)</span><span className="font-semibold">{monthlyVacationDetails.vacationTakenThisMonth > 0 && '- '}{monthlyVacationDetails.vacationTakenThisMonth} Tage</span></div>
                        <div className="flex justify-between"><span className="text-yellow-600">Beantragt (diesen Monat)</span><span className="font-semibold text-yellow-600">{monthlyVacationDetails.pendingThisMonth > 0 && '- '}{monthlyVacationDetails.pendingThisMonth} Tage</span></div>
                        <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold text-green-600">Verbleibend (am Monatsende)</span><span className="font-bold text-green-600">{monthlyVacationDetails.remainingAtEndOfMonth} Tage</span></div>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsRequestsOpen(!isRequestsOpen)} aria-expanded={isRequestsOpen} aria-controls="requests-details">
                    <h2 className="text-xl font-bold">Meine Anträge</h2>
                    <ChevronDownIcon className={`h-6 w-6 text-gray-400 transition-transform duration-300 ${isRequestsOpen ? 'rotate-180' : ''}`} />
                </div>
                <div id="requests-details" className={`transition-all duration-300 ease-in-out overflow-hidden ${isRequestsOpen ? 'max-h-[1000px] mt-4' : 'max-h-0 mt-0'}`}>
                    <div className="space-y-6">
                      {sortedYears.length > 0 ? sortedYears.map(year => (
                        <div key={year} className="space-y-4 pt-4 border-t first:border-t-0 first:pt-0">
                          <h3 className="text-lg font-bold text-gray-800">{year}</h3>
                          <div className="space-y-3">
                            {groupedRequests[year].map(req => {
                              const dayPortionText = req.dayPortion === 'am' ? ' (Vormittags)' : req.dayPortion === 'pm' ? ' (Nachmittags)' : '';
                              const dateText = req.startDate === req.endDate
                                  ? `${new Date(req.startDate).toLocaleDateString('de-DE')}${dayPortionText}`
                                  : `${new Date(req.startDate).toLocaleDateString('de-DE')} - ${new Date(req.endDate).toLocaleDateString('de-DE')}`;
                              return (
                                <div key={req.id} className="p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="font-semibold">{getAbsenceStyle(req.type).label}</p>
                                      <p className="text-sm text-gray-600">{dateText}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      {getStatusChip(req.status)}
                                      {req.status==='pending' && (<Button onClick={()=>setRequestToRetract(req)} className="text-xs bg-gray-500 hover:bg-gray-600 px-2 py-1">Zurückziehen</Button>)}
                                    </div>
                                  </div>
                                  {req.adminComment && req.status!=='pending' && (<p className="mt-2 pt-2 border-t text-sm italic"><span className="font-medium not-italic text-gray-700">Kommentar:</span> "{req.adminComment}"</p>)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-gray-500 py-4">Keine Anträge vorhanden.</p>
                      )}
                    </div>
                </div>
            </Card>

            <Card onClick={() => setIsExportModalOpen(true)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Meine Stundenzettel</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Monatsübersicht als Excel- oder PDF-Datei herunterladen</p>
                    </div>
                    <DocumentArrowDownIcon className="h-6 w-6 text-blue-600" />
                </div>
            </Card>

            <TimesheetExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onConfirm={handleConfirmExport} employees={[currentUser]} fixedEmployee={currentUser} />
            <ConfirmModal isOpen={!!requestToRetract} onClose={() => setRequestToRetract(null)} onConfirm={() => { if(requestToRetract) { onRetractAbsenceRequest(requestToRetract.id); setRequestToRetract(null); }}} title="Antrag zurückziehen" message="Möchten Sie diesen Antrag wirklich zurückziehen?" confirmText="Ja, zurückziehen" />
        </div>
    );
};