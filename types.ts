export interface BankRecord {
  id: string;
  bankName: string;
  otherName?: string;
  amount: string; // Keeping as string to allow empty state easily
}

export interface MemberDebt {
  id: string;
  name: string;
  banks: BankRecord[];
}

export interface ExtractedData {
  companyName: string;
  taxId: string;
  businessLine: string;
  revenue2023: string;
  revenue2024: string;
  netProfitOrLoss2024: string; // Added to store profit/loss for 2024
  // Quarterly VAT
  revenueQ1_2025: string;
  revenueQ2_2025: string;
  revenueQ3_2025: string;
  revenueQ4_2025: string;
  // Monthly VAT
  revenueM1_2025: string;
  revenueM2_2025: string;
  revenueM3_2025: string;
  revenueM4_2025: string;
  revenueM5_2025: string;
  revenueM6_2025: string;
  revenueM7_2025: string;
  revenueM8_2025: string;
  revenueM9_2025: string;
  revenueM10_2025: string;
  revenueM11_2025: string;
  revenueM12_2025: string;
}

export interface ManualData {
  // totalCorporateDebt removed as it is calculated
  corporateBanks: BankRecord[];
  personalDebts: MemberDebt[];
  software: string[];
  softwareOther: string;
  importExport: string;
  supermarket: string;
  supermarketName: string;
  profitLoss2024: string;
  manualProfitLossAmount: string;
  corporateBadDebt: string;
  personalBadDebt: string;
  memberBadDebt: string;
}

export interface AppState {
  extracted: ExtractedData;
  manual: ManualData;
}

export enum DocType {
  REGISTRATION = 'REGISTRATION',
  FINANCIAL_2023 = 'FINANCIAL_2023',
  FINANCIAL_2024 = 'FINANCIAL_2024',
  // Quarters
  VAT_Q1 = 'VAT_Q1',
  VAT_Q2 = 'VAT_Q2',
  VAT_Q3 = 'VAT_Q3',
  VAT_Q4 = 'VAT_Q4',
  // Months
  VAT_M1 = 'VAT_M1',
  VAT_M2 = 'VAT_M2',
  VAT_M3 = 'VAT_M3',
  VAT_M4 = 'VAT_M4',
  VAT_M5 = 'VAT_M5',
  VAT_M6 = 'VAT_M6',
  VAT_M7 = 'VAT_M7',
  VAT_M8 = 'VAT_M8',
  VAT_M9 = 'VAT_M9',
  VAT_M10 = 'VAT_M10',
  VAT_M11 = 'VAT_M11',
  VAT_M12 = 'VAT_M12',
}