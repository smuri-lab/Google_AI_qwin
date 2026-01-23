import React, { useState, useMemo, useCallback } from 'react';
import type { TimeEntry, Customer, Activity, UserAccount, Employee, AbsenceRequest, Holiday, CompanySettings, HolidaysByYear, TimeBalanceAdjustment } from '../types';
import { Card } from './ui/Card';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { TimesheetExportModal } from './admin/TimesheetExportModal';
import { formatHoursAndMinutes, exportTimesheet, calculateBalance, getContractDetailsForDate } from './utils';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { Button } from './ui/Button';
import { ConfirmModal } from './ui/ConfirmModal';
import { AbsenceType } from '../types';

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
    const [isExportModalClosing, setIsExportModalClosing] = useState(false);
    const [balanceDate, setBalanceDate] = useState(new Date());
    const [requestToRetract, setRequestToRetract] = useState<AbsenceRequest | null>(null);

    const timeFormat = companySettings.employeeTimeFormat || 'hoursMinutes';
    const currentYear = new Date().getFullYear();

    const pendingVacationDays = useMemo(() => {
        const holidaysForYear = holidaysByYear[currentYear] || [];
        const holidayDates = new Set(holidaysForYear.map(h => h.date));
        
        const pendingRequests = absenceRequests.filter(r => r.type === AbsenceType.Vacation && r.status === 'pending');
        let totalDays = 0;
        
        for (const req of pendingRequests) {
            const loopDate = new Date(req.startDate);
            const endDate = new Date(req.endDate);
            while(loopDate <= endDate) {
                const dayOfWeek = loopDate.getDay();
                const dateString = loopDate.toLocaleDateString('sv-SE');
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateString)) {
                    if (req.dayPortion && req.dayPortion !== 'full') {
                        totalDays += 0.5;
                    } else {
                        totalDays += 1;
                    }
                }
                loopDate.setDate(loopDate.getDate() + 1);
            }
        }
        return totalDays;
    }, [absenceRequests, holidaysByYear, currentYear]);

    const monthlyBalanceDetails = useMemo(() => {
        const year = balanceDate.getFullYear();
        const month = balanceDate.getMonth();
        onEnsureHolidaysForYear(year);
        if (month === 0) onEnsureHolidaysForYear(year - 1);
        
        const holidaysForYear = holidaysByYear[year] || [];
        const holidayDates = new Set(holidaysForYear.map(h => h.date));
        
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const prevMonthEnd = new Date(year, month, 0);
        
        const previousBalance = calculateBalance(currentUser, prevMonthEnd, timeEntries, absenceRequests, timeBalanceAdjustments, holidaysByYear);
        
        const workedHoursThisMonth = timeEntries
            .filter(e => new Date(e.start) >= monthStart && new Date(e.start) <= monthEnd)
            .reduce((sum, e) => sum + ((new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000 - (e.breakDurationMinutes / 60)), 0);

        let absenceHolidayCreditHoursThisMonth = 0;
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const contract = getContractDetailsForDate(currentUser, d);
            const dayOfWeek = d.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            const dateString = d.toLocaleDateString('sv-SE');
            const isHoliday = holidayDates.has(dateString);
            const absence = absenceRequests.find(r => r.status === 'approved' && dateString >= r.startDate && dateString <= r.endDate);

            if(isHoliday || (absence && (absence.type === AbsenceType.Vacation || absence.type === AbsenceType.SickLeave))) {
                absenceHolidayCreditHoursThisMonth += contract.dailyTargetHours;
            }
        }

        const totalCreditedHours = workedHoursThisMonth + absenceHolidayCreditHoursThisMonth;
        const contract = getContractDetailsForDate(currentUser, monthStart);
        const targetHours = contract.monthlyTargetHours;
        const monthlyBalance = totalCreditedHours - targetHours;
        const endOfMonthBalance = previousBalance + monthlyBalance;

        return {
            previousBalance,
            workedHours: workedHoursThisMonth,
            absenceHolidayCredit: absenceHolidayCreditHoursThisMonth,
            totalCredited: totalCreditedHours,
            targetHours,
            monthlyBalance,
            endOfMonthBalance
        };
    }, [balanceDate, currentUser, timeEntries, absenceRequests, timeBalanceAdjustments, holidaysByYear, onEnsureHolidaysForYear]);
    
    const changeBalanceMonth = (offset: number) => {
        setBalanceDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const handleConfirmExport = (selectedEmployees: Employee[], year: number, selectedMonths: number[]) => {
      selectedMonths.forEach(month => {
          exportTimesheet({
              employee: currentUser, year, month,
              allTimeEntries: timeEntries,
              allAbsenceRequests: absenceRequests,
              customers, activities,
              selectedState,
              companySettings,
              holidays: holidaysByYear[year] || [],
              timeFormat,
          });
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
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card>
                <h2 className="text-xl font-bold mb-4">Urlaubsübersicht {currentYear}</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Jahresanspruch</span><span className="font-semibold">{userAccount.vacationAnnualEntitlement || 0} Tage</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Resturlaub Vorjahr</span><span className="font-semibold">{userAccount.vacationCarryover || 0} Tage</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold">Gesamt verfügbar</span><span className="font-bold">{ (userAccount.vacationAnnualEntitlement || 0) + (userAccount.vacationCarryover || 0) } Tage</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Genommen (genehmigt)</span><span className="font-semibold">- { ((userAccount.vacationAnnualEntitlement || 0) + (userAccount.vacationCarryover || 0)) - userAccount.vacationDaysLeft } Tage</span></div>
                    <div className="flex justify-between"><span className="text-yellow-600">Beantragt (ausstehend)</span><span className="font-semibold text-yellow-600">- {pendingVacationDays} Tage</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold text-green-600">Verbleibend</span><span className="font-bold text-green-600">{userAccount.vacationDaysLeft} Tage</span></div>
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeBalanceMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5"/></button>
                    <h2 className="text-xl font-bold text-center">Stundenkonto {balanceDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => changeBalanceMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon className="h-5 w-5"/></button>
                </div>
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Übertrag Vormonat</span><span className="font-semibold">{formatHoursAndMinutes(monthlyBalanceDetails.previousBalance, timeFormat)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Gearbeitete Stunden</span><span>{formatHoursAndMinutes(monthlyBalanceDetails.workedHours, timeFormat)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Gutschrift (Urlaub, Krank, Feiertag)</span><span>{formatHoursAndMinutes(monthlyBalanceDetails.absenceHolidayCredit, timeFormat)}</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span className="font-semibold">Gesamtstunden (Plus)</span><span className="font-semibold">{formatHoursAndMinutes(monthlyBalanceDetails.totalCredited, timeFormat)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Soll-Stunden</span><span>{formatHoursAndMinutes(monthlyBalanceDetails.targetHours, timeFormat)}</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-bold">Monatssaldo</span>
                        <span className={`font-bold ${monthlyBalanceDetails.monthlyBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatHoursAndMinutes(monthlyBalanceDetails.monthlyBalance, timeFormat)}</span>
                    </div>
                    <div className="flex justify-between"><span className="font-bold">Saldo Monatsende</span><span className="font-bold">{formatHoursAndMinutes(monthlyBalanceDetails.endOfMonthBalance, timeFormat)}</span></div>
                </div>
            </Card>
            
            <Card onClick={() => setIsExportModalOpen(true)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-700">Meine Stundenzettel</h3>
                        <p className="text-xs sm:text-sm text-gray-500">Monatsübersicht als Excel-Datei herunterladen</p>
                    </div>
                    <DocumentArrowDownIcon className="h-6 w-6 text-blue-600" />
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold mb-4">Meine Anträge</h2>
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
            </Card>

            <TimesheetExportModal isOpen={isExportModalOpen} isClosing={isExportModalClosing} onClose={() => setIsExportModalOpen(false)} onConfirm={handleConfirmExport} employees={[currentUser]} fixedEmployee={currentUser} />
            <ConfirmModal isOpen={!!requestToRetract} onClose={() => setRequestToRetract(null)} onConfirm={() => { if(requestToRetract) { onRetractAbsenceRequest(requestToRetract.id); setRequestToRetract(null); }}} title="Antrag zurückziehen" message="Möchten Sie diesen Antrag wirklich zurückziehen?" confirmText="Ja, zurückziehen" />
        </div>
    );
};