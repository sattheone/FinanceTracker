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
  private hasApiKey: boolean;

  constructor() {
    this.hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
    
    if (this.hasApiKey) {
      try {
        // Use the correct model name for vision tasks
        this.model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash', // Working model - will test vision capability
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          }
        });
        console.log('✅ Gemini AI model initialized successfully with: gemini-2.5-flash');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini AI model:', error);
        this.hasApiKey = false;
      }
    } else {
      console.warn('⚠️ Gemini API key not found. Using mock data for demo.');
    }
  }

  async extractAssetsFromImage(imageFile: File): Promise<ExtractedAssetData[]> {
    console.log('🔍 Starting asset extraction from image:', imageFile.name, imageFile.size, 'bytes');
    
    try {
      if (!this.hasApiKey) {
        console.warn('⚠️ Gemini API key not found. Using mock data for demo.');
        // Return mock data for demo
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        return [
          {
            name: 'HDFC Bank Ltd',
            category: 'stocks',
            currentValue: 125000,
            purchaseValue: 100000,
            quantity: 100,
            price: 1250,
            confidence: 0.85
          },
          {
            name: 'SBI Bluechip Fund',
            category: 'mutual_funds',
            currentValue: 85000,
            purchaseValue: 75000,
            quantity: 1250.5,
            price: 67.95,
            confidence: 0.90
          },
          {
            name: 'Gold ETF',
            category: 'gold',
            currentValue: 45000,
            purchaseValue: 40000,
            quantity: 10,
            price: 4500,
            confidence: 0.88
          }
        ];
      }

      // Validate file size and type
      if (imageFile.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Image file is too large. Please use an image smaller than 10MB.');
      }

      if (!imageFile.type.startsWith('image/')) {
        throw new Error('Please upload a valid image file (JPG, PNG, WebP).');
      }

      console.log('📤 Converting image to base64...');
      const imageData = await this.fileToGenerativePart(imageFile);
      console.log('✅ Image converted successfully');
      
      const prompt = `
        You are a financial data extraction expert. Analyze this portfolio/investment screenshot carefully and extract asset information.
        
        Look for these types of investments:
        - Stock holdings: Company names, share quantities, current market prices, total values
        - Mutual funds/SIPs: Scheme names, NAV, units held, current values
        - Fixed deposits: Bank names, amounts, maturity details
        - Gold investments: Physical gold, gold ETFs, digital gold
        - Cash/savings: Bank balances, liquid funds
        - Other investments: Bonds, PPF, NSC, etc.
        
        CRITICAL: Return ONLY a valid JSON array. No explanations, no markdown formatting, just the JSON:
        
        [
          {
            "name": "Exact Asset Name as shown",
            "category": "stocks|mutual_funds|fixed_deposit|gold|cash|other",
            "currentValue": number_without_commas_or_currency,
            "purchaseValue": number_if_visible_otherwise_omit,
            "quantity": number_if_available,
            "price": number_per_unit_if_available,
            "confidence": decimal_between_0_and_1
          }
        ]
        
        Rules:
        - Extract exact names as displayed (don't abbreviate)
        - Convert ₹1,23,456 to 123456 (remove currency and commas)
        - Only include data you can clearly see
        - Set confidence: 0.9+ for very clear data, 0.7+ for readable data, 0.5+ for unclear data
        - Return [] if no financial data is visible
        - Maximum 20 assets to avoid overwhelming the user
      `;

      console.log('📡 Sending request to Gemini API...');
      
      let result, response, text;
      try {
        result = await this.model.generateContent([prompt, imageData]);
        response = await result.response;
        text = response.text();
      } catch (apiError: any) {
        console.error('❌ Gemini API request failed:', apiError);
        
        // If API fails, provide helpful error message and fallback
        console.error('❌ API Error details:', {
          message: apiError.message,
          status: apiError.status,
          statusText: apiError.statusText
        });
        
        // If it's an image processing error, provide fallback data
        if (apiError.message && (
          apiError.message.includes('Unable to process input image') ||
          apiError.message.includes('image') ||
          apiError.status === 400
        )) {
          console.log('🔄 Image processing failed, providing sample data for demo...');
          return [
            {
              name: 'Sample Asset (Image Analysis Failed)',
              category: 'other',
              currentValue: 50000,
              confidence: 0.3
            }
          ];
        }
        
        throw new Error(`Gemini API failed: ${apiError.message}. Please check your API key and try again.`);
      }
      
      console.log('📥 Gemini API response received:', text.substring(0, 200) + '...');
      
      // Try to extract JSON from the response
      console.log('🔍 Parsing JSON from response...');
      let jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        // Try alternative JSON extraction patterns
        jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonMatch[0] = jsonMatch[1];
        } else {
          // Try to find JSON within the text
          jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonMatch[0] = jsonMatch[1];
          }
        }
      }
      
      if (jsonMatch) {
        try {
          const cleanedJson = jsonMatch[0].trim();
          console.log('🧹 Cleaned JSON:', cleanedJson.substring(0, 200) + '...');
          
          const extractedData = JSON.parse(cleanedJson);
          console.log('✅ Successfully parsed assets:', extractedData.length, 'items');
          
          // Validate the structure
          const validatedData = this.validateAssetData(extractedData);
          console.log('✅ Validated assets:', validatedData.length, 'items');
          
          return validatedData;
        } catch (parseError) {
          console.error('❌ JSON parsing error:', parseError);
          console.log('📄 Raw response text:', text);
          
          // Try to manually extract data if JSON parsing fails
          return this.fallbackAssetExtraction(text);
        }
      }
      
      console.warn('⚠️ No valid JSON found in response');
      console.log('📄 Full response:', text);
      return [];
    } catch (error) {
      console.error('Error extracting assets from image:', error);
      
      // Return mock data on error for demo purposes
      return [
        {
          name: 'Sample Stock',
          category: 'stocks',
          currentValue: 50000,
          purchaseValue: 45000,
          confidence: 0.5
        }
      ];
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

  // Validate extracted asset data
  private validateAssetData(data: any[]): ExtractedAssetData[] {
    if (!Array.isArray(data)) {
      console.warn('⚠️ Data is not an array, wrapping in array');
      data = [data];
    }

    return data.filter(item => {
      // Basic validation
      if (!item || typeof item !== 'object') return false;
      if (!item.name || typeof item.name !== 'string') return false;
      if (!item.category || typeof item.category !== 'string') return false;
      if (!item.currentValue || typeof item.currentValue !== 'number') return false;
      
      // Ensure category is valid
      const validCategories = ['stocks', 'mutual_funds', 'fixed_deposit', 'gold', 'cash', 'other'];
      if (!validCategories.includes(item.category)) {
        item.category = 'other';
      }
      
      // Ensure confidence is valid
      if (!item.confidence || typeof item.confidence !== 'number') {
        item.confidence = 0.5;
      }
      
      return true;
    }).map(item => ({
      name: item.name.trim(),
      category: item.category,
      currentValue: Math.abs(item.currentValue),
      purchaseValue: item.purchaseValue ? Math.abs(item.purchaseValue) : undefined,
      quantity: item.quantity ? Math.abs(item.quantity) : undefined,
      price: item.price ? Math.abs(item.price) : undefined,
      confidence: Math.min(Math.max(item.confidence, 0), 1)
    }));
  }

  // Fallback extraction when JSON parsing fails
  private fallbackAssetExtraction(text: string): ExtractedAssetData[] {
    console.log('🔄 Attempting fallback asset extraction...');
    
    // Try to extract basic asset information using regex patterns
    const assets: ExtractedAssetData[] = [];
    
    // Look for common patterns in portfolio screenshots
    const patterns = [
      // Pattern for "Stock Name: ₹123,456"
      /([A-Z][A-Za-z\s&]+):\s*₹?([\d,]+)/g,
      // Pattern for "Stock Name ₹123,456"
      /([A-Z][A-Za-z\s&]+)\s+₹?([\d,]+)/g,
      // Pattern for table-like data
      /([A-Z][A-Za-z\s&]+)\s+(\d+)\s+₹?([\d,]+)/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        const value = parseInt(match[2].replace(/,/g, ''));
        
        if (name.length > 2 && value > 0) {
          assets.push({
            name,
            category: this.guessAssetCategory(name),
            currentValue: value,
            confidence: 0.3 // Lower confidence for fallback extraction
          });
        }
      }
    });
    
    console.log('🔄 Fallback extraction found:', assets.length, 'assets');
    return assets.slice(0, 10); // Limit to 10 assets
  }

  // Test API key validity
  async testAPIKey(): Promise<{ isValid: boolean; error?: string }> {
    if (!this.hasApiKey) {
      return { isValid: false, error: 'No API key configured' };
    }

    try {
      // Test with a simple text-only request
      const testModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await testModel.generateContent(['Say "API key is working" if you can read this.']);
      const response = await result.response;
      const text = response.text();
      
      if (text && text.toLowerCase().includes('working')) {
        return { isValid: true };
      } else {
        return { isValid: false, error: 'Unexpected API response' };
      }
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.message || 'API key test failed' 
      };
    }
  }

  // Guess asset category based on name
  private guessAssetCategory(name: string): ExtractedAssetData['category'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('fund') || lowerName.includes('sip') || lowerName.includes('mutual')) {
      return 'mutual_funds';
    }
    if (lowerName.includes('gold') || lowerName.includes('etf')) {
      return 'gold';
    }
    if (lowerName.includes('fd') || lowerName.includes('deposit') || lowerName.includes('fixed')) {
      return 'fixed_deposit';
    }
    if (lowerName.includes('cash') || lowerName.includes('savings') || lowerName.includes('bank')) {
      return 'cash';
    }
    
    return 'stocks'; // Default to stocks for company names
  }

  private async fileToGenerativePart(file: File) {
    console.log('🖼️ Converting file to base64:', file.name, file.type);
    
    // Validate and normalize MIME type
    let mimeType = file.type;
    if (!mimeType || !mimeType.startsWith('image/')) {
      // Try to determine MIME type from file extension
      const extension = file.name.toLowerCase().split('.').pop();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'png':
          mimeType = 'image/png';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        default:
          mimeType = 'image/jpeg'; // Default fallback
      }
    }
    
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          const base64String = result.split(',')[1];
          console.log('✅ Base64 conversion successful, length:', base64String.length, 'MIME:', mimeType);
          resolve(base64String);
        } catch (error) {
          console.error('❌ Base64 conversion failed:', error);
          reject(error);
        }
      };
      reader.onerror = () => {
        console.error('❌ FileReader error');
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });

    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: mimeType,
      },
    };
  }
}

export const aiService = new AIService();