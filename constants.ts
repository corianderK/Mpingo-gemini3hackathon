
import { RiskLevel, Patient } from './types';

export const APP_STRINGS = {
  NAV: {
    PATIENT: 'Patient',
    RECORD: 'Record',
    ASSIST: 'Assist',
    PHARMACY: 'Pharmacy',
    SETTINGS: 'Settings'
  },
  COMMON: {
    SAVE: 'Save',
    CANCEL: 'Cancel',
    DELETE: 'Delete',
    EDIT: 'Edit',
    NOT_A_DIAGNOSIS: 'This app is for triage/risk assessment only, not a medical diagnosis.',
    EMERGENCY_NOTICE: 'In case of severe emergency, stop using the app and call local emergency services immediately.'
  },
  PATIENT: {
    TITLE: 'Patient Profile',
    CREATE_FIRST: 'Create a patient profile to begin.',
    ADD_NEW: 'Create Profile',
    SWITCH: 'Switch Patient',
    FIELDS: {
      NAME: 'Full Name',
      AGE: 'Age',
      SEX: 'Sex',
      HEIGHT: 'Height (cm)',
      BLOOD_TYPE: 'Blood Type',
      WEIGHT: 'Weight (kg)',
      PREGNANCY: 'Pregnancy/Breastfeeding',
      CONDITIONS: 'Known Conditions',
      ALLERGIES: 'Allergies',
      MEDS: 'Current Medications',
      LOCATION: {
        TITLE: 'Location (Moçambique)',
        STREET: 'Avenida / Rua (Street)',
        BAIRRO: 'Bairro (Neighborhood)',
        DISTRITO: 'Distrito Municipal',
        CIDADE: 'Cidade / Província',
        COUNTRY: 'Country'
      }
    }
  },
  RECORD: {
    TITLE: 'Clinical Record',
    TEMPLATES: ['Fever', 'Cough', 'Diarrhea', 'Rash', 'Pain', 'Other'],
    PLACEHOLDER: 'Describe symptoms, notes, or what happened...',
    EMPTY: 'No visit records yet for this patient.'
  },
  ASSIST: {
    TITLE: 'AI Assist Triage',
    RUN: 'Run Risk Assessment',
    EMERGENCY_SCRIPT_TITLE: 'Emergency Call Script',
    EMERGENCY_SCRIPT: 'I am calling to report a medical emergency for a patient. Name: [NAME], Age: [AGE]. They are currently experiencing [SYMPTOMS]. Our location is [LOCATION].',
    ANALYZING: 'Analyzing health risk...'
  }
};

export const MOCK_PATIENTS: Patient[] = [];

export const MOCK_TRIAGE_RESULT = {
  riskLevel: RiskLevel.YELLOW,
  reason: 'Patient reports persistent high fever and productive cough for 3 days.',
  topQuestions: [
    'Is the patient having difficulty breathing?',
    'Has there been chest pain when coughing?',
    'Any bluish tint to lips or fingernails?'
  ],
  possibleCauses: [
    { name: 'Lower Respiratory Infection', rationale: 'Productive cough and sustained fever suggest potential pneumonia.', confidence: 0.75 },
    { name: 'Acute Bronchitis', rationale: 'Common cause of cough and fever without severe distress.', confidence: 0.60 }
  ],
  nextActions: [
    { urgency: 'URGENT', details: 'Visit a primary care clinic within 24 hours.' },
    { urgency: 'MONITOR', details: 'Monitor temperature every 4 hours.' }
  ],
  otcOptions: [
    { name: 'Paracetamol', purpose: 'To reduce fever.', warnings: 'Do not exceed 4g in 24 hours.' }
  ],
  whenToSeekCare: [
    'Difficulty breathing at rest',
    'High fever (>39°C) that does not drop with medication',
    'Confusion or altered mental state'
  ]
};
