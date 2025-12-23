import React, { useState } from 'react';
import { DocType } from '../types';
import { processDocument } from '../services/geminiService';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ExtractionFieldProps {
  label: string;
  docType: DocType;
  resultLabel?: string;
  resultValue?: string;
  onExtract: (data: any) => void;
  subLabel?: string;
}

const ExtractionField: React.FC<ExtractionFieldProps> = ({
  label,
  docType,
  resultLabel,
  resultValue,
  onExtract,
  subLabel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setError(null);
      try {
        const data = await processDocument(file, docType);
        onExtract(data);
      } catch (err) {
        setError("Không thể đọc tài liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-gray-700 font-medium mb-1">{label}</label>
      {subLabel && <p className="text-sm text-gray-500 mb-2">{subLabel}</p>}
      
      <div className="flex items-center gap-3">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.xml,.xlsx,.xls"
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100 border border-gray-300 rounded-md p-1"
        />
        {loading && <Loader2 className="animate-spin text-blue-500" size={24} />}
      </div>

      {error && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14}/> {error}</p>}

      {resultValue && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
          <CheckCircle className="text-green-600 mt-0.5" size={16} />
          <div className="text-sm text-gray-800">
            {resultLabel && <span className="font-semibold">{resultLabel}: </span>}
            <span>{resultValue}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionField;