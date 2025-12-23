import { GoogleGenAI, Type } from "@google/genai";
import { DocType } from "../types";

// Initialize AI client using process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CẤU HÌNH DANH SÁCH MODEL
// Sử dụng Gemini 2.0 Flash làm chủ đạo vì tốc độ và quota tốt nhất.
const MODEL_PRIORITY = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.0-pro-exp-02-05' // Backup cuối cùng nếu Flash quá tải
];

const fileToPart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
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

// Hàm delay đơn giản
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    let lastError: any = null;

    // Duyệt qua từng Model trong danh sách ưu tiên
    for (const modelName of MODEL_PRIORITY) {
      // Với mỗi Model, thử tối đa 3 lần (Retry) nếu gặp lỗi 429
      const MAX_RETRIES = 3;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Gemini Service] Model: ${modelName} - Attempt: ${attempt}`);
          
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
             throw new Error("Empty response text");
          }

        } catch (error: any) {
          const msg = error?.message || "";
          console.warn(`[Gemini Service] Error with ${modelName} (Attempt ${attempt}):`, msg);
          lastError = error;

          // Kiểm tra nếu là lỗi Quota (429) hoặc Server quá tải (503, 500)
          const isQuotaError = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
          const isServerError = msg.includes("503") || msg.includes("500") || msg.includes("overloaded");

          if (isQuotaError || isServerError) {
            if (attempt < MAX_RETRIES) {
              // Nếu chưa hết lượt thử, chờ một chút rồi thử lại chính Model này.
              // Thời gian chờ tăng dần: Lần 1 chờ 4s, Lần 2 chờ 8s...
              const waitTime = attempt * 4000; 
              console.log(`[Gemini Service] Waiting ${waitTime}ms before retry...`);
              await delay(waitTime);
              continue; // Quay lại vòng lặp attempt
            }
            // Nếu đã hết lượt thử của Model này, break để chuyển sang Model tiếp theo trong danh sách ưu tiên
          }
          
          // Nếu lỗi khác (không phải do quota), chuyển ngay sang model tiếp theo
          break; 
        }
      }
      
      // Chờ nhẹ trước khi chuyển sang Model dự phòng tiếp theo
      await delay(1000);
    }

    console.error("All models and retries exhausted.");
    throw lastError || new Error("Hệ thống đang quá tải. Vui lòng thử lại sau 1 phút.");

  } catch (error) {
    console.error("Gemini processing fatal error:", error);
    throw error;
  }
};