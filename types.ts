export enum OperatorRole {
  PATIENT = 'Patient',
  CAREGIVER = 'Caregiver',
  CLINICIAN = 'Clinician'
}

export enum Sex {
  FEMALE = 'Female',
  MALE = 'Male'
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-' | 'Unknown';

export type Language = 'en' | 'pt';

export enum RiskLevel {
  GREEN = 'LOW RISK',
  YELLOW = 'MODERATE RISK',
  RED = 'HIGH RISK / EMERGENCY'
}

export interface PatientLocation {
  street: string;
  houseNumber?: string;
  bairro: string;
  distrito: string;
  cidade: string;
  provincia: string;
  country: string;
}

export interface HospitalRecord {
  hospitalName: string;
  registrationNumber: string;
}

export interface RecordAttachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64 encoded data
}

export interface Vitals {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  oxygenSaturation?: number; // New: SpO2 %
  temperature?: number; // New: Body temp in Celsius
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  operatorRole: OperatorRole;
  timestamp: number; // Entry creation date
  documentDate?: number; // Original date of the document/event
  content: string;
  vitals?: Vitals;
  attachments: RecordAttachment[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Patient {
  id: string;
  fullName: string;
  phoneNumber?: string;
  emergencyContact?: EmergencyContact;
  sex: Sex;
  age: number;
  height?: number; // in cm
  bloodType?: BloodType;
  weight?: number; // in kg
  race?: string;
  maritalStatus?: string;
  hospitalRecords?: HospitalRecord[];
  isPregnantOrBreastfeeding?: boolean;
  pregnancyWeeks?: number; // New field for BMI context
  knownConditions: string[];
  allergies?: string;
  chronicDiseases?: string; // New: Separated from history
  pastMedicalHistory?: string; // New: Separated from chronic
  chronicMedications?: string; // New: Long-term medications
  currentMedications?: string; // Acute/reason for current visit
  location?: PatientLocation;
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