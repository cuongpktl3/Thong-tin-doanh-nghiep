import { GoogleGenAI, Type } from "@google/genai";
import { DocType } from "../types";

// Initialize AI client using process.env.API_KEY directly as per guidelines.
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CẤU HÌNH DANH SÁCH MODEL DỰ PHÒNG (FALLBACK)
// Thứ tự ưu tiên từ cao xuống thấp theo yêu cầu:
// 1. Gemini 3 Pro Preview (Giới hạn quota rất thấp)
// 2. Gemini 3 Flash Preview
// 3. Gemini 2.5 Pro Preview (Sử dụng 2.0 Pro Exp)
// 4. Gemini 2.5 Flash (Sử dụng 2.0 Flash)
// 5. Gemini 2.5 Flash Lite (Sử dụng 2.0 Flash Lite)
const MODEL_PRIORITY = [
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.0-pro-exp-02-05', 
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite-preview-02-05'
];

const fileToPart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      // Ensure we have data
      if (!base64Data) {
        reject(new Error("File reading failed: result is empty"));
        return;
      }
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = (error) => {
        console.error("FileReader Error:", error);
        reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export const processDocument = async (file: File, docType: DocType): Promise<any> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY chưa được cấu hình. Vui lòng kiểm tra Settings trên Vercel (API_KEY) và Redeploy.");
  }

  try {
    const filePart = await fileToPart(file);
    let prompt = "";
    let responseSchema = {};
    let tools: any[] = [];

    // Define prompt and schema based on DocType
    switch (docType) {
      case DocType.REGISTRATION:
        prompt = `1. Extract the 'Tax ID' (Mã số thuế) and 'Company Name' (Tên công ty) from the image.
                  2. Use the google_search tool to search for the Tax ID on "masothue.com".
                  3. On the masothue.com page, locate the specific row or field labeled "Ngành nghề chính" (Main Business Line).
                  4. EXTRACT the EXACT full text content of this field.
                     - Do not look for a table of multiple industries. Look for the specific field explicitly labeled "Ngành nghề chính".
                     - Copy the content exactly, including the "Chi tiết:" (Detail) part if it exists (e.g., "Bán buôn... Chi tiết: ...").
                  5. Return the Company Name, Tax ID, and this full Business Line string.`;
        
        tools = [{ googleSearch: {} }];

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING },
            taxId: { type: Type.STRING },
            businessLine: { type: Type.STRING, description: "The complete text of the main business line." },
          },
        };
        break;
      case DocType.FINANCIAL_2023:
        prompt = "Extract the Net Revenue (Doanh thu thuần) or Total Revenue (Tổng doanh thu) from the Income Statement (Báo cáo kết quả kinh doanh). Return just the number or string representation of the money.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            revenue: { type: Type.STRING },
          },
        };
        break;
      case DocType.FINANCIAL_2024:
        prompt = `Extract data from the Income Statement (Báo cáo kết quả kinh doanh) for 2024:
                  1. Net Revenue (Doanh thu thuần) or Total Revenue (Tổng doanh thu).
                  2. Net Profit after tax (Lợi nhuận sau thuế).
                  Return the exact numbers or strings found.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            revenue: { type: Type.STRING },
            netProfitOrLoss: { type: Type.STRING, description: "Lợi nhuận sau thuế (Profit after tax)" },
          },
        };
        break;
      case DocType.VAT_Q1:
      case DocType.VAT_Q2:
      case DocType.VAT_Q3:
      case DocType.VAT_Q4:
        prompt = "Extract the value from target [34] - Total Revenue (Tổng doanh thu) from this VAT declaration.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            revenue: { type: Type.STRING },
          },
        };
        break;
    }

    // Try models in priority order
    let lastError: any = null;
    
    for (const modelName of MODEL_PRIORITY) {
      try {
        console.log(`[Gemini Service] Attempting with model: ${modelName}`);
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [filePart, { text: prompt }],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            tools: tools,
          },
        });

        if (response.text) {
           console.log(`[Gemini Service] Success with ${modelName}`);
           return JSON.parse(response.text);
        } else {
           // If response is empty, consider it a failure for this model and try next
           throw new Error("Empty response text");
        }

      } catch (error: any) {
        console.warn(`[Gemini Service] Failed with ${modelName}:`, error.message);
        lastError = error;
        
        // Add a small delay (1 second) before trying the next model.
        // This is CRITICAL for 429 errors. If we hit the rate limit, 
        // hammering the API instantly with the next request will just trigger another 429 globally.
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        continue;
      }
    }

    // If loop finishes without returning, all models failed
    console.error("All models exhausted.");
    throw lastError || new Error("All AI models failed to process the document.");

  } catch (error) {
    console.error("Gemini processing fatal error:", error);
    throw error;
  }
};