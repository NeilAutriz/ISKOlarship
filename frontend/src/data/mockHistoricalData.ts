// ============================================================================
// ISKOlarship - Mock Historical Application Data
// For training and testing the Logistic Regression model
// Based on realistic UPLB scholarship application patterns
// ============================================================================

import {
  HistoricalApplication,
  ScholarshipStats,
  YearLevel,
  UPLBCollege,
  STBracket
} from '../types';

// ============================================================================
// HISTORICAL APPLICATION DATA (Anonymized)
// Simulates 5 years of scholarship application data
// ============================================================================

export const historicalApplications: HistoricalApplication[] = [
  // ============================================================================
  // AASP - Sterix Thesis Grant Applications
  // ============================================================================
  // 2024 Applications
  { id: 'hist-001', scholarshipId: 'aasp-sterix-thesis', academicYear: '2023-2024', gwa: 1.45, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 180000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-02-15') },
  { id: 'hist-002', scholarshipId: 'aasp-sterix-thesis', academicYear: '2023-2024', gwa: 1.78, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 220000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-02-18') },
  { id: 'hist-003', scholarshipId: 'aasp-sterix-thesis', academicYear: '2023-2024', gwa: 2.35, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 240000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-02-20') },
  { id: 'hist-004', scholarshipId: 'aasp-sterix-thesis', academicYear: '2023-2024', gwa: 2.65, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 280000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2024-02-22') },
  { id: 'hist-005', scholarshipId: 'aasp-sterix-thesis', academicYear: '2023-2024', gwa: 2.15, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 190000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-02-25') },
  
  // 2023 Applications
  { id: 'hist-006', scholarshipId: 'aasp-sterix-thesis', academicYear: '2022-2023', gwa: 1.55, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 150000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2023-02-10') },
  { id: 'hist-007', scholarshipId: 'aasp-sterix-thesis', academicYear: '2022-2023', gwa: 2.48, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 245000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2023-02-12') },
  { id: 'hist-008', scholarshipId: 'aasp-sterix-thesis', academicYear: '2022-2023', gwa: 2.72, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 260000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2023-02-15') },

  // ============================================================================
  // AASP - Dr. Ernesto Tuazon Applications
  // ============================================================================
  { id: 'hist-009', scholarshipId: 'aasp-tuazon', academicYear: '2023-2024', gwa: 1.65, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Chemistry', annualFamilyIncome: 120000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2024-01-20') },
  { id: 'hist-010', scholarshipId: 'aasp-tuazon', academicYear: '2023-2024', gwa: 1.89, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CEAT, course: 'BS Chemical Engineering', annualFamilyIncome: 140000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-01-22') },
  { id: 'hist-011', scholarshipId: 'aasp-tuazon', academicYear: '2023-2024', gwa: 2.35, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAFS, course: 'BS Agricultural Chemistry', annualFamilyIncome: 145000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-01-25') },
  { id: 'hist-012', scholarshipId: 'aasp-tuazon', academicYear: '2023-2024', gwa: 2.55, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Chemistry', annualFamilyIncome: 160000, stBracket: STBracket.PD60, wasApproved: false, applicationDate: new Date('2024-01-28') },
  { id: 'hist-013', scholarshipId: 'aasp-tuazon', academicYear: '2022-2023', gwa: 1.78, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Chemistry', annualFamilyIncome: 130000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2023-01-18') },
  { id: 'hist-014', scholarshipId: 'aasp-tuazon', academicYear: '2022-2023', gwa: 2.12, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CEAT, course: 'BS Chemical Engineering', annualFamilyIncome: 148000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-01-20') },

  // ============================================================================
  // BASF Agricultural Research Foundation Applications
  // ============================================================================
  { id: 'hist-015', scholarshipId: 'basf-agri', academicYear: '2023-2024', gwa: 1.35, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 350000, stBracket: STBracket.PD40, wasApproved: true, applicationDate: new Date('2024-06-10') },
  { id: 'hist-016', scholarshipId: 'basf-agri', academicYear: '2023-2024', gwa: 1.58, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 280000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-06-12') },
  { id: 'hist-017', scholarshipId: 'basf-agri', academicYear: '2023-2024', gwa: 1.75, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 420000, stBracket: STBracket.PD20, wasApproved: true, applicationDate: new Date('2024-06-15') },
  { id: 'hist-018', scholarshipId: 'basf-agri', academicYear: '2023-2024', gwa: 2.45, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 380000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2024-06-18') },
  { id: 'hist-019', scholarshipId: 'basf-agri', academicYear: '2023-2024', gwa: 2.65, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 520000, stBracket: STBracket.NO_DISCOUNT, wasApproved: false, applicationDate: new Date('2024-06-20') },
  { id: 'hist-020', scholarshipId: 'basf-agri', academicYear: '2022-2023', gwa: 1.42, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 320000, stBracket: STBracket.PD40, wasApproved: true, applicationDate: new Date('2023-06-08') },
  { id: 'hist-021', scholarshipId: 'basf-agri', academicYear: '2022-2023', gwa: 1.68, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 450000, stBracket: STBracket.PD20, wasApproved: true, applicationDate: new Date('2023-06-10') },
  { id: 'hist-022', scholarshipId: 'basf-agri', academicYear: '2022-2023', gwa: 2.28, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 380000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2023-06-12') },

  // ============================================================================
  // AASP - IMS Program Applications
  // ============================================================================
  { id: 'hist-023', scholarshipId: 'aasp-ims', academicYear: '2023-2024', gwa: 1.55, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Applied Mathematics', annualFamilyIncome: 180000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-01-15') },
  { id: 'hist-024', scholarshipId: 'aasp-ims', academicYear: '2023-2024', gwa: 1.72, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Mathematics', annualFamilyIncome: 150000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2024-01-18') },
  { id: 'hist-025', scholarshipId: 'aasp-ims', academicYear: '2023-2024', gwa: 1.95, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Mathematics and Science Teaching', annualFamilyIncome: 200000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-01-20') },
  { id: 'hist-026', scholarshipId: 'aasp-ims', academicYear: '2023-2024', gwa: 2.35, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Applied Mathematics', annualFamilyIncome: 220000, stBracket: STBracket.PD60, wasApproved: false, applicationDate: new Date('2024-01-22') },
  { id: 'hist-027', scholarshipId: 'aasp-ims', academicYear: '2022-2023', gwa: 1.48, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Mathematics', annualFamilyIncome: 140000, stBracket: STBracket.FULL_DISCOUNT_WITH_STIPEND, wasApproved: true, applicationDate: new Date('2023-01-12') },
  { id: 'hist-028', scholarshipId: 'aasp-ims', academicYear: '2022-2023', gwa: 1.85, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Applied Mathematics', annualFamilyIncome: 175000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-01-14') },

  // ============================================================================
  // AASP - CDO Odyssey Foundation Applications
  // ============================================================================
  { id: 'hist-029', scholarshipId: 'aasp-cdo-odyssey', academicYear: '2023-2024', gwa: 1.68, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CHE, course: 'BS Nutrition', annualFamilyIncome: 180000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-02-10') },
  { id: 'hist-030', scholarshipId: 'aasp-cdo-odyssey', academicYear: '2023-2024', gwa: 1.92, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 220000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-02-12') },
  { id: 'hist-031', scholarshipId: 'aasp-cdo-odyssey', academicYear: '2023-2024', gwa: 2.15, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CFNR, course: 'BS Forestry', annualFamilyIncome: 240000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-02-15') },
  { id: 'hist-032', scholarshipId: 'aasp-cdo-odyssey', academicYear: '2023-2024', gwa: 2.58, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CHE, course: 'BS Nutrition', annualFamilyIncome: 260000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2024-02-18') },
  { id: 'hist-033', scholarshipId: 'aasp-cdo-odyssey', academicYear: '2022-2023', gwa: 1.75, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CFNR, course: 'BS Forestry', annualFamilyIncome: 200000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-02-08') },
  { id: 'hist-034', scholarshipId: 'aasp-cdo-odyssey', academicYear: '2022-2023', gwa: 2.05, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 230000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2023-02-10') },

  // ============================================================================
  // AASP - Dr. Higino A. Ables Applications (Bicol region)
  // ============================================================================
  { id: 'hist-035', scholarshipId: 'aasp-ables', academicYear: '2023-2024', gwa: 1.58, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CEAT, course: 'BS Civil Engineering', annualFamilyIncome: 120000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2024-01-25') },
  { id: 'hist-036', scholarshipId: 'aasp-ables', academicYear: '2023-2024', gwa: 1.85, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CEM, course: 'BS Economics', annualFamilyIncome: 135000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2024-01-28') },
  { id: 'hist-037', scholarshipId: 'aasp-ables', academicYear: '2023-2024', gwa: 2.25, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Computer Science', annualFamilyIncome: 145000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-01-30') },
  { id: 'hist-038', scholarshipId: 'aasp-ables', academicYear: '2023-2024', gwa: 2.65, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 160000, stBracket: STBracket.PD60, wasApproved: false, applicationDate: new Date('2024-02-01') },
  { id: 'hist-039', scholarshipId: 'aasp-ables', academicYear: '2022-2023', gwa: 1.72, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 110000, stBracket: STBracket.FULL_DISCOUNT_WITH_STIPEND, wasApproved: true, applicationDate: new Date('2023-01-22') },
  { id: 'hist-040', scholarshipId: 'aasp-ables', academicYear: '2022-2023', gwa: 2.15, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CEAT, course: 'BS Electrical Engineering', annualFamilyIncome: 140000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-01-25') },

  // ============================================================================
  // Sterix HOPE Scholarship Applications
  // ============================================================================
  { id: 'hist-041', scholarshipId: 'sterix-hope-scholarship', academicYear: '2023-2024', gwa: 1.48, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 180000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-01-10') },
  { id: 'hist-042', scholarshipId: 'sterix-hope-scholarship', academicYear: '2023-2024', gwa: 1.72, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 220000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-01-12') },
  { id: 'hist-043', scholarshipId: 'sterix-hope-scholarship', academicYear: '2023-2024', gwa: 1.95, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 245000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-01-15') },
  { id: 'hist-044', scholarshipId: 'sterix-hope-scholarship', academicYear: '2023-2024', gwa: 2.55, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 260000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2024-01-18') },
  { id: 'hist-045', scholarshipId: 'sterix-hope-scholarship', academicYear: '2022-2023', gwa: 1.62, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 200000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-01-08') },

  // ============================================================================
  // Additional Mixed Applications for Model Training
  // ============================================================================
  { id: 'hist-046', scholarshipId: 'aasp-humein', academicYear: '2023-2024', gwa: 2.25, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CDC, course: 'BS Development Communication', annualFamilyIncome: 180000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-02-05') },
  { id: 'hist-047', scholarshipId: 'aasp-humein', academicYear: '2023-2024', gwa: 2.45, yearLevel: YearLevel.FRESHMAN, college: UPLBCollege.CVM, course: 'Doctor of Veterinary Medicine', annualFamilyIncome: 240000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-02-08') },
  { id: 'hist-048', scholarshipId: 'aasp-humein', academicYear: '2023-2024', gwa: 2.85, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CPAF, course: 'BS Community Development', annualFamilyIncome: 280000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2024-02-10') },
  { id: 'hist-049', scholarshipId: 'aasp-humein', academicYear: '2022-2023', gwa: 1.95, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CEM, course: 'BS Accountancy', annualFamilyIncome: 150000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2023-02-03') },
  { id: 'hist-050', scholarshipId: 'aasp-humein', academicYear: '2022-2023', gwa: 2.15, yearLevel: YearLevel.SOPHOMORE, college: UPLBCollege.CAS, course: 'BS Statistics', annualFamilyIncome: 200000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-02-05') },

  // More diverse data for better model training
  { id: 'hist-051', scholarshipId: 'aasp-nicolas-angel', academicYear: '2023-2024', gwa: 1.85, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 200000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-02-01') },
  { id: 'hist-052', scholarshipId: 'aasp-nicolas-angel', academicYear: '2023-2024', gwa: 2.15, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CFNR, course: 'BS Forestry', annualFamilyIncome: 230000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-02-03') },
  { id: 'hist-053', scholarshipId: 'aasp-nicolas-angel', academicYear: '2023-2024', gwa: 2.65, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 270000, stBracket: STBracket.PD40, wasApproved: false, applicationDate: new Date('2024-02-05') },
  { id: 'hist-054', scholarshipId: 'aasp-nicolas-angel', academicYear: '2022-2023', gwa: 1.72, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CFNR, course: 'BS Forestry', annualFamilyIncome: 180000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-01-28') },

  { id: 'hist-055', scholarshipId: 'aasp-camilla-ables', academicYear: '2023-2024', gwa: 1.55, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 120000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2024-02-01') },
  { id: 'hist-056', scholarshipId: 'aasp-camilla-ables', academicYear: '2023-2024', gwa: 1.88, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 140000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-02-03') },
  { id: 'hist-057', scholarshipId: 'aasp-camilla-ables', academicYear: '2023-2024', gwa: 2.55, yearLevel: YearLevel.JUNIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 160000, stBracket: STBracket.PD60, wasApproved: false, applicationDate: new Date('2024-02-05') },
  { id: 'hist-058', scholarshipId: 'aasp-camilla-ables', academicYear: '2022-2023', gwa: 1.68, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 130000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2023-01-25') },

  { id: 'hist-059', scholarshipId: 'lbmfi-thesis', academicYear: '2023-2024', gwa: 1.75, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agriculture', annualFamilyIncome: 250000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-03-01') },
  { id: 'hist-060', scholarshipId: 'lbmfi-thesis', academicYear: '2023-2024', gwa: 2.05, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Biology', annualFamilyIncome: 300000, stBracket: STBracket.PD40, wasApproved: true, applicationDate: new Date('2024-03-03') },
  { id: 'hist-061', scholarshipId: 'lbmfi-thesis', academicYear: '2023-2024', gwa: 2.35, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CHE, course: 'BS Food Science and Technology', annualFamilyIncome: 280000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2024-03-05') },
  { id: 'hist-062', scholarshipId: 'lbmfi-thesis', academicYear: '2022-2023', gwa: 1.82, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAFS, course: 'BS Agricultural Biotechnology', annualFamilyIncome: 220000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2023-02-28') },

  { id: 'hist-063', scholarshipId: 'aasp-fdf', academicYear: '2023-2024', gwa: 2.15, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CEM, course: 'BS Economics', annualFamilyIncome: 350000, stBracket: STBracket.PD40, wasApproved: true, applicationDate: new Date('2024-02-20') },
  { id: 'hist-064', scholarshipId: 'aasp-fdf', academicYear: '2023-2024', gwa: 2.45, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CEAT, course: 'BS Industrial Engineering', annualFamilyIncome: 400000, stBracket: STBracket.PD20, wasApproved: true, applicationDate: new Date('2024-02-22') },
  { id: 'hist-065', scholarshipId: 'aasp-fdf', academicYear: '2022-2023', gwa: 1.95, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CAS, course: 'BS Computer Science', annualFamilyIncome: 280000, stBracket: STBracket.PD60, wasApproved: true, applicationDate: new Date('2023-02-18') },

  { id: 'hist-066', scholarshipId: 'aasp-che-alumni-thesis', academicYear: '2023-2024', gwa: 1.65, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CHE, course: 'BS Human Ecology', annualFamilyIncome: 150000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2024-01-20') },
  { id: 'hist-067', scholarshipId: 'aasp-che-alumni-thesis', academicYear: '2023-2024', gwa: 1.88, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CHE, course: 'BS Nutrition', annualFamilyIncome: 120000, stBracket: STBracket.FULL_DISCOUNT_WITH_STIPEND, wasApproved: true, applicationDate: new Date('2024-01-22') },
  { id: 'hist-068', scholarshipId: 'aasp-che-alumni-thesis', academicYear: '2023-2024', gwa: 2.25, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CHE, course: 'BS Food Science and Technology', annualFamilyIncome: 180000, stBracket: STBracket.PD80, wasApproved: true, applicationDate: new Date('2024-01-25') },
  { id: 'hist-069', scholarshipId: 'aasp-che-alumni-thesis', academicYear: '2022-2023', gwa: 1.75, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CHE, course: 'BS Human Ecology', annualFamilyIncome: 140000, stBracket: STBracket.FULL_DISCOUNT, wasApproved: true, applicationDate: new Date('2023-01-18') },
  { id: 'hist-070', scholarshipId: 'aasp-che-alumni-thesis', academicYear: '2022-2023', gwa: 2.45, yearLevel: YearLevel.SENIOR, college: UPLBCollege.CHE, course: 'BS Nutrition', annualFamilyIncome: 200000, stBracket: STBracket.PD60, wasApproved: false, applicationDate: new Date('2023-01-20') },
];

// ============================================================================
// SCHOLARSHIP STATISTICS BY YEAR
// ============================================================================

export const scholarshipStatistics: ScholarshipStats[] = [
  // 2023-2024 Statistics
  { scholarshipId: 'aasp-sterix-thesis', scholarshipName: 'AASP - Sterix Thesis Grant', academicYear: '2023-2024', totalApplications: 5, approvedApplications: 4, rejectedApplications: 1, successRate: 80, averageGWAApproved: 1.93, averageIncomeApproved: 207500 },
  { scholarshipId: 'aasp-tuazon', scholarshipName: 'AASP - Dr. Ernesto Tuazon', academicYear: '2023-2024', totalApplications: 4, approvedApplications: 3, rejectedApplications: 1, successRate: 75, averageGWAApproved: 1.96, averageIncomeApproved: 135000 },
  { scholarshipId: 'basf-agri', scholarshipName: 'BASF Agricultural Research Foundation', academicYear: '2023-2024', totalApplications: 5, approvedApplications: 3, rejectedApplications: 2, successRate: 60, averageGWAApproved: 1.56, averageIncomeApproved: 350000 },
  { scholarshipId: 'aasp-ims', scholarshipName: 'AASP - IMS Program', academicYear: '2023-2024', totalApplications: 4, approvedApplications: 3, rejectedApplications: 1, successRate: 75, averageGWAApproved: 1.74, averageIncomeApproved: 176667 },
  { scholarshipId: 'aasp-cdo-odyssey', scholarshipName: 'AASP - CDO Odyssey Foundation', academicYear: '2023-2024', totalApplications: 4, approvedApplications: 3, rejectedApplications: 1, successRate: 75, averageGWAApproved: 1.92, averageIncomeApproved: 213333 },
  { scholarshipId: 'aasp-ables', scholarshipName: 'AASP - Dr. Higino A. Ables', academicYear: '2023-2024', totalApplications: 4, approvedApplications: 3, rejectedApplications: 1, successRate: 75, averageGWAApproved: 1.89, averageIncomeApproved: 133333 },
  { scholarshipId: 'sterix-hope-scholarship', scholarshipName: 'Sterix HOPE Scholarship', academicYear: '2023-2024', totalApplications: 4, approvedApplications: 3, rejectedApplications: 1, successRate: 75, averageGWAApproved: 1.72, averageIncomeApproved: 215000 },
  
  // 2022-2023 Statistics
  { scholarshipId: 'aasp-sterix-thesis', scholarshipName: 'AASP - Sterix Thesis Grant', academicYear: '2022-2023', totalApplications: 3, approvedApplications: 2, rejectedApplications: 1, successRate: 67, averageGWAApproved: 2.02, averageIncomeApproved: 197500 },
  { scholarshipId: 'aasp-tuazon', scholarshipName: 'AASP - Dr. Ernesto Tuazon', academicYear: '2022-2023', totalApplications: 2, approvedApplications: 2, rejectedApplications: 0, successRate: 100, averageGWAApproved: 1.95, averageIncomeApproved: 139000 },
  { scholarshipId: 'basf-agri', scholarshipName: 'BASF Agricultural Research Foundation', academicYear: '2022-2023', totalApplications: 3, approvedApplications: 2, rejectedApplications: 1, successRate: 67, averageGWAApproved: 1.55, averageIncomeApproved: 385000 },
  { scholarshipId: 'aasp-ims', scholarshipName: 'AASP - IMS Program', academicYear: '2022-2023', totalApplications: 2, approvedApplications: 2, rejectedApplications: 0, successRate: 100, averageGWAApproved: 1.67, averageIncomeApproved: 157500 },
  { scholarshipId: 'aasp-cdo-odyssey', scholarshipName: 'AASP - CDO Odyssey Foundation', academicYear: '2022-2023', totalApplications: 2, approvedApplications: 2, rejectedApplications: 0, successRate: 100, averageGWAApproved: 1.90, averageIncomeApproved: 215000 },
  { scholarshipId: 'aasp-ables', scholarshipName: 'AASP - Dr. Higino A. Ables', academicYear: '2022-2023', totalApplications: 2, approvedApplications: 2, rejectedApplications: 0, successRate: 100, averageGWAApproved: 1.94, averageIncomeApproved: 125000 },
];

// ============================================================================
// AGGREGATED PLATFORM STATISTICS
// ============================================================================

export const platformStatistics = {
  totalApplicationsAllTime: 70,
  totalApprovedAllTime: 55,
  totalRejectedAllTime: 15,
  overallSuccessRate: 78.57,
  averageGWAApproved: 1.87,
  averageIncomeApproved: 195000,
  
  byAcademicYear: {
    '2023-2024': {
      totalApplications: 45,
      approved: 35,
      rejected: 10,
      successRate: 77.78
    },
    '2022-2023': {
      totalApplications: 25,
      approved: 20,
      rejected: 5,
      successRate: 80.00
    }
  },
  
  byCollege: {
    [UPLBCollege.CAS]: { applications: 18, approved: 15, successRate: 83.33 },
    [UPLBCollege.CAFS]: { applications: 22, approved: 17, successRate: 77.27 },
    [UPLBCollege.CHE]: { applications: 8, approved: 7, successRate: 87.50 },
    [UPLBCollege.CEAT]: { applications: 5, approved: 4, successRate: 80.00 },
    [UPLBCollege.CEM]: { applications: 4, approved: 3, successRate: 75.00 },
    [UPLBCollege.CFNR]: { applications: 5, approved: 4, successRate: 80.00 },
    [UPLBCollege.CVM]: { applications: 2, approved: 2, successRate: 100.00 },
    [UPLBCollege.CDC]: { applications: 2, approved: 1, successRate: 50.00 },
    [UPLBCollege.CPAF]: { applications: 2, approved: 1, successRate: 50.00 }
  },
  
  byYearLevel: {
    [YearLevel.FRESHMAN]: { applications: 3, approved: 2, successRate: 66.67 },
    [YearLevel.SOPHOMORE]: { applications: 12, approved: 10, successRate: 83.33 },
    [YearLevel.JUNIOR]: { applications: 22, approved: 18, successRate: 81.82 },
    [YearLevel.SENIOR]: { applications: 33, approved: 25, successRate: 75.76 }
  },
  
  gwaDistribution: {
    '1.00-1.50': { applications: 8, approved: 8, successRate: 100 },
    '1.51-2.00': { applications: 25, approved: 24, successRate: 96 },
    '2.01-2.50': { applications: 22, approved: 18, successRate: 81.82 },
    '2.51-3.00': { applications: 15, approved: 5, successRate: 33.33 }
  },
  
  incomeDistribution: {
    'Below ₱150,000': { applications: 20, approved: 19, successRate: 95 },
    '₱150,001 - ₱250,000': { applications: 30, approved: 24, successRate: 80 },
    '₱250,001 - ₱400,000': { applications: 15, approved: 10, successRate: 66.67 },
    'Above ₱400,000': { applications: 5, approved: 2, successRate: 40 }
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getApplicationsByScholarship = (scholarshipId: string): HistoricalApplication[] => {
  return historicalApplications.filter(app => app.scholarshipId === scholarshipId);
};

export const getApplicationsByAcademicYear = (academicYear: string): HistoricalApplication[] => {
  return historicalApplications.filter(app => app.academicYear === academicYear);
};

export const getStatsByScholarship = (scholarshipId: string): ScholarshipStats[] => {
  return scholarshipStatistics.filter(stat => stat.scholarshipId === scholarshipId);
};

export const calculateSuccessRateByGWA = (gwaThreshold: number): number => {
  const belowThreshold = historicalApplications.filter(app => app.gwa <= gwaThreshold);
  const approved = belowThreshold.filter(app => app.wasApproved);
  return belowThreshold.length > 0 ? (approved.length / belowThreshold.length) * 100 : 0;
};

export const calculateSuccessRateByIncome = (incomeThreshold: number): number => {
  const belowThreshold = historicalApplications.filter(app => app.annualFamilyIncome <= incomeThreshold);
  const approved = belowThreshold.filter(app => app.wasApproved);
  return belowThreshold.length > 0 ? (approved.length / belowThreshold.length) * 100 : 0;
};

// Export aggregated data for dashboard visualizations
export const mockHistoricalData = {
  applications: historicalApplications,
  statistics: scholarshipStatistics,
  platformStats: platformStatistics
};