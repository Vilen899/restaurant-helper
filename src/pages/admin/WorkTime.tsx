import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Clock, Download, Users, Calendar, Timer, DollarSign, CalendarRange } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import * as XLSX from 'xlsx';

interface Shift {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number | null;
  notes: string | null;
  location: { name: string } | null;
  profile: { full_name: string; hourly_rate: number | null } | null;
}

interface StaffSummary {
  user_id: string;
  full_name: string;
  hourly_rate: number;
  total_hours: number;
  total_shifts: number;
  total_earnings: number;
}

export default function WorkTimePage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [useCustomRange, setUseCustomRange] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedLocation, dateFrom, dateTo, useCustomRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (useCustomRange && dateFrom && dateTo) {
        startDate = dateFrom;
        endDate = dateTo;
      } else {
        startDate = startOfMonth(new Date(selectedMonth + '-01'));
        endDate = endOfMonth(startDate);
      }

      let query = supabase
        .from('shifts')
        .select('*, location:locations(name)')
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .order('started_at', { ascending: false });

      if (selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }

      const [shiftsRes, locationsRes, profilesRes] = await Promise.all([
        query,
        supabase.from('locations').select('id, name').eq('is_active', true),
        supabase.from('profiles').select('id, full_name, hourly_rate'),
      ]);

      // Merge profiles with shifts
      const shiftsWithProfiles = (shiftsRes.data || []).map(shift => {
        const profile = profilesRes.data?.find(p => p.id === shift.user_id);
        return {
          ...shift,
          profile: profile ? { full_name: profile.full_name, hourly_rate: profile.hourly_rate } : null,
        };
      });

      setShifts(shiftsWithProfiles as Shift[]);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const calculateShiftHours = (shift: Shift): number => {
    if (!shift.ended_at) return 0;
    const minutes = differenceInMinutes(new Date(shift.ended_at), new Date(shift.started_at));
    const breakMinutes = shift.break_minutes || 0;
    return Math.max(0, (minutes - breakMinutes) / 60);
  };

  const staffSummaries: StaffSummary[] = shifts.reduce((acc, shift) => {
    const existing = acc.find(s => s.user_id === shift.user_id);
    const hours = calculateShiftHours(shift);
    const rate = shift.profile?.hourly_rate || 0;

    if (existing) {
      existing.total_hours += hours;
      existing.total_shifts += 1;
      existing.total_earnings = existing.total_hours * existing.hourly_rate;
    } else {
      acc.push({
        user_id: shift.user_id,
        full_name: shift.profile?.full_name || 'Неизвестно',
        hourly_rate: rate,
        total_hours: hours,
        total_shifts: 1,
        total_earnings: hours * rate,
      });
    }
    return acc;
  }, [] as StaffSummary[]);

  const totalHours = staffSummaries.reduce((sum, s) => sum + s.total_hours, 0);
  const totalEarnings = staffSummaries.reduce((sum, s) => sum + s.total_earnings, 0);

  const exportToExcel = () => {
    const data = shifts.map(s => ({
      'Сотрудник': s.profile?.full_name || '',
      'Точка': s.location?.name || '',
      'Начало': format(new Date(s.started_at), 'dd.MM.yyyy HH:mm'),
      'Конец': s.ended_at ? format(new Date(s.ended_at), 'dd.MM.yyyy HH:mm') : 'Открыта',
      'Перерыв (мин)': s.break_minutes || 0,
      'Часов': calculateShiftHours(s).toFixed(2),
      'Ставка': s.profile?.hourly_rate || 0,
      'Начислено': (calculateShiftHours(s) * (s.profile?.hourly_rate || 0)).toFixed(0),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Время работы');
    XLSX.writeFile(wb, `worktime_${selectedMonth}.xlsx`);
    toast.success('Экспорт завершён');
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'LLLL yyyy', { locale: ru }),
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Учёт рабочего времени"
        description="Смены и отработанные часы сотрудников"
        onRefresh={fetchData}
        loading={loading}
        actions={
          <Button onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт Excel
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Всего смен" value={shifts.length} icon={Calendar} />
        <StatCard title="Сотрудников" value={staffSummaries.length} icon={Users} variant="info" />
        <StatCard title="Отработано часов" value={totalHours.toFixed(1)} icon={Timer} variant="success" />
        <StatCard title="К выплате" value={`${totalEarnings.toLocaleString()} ֏`} icon={DollarSign} variant="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant={useCustomRange ? "outline" : "default"} 
            size="sm"
            onClick={() => setUseCustomRange(false)}
          >
            По месяцу
          </Button>
          <Button 
            variant={useCustomRange ? "default" : "outline"} 
            size="sm"
            onClick={() => setUseCustomRange(true)}
          >
            <CalendarRange className="h-4 w-4 mr-2" />
            По датам
          </Button>
        </div>

        {!useCustomRange ? (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-36">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateFrom ? format(dateFrom, 'dd.MM.yyyy') : 'С даты'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-36">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dateTo ? format(dateTo, 'dd.MM.yyyy') : 'По дату'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Все точки" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все точки</SelectItem>
            {locations.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Staff Summary */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Сводка по сотрудникам</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Смен</TableHead>
                <TableHead>Часов</TableHead>
                <TableHead>Ставка</TableHead>
                <TableHead>К выплате</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffSummaries.map(staff => (
                <TableRow key={staff.user_id}>
                  <TableCell className="font-medium">{staff.full_name}</TableCell>
                  <TableCell>{staff.total_shifts}</TableCell>
                  <TableCell>{staff.total_hours.toFixed(1)} ч</TableCell>
                  <TableCell>{staff.hourly_rate} ֏/ч</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {staff.total_earnings.toLocaleString()} ֏
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Shifts */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Детализация смен</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Точка</TableHead>
                <TableHead>Начало</TableHead>
                <TableHead>Конец</TableHead>
                <TableHead>Перерыв</TableHead>
                <TableHead>Часов</TableHead>
                <TableHead>Начислено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map(shift => {
                const hours = calculateShiftHours(shift);
                const earnings = hours * (shift.profile?.hourly_rate || 0);
                return (
                  <TableRow key={shift.id}>
                    <TableCell>{format(new Date(shift.started_at), 'dd.MM.yy')}</TableCell>
                    <TableCell className="font-medium">{shift.profile?.full_name}</TableCell>
                    <TableCell>{shift.location?.name || '—'}</TableCell>
                    <TableCell>{format(new Date(shift.started_at), 'HH:mm')}</TableCell>
                    <TableCell>
                      {shift.ended_at ? format(new Date(shift.ended_at), 'HH:mm') : (
                        <Badge variant="secondary">Открыта</Badge>
                      )}
                    </TableCell>
                    <TableCell>{shift.break_minutes || 0} мин</TableCell>
                    <TableCell>{hours.toFixed(1)} ч</TableCell>
                    <TableCell className="font-semibold">{earnings.toLocaleString()} ֏</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
