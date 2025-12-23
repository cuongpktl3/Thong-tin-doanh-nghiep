import React, { useState, useRef } from 'react';
import { BankRecord, ExtractedData, ManualData, DocType } from './types';
import BankInput from './components/BankInput';
import MemberDebtInput from './components/MemberDebtInput';
import ExtractionField from './components/ExtractionField';
import { Download, Check, FileText, Copy, Code, X, RefreshCw } from 'lucide-react';

// Factory functions to ensure deep copies/fresh state on reset
const getInitialExtracted = (): ExtractedData => ({
  companyName: '',
  taxId: '',
  businessLine: '',
  revenue2023: '',
  revenue2024: '',
  netProfitOrLoss2024: '',
  revenueQ1_2025: '',
  revenueQ2_2025: '',
  revenueQ3_2025: '',
  revenueQ4_2025: '',
});

const getInitialManual = (): ManualData => ({
  corporateBanks: [{ id: Date.now().toString(), bankName: '', amount: '' }],
  personalDebts: [{ id: Date.now().toString(), name: '', banks: [{ id: Date.now().toString() + 'b', bankName: '', amount: '' }] }],
  software: [],
  softwareOther: '',
  importExport: '',
  supermarket: '',
  supermarketName: '',
  profitLoss2024: '',
  corporateBadDebt: '',
  personalBadDebt: '',
  memberBadDebt: '',
});

const App: React.FC = () => {
  const [extracted, setExtracted] = useState<ExtractedData>(getInitialExtracted());
  const [manual, setManual] = useState<ManualData>(getInitialManual());
  const [showResult, setShowResult] = useState(false);
  const [showHTML, setShowHTML] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // Helper to update manual state
  const setManField = <K extends keyof ManualData>(field: K, value: ManualData[K]) => {
    setManual(prev => ({ ...prev, [field]: value }));
  };

  // Format number with dots as thousands separator (e.g. 10.000.000)
  const formatMoneyInput = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (!raw) return '';
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Helper for software checkbox
  const handleSoftwareChange = (value: string) => {
    setManual(prev => {
      const current = prev.software;
      if (current.includes(value)) {
        return { ...prev, software: current.filter(s => s !== value) };
      }
      return { ...prev, software: [...current, value] };
    });
  };

  const handleReset = () => {
    if (window.confirm("Bạn có chắc muốn tạo mới (tải lại trang)?")) {
      window.location.reload();
    }
  };

  const formatCurrency = (val: string) => {
      if(!val) return '... VNĐ';
      return `${val} VNĐ`;
  }

  // Parse string with dots to number (for standard integer inputs)
  const parseMoney = (val: string): number => {
    if (!val) return 0;
    const raw = val.replace(/\./g, '').replace(/,/g, '');
    return parseFloat(raw) || 0;
  };

  // Reusable helper to parse amount strings (handling Vietnamese comma/dot)
  const parseAmountSafe = (amount: string): number => {
    const valStr = amount.toString().trim();
    if (!valStr) return 0;
    // Remove dots (thousand separators), replace comma with dot
    const noDots = valStr.replace(/\./g, '');
    const withDot = noDots.replace(',', '.');
    const num = parseFloat(withDot);
    return isNaN(num) ? 0 : num;
  };

  // Calculate Total Debt from Banks list
  const calculateTotalDebt = (banks: BankRecord[]): string => {
      const total = banks.reduce((sum, bank) => sum + parseAmountSafe(bank.amount), 0);
      if (total === 0) return '';
      return total.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  };

  // Calculate Total Personal Debt (All members combined)
  const calculateTotalPersonalDebt = (): string => {
      const total = manual.personalDebts.reduce((sum, member) => {
          const memberTotal = member.banks.reduce((s, b) => s + parseAmountSafe(b.amount), 0);
          return sum + memberTotal;
      }, 0);

      if (total === 0) return '';
      return total.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
  };

  // Calculate live totals
  const vatQ1 = parseMoney(extracted.revenueQ1_2025);
  const vatQ2 = parseMoney(extracted.revenueQ2_2025);
  const vatQ3 = parseMoney(extracted.revenueQ3_2025);
  const vatQ4 = parseMoney(extracted.revenueQ4_2025);
  const vatTotal = vatQ1 + vatQ2 + vatQ3 + vatQ4;
  const vatTotalDisplay = vatTotal > 0 ? formatMoneyInput(vatTotal.toString()) + ' VNĐ' : '...';

  const totalCorporateDebtDisplay = calculateTotalDebt(manual.corporateBanks);
  const totalPersonalDebtDisplay = calculateTotalPersonalDebt();

  // Result Actions
  const handleCopy = () => {
    if (resultRef.current) {
      navigator.clipboard.writeText(resultRef.current.innerText);
      alert("Đã sao chép nội dung!");
    }
  };

  const handleViewHTML = () => {
    setShowHTML(!showHTML);
  };

  const handleDownload = () => {
    if (resultRef.current) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Báo Cáo Doanh Nghiệp</title>
          <style>
             body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
             strong { color: #333; }
             ul { list-style-type: none; padding: 0; }
             li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          ${resultRef.current.innerHTML}
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_${extracted.taxId || 'DN'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const generateResultHTML = () => {
    const formatBanks = (banks: BankRecord[]) => {
      const validBanks = banks.filter(b => b.bankName && b.amount);
      if (validBanks.length === 0) return '';
      const details = validBanks.map(b => `${b.bankName === 'OTHER' ? b.otherName : b.bankName}: ${b.amount} tỷ`).join(', ');
      return `(Chi tiết: ${details})`;
    };

    const getSoftwareString = () => {
        const list = [...manual.software];
        if (manual.softwareOther) list.push(manual.softwareOther);
        return list.length > 0 ? list.join(', ') : 'Không';
    };

    // Logic for Profit/Loss 2024
    let profitLossDisplay = '...';
    if (manual.profitLoss2024 === 'loi') {
        profitLossDisplay = `Có lỗ (${extracted.netProfitOrLoss2024 ? formatCurrency(extracted.netProfitOrLoss2024) : '...'}`;
        if(!extracted.netProfitOrLoss2024) profitLossDisplay += ")";
        else profitLossDisplay += ")";
    } else if (manual.profitLoss2024 === 'loi_nhuan') {
        profitLossDisplay = 'Có lợi nhuận';
    }

    return (
      <div className="font-sans text-gray-800 leading-relaxed p-6 bg-white border rounded shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-center border-b pb-2">TỔNG HỢP THÔNG TIN DOANH NGHIỆP</h3>
        <ul className="space-y-3 list-none">
          <li><strong>Công ty:</strong> {extracted.companyName || '....................'}</li>
          <li><strong>Ngành nghề kinh doanh:</strong> {extracted.businessLine || '....................'}</li>
          <li><strong>Doanh thu thuế 2023:</strong> {formatCurrency(extracted.revenue2023)}</li>
          <li><strong>Doanh thu thuế 2024:</strong> {formatCurrency(extracted.revenue2024)}</li>
          <li>
            <strong>Doanh thu thuế 2025 (Tổng cộng: {vatTotalDisplay}):</strong>
            <ul className="ml-6 mt-1 space-y-1 list-disc text-sm text-gray-700">
              <li>Quý 1: {formatCurrency(extracted.revenueQ1_2025)}</li>
              <li>Quý 2: {formatCurrency(extracted.revenueQ2_2025)}</li>
              <li>Quý 3: {formatCurrency(extracted.revenueQ3_2025)}</li>
              <li>Quý 4: {formatCurrency(extracted.revenueQ4_2025)}</li>
            </ul>
          </li>
          <li>
            <strong>Dư nợ doanh nghiệp:</strong>{' '}
            {totalCorporateDebtDisplay ? (
              <span className="text-red-600 font-bold">Tổng cộng: {totalCorporateDebtDisplay} Tỷ</span>
            ) : (
              '...'
            )}{' '}
            {formatBanks(manual.corporateBanks)}
          </li>
          <li>
             <strong>Dư nợ cá nhân các thành viên:</strong>
             {totalPersonalDebtDisplay && <span className="text-red-600 font-bold ml-1">(Tổng cộng: {totalPersonalDebtDisplay} Tỷ)</span>}
             <ul className="ml-6 mt-1 space-y-2 list-circle text-gray-700">
                {manual.personalDebts.map((member, idx) => {
                    const validBanks = member.banks.filter(b => b.bankName && b.amount);
                    const total = member.banks.reduce((acc, curr) => acc + parseAmountSafe(curr.amount), 0);
                    
                    const totalDisplay = total.toLocaleString('vi-VN', { maximumFractionDigits: 3 }); 

                    const details = validBanks.map(b => `${b.bankName === 'OTHER' ? b.otherName : b.bankName} ${b.amount} tỷ`).join(', ');
                    const nameDisplay = member.name ? member.name : `Thành viên ${idx + 1}`;
                    const hasData = member.name || validBanks.length > 0;
                    
                    if(!hasData) return null;

                    return (
                      <li key={member.id}>
                        - {nameDisplay}: {total > 0 ? `${totalDisplay} Tỷ` : '...'} {details ? `(${details})` : ''}
                      </li>
                    );
                })}
                {manual.personalDebts.every(m => !m.name && m.banks.every(b => !b.amount)) && <li>...</li>}
             </ul>
          </li>
          <li><strong>Phần mềm sử dụng:</strong> {getSoftwareString()}</li>
          <li><strong>Xuất nhập khẩu:</strong> {manual.importExport === 'nhap_khau' ? 'Có nhập khẩu' : manual.importExport === 'xuat_khau' ? 'Có xuất khẩu' : manual.importExport === 'ca_hai' ? 'Cả hai' : 'Không'}</li>
          <li><strong>Cung cấp hàng siêu thị:</strong> {manual.supermarket === 'co' ? `Có (${manual.supermarketName})` : 'Không'}</li>
          <li><strong>Báo thuế 2024 có lỗ không:</strong> {profitLossDisplay}</li>
          <li><strong>Nợ xấu doanh nghiệp:</strong> {manual.corporateBadDebt === 'co' ? 'Có' : 'Không'}</li>
          <li><strong>Nợ xấu cá nhân:</strong> {manual.personalBadDebt === 'co' ? 'Có' : 'Không'}</li>
          <li><strong>Thành viên góp vốn nợ xấu:</strong> {manual.memberBadDebt === 'co_mot_nguoi' ? 'Có' : manual.memberBadDebt === 'khong' ? 'Không' : 'Không rõ'}</li>
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText /> Biểu Mẫu Thu Thập Thông Tin Doanh Nghiệp
          </h1>
          <div className="mt-2 flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
            <p className="text-blue-100 opacity-90 text-sm">
              Kết hợp trích xuất AI tự động và nhập liệu thủ công để tạo báo cáo nhanh.
            </p>
            <div className="text-white font-bold text-sm whitespace-nowrap">
              Mr Cường - Tel: 0975109612
            </div>
          </div>
        </div>

        {/* Outer content container */}
        <div className="p-6 sm:p-8">
            
            {/* Dynamic Content Area */}
            <div key={resetKey} className="space-y-10">
            
              {/* SECTION 1: AUTO EXTRACTION */}
              <section className="bg-blue-50/50 p-6 rounded-lg border-l-4 border-blue-500">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Phần 1: Trích Xuất Tự Động</h2>
                <p className="text-sm text-gray-600 mb-6 bg-white p-3 rounded border border-blue-100">
                  Tải lên tài liệu để hệ thống AI (Gemini) tự động điền thông tin.
                </p>

                <ExtractionField
                  label="1. Giấy Đăng Ký Kinh Doanh"
                  subLabel="Hệ thống sẽ lấy MST và tra cứu Ngành nghề chính trên Masothue.com"
                  docType={DocType.REGISTRATION}
                  resultLabel="Kết quả"
                  resultValue={extracted.companyName ? `${extracted.companyName} - ${extracted.businessLine}` : undefined}
                  onExtract={(data) => setExtracted(prev => ({ ...prev, companyName: data.companyName, taxId: data.taxId, businessLine: data.businessLine }))}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ExtractionField
                    label="2. BCTC 2023"
                    docType={DocType.FINANCIAL_2023}
                    resultLabel="Doanh thu 2023"
                    resultValue={extracted.revenue2023}
                    onExtract={(data) => setExtracted(prev => ({ ...prev, revenue2023: data.revenue }))}
                  />
                  <ExtractionField
                    label="BCTC 2024"
                    docType={DocType.FINANCIAL_2024}
                    resultLabel="Doanh thu 2024"
                    resultValue={extracted.revenue2024}
                    onExtract={(data) => setExtracted(prev => ({ ...prev, revenue2024: data.revenue, netProfitOrLoss2024: data.netProfitOrLoss }))}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-gray-700 font-bold mb-2">
                    3. Tờ Khai Thuế GTGT 2025 (Tổng cộng: {vatTotalDisplay})
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ExtractionField label="Quý 1" docType={DocType.VAT_Q1} resultValue={extracted.revenueQ1_2025} onExtract={(d) => setExtracted(p => ({...p, revenueQ1_2025: d.revenue}))} />
                    <ExtractionField label="Quý 2" docType={DocType.VAT_Q2} resultValue={extracted.revenueQ2_2025} onExtract={(d) => setExtracted(p => ({...p, revenueQ2_2025: d.revenue}))} />
                    <ExtractionField label="Quý 3" docType={DocType.VAT_Q3} resultValue={extracted.revenueQ3_2025} onExtract={(d) => setExtracted(p => ({...p, revenueQ3_2025: d.revenue}))} />
                    <ExtractionField label="Quý 4" docType={DocType.VAT_Q4} resultValue={extracted.revenueQ4_2025} onExtract={(d) => setExtracted(p => ({...p, revenueQ4_2025: d.revenue}))} />
                  </div>
                </div>
              </section>

              {/* SECTION 2: MANUAL ENTRY */}
              <section className="bg-gray-50 p-6 rounded-lg border-l-4 border-green-500">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Phần 2: Nhập Liệu Thủ Công</h2>

                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">4. Tổng Dư Nợ Doanh Nghiệp (Tỷ đồng)</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-gray-100 text-gray-600 font-bold"
                    placeholder="Tự động tính toán từ chi tiết bên dưới..."
                    value={totalCorporateDebtDisplay}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Số liệu được tính tự động từ tổng chi tiết bên dưới.</p>
                </div>

                <BankInput
                  label="Chi Tiết Dư Nợ Doanh Nghiệp (Theo Ngân Hàng)"
                  banks={manual.corporateBanks}
                  onChange={(banks) => setManField('corporateBanks', banks)}
                />

                <MemberDebtInput
                  members={manual.personalDebts}
                  onChange={(members) => setManField('personalDebts', members)}
                />

                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">6. Phần Mềm Đang Sử Dụng</label>
                  <div className="flex flex-wrap gap-4">
                    {['misa', 'easy_invoice', 'bkav', 'cyber_lotus'].map(sw => (
                      <label key={sw} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manual.software.includes(sw)}
                          onChange={() => handleSoftwareChange(sw)}
                          className="rounded text-blue-600 focus:ring-blue-500 h-5 w-5"
                        />
                        <span className="capitalize">{sw.replace('_', ' ')}</span>
                      </label>
                    ))}
                    <label className="flex items-center space-x-2">
                      <span className="text-gray-700">Khác:</span>
                      <input
                        type="text"
                        className="border-b border-gray-400 outline-none focus:border-blue-500 px-1"
                        value={manual.softwareOther}
                        onChange={(e) => setManField('softwareOther', e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                      <label className="block text-gray-700 font-semibold mb-2">7. Xuất Nhập Khẩu</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded"
                        value={manual.importExport}
                        onChange={(e) => setManField('importExport', e.target.value)}
                      >
                        <option value="">-- Chọn --</option>
                        <option value="nhap_khau">Có nhập khẩu</option>
                        <option value="xuat_khau">Có xuất khẩu</option>
                        <option value="ca_hai">Có cả hai</option>
                        <option value="khong">Không</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-gray-700 font-semibold mb-2">8. Cung cấp siêu thị?</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded"
                        value={manual.supermarket}
                        onChange={(e) => setManField('supermarket', e.target.value)}
                      >
                        <option value="">-- Chọn --</option>
                        <option value="co">Có</option>
                        <option value="khong">Không</option>
                      </select>
                      {manual.supermarket === 'co' && (
                        <input
                          type="text"
                          className="mt-2 w-full p-2 border border-gray-300 rounded"
                          placeholder="Tên siêu thị..."
                          value={manual.supermarketName}
                          onChange={(e) => setManField('supermarketName', e.target.value)}
                        />
                      )}
                  </div>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">9. Báo cáo thuế 2024 có lỗ không?</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={manual.profitLoss2024}
                      onChange={(e) => setManField('profitLoss2024', e.target.value)}
                    >
                      <option value="">-- Chọn --</option>
                      <option value="loi">Có lỗ</option>
                      <option value="loi_nhuan">Có lợi nhuận</option>
                    </select>
                </div>

                <div className="mb-6 space-y-3">
                  <label className="block text-gray-700 font-semibold">10. Tình trạng Nợ Xấu (CIC)</label>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2">
                        <input type="radio" name="corpBad" value="co" checked={manual.corporateBadDebt === 'co'} onChange={() => setManField('corporateBadDebt', 'co')} />
                        DN Có nợ xấu
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="corpBad" value="khong" checked={manual.corporateBadDebt === 'khong'} onChange={() => setManField('corporateBadDebt', 'khong')} />
                        DN Không nợ xấu
                    </label>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2">
                        <input type="radio" name="perBad" value="co" checked={manual.personalBadDebt === 'co'} onChange={() => setManField('personalBadDebt', 'co')} />
                        Cá nhân Có nợ xấu
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="perBad" value="khong" checked={manual.personalBadDebt === 'khong'} onChange={() => setManField('personalBadDebt', 'khong')} />
                        Cá nhân Không nợ xấu
                    </label>
                  </div>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">11. Thành viên góp vốn có nợ xấu?</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded"
                      value={manual.memberBadDebt}
                      onChange={(e) => setManField('memberBadDebt', e.target.value)}
                    >
                      <option value="">-- Chọn --</option>
                      <option value="co_mot_nguoi">Có ít nhất một người</option>
                      <option value="khong">Không</option>
                      <option value="khong_ro">Không rõ</option>
                    </select>
                </div>

              </section>
            
            </div>

            {/* Buttons Section - Adjusted width to be equal using flex-1 for both */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 mt-10">
                <button
                  type="button"
                  onClick={() => setShowResult(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow transition-colors flex justify-center items-center gap-2"
                >
                    <Check size={20} /> Kết Quả
                </button>
                 <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow transition-colors flex justify-center items-center gap-2"
                >
                  <RefreshCw size={20} /> Tạo Mới
                </button>
            </div>
        </div>
      </div>

      {/* RESULT MODAL */}
      {showResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
             <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800">Kết Quả Biểu Mẫu</h3>
                <div className="flex items-center gap-2">
                   <button onClick={handleCopy} className="p-2 hover:bg-gray-200 rounded text-gray-600 flex items-center gap-1 text-sm font-medium" title="Copy Text">
                      <Copy size={16}/> Copy
                   </button>
                   <button onClick={handleViewHTML} className="p-2 hover:bg-gray-200 rounded text-gray-600 flex items-center gap-1 text-sm font-medium" title="Xem HTML">
                      <Code size={16}/> Xem HTML
                   </button>
                   <button onClick={handleDownload} className="p-2 hover:bg-gray-200 rounded text-gray-600 flex items-center gap-1 text-sm font-medium" title="Download">
                      <Download size={16}/> Download
                   </button>
                   <button onClick={() => setShowResult(false)} className="ml-2 text-gray-500 hover:text-gray-700">
                      <X size={24} />
                   </button>
                </div>
             </div>
             
             <div className="p-6">
                <div ref={resultRef}>
                   {generateResultHTML()}
                </div>
                {showHTML && (
                  <div className="mt-6 border-t pt-4">
                     <h4 className="text-sm font-bold mb-2">Xem trước HTML:</h4>
                     <iframe 
                        title="HTML Preview"
                        className="w-full h-96 border rounded bg-gray-50"
                        srcDoc={`
                          <html>
                          <head>
                             <style>
                               body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                               strong { color: #000; }
                               ul { list-style-type: none; padding-left: 0; }
                               li { margin-bottom: 8px; }
                               .list-disc { list-style-type: disc; padding-left: 20px; }
                               .list-circle { list-style-type: circle; padding-left: 20px; }
                             </style>
                          </head>
                          <body>
                             ${resultRef.current?.innerHTML || ''}
                          </body>
                          </html>
                        `}
                     />
                  </div>
                )}
             </div>

             <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowResult(false)}
                   className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
                >
                   Đóng
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;