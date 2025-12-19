
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useCurrency = () => {
    const { user } = useAuth();
    const [currency, setCurrency] = useState('ZMW');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrency = async () => {
            if (!user) return;

            try {
                // First check if user is an institution admin
                const { data: inst } = await supabase
                    .from('healthcare_institutions')
                    .select('currency')
                    .eq('admin_id', user.id)
                    .maybeSingle();

                if (inst?.currency) {
                    setCurrency(inst.currency);
                } else {
                    // If not an admin, check if they are personnel
                    const { data: personnel } = await supabase
                        .from('institution_personnel')
                        .select('institution_id')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (personnel?.institution_id) {
                        const { data: instData } = await supabase
                            .from('healthcare_institutions')
                            .select('currency')
                            .eq('id', personnel.institution_id)
                            .maybeSingle();

                        if (instData?.currency) {
                            setCurrency(instData.currency);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching currency:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrency();
    }, [user]);

    const formatPrice = (amount: number) => {
        const symbol = currency === 'USD' ? '$' : 'K';
        return `${symbol}${amount.toLocaleString()}`;
    };

    return { currency, formatPrice, loading };
};
