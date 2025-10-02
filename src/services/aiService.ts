import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface ExtractedAssetData {
  name: string;
  category: 'stocks' | 'mutual_funds' | 'fixed_deposit' | 'gold' | 'cash' | 'other';
  currentValue: number;
  purchaseValue?: number;
  quantity?: number;
  price?: number;
  confidence: number;
}

export interface ExtractedTransactionData {
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense' | 'investment' | 'insurance';
  amount: number;
  confidence: number;
}

export interface ExtractedInsuranceData {
  policyName: string;
  type: 'term' | 'endowment' | 'health' | 'other';
  coverAmount: number;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'yearly';
  maturityDate?: string;
  confidence: number;
}

export class AIService {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    });
  }

  async extractAssetsFromImage(imageFile: File): Promise<ExtractedAssetData[]> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        // Return mock data for demo
        return [
          {
            name: 'HDFC Bank Ltd',
            category: 'stocks',
            currentValue: 125000,
            purchaseValue: 100000,
            confidence: 0.85
          }
        ];
      }

      const imageData = await this.fileToGenerativePart(imageFile);
      const result = await this.model.generateContent([
        'Extract financial asset information from this image and return as JSON array with fields: name, category, currentValue, purchaseValue, confidence',
        imageData
      ]);

      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Error extracting assets:', error);
      return [];
    }
  }

  async extractTransactionsFromImage(imageFile: File): Promise<ExtractedTransactionData[]> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        // Return mock data for demo
        return [
          {
            date: new Date().toISOString().split('T')[0],
            description: 'Salary Credit',
            category: 'Salary',
            type: 'income',
            amount: 85000,
            confidence: 0.95
          }
        ];
      }

      const imageData = await this.fileToGenerativePart(imageFile);
      const result = await this.model.generateContent([
        'Extract transaction information from this image and return as JSON array with fields: date, description, category, type, amount, confidence',
        imageData
      ]);

      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Error extracting transactions:', error);
      return [];
    }
  }

  async extractInsuranceFromImage(imageFile: File): Promise<ExtractedInsuranceData[]> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        // Return mock data for demo
        return [
          {
            policyName: 'HDFC Life Term Plan',
            type: 'term',
            coverAmount: 5000000,
            premiumAmount: 25000,
            premiumFrequency: 'yearly',
            confidence: 0.87
          }
        ];
      }

      const imageData = await this.fileToGenerativePart(imageFile);
      const result = await this.model.generateContent([
        'Extract insurance policy information from this image and return as JSON array with fields: policyName, type, coverAmount, premiumAmount, premiumFrequency, confidence',
        imageData
      ]);

      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Error extracting insurance:', error);
      return [];
    }
  }

  private async fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(file);
    });

    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  }
}

export const aiService = new AIService();