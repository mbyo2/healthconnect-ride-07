import React, { useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Edit3, Plus, Save, Search, Tag, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { supabase } from "@/integrations/supabase/client";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

export interface ServiceTariff {
  id: string;
  code: string;
  name: string;
  category: "opd" | "lab" | "radiology" | "dental" | "surgery" | "pharmacy" | "ward" | "emergency" | "other";
  department: string;
  basePrice: number;
  costPrice?: number;
  insurancePrice?: number;
  isAvailable: boolean;
}

/**
 * Comprehensive Zambian private-healthcare starter charge book.
 * Researched 2026-10-17 (see workspace/goals/doc0clock-clinic-launch/files/
 * zambia-hospital-tariff-research.md): NHIMA tariff anchors, mymedicplus
 * bands, regional proxies. Prices are Kwacha defaults — institutions
 * override them to their own fees. Loaded per-institution via the
 * "Load starter tariffs" button (upsert on institution_id + code).
 */
const DEFAULT_TARIFFS: ServiceTariff[] = [
  // ── OPD consultations ──
  { id: "T-OPD-01", code: "OPD-GP-NEW", name: "GP Consultation — New Patient", category: "opd", department: "Outpatient (OPD)", basePrice: 300, costPrice: 60, insurancePrice: 350, isAvailable: true },
  { id: "T-OPD-02", code: "OPD-GP-FOLLOW", name: "GP Consultation — Follow-up", category: "opd", department: "Outpatient (OPD)", basePrice: 200, costPrice: 40, insurancePrice: 230, isAvailable: true },
  { id: "T-OPD-03", code: "OPD-GP-NIGHT", name: "GP Consultation — After Hours", category: "opd", department: "Outpatient (OPD)", basePrice: 450, costPrice: 90, insurancePrice: 520, isAvailable: true },
  { id: "T-OPD-04", code: "OPD-SPEC-GEN", name: "Specialist Consultation — New", category: "opd", department: "Outpatient (OPD)", basePrice: 700, costPrice: 140, insurancePrice: 800, isAvailable: true },
  { id: "T-OPD-05", code: "OPD-SPEC-FOLLOW", name: "Specialist Consultation — Follow-up", category: "opd", department: "Outpatient (OPD)", basePrice: 450, costPrice: 90, insurancePrice: 520, isAvailable: true },
  { id: "T-OPD-06", code: "OPD-CARDIO", name: "Cardiologist Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 800, costPrice: 160, insurancePrice: 920, isAvailable: true },
  { id: "T-OPD-07", code: "OPD-NEURO", name: "Neurologist Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 800, costPrice: 160, insurancePrice: 920, isAvailable: true },
  { id: "T-OPD-08", code: "OPD-ORTHO", name: "Orthopaedic Surgeon Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 750, costPrice: 150, insurancePrice: 860, isAvailable: true },
  { id: "T-OPD-09", code: "OPD-DERM", name: "Dermatologist Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 700, costPrice: 140, insurancePrice: 800, isAvailable: true },
  { id: "T-OPD-10", code: "OPD-ENT", name: "ENT Specialist Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 700, costPrice: 140, insurancePrice: 800, isAvailable: true },
  { id: "T-OPD-11", code: "OPD-EYE", name: "Ophthalmologist Consultation", category: "opd", department: "Eye Clinic", basePrice: 650, costPrice: 130, insurancePrice: 750, isAvailable: true },
  { id: "T-OPD-12", code: "OPD-OBGYN", name: "Obstetrician / Gynaecologist Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 700, costPrice: 140, insurancePrice: 800, isAvailable: true },
  { id: "T-OPD-13", code: "OPD-PSYCH", name: "Psychiatrist Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 750, costPrice: 150, insurancePrice: 860, isAvailable: true },
  { id: "T-OPD-14", code: "OPD-DENTAL", name: "Dental Consultation", category: "opd", department: "Dental Clinic", basePrice: 250, costPrice: 50, insurancePrice: 290, isAvailable: true },
  { id: "T-OPD-15", code: "OPD-PHYSIO", name: "Physiotherapy Initial Assessment", category: "opd", department: "Physiotherapy", basePrice: 400, costPrice: 80, insurancePrice: 460, isAvailable: true },
  { id: "T-OPD-16", code: "OPD-DIET", name: "Dietician / Nutrition Consultation", category: "opd", department: "Outpatient (OPD)", basePrice: 350, costPrice: 70, insurancePrice: 400, isAvailable: true },
  // ── Emergency / casualty ──
  { id: "T-EMG-01", code: "EMG-CONSULT", name: "Casualty / Emergency Consultation", category: "emergency", department: "Casualty", basePrice: 500, costPrice: 100, insurancePrice: 580, isAvailable: true },
  { id: "T-EMG-02", code: "EMG-RESUS", name: "Resuscitation (per episode)", category: "emergency", department: "Casualty", basePrice: 2500, costPrice: 600, insurancePrice: 2900, isAvailable: true },
  { id: "T-EMG-03", code: "EMG-OBS", name: "Emergency Observation — per hour", category: "emergency", department: "Casualty", basePrice: 300, costPrice: 70, insurancePrice: 350, isAvailable: true },
  { id: "T-EMG-04", code: "EMG-OBS-DAY", name: "Emergency Observation — per 24h", category: "emergency", department: "Casualty", basePrice: 2000, costPrice: 480, insurancePrice: 2300, isAvailable: true },
  { id: "T-EMG-05", code: "EMG-SUTURE", name: "Wound Suturing — Minor", category: "emergency", department: "Casualty", basePrice: 800, costPrice: 190, insurancePrice: 920, isAvailable: true },
  { id: "T-EMG-06", code: "EMG-SUTURE-MAJ", name: "Wound Suturing — Major", category: "emergency", department: "Casualty", basePrice: 1800, costPrice: 430, insurancePrice: 2100, isAvailable: true },
  { id: "T-EMG-07", code: "EMG-PLASTER", name: "Plaster of Paris — Limb", category: "emergency", department: "Casualty", basePrice: 1200, costPrice: 290, insurancePrice: 1400, isAvailable: true },
  { id: "T-EMG-08", code: "EMG-SPLINT", name: "Splinting / Backslab", category: "emergency", department: "Casualty", basePrice: 600, costPrice: 140, insurancePrice: 690, isAvailable: true },
  // ── Radiology: X-ray ──
  { id: "T-RAD-01", code: "RAD-XR-CHEST", name: "X-Ray — Chest", category: "radiology", department: "Radiology & Imaging", basePrice: 400, costPrice: 95, insurancePrice: 460, isAvailable: true },
  { id: "T-RAD-02", code: "RAD-XR-SKULL", name: "X-Ray — Skull", category: "radiology", department: "Radiology & Imaging", basePrice: 450, costPrice: 110, insurancePrice: 520, isAvailable: true },
  { id: "T-RAD-03", code: "RAD-XR-SINUS", name: "X-Ray — Paranasal Sinuses", category: "radiology", department: "Radiology & Imaging", basePrice: 450, costPrice: 110, insurancePrice: 520, isAvailable: true },
  { id: "T-RAD-04", code: "RAD-XR-CSPINE", name: "X-Ray — Cervical Spine", category: "radiology", department: "Radiology & Imaging", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  { id: "T-RAD-05", code: "RAD-XR-TSPINE", name: "X-Ray — Thoracic Spine", category: "radiology", department: "Radiology & Imaging", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  { id: "T-RAD-06", code: "RAD-XR-LSPINE", name: "X-Ray — Lumbosacral Spine", category: "radiology", department: "Radiology & Imaging", basePrice: 550, costPrice: 130, insurancePrice: 630, isAvailable: true },
  { id: "T-RAD-07", code: "RAD-XR-SPINE-WHOLE", name: "X-Ray — Whole Spine Series", category: "radiology", department: "Radiology & Imaging", basePrice: 1200, costPrice: 290, insurancePrice: 1400, isAvailable: true },
  { id: "T-RAD-08", code: "RAD-XR-SHOULDER", name: "X-Ray — Shoulder", category: "radiology", department: "Radiology & Imaging", basePrice: 400, costPrice: 95, insurancePrice: 460, isAvailable: true },
  { id: "T-RAD-09", code: "RAD-XR-ARM", name: "X-Ray — Humerus / Forearm", category: "radiology", department: "Radiology & Imaging", basePrice: 400, costPrice: 95, insurancePrice: 460, isAvailable: true },
  { id: "T-RAD-10", code: "RAD-XR-ELBOW", name: "X-Ray — Elbow", category: "radiology", department: "Radiology & Imaging", basePrice: 350, costPrice: 85, insurancePrice: 400, isAvailable: true },
  { id: "T-RAD-11", code: "RAD-XR-WRIST", name: "X-Ray — Wrist / Hand", category: "radiology", department: "Radiology & Imaging", basePrice: 350, costPrice: 85, insurancePrice: 400, isAvailable: true },
  { id: "T-RAD-12", code: "RAD-XR-PELVIS", name: "X-Ray — Pelvis", category: "radiology", department: "Radiology & Imaging", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  { id: "T-RAD-13", code: "RAD-XR-HIP", name: "X-Ray — Hip", category: "radiology", department: "Radiology & Imaging", basePrice: 450, costPrice: 110, insurancePrice: 520, isAvailable: true },
  { id: "T-RAD-14", code: "RAD-XR-KNEE", name: "X-Ray — Knee", category: "radiology", department: "Radiology & Imaging", basePrice: 400, costPrice: 95, insurancePrice: 460, isAvailable: true },
  { id: "T-RAD-15", code: "RAD-XR-LEG", name: "X-Ray — Femur / Tibia-Fibula", category: "radiology", department: "Radiology & Imaging", basePrice: 450, costPrice: 110, insurancePrice: 520, isAvailable: true },
  { id: "T-RAD-16", code: "RAD-XR-ANKLE", name: "X-Ray — Ankle / Foot", category: "radiology", department: "Radiology & Imaging", basePrice: 350, costPrice: 85, insurancePrice: 400, isAvailable: true },
  { id: "T-RAD-17", code: "RAD-XR-ABDOMEN", name: "X-Ray — Abdomen", category: "radiology", department: "Radiology & Imaging", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  { id: "T-RAD-18", code: "RAD-XR-IVU", name: "IVU / IVP (with contrast)", category: "radiology", department: "Radiology & Imaging", basePrice: 2500, costPrice: 600, insurancePrice: 2900, isAvailable: true },
  { id: "T-RAD-19", code: "RAD-XR-BARIUM", name: "Barium Swallow / Meal / Enema", category: "radiology", department: "Radiology & Imaging", basePrice: 2000, costPrice: 480, insurancePrice: 2300, isAvailable: true },
  { id: "T-RAD-20", code: "RAD-XR-HSG", name: "Hysterosalpingography (HSG)", category: "radiology", department: "Radiology & Imaging", basePrice: 2200, costPrice: 530, insurancePrice: 2500, isAvailable: true },
  // ── Radiology: ultrasound ──
  { id: "T-RAD-21", code: "RAD-US-ABDOMEN", name: "Ultrasound — Abdomen", category: "radiology", department: "Ultrasonography", basePrice: 700, costPrice: 170, insurancePrice: 800, isAvailable: true },
  { id: "T-RAD-22", code: "RAD-US-PELVIS", name: "Ultrasound — Pelvis", category: "radiology", department: "Ultrasonography", basePrice: 650, costPrice: 155, insurancePrice: 750, isAvailable: true },
  { id: "T-RAD-23", code: "RAD-US-ABDPEL", name: "Ultrasound — Abdomen + Pelvis", category: "radiology", department: "Ultrasonography", basePrice: 1000, costPrice: 240, insurancePrice: 1150, isAvailable: true },
  { id: "T-RAD-24", code: "RAD-US-OB-DATING", name: "Ultrasound — Obstetric Dating", category: "radiology", department: "Ultrasonography", basePrice: 600, costPrice: 145, insurancePrice: 690, isAvailable: true },
  { id: "T-RAD-25", code: "RAD-US-OB-ANOMALY", name: "Ultrasound — Obstetric Anomaly Scan", category: "radiology", department: "Ultrasonography", basePrice: 900, costPrice: 215, insurancePrice: 1050, isAvailable: true },
  { id: "T-RAD-26", code: "RAD-US-OB-GROWTH", name: "Ultrasound — Obstetric Growth / Doppler", category: "radiology", department: "Ultrasonography", basePrice: 800, costPrice: 190, insurancePrice: 920, isAvailable: true },
  { id: "T-RAD-27", code: "RAD-US-KUB", name: "Ultrasound — KUB", category: "radiology", department: "Ultrasonography", basePrice: 700, costPrice: 170, insurancePrice: 800, isAvailable: true },
  { id: "T-RAD-28", code: "RAD-US-THYROID", name: "Ultrasound — Thyroid / Neck", category: "radiology", department: "Ultrasonography", basePrice: 750, costPrice: 180, insurancePrice: 860, isAvailable: true },
  { id: "T-RAD-29", code: "RAD-US-BREAST", name: "Ultrasound — Breast (bilateral)", category: "radiology", department: "Ultrasonography", basePrice: 800, costPrice: 190, insurancePrice: 920, isAvailable: true },
  { id: "T-RAD-30", code: "RAD-US-SCROTAL", name: "Ultrasound — Scrotal", category: "radiology", department: "Ultrasonography", basePrice: 750, costPrice: 180, insurancePrice: 860, isAvailable: true },
  { id: "T-RAD-31", code: "RAD-US-DOPPLER", name: "Doppler Ultrasound — per region", category: "radiology", department: "Ultrasonography", basePrice: 1200, costPrice: 290, insurancePrice: 1400, isAvailable: true },
  { id: "T-RAD-32", code: "RAD-US-ECHO", name: "Echocardiogram", category: "radiology", department: "Radiology & Imaging", basePrice: 1800, costPrice: 430, insurancePrice: 2100, isAvailable: true },
  { id: "T-RAD-33", code: "RAD-US-TRANSVAG", name: "Ultrasound — Transvaginal", category: "radiology", department: "Ultrasonography", basePrice: 800, costPrice: 190, insurancePrice: 920, isAvailable: true },
  { id: "T-RAD-34", code: "RAD-US-MSK", name: "Ultrasound — Musculoskeletal", category: "radiology", department: "Ultrasonography", basePrice: 850, costPrice: 205, insurancePrice: 980, isAvailable: true },
  // ── Radiology: CT / MRI / cardiac ──
  { id: "T-RAD-35", code: "RAD-CT-HEAD", name: "CT Scan — Head / Brain", category: "radiology", department: "Radiology & Imaging", basePrice: 2800, costPrice: 670, insurancePrice: 3200, isAvailable: true },
  { id: "T-RAD-36", code: "RAD-CT-HEAD-C", name: "CT Scan — Head with Contrast", category: "radiology", department: "Radiology & Imaging", basePrice: 4200, costPrice: 1000, insurancePrice: 4800, isAvailable: true },
  { id: "T-RAD-37", code: "RAD-CT-CHEST", name: "CT Scan — Chest", category: "radiology", department: "Radiology & Imaging", basePrice: 3200, costPrice: 770, insurancePrice: 3700, isAvailable: true },
  { id: "T-RAD-38", code: "RAD-CT-ABDOMEN", name: "CT Scan — Abdomen + Pelvis", category: "radiology", department: "Radiology & Imaging", basePrice: 3800, costPrice: 910, insurancePrice: 4400, isAvailable: true },
  { id: "T-RAD-39", code: "RAD-CT-ABDOMEN-C", name: "CT Scan — Abdomen + Pelvis with Contrast", category: "radiology", department: "Radiology & Imaging", basePrice: 5500, costPrice: 1320, insurancePrice: 6300, isAvailable: true },
  { id: "T-RAD-40", code: "RAD-CT-SPINE", name: "CT Scan — Spine (per region)", category: "radiology", department: "Radiology & Imaging", basePrice: 3000, costPrice: 720, insurancePrice: 3500, isAvailable: true },
  { id: "T-RAD-41", code: "RAD-MRI-BRAIN", name: "MRI — Brain", category: "radiology", department: "Radiology & Imaging", basePrice: 7500, costPrice: 1800, insurancePrice: 8600, isAvailable: true },
  { id: "T-RAD-42", code: "RAD-MRI-SPINE", name: "MRI — Spine (per region)", category: "radiology", department: "Radiology & Imaging", basePrice: 7000, costPrice: 1680, insurancePrice: 8000, isAvailable: true },
  { id: "T-RAD-43", code: "RAD-MRI-ABDOMEN", name: "MRI — Abdomen / Pelvis", category: "radiology", department: "Radiology & Imaging", basePrice: 8500, costPrice: 2040, insurancePrice: 9800, isAvailable: true },
  { id: "T-RAD-44", code: "RAD-MRI-JOINT", name: "MRI — Joint (knee / shoulder)", category: "radiology", department: "Radiology & Imaging", basePrice: 6500, costPrice: 1560, insurancePrice: 7500, isAvailable: true },
  { id: "T-RAD-45", code: "RAD-MAMMO", name: "Mammography (bilateral)", category: "radiology", department: "Radiology & Imaging", basePrice: 1500, costPrice: 360, insurancePrice: 1750, isAvailable: true },
  { id: "T-RAD-46", code: "RAD-ECG", name: "ECG (12-lead)", category: "radiology", department: "Radiology & Imaging", basePrice: 250, costPrice: 60, insurancePrice: 290, isAvailable: true },
  { id: "T-RAD-47", code: "RAD-ECG-STRESS", name: "Stress / Exercise ECG", category: "radiology", department: "Radiology & Imaging", basePrice: 1200, costPrice: 290, insurancePrice: 1400, isAvailable: true },
  { id: "T-RAD-48", code: "RAD-HOLTER", name: "24-hour Holter Monitoring", category: "radiology", department: "Radiology & Imaging", basePrice: 1800, costPrice: 430, insurancePrice: 2100, isAvailable: true },
  // ── Laboratory ──
  { id: "T-LAB-01", code: "LAB-FBC", name: "Full Blood Count (FBC)", category: "lab", department: "Haematology Lab", basePrice: 200, costPrice: 48, insurancePrice: 230, isAvailable: true },
  { id: "T-LAB-02", code: "LAB-HB", name: "Haemoglobin (Hb)", category: "lab", department: "Haematology Lab", basePrice: 100, costPrice: 24, insurancePrice: 115, isAvailable: true },
  { id: "T-LAB-03", code: "LAB-ESR", name: "ESR", category: "lab", department: "Haematology Lab", basePrice: 100, costPrice: 24, insurancePrice: 115, isAvailable: true },
  { id: "T-LAB-04", code: "LAB-BLOOD-GROUP", name: "Blood Grouping (ABO + Rhesus)", category: "lab", department: "Haematology Lab", basePrice: 150, costPrice: 36, insurancePrice: 175, isAvailable: true },
  { id: "T-LAB-05", code: "LAB-CROSSMATCH", name: "Cross-match (per unit)", category: "lab", department: "Blood Bank", basePrice: 250, costPrice: 60, insurancePrice: 290, isAvailable: true },
  { id: "T-LAB-06", code: "LAB-HBA1C", name: "HbA1c", category: "lab", department: "Haematology Lab", basePrice: 400, costPrice: 96, insurancePrice: 460, isAvailable: true },
  { id: "T-LAB-07", code: "LAB-SICKLING", name: "Sickling Test", category: "lab", department: "Haematology Lab", basePrice: 150, costPrice: 36, insurancePrice: 175, isAvailable: true },
  { id: "T-LAB-08", code: "LAB-PT-INR", name: "PT/INR (Coagulation)", category: "lab", department: "Haematology Lab", basePrice: 300, costPrice: 72, insurancePrice: 350, isAvailable: true },
  { id: "T-LAB-09", code: "LAB-APTT", name: "APTT (Coagulation)", category: "lab", department: "Haematology Lab", basePrice: 300, costPrice: 72, insurancePrice: 350, isAvailable: true },
  { id: "T-LAB-10", code: "LAB-MAL-RDT", name: "Malaria RDT", category: "lab", department: "Microbiology Lab", basePrice: 120, costPrice: 29, insurancePrice: 140, isAvailable: true },
  { id: "T-LAB-11", code: "LAB-MAL-MICRO", name: "Malaria Microscopy", category: "lab", department: "Microbiology Lab", basePrice: 150, costPrice: 36, insurancePrice: 175, isAvailable: true },
  { id: "T-LAB-12", code: "LAB-HIV-RAPID", name: "HIV Rapid Test", category: "lab", department: "Microbiology Lab", basePrice: 150, costPrice: 36, insurancePrice: 175, isAvailable: true },
  { id: "T-LAB-13", code: "LAB-HIV-VL", name: "HIV Viral Load", category: "lab", department: "Microbiology Lab", basePrice: 600, costPrice: 144, insurancePrice: 690, isAvailable: true },
  { id: "T-LAB-14", code: "LAB-CD4", name: "CD4 Count", category: "lab", department: "Microbiology Lab", basePrice: 400, costPrice: 96, insurancePrice: 460, isAvailable: true },
  { id: "T-LAB-15", code: "LAB-HEP-B", name: "Hepatitis B (HBsAg)", category: "lab", department: "Microbiology Lab", basePrice: 200, costPrice: 48, insurancePrice: 230, isAvailable: true },
  { id: "T-LAB-16", code: "LAB-HEP-C", name: "Hepatitis C Antibody", category: "lab", department: "Microbiology Lab", basePrice: 250, costPrice: 60, insurancePrice: 290, isAvailable: true },
  { id: "T-LAB-17", code: "LAB-TPHA", name: "Syphilis (TPHA/RPR)", category: "lab", department: "Microbiology Lab", basePrice: 180, costPrice: 43, insurancePrice: 210, isAvailable: true },
  { id: "T-LAB-18", code: "LAB-WIDAL", name: "Widal (Typhoid)", category: "lab", department: "Microbiology Lab", basePrice: 180, costPrice: 43, insurancePrice: 210, isAvailable: true },
  { id: "T-LAB-19", code: "LAB-TB-GENEX", name: "TB GeneXpert", category: "lab", department: "Microbiology Lab", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  { id: "T-LAB-20", code: "LAB-COVID-PCR", name: "COVID-19 PCR", category: "lab", department: "Microbiology Lab", basePrice: 450, costPrice: 108, insurancePrice: 520, isAvailable: true },
  { id: "T-LAB-21", code: "LAB-COVID-RDT", name: "COVID-19 Antigen RDT", category: "lab", department: "Microbiology Lab", basePrice: 200, costPrice: 48, insurancePrice: 230, isAvailable: true },
  { id: "T-LAB-22", code: "LAB-GLUCOSE", name: "Blood Glucose (Random / Fasting)", category: "lab", department: "Biochemistry Lab", basePrice: 100, costPrice: 24, insurancePrice: 115, isAvailable: true },
  { id: "T-LAB-23", code: "LAB-LFT", name: "Liver Function Tests", category: "lab", department: "Biochemistry Lab", basePrice: 450, costPrice: 108, insurancePrice: 520, isAvailable: true },
  { id: "T-LAB-24", code: "LAB-KFT", name: "Kidney Function Tests", category: "lab", department: "Biochemistry Lab", basePrice: 450, costPrice: 108, insurancePrice: 520, isAvailable: true },
  { id: "T-LAB-25", code: "LAB-LIPIDS", name: "Lipid Profile", category: "lab", department: "Biochemistry Lab", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  { id: "T-LAB-26", code: "LAB-PSA", name: "PSA (Prostate Specific Antigen)", category: "lab", department: "Biochemistry Lab", basePrice: 450, costPrice: 108, insurancePrice: 520, isAvailable: true },
  { id: "T-LAB-27", code: "LAB-THYROID", name: "Thyroid Function (TSH, T3, T4)", category: "lab", department: "Biochemistry Lab", basePrice: 600, costPrice: 144, insurancePrice: 690, isAvailable: true },
  { id: "T-LAB-28", code: "LAB-CRP", name: "C-Reactive Protein (CRP)", category: "lab", department: "Biochemistry Lab", basePrice: 250, costPrice: 60, insurancePrice: 290, isAvailable: true },
  { id: "T-LAB-29", code: "LAB-FERRITIN", name: "Ferritin", category: "lab", department: "Biochemistry Lab", basePrice: 350, costPrice: 84, insurancePrice: 400, isAvailable: true },
  { id: "T-LAB-30", code: "LAB-VITD", name: "Vitamin D", category: "lab", department: "Biochemistry Lab", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  { id: "T-LAB-31", code: "LAB-URINE", name: "Urinalysis", category: "lab", department: "Microbiology Lab", basePrice: 120, costPrice: 29, insurancePrice: 140, isAvailable: true },
  { id: "T-LAB-32", code: "LAB-URINE-CULT", name: "Urine Culture & Sensitivity", category: "lab", department: "Microbiology Lab", basePrice: 600, costPrice: 144, insurancePrice: 690, isAvailable: true },
  { id: "T-LAB-33", code: "LAB-STOOL", name: "Stool Microscopy", category: "lab", department: "Microbiology Lab", basePrice: 120, costPrice: 29, insurancePrice: 140, isAvailable: true },
  { id: "T-LAB-34", code: "LAB-BLOOD-CULT", name: "Blood Culture & Sensitivity", category: "lab", department: "Microbiology Lab", basePrice: 800, costPrice: 192, insurancePrice: 920, isAvailable: true },
  { id: "T-LAB-35", code: "LAB-WOUND-CULT", name: "Wound Swab Culture & Sensitivity", category: "lab", department: "Microbiology Lab", basePrice: 600, costPrice: 144, insurancePrice: 690, isAvailable: true },
  { id: "T-LAB-36", code: "LAB-SPUTUM", name: "Sputum Microscopy (AFB)", category: "lab", department: "Microbiology Lab", basePrice: 150, costPrice: 36, insurancePrice: 175, isAvailable: true },
  { id: "T-LAB-37", code: "LAB-PREG", name: "Urine Pregnancy Test (HCG)", category: "lab", department: "Microbiology Lab", basePrice: 100, costPrice: 24, insurancePrice: 115, isAvailable: true },
  { id: "T-LAB-38", code: "LAB-BHCG", name: "Serum Beta-HCG (Quantitative)", category: "lab", department: "Biochemistry Lab", basePrice: 400, costPrice: 96, insurancePrice: 460, isAvailable: true },
  { id: "T-LAB-39", code: "LAB-PAP", name: "Pap Smear", category: "lab", department: "Microbiology Lab", basePrice: 450, costPrice: 108, insurancePrice: 520, isAvailable: true },
  { id: "T-LAB-40", code: "LAB-SEMEN", name: "Semen Analysis", category: "lab", department: "Microbiology Lab", basePrice: 500, costPrice: 120, insurancePrice: 580, isAvailable: true },
  // ── Ward / bed charges (per day) ──
  { id: "T-WARD-01", code: "WARD-GENERAL", name: "General Ward — per day", category: "ward", department: "Inpatient (IPD)", basePrice: 1000, costPrice: 240, insurancePrice: 1150, isAvailable: true },
  { id: "T-WARD-02", code: "WARD-SEMI", name: "Semi-Private Room — per day", category: "ward", department: "Inpatient (IPD)", basePrice: 1800, costPrice: 430, insurancePrice: 2100, isAvailable: true },
  { id: "T-WARD-03", code: "WARD-PRIVATE", name: "Private Room — per day", category: "ward", department: "Inpatient (IPD)", basePrice: 3000, costPrice: 720, insurancePrice: 3500, isAvailable: true },
  { id: "T-WARD-04", code: "WARD-ICU", name: "ICU — per day", category: "ward", department: "Intensive Care (ICU)", basePrice: 6500, costPrice: 1560, insurancePrice: 7500, isAvailable: true },
  { id: "T-WARD-05", code: "WARD-HDU", name: "High Dependency Unit — per day", category: "ward", department: "Intensive Care (ICU)", basePrice: 4000, costPrice: 960, insurancePrice: 4600, isAvailable: true },
  { id: "T-WARD-06", code: "WARD-NICU", name: "NICU — per day", category: "ward", department: "Neonatal", basePrice: 5000, costPrice: 1200, insurancePrice: 5800, isAvailable: true },
  { id: "T-WARD-07", code: "WARD-PICU", name: "PICU — per day", category: "ward", department: "Paediatrics", basePrice: 5500, costPrice: 1320, insurancePrice: 6300, isAvailable: true },
  { id: "T-WARD-08", code: "WARD-MATERNITY", name: "Maternity Ward — per day", category: "ward", department: "Maternity", basePrice: 1200, costPrice: 290, insurancePrice: 1400, isAvailable: true },
  { id: "T-WARD-09", code: "WARD-PAEDS", name: "Paediatric Ward — per day", category: "ward", department: "Paediatrics", basePrice: 1000, costPrice: 240, insurancePrice: 1150, isAvailable: true },
  { id: "T-WARD-10", code: "WARD-ISOLATION", name: "Isolation Room — per day", category: "ward", department: "Inpatient (IPD)", basePrice: 2500, costPrice: 600, insurancePrice: 2900, isAvailable: true },
  { id: "T-WARD-11", code: "WARD-DAY", name: "Day-Case / Observation Bed — per day", category: "ward", department: "Inpatient (IPD)", basePrice: 800, costPrice: 190, insurancePrice: 920, isAvailable: true },
  // ── Theatre & surgery ──
  { id: "T-SURG-01", code: "SURG-APPEND", name: "Appendectomy (Open)", category: "surgery", department: "General Surgery OT", basePrice: 18000, costPrice: 5000, insurancePrice: 20000, isAvailable: true },
  { id: "T-SURG-02", code: "SURG-APPEND-LAP", name: "Appendectomy (Laparoscopic)", category: "surgery", department: "General Surgery OT", basePrice: 28000, costPrice: 7800, insurancePrice: 31000, isAvailable: true },
  { id: "T-SURG-03", code: "SURG-HERNIA", name: "Hernia Repair (Open)", category: "surgery", department: "General Surgery OT", basePrice: 15000, costPrice: 4200, insurancePrice: 17000, isAvailable: true },
  { id: "T-SURG-04", code: "SURG-HERNIA-LAP", name: "Hernia Repair (Laparoscopic)", category: "surgery", department: "General Surgery OT", basePrice: 25000, costPrice: 7000, insurancePrice: 28000, isAvailable: true },
  { id: "T-SURG-05", code: "SURG-CSECTION", name: "Caesarean Section", category: "surgery", department: "Obstetrics OT", basePrice: 22000, costPrice: 6100, insurancePrice: 24500, isAvailable: true },
  { id: "T-SURG-06", code: "SURG-HYST", name: "Hysterectomy (Abdominal)", category: "surgery", department: "Gynaecology OT", basePrice: 25000, costPrice: 7000, insurancePrice: 28000, isAvailable: true },
  { id: "T-SURG-07", code: "SURG-MYOM", name: "Myomectomy", category: "surgery", department: "Gynaecology OT", basePrice: 22000, costPrice: 6100, insurancePrice: 24500, isAvailable: true },
  { id: "T-SURG-08", code: "SURG-CHOLE", name: "Cholecystectomy (Open)", category: "surgery", department: "General Surgery OT", basePrice: 22000, costPrice: 6100, insurancePrice: 24500, isAvailable: true },
  { id: "T-SURG-09", code: "SURG-CHOLE-LAP", name: "Cholecystectomy (Laparoscopic)", category: "surgery", department: "General Surgery OT", basePrice: 32000, costPrice: 8900, insurancePrice: 35500, isAvailable: true },
  { id: "T-SURG-10", code: "SURG-CATARACT", name: "Cataract Extraction + IOL", category: "surgery", department: "Eye Theatre", basePrice: 12000, costPrice: 3300, insurancePrice: 13500, isAvailable: true },
  { id: "T-SURG-11", code: "SURG-TONSIL", name: "Tonsillectomy", category: "surgery", department: "ENT Theatre", basePrice: 12000, costPrice: 3300, insurancePrice: 13500, isAvailable: true },
  { id: "T-SURG-12", code: "SURG-FRACTURE", name: "Fracture Fixation (ORIF, per bone)", category: "surgery", department: "Orthopaedic OT", basePrice: 20000, costPrice: 5600, insurancePrice: 22500, isAvailable: true },
  { id: "T-SURG-13", code: "SURG-LIPOMA", name: "Lipoma / Lump Excision (Minor)", category: "surgery", department: "Minor Theatre", basePrice: 5000, costPrice: 1400, insurancePrice: 5600, isAvailable: true },
  { id: "T-SURG-14", code: "SURG-CIRCUM", name: "Circumcision (Adult)", category: "surgery", department: "Minor Theatre", basePrice: 3500, costPrice: 980, insurancePrice: 3900, isAvailable: true },
  { id: "T-SURG-15", code: "SURG-DNC", name: "D&C (Dilatation & Curettage)", category: "surgery", department: "Gynaecology OT", basePrice: 8000, costPrice: 2200, insurancePrice: 9000, isAvailable: true },
  { id: "T-SURG-16", code: "SURG-SVD", name: "Normal Vaginal Delivery Package", category: "surgery", department: "Maternity", basePrice: 9000, costPrice: 2500, insurancePrice: 10000, isAvailable: true },
  { id: "T-SURG-17", code: "THEATRE-HR", name: "Theatre Time — per hour", category: "surgery", department: "Theatre", basePrice: 3000, costPrice: 840, insurancePrice: 3400, isAvailable: true },
  { id: "T-SURG-18", code: "ANAES-GENERAL", name: "General Anaesthesia — per procedure", category: "surgery", department: "Anaesthesia", basePrice: 4000, costPrice: 1120, insurancePrice: 4500, isAvailable: true },
  { id: "T-SURG-19", code: "ANAES-SPINAL", name: "Spinal / Regional Anaesthesia — per procedure", category: "surgery", department: "Anaesthesia", basePrice: 2500, costPrice: 700, insurancePrice: 2800, isAvailable: true },
  // ── Dental ──
  { id: "T-DENT-01", code: "DENT-CONSULT", name: "Dental Consultation", category: "dental", department: "Dental Clinic", basePrice: 250, costPrice: 60, insurancePrice: 290, isAvailable: true },
  { id: "T-DENT-02", code: "DENT-EXT-SIMPLE", name: "Simple Dental Extraction", category: "dental", department: "Dental Clinic", basePrice: 400, costPrice: 100, insurancePrice: 460, isAvailable: true },
  { id: "T-DENT-03", code: "DENT-EXT-SURGICAL", name: "Surgical Extraction (incl. wisdom)", category: "dental", department: "Dental Clinic", basePrice: 900, costPrice: 220, insurancePrice: 1050, isAvailable: true },
  { id: "T-DENT-04", code: "DENT-FILLING", name: "Composite Filling (per tooth)", category: "dental", department: "Dental Clinic", basePrice: 700, costPrice: 175, insurancePrice: 800, isAvailable: true },
  { id: "T-DENT-05", code: "DENT-RCT", name: "Root Canal Treatment (per tooth)", category: "dental", department: "Dental Clinic", basePrice: 1500, costPrice: 375, insurancePrice: 1750, isAvailable: true },
  { id: "T-DENT-06", code: "DENT-CLEAN", name: "Scaling & Polishing", category: "dental", department: "Dental Clinic", basePrice: 500, costPrice: 125, insurancePrice: 580, isAvailable: true },
  { id: "T-DENT-07", code: "DENT-CROWN", name: "Crown (per tooth)", category: "dental", department: "Dental Clinic", basePrice: 2500, costPrice: 625, insurancePrice: 2900, isAvailable: true },
  { id: "T-DENT-08", code: "DENT-DENTURE", name: "Full Denture (per arch)", category: "dental", department: "Dental Clinic", basePrice: 4000, costPrice: 1000, insurancePrice: 4600, isAvailable: true },
  // ── Other billable services (often missed) ──
  { id: "T-OTH-01", code: "OTH-OXYGEN", name: "Oxygen Therapy — per hour", category: "other", department: "Nursing", basePrice: 300, costPrice: 75, insurancePrice: 350, isAvailable: true },
  { id: "T-OTH-02", code: "OTH-NEBULIZE", name: "Nebulization — per session", category: "other", department: "Nursing", basePrice: 200, costPrice: 50, insurancePrice: 230, isAvailable: true },
  { id: "T-OTH-03", code: "OTH-DRESSING", name: "Wound Dressing Change", category: "other", department: "Nursing", basePrice: 250, costPrice: 62, insurancePrice: 290, isAvailable: true },
  { id: "T-OTH-04", code: "OTH-INJ-IM", name: "IM Injection Administration", category: "other", department: "Nursing", basePrice: 100, costPrice: 25, insurancePrice: 115, isAvailable: true },
  { id: "T-OTH-05", code: "OTH-IV-CANNULA", name: "IV Cannulation", category: "other", department: "Nursing", basePrice: 300, costPrice: 75, insurancePrice: 350, isAvailable: true },
  { id: "T-OTH-06", code: "OTH-IV-DRIP", name: "IV Fluid Administration — per bag", category: "other", department: "Nursing", basePrice: 400, costPrice: 100, insurancePrice: 460, isAvailable: true },
  { id: "T-OTH-07", code: "OTH-PHYSIO", name: "Physiotherapy Session", category: "other", department: "Physiotherapy", basePrice: 400, costPrice: 100, insurancePrice: 460, isAvailable: true },
  { id: "T-OTH-08", code: "OTH-AMBULANCE", name: "Ambulance Transport — per trip (urban)", category: "other", department: "Ambulance", basePrice: 1500, costPrice: 375, insurancePrice: 1750, isAvailable: true },
  { id: "T-OTH-09", code: "OTH-MEDREPORT", name: "Medical Report / Certificate", category: "other", department: "Medical Records", basePrice: 500, costPrice: 125, insurancePrice: 580, isAvailable: true },
  { id: "T-OTH-10", code: "OTH-TRANSFUSE", name: "Blood Transfusion — per unit", category: "other", department: "Blood Bank", basePrice: 1500, costPrice: 375, insurancePrice: 1750, isAvailable: true },
  { id: "T-OTH-11", code: "OTH-DIALYSIS", name: "Haemodialysis — per session", category: "other", department: "Renal Unit", basePrice: 2500, costPrice: 625, insurancePrice: 2900, isAvailable: true },
  { id: "T-OTH-12", code: "OTH-GUARDIAN", name: "Guardian / Bed-sitter Lodging — per day", category: "other", department: "Inpatient (IPD)", basePrice: 300, costPrice: 75, insurancePrice: 350, isAvailable: true },
  { id: "T-OTH-13", code: "OTH-VAC-ADMIN", name: "Vaccination Administration Fee", category: "other", department: "Nursing", basePrice: 100, costPrice: 25, insurancePrice: 115, isAvailable: true },
  { id: "T-OTH-14", code: "OTH-ANC", name: "Antenatal Care Visit", category: "other", department: "Maternity", basePrice: 200, costPrice: 50, insurancePrice: 230, isAvailable: true },
];

/**
 * Fetch an institution's active tariffs (for billing charge lookup).
 * Returns [] when the charge book is empty or unreachable — callers must
 * fall back to their own safe defaults.
 */
export async function fetchInstitutionTariffs(institutionId: string): Promise<ServiceTariff[]> {
  if (!institutionId) return [];
  const { data, error } = await supabase
    .from('service_tariffs' as any)
    .select('*')
    .eq('institution_id', institutionId)
    .eq('is_active', true)
    .order('category')
    .order('name');
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    department: r.department || '',
    basePrice: Number(r.base_price) || 0,
    costPrice: Number(r.cost_price) || 0,
    insurancePrice: r.insurance_price != null ? Number(r.insurance_price) : undefined,
    isAvailable: r.is_active !== false,
  }));
}

/**
 * Resolve a charge from the tariff book: prefer a name match inside the
 * category, else the first active tariff of that category, else fallback.
 */
export function resolveTariffPrice(
  tariffs: ServiceTariff[],
  category: ServiceTariff['category'],
  nameHint: string | undefined,
  fallback: number
): number {
  const inCategory = tariffs.filter((t) => t.category === category && t.isAvailable);
  if (inCategory.length === 0) return fallback;
  if (nameHint) {
    const needle = nameHint.toLowerCase();
    const hit = inCategory.find(
      (t) => t.name.toLowerCase().includes(needle) || needle.includes(t.name.toLowerCase())
    );
    if (hit) return hit.basePrice;
  }
  return inCategory[0].basePrice;
}

export const TariffAndPriceManager = ({ institutionId: propInstitutionId }: { institutionId?: string } = {}) => {
  const { currency, getSymbol } = useCurrency();
  const { institution } = useInstitutionContext();
  const institutionId = propInstitutionId || institution?.id || null;
  const [tariffs, setTariffs] = useState<ServiceTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [editingCost, setEditingCost] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newService, setNewService] = useState<Partial<ServiceTariff>>({
    code: "",
    name: "",
    category: "opd",
    department: "General OPD",
    basePrice: 0,
    costPrice: 0,
    insurancePrice: 0,
    isAvailable: true,
  });

  const load = useCallback(async () => {
    if (!institutionId) {
      setTariffs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_tariffs' as any)
        .select('*')
        .eq('institution_id', institutionId)
        .order('category')
        .order('name');
      if (error) throw error;
      setTariffs(
        ((data || []) as any[]).map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          category: r.category,
          department: r.department || '',
          basePrice: Number(r.base_price) || 0,
          costPrice: Number(r.cost_price) || 0,
          insurancePrice: r.insurance_price != null ? Number(r.insurance_price) : undefined,
          isAvailable: r.is_active !== false,
        }))
      );
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load tariffs');
      setTariffs([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    load();
  }, [load]);

  // One-click Zambian starter charge book for brand-new facilities.
  // Also upgrades facilities that loaded the original 11-item starter set
  // (codes T-101..T-602): those legacy rows are removed first so the book
  // doesn't carry duplicate chest X-rays etc. Custom rows are untouched.
  const loadStarterTariffs = async () => {
    if (!institutionId) return;
    setSeeding(true);
    try {
      const legacyCodes = ["T-101","T-102","T-103","T-201","T-202","T-301","T-401","T-402","T-501","T-601","T-602"];
      const { error: delError } = await supabase.from('service_tariffs' as any).delete().eq('institution_id', institutionId).in('code', legacyCodes);
      if (delError) throw delError;
      const rows = DEFAULT_TARIFFS.map((t) => ({
        institution_id: institutionId,
        code: t.code,
        name: t.name,
        category: t.category,
        department: t.department,
        base_price: t.basePrice,
        cost_price: t.costPrice || 0,
        insurance_price: t.insurancePrice ?? Math.round(t.basePrice * 1.15),
        currency,
        is_active: true,
      }));
      const { error } = await supabase.from('service_tariffs' as any).upsert(rows, { onConflict: 'institution_id,code' });
      if (error) throw error;
      toast.success(`Loaded ${rows.length} starter tariffs — adjust them to your fees`);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load starter tariffs');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveInlineEdit = async (id: string) => {
    try {
      const { error } = await supabase.from('service_tariffs' as any).update({
        base_price: editingPrice,
        cost_price: editingCost,
        insurance_price: Math.round(editingPrice * 1.15),
      }).eq('id', id);
      if (error) throw error;
      setTariffs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, basePrice: editingPrice, costPrice: editingCost, insurancePrice: Math.round(editingPrice * 1.15) } : t))
      );
      setEditingId(null);
      toast.success('Updated service price successfully!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save price');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.basePrice) return;
    if (!institutionId) {
      toast.error('No institution context — cannot save tariff');
      return;
    }
    try {
      const payload = {
        institution_id: institutionId,
        code: newService.code || `SRV-${Date.now().toString(36).toUpperCase()}`,
        name: newService.name,
        category: (newService.category as any) || 'opd',
        department: newService.department || 'General',
        base_price: Number(newService.basePrice),
        cost_price: Number(newService.costPrice || 0),
        insurance_price: Number(newService.insurancePrice || Number(newService.basePrice) * 1.15),
        currency,
        is_active: true,
      };
      const { data, error } = await supabase.from('service_tariffs' as any).insert(payload).select().single();
      if (error) throw error;
      const row = data as any;
      setTariffs((prev) => [{
        id: row.id, code: row.code, name: row.name, category: row.category,
        department: row.department || '', basePrice: Number(row.base_price) || 0,
        costPrice: Number(row.cost_price) || 0,
        insurancePrice: row.insurance_price != null ? Number(row.insurance_price) : undefined,
        isAvailable: row.is_active !== false,
      }, ...prev]);
      setShowAddModal(false);
      setNewService({ code: '', name: '', category: 'opd', department: 'General OPD', basePrice: 0, costPrice: 0, insurancePrice: 0, isAvailable: true });
      toast.success(`Added new service: ${payload.name}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add tariff');
    }
  };

  const toggleAvailability = async (id: string, next: boolean) => {
    try {
      const { error } = await supabase.from('service_tariffs' as any).update({ is_active: next }).eq('id', id);
      if (error) throw error;
      setTariffs((prev) => prev.map((t) => (t.id === id ? { ...t, isAvailable: next } : t)));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  const filtered = tariffs.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-canvas-silk pb-3">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-500" />
            Universal Hospital Service Tariff & Pricing Matrix
          </h2>
          <p className="text-xs text-graphite-500 dark:text-slate-400 font-medium">
            Configure consultation fees, laboratory panels, radiology rates, and ward bed prices
          </p>
        </div>
        <div className="flex gap-2">
          {tariffs.length === 0 && !loading && (
            <button
              onClick={loadStarterTariffs}
              disabled={seeding || !institutionId}
              className="px-3.5 py-1.5 rounded-md border border-primary-500 text-primary-500 hover:bg-primary-100 font-extrabold text-xs shadow-xs flex items-center gap-1 disabled:opacity-50"
            >
              <Tag className="h-4 w-4" />
              <span>{seeding ? 'Loading…' : 'Load Starter Tariffs'}</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-md bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Service Tariff</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-graphite-500 dark:text-slate-400 py-8 text-center">Loading charge book…</p>
      ) : tariffs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-graphite-300 dark:border-slate-700 p-8 text-center space-y-2">
          <Tag className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm font-extrabold">No tariffs yet</p>
          <p className="text-xs text-graphite-500 dark:text-slate-400">Load the Zambian starter charge book or add your own services — billing uses these rates.</p>
        </div>
      ) : null}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search procedure name, code, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700"
        >
          <option value="all">All Categories ({tariffs.length})</option>
          <option value="opd">OPD & Consultation</option>
          <option value="emergency">Emergency / Casualty</option>
          <option value="dental">Dental Clinic</option>
          <option value="lab">Laboratory Tests</option>
          <option value="radiology">Radiology Scans</option>
          <option value="surgery">OT & Surgery</option>
          <option value="ward">Ward Beds & IPD</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="other">Other Services</option>
        </select>
      </div>

      {/* Main Tariff Table */}
      {!loading && tariffs.length > 0 && (
      <div className="w-full overflow-x-auto rounded-xl border border-canvas-silk bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-canvas-silk bg-canvas text-[11px] font-extrabold uppercase text-graphite-500 dark:text-slate-400">
              <th className="py-2.5 px-4">Code / Category</th>
              <th className="py-2.5 px-3">Service Name</th>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3 text-right">Cost Price ({getSymbol()})</th>
              <th className="py-2.5 px-3 text-right">Base Price ({getSymbol()})</th>
              <th className="py-2.5 px-3 text-right">Margin</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-silk">
            {filtered.map((t) => {
              const isEditing = editingId === t.id;
              const cost = isEditing ? editingCost : t.costPrice || 0;
              const price = isEditing ? editingPrice : t.basePrice;
              const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

              return (
                <tr key={t.id} className="hover:bg-canvas-mist dark:hover:bg-slate-800 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.code}</td>
                  <td className="py-3 px-3 font-extrabold text-slate-900">{t.name}</td>
                  <td className="py-3 px-3 text-graphite-500 dark:text-slate-400">{t.department}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingCost}
                        onChange={(e) => setEditingCost(Number(e.target.value))}
                        className="w-20 text-right p-1 border rounded text-xs font-mono"
                      />
                    ) : (
                      <span>{cost.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-primary-500">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(Number(e.target.value))}
                        className="w-24 text-right p-1 border rounded text-xs font-mono font-bold text-primary-500"
                      />
                    ) : (
                      <span>{price.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                    +{margin}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button onClick={() => toggleAvailability(t.id, !t.isAvailable)}>
                      {t.isAvailable ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-success-500">Active</span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-error-500">Disabled</span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveInlineEdit(t.id)}
                        className="px-2.5 py-1 rounded-md bg-success-500 text-white text-[11px] font-bold"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setEditingPrice(t.basePrice);
                          setEditingCost(t.costPrice || 0);
                        }}
                        className="px-2.5 py-1 rounded-md bg-primary-500 text-white text-[11px] font-bold"
                      >
                        Edit Price
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[450px] bg-white border border-canvas-silk dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-base">Add Service Price</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Service Name *</label>
              <input
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g. Dental Crown Fitting"
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Selling Price ({currency}) *</label>
                <input
                  type="number"
                  value={newService.basePrice}
                  onChange={(e) => setNewService({ ...newService, basePrice: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-primary-500"
                  required
                />
              </div>
              <div>
                <label className="font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Cost Price ({currency})</label>
                <input
                  type="number"
                  value={newService.costPrice}
                  onChange={(e) => setNewService({ ...newService, costPrice: Number(e.target.value) })}
                  className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700"
                />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 rounded-md bg-primary-500 text-white font-bold text-xs">
                Save Price
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TariffAndPriceManager;
