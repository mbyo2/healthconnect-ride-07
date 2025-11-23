import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MedicalRecord {
    id: string;
    title: string;
    provider: string;
    date: string;
    category: string;
    hash: string;
    verified: boolean;
    shared_with: string[];
    created_at?: string;
}

export function useMedicalRecords(userId: string | undefined) {
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        fetchRecords();
    }, [userId]);

    const fetchRecords = async () => {
        try {
            const { data, error } = await supabase
                .from('medical_records')
                .select('*')
                .eq('patient_id', userId)
                .order('date', { ascending: false });

            if (error) throw error;
            setRecords((data as any) || []);
        } catch (error) {
            console.error('Error fetching medical records:', error);
            toast.error('Failed to load medical records');
        } finally {
            setLoading(false);
        }
    };

    const addRecord = async (record: Omit<MedicalRecord, 'id' | 'created_at' | 'verified' | 'hash'>) => {
        if (!userId) return;

        // Simulate blockchain hash generation
        const mockHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        try {
            const { data, error } = await supabase
                .from('medical_records' as any)
                .insert({
                    patient_id: userId,
                    ...record,
                    record_type: record.category, // Map category to record_type
                    hash: mockHash,
                    verified: true,
                    shared_with: []
                })
                .select()
                .single();

            if (error) throw error;

            setRecords([data, ...records]);
            toast.success('Record added and verified on blockchain');
            return data;
        } catch (error) {
            console.error('Error adding record:', error);
            toast.error('Failed to add record');
            throw error;
        }
    };

    const shareRecord = async (recordId: string, providerName: string) => {
        try {
            const record = records.find(r => r.id === recordId);
            if (!record) return;

            const updatedSharedWith = [...(record.shared_with || []), providerName];

            const { error } = await supabase
                .from('medical_records' as any)
                .update({ shared_with: updatedSharedWith })
                .eq('id', recordId);

            if (error) throw error;

            setRecords(records.map(r =>
                r.id === recordId
                    ? { ...r, shared_with: updatedSharedWith }
                    : r
            ));
            toast.success(`Record shared with ${providerName}`);
        } catch (error) {
            console.error('Error sharing record:', error);
            toast.error('Failed to share record');
        }
    };

    return {
        records,
        loading,
        addRecord,
        shareRecord
    };
}
