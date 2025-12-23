import React from 'react';
import { MemberDebt, BankRecord } from '../types';
import BankInput from './BankInput';
import { Plus, Trash2, User } from 'lucide-react';

interface MemberDebtInputProps {
  members: MemberDebt[];
  onChange: (members: MemberDebt[]) => void;
}

const MemberDebtInput: React.FC<MemberDebtInputProps> = ({ members, onChange }) => {
  const addMember = () => {
    onChange([
      ...members,
      { id: Date.now().toString(), name: '', banks: [{ id: Date.now().toString() + 'b', bankName: '', amount: '' }] }
    ]);
  };

  const removeMember = (id: string) => {
    onChange(members.filter(m => m.id !== id));
  };

  const updateMemberName = (id: string, name: string) => {
    onChange(members.map(m => m.id === id ? { ...m, name } : m));
  };

  const updateMemberBanks = (id: string, banks: BankRecord[]) => {
    onChange(members.map(m => m.id === id ? { ...m, banks } : m));
  };

  return (
    <div className="mb-6">
       <label className="block text-gray-700 font-semibold mb-3 text-lg border-b pb-1">5. Dư Nợ Cá Nhân các thành viên</label>
       <div className="space-y-6">
           {members.map((member, index) => (
             <div key={member.id} className="p-4 border border-gray-200 rounded-lg bg-blue-50/30">
                <div className="flex justify-between items-center mb-3">
                   <div className="flex items-center gap-2 w-full">
                      <User size={20} className="text-blue-600"/>
                      <input 
                        type="text" 
                        placeholder={`Nhập tên thành viên ${index + 1}...`}
                        className="font-medium bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none w-full max-w-sm px-1 py-1"
                        value={member.name}
                        onChange={(e) => updateMemberName(member.id, e.target.value)}
                      />
                   </div>
                   {members.length > 1 && (
                     <button onClick={() => removeMember(member.id)} className="text-red-500 hover:text-red-700 bg-white p-2 rounded shadow-sm">
                        <Trash2 size={18} />
                     </button>
                   )}
                </div>
                
                <div className="pl-2 sm:pl-4 border-l-2 border-blue-200">
                    <BankInput 
                       label="Chi tiết ngân hàng:" 
                       banks={member.banks} 
                       onChange={(banks) => updateMemberBanks(member.id, banks)} 
                    />
                </div>
             </div>
           ))}
       </div>
       <button
         type="button"
         onClick={addMember}
         className="mt-4 flex items-center gap-2 text-white bg-blue-500 hover:bg-blue-600 py-2 px-4 rounded-md shadow-sm transition-colors text-sm font-medium"
       >
         <Plus size={16} /> Thêm Thành Viên
       </button>
    </div>
  );
};

export default MemberDebtInput;