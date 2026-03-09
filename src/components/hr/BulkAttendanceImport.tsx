import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { toast } from 'sonner';

interface ParsedRecord {
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  clock_in?: string;
  clock_out?: string;
  notes?: string;
  valid: boolean;
  error?: string;
}

export const BulkAttendanceImport: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { institutionId } = useInstitutionAffiliation();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): ParsedRecord[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const records: ParsedRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: ParsedRecord = {
        staff_id: '',
        date: '',
        status: 'present',
        valid: true,
      };

      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        switch (header) {
          case 'staff_id':
          case 'employee_id':
            record.staff_id = value;
            break;
          case 'date':
            record.date = value;
            break;
          case 'status':
            if (['present', 'absent', 'late', 'half_day', 'on_leave'].includes(value.toLowerCase())) {
              record.status = value.toLowerCase() as ParsedRecord['status'];
            }
            break;
          case 'clock_in':
          case 'time_in':
            record.clock_in = value;
            break;
          case 'clock_out':
          case 'time_out':
            record.clock_out = value;
            break;
          case 'notes':
            record.notes = value;
            break;
        }
      });

      // Validate
      if (!record.staff_id) {
        record.valid = false;
        record.error = 'Missing staff_id';
      } else if (!record.date || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        record.valid = false;
        record.error = 'Invalid date format (use YYYY-MM-DD)';
      }

      records.push(record);
    }

    return records;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setParsedData(parsed);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!institutionId || parsedData.length === 0) return;

    const validRecords = parsedData.filter(r => r.valid);
    if (validRecords.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    setImporting(true);
    let success = 0;
    let failed = 0;

    try {
      for (const record of validRecords) {
        const { error } = await supabase
          .from('staff_attendance')
          .upsert({
            institution_id: institutionId,
            staff_id: record.staff_id,
            date: record.date,
            status: record.status,
            clock_in: record.clock_in ? `${record.date}T${record.clock_in}` : null,
            clock_out: record.clock_out ? `${record.date}T${record.clock_out}` : null,
            notes: record.notes || null,
          } as any, { onConflict: 'institution_id,staff_id,date' });

        if (error) {
          failed++;
        } else {
          success++;
        }
      }

      setImportResult({ success, failed });
      if (success > 0) {
        toast.success(`Imported ${success} attendance records`);
        onComplete();
      }
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `staff_id,date,status,clock_in,clock_out,notes
emp-001,2024-03-09,present,08:00,17:00,
emp-002,2024-03-09,late,09:30,17:00,Traffic delay
emp-003,2024-03-09,absent,,,Sick leave`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Attendance Import
        </CardTitle>
        <CardDescription>
          Upload a CSV file to import multiple attendance records at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="mt-6">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {parsedData.length > 0 && (
          <>
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{validCount} valid</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">{invalidCount} invalid</span>
                </div>
              )}
            </div>

            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="font-medium mb-2">Invalid records:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {parsedData.filter(r => !r.valid).slice(0, 5).map((r, i) => (
                      <li key={i}>Row {i + 2}: {r.error}</li>
                    ))}
                    {invalidCount > 5 && <li>...and {invalidCount - 5} more</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="max-h-[200px] overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Staff ID</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Clock In</th>
                    <th className="p-2 text-left">Clock Out</th>
                    <th className="p-2 text-left">Valid</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 20).map((record, idx) => (
                    <tr key={idx} className={record.valid ? '' : 'bg-destructive/10'}>
                      <td className="p-2 font-mono text-xs">{record.staff_id || '-'}</td>
                      <td className="p-2">{record.date || '-'}</td>
                      <td className="p-2">{record.status}</td>
                      <td className="p-2">{record.clock_in || '-'}</td>
                      <td className="p-2">{record.clock_out || '-'}</td>
                      <td className="p-2">
                        {record.valid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {validCount} Records
                </>
              )}
            </Button>
          </>
        )}

        {importResult && (
          <Alert>
            <AlertDescription>
              Import complete: {importResult.success} succeeded, {importResult.failed} failed
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
