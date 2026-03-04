import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Plus, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export const DietManagement = ({ hospital }: { hospital: any }) => {
  const [mealTime, setMealTime] = useState('lunch');

  const patients = [
    { id: 1, name: 'John Mwale', bed: 'W1-B3', dept: 'General Medicine', diet: 'Diabetic', restrictions: ['No Sugar', 'Low Carb'], meal: 'served', allergies: 'None' },
    { id: 2, name: 'Mary Phiri', bed: 'W2-B1', dept: 'Surgery', diet: 'Soft/Liquid', restrictions: ['Post-Op Day 1'], meal: 'pending', allergies: 'Peanuts' },
    { id: 3, name: 'Grace Banda', bed: 'ICU-B2', dept: 'ICU', diet: 'Nil By Mouth (NBM)', restrictions: ['NPO'], meal: 'skipped', allergies: 'None' },
    { id: 4, name: 'Peter Zulu', bed: 'W3-B5', dept: 'Orthopedics', diet: 'Regular High Protein', restrictions: ['High Protein'], meal: 'pending', allergies: 'Shellfish' },
    { id: 5, name: 'David Mumba', bed: 'W1-B7', dept: 'Cardiology', diet: 'Cardiac (Low Salt)', restrictions: ['Low Sodium', 'Low Fat'], meal: 'served', allergies: 'None' },
    { id: 6, name: 'Sarah Tembo', bed: 'W4-B2', dept: 'Obstetrics', diet: 'Regular + Iron Rich', restrictions: ['Iron Supplement'], meal: 'pending', allergies: 'None' },
  ];

  const stats = {
    total: patients.length,
    served: patients.filter(p => p.meal === 'served').length,
    pending: patients.filter(p => p.meal === 'pending').length,
    special: patients.filter(p => p.diet !== 'Regular').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Diet & Nutrition Management</h3>
          <p className="text-sm text-muted-foreground">Patient dietary plans, meal tracking & allergy management</p>
        </div>
        <div className="flex gap-2">
          <Select value={mealTime} onValueChange={setMealTime}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Diet Plan</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Utensils className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Patients</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.served}</p>
          <p className="text-xs text-muted-foreground">Served</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.special}</p>
          <p className="text-xs text-muted-foreground">Special Diets</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {patients.map(p => (
          <Card key={p.id} className={p.diet === 'Nil By Mouth (NBM)' ? 'border-destructive/30' : p.allergies !== 'None' ? 'border-amber-500/30' : ''}>
            <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">{p.bed}</Badge>
                  <Badge variant={p.meal === 'served' ? 'default' : p.meal === 'skipped' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{p.meal}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.dept} • Diet: <strong className="text-foreground">{p.diet}</strong></p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.restrictions.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                  {p.allergies !== 'None' && <Badge variant="destructive" className="text-[10px]">⚠ Allergy: {p.allergies}</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                {p.meal === 'pending' && <Button size="sm" className="text-xs">Mark Served</Button>}
                <Button size="sm" variant="outline" className="text-xs">Edit Diet</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
