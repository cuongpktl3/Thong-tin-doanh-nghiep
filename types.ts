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
  revenueQ1_2025: string;
  revenueQ2_2025: string;
  revenueQ3_2025: string;
  revenueQ4_2025: string;
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
  VAT_Q1 = 'VAT_Q1',
  VAT_Q2 = 'VAT_Q2',
  VAT_Q3 = 'VAT_Q3',
  VAT_Q4 = 'VAT_Q4',
}