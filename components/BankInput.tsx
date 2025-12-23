import React from 'react';
import { BankRecord } from '../types';
import { Trash2, Plus } from 'lucide-react';

interface BankInputProps {
  label: string;
  banks: BankRecord[];
  onChange: (banks: BankRecord[]) => void;
}

const BankInput: React.FC<BankInputProps> = ({ label, banks, onChange }) => {
  const handleAddRow = () => {
    onChange([
      ...banks,
      { id: Date.now().toString(), bankName: '', amount: '' },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (banks.length > 1) {
      onChange(banks.filter((b) => b.id !== id));
    } else {
        // Reset the last one instead of removing
         onChange([{ id: Date.now().toString(), bankName: '', amount: '' }]);
    }
  };

  const updateRow = (id: string, field: keyof BankRecord, value: string) => {
    onChange(
      banks.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  return (
    <div className="mb-6">
      <label className="block text-gray-700 font-semibold mb-2">{label}</label>
      <div className="space-y-3">
        {banks.map((bank, index) => (
          <div key={bank.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-md border border-gray-200">
            <select
              value={bank.bankName}
              onChange={(e) => updateRow(bank.id, 'bankName', e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Chọn Ngân hàng --</option>
              <option value="TCB">Techcombank (TCB)</option>
              <option value="VPB">VPBank (VPB)</option>
              <option value="VIB">VIB (VIB)</option>
              <option value="ACB">ACB</option>
              <option value="VCB">Vietcombank (VCB)</option>
              <option value="BIDV">BIDV</option>
              <option value="CTG">VietinBank (CTG)</option>
              <option value="MBB">MBBank (MBB)</option>
              <option value="STB">Sacombank (STB)</option>
              <option value="OTHER">Khác (Ghi rõ)...</option>
            </select>

            {bank.bankName === 'OTHER' && (
              <input
                type="text"
                placeholder="Tên ngân hàng khác"
                value={bank.otherName || ''}
                onChange={(e) => updateRow(bank.id, 'otherName', e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}

            <input
              type="text" 
              placeholder="Số tiền (Tỷ)"
              value={bank.amount}
              onChange={(e) => updateRow(bank.id, 'amount', e.target.value)}
              className="w-full sm:w-32 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleRemoveRow(bank.id)}
              className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Xóa dòng"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddRow}
        className="mt-3 flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700"
      >
        <Plus size={16} /> Thêm Ngân Hàng
      </button>
    </div>
  );
};

export default BankInput;