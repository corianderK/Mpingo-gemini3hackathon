
export enum OperatorRole {
  PATIENT = 'Patient',
  CAREGIVER = 'Caregiver',
  CLINICIAN = 'Clinician'
}

export enum Sex {
  FEMALE = 'Female',
  MALE = 'Male',
  INTERSEX = 'Intersex / Differences of Sex Development'
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | 'Unknown';

export enum RiskLevel {
  GREEN = 'LOW RISK',
  YELLOW = 'MODERATE RISK',
  RED = 'HIGH RISK / EMERGENCY'
}

export interface PatientLocation {
  street: string;
  bairro: string;
  distrito: string;
  cidade: string;
  country: string;
}

export interface Patient {
  id: string;
  fullName: string;
  sex: Sex;
  age: number;
  height?: number; // in cm
  bloodType?: BloodType;
  weight?: number; // in kg
  isPregnantOrBreastfeeding?: boolean;
  knownConditions: string[];
  allergies?: string;
  currentMedications?: string;
  location?: PatientLocation;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  operatorRole: OperatorRole;
  timestamp: number;
  content: string;
  attachments: string[];
}

export interface TriageResult {
  riskLevel: RiskLevel;
  reason: string;
  topQuestions: string[];
  possibleCauses: { name: string; rationale: string; confidence: number }[];
  nextActions: { urgency: string; details: string }[];
  otcOptions: { name: string; purpose: string; warnings: string }[];
  whenToSeekCare: string[];
}
